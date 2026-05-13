<template>
  <div
    id="desktop-pet"
    :style="petStyle"
    @mousedown="startDrag"
    @contextmenu.prevent
  >
    <component :is="currentSkin.component" :state="currentState" :emotion="currentEmotion" />
    <InteractionLayer
      :state="currentState"
      :messages="messages"
      :bot-output="cleanedBotOutput"
      :upload-fn="api.uploadFile"
      :is-speaking="isSpeaking"
      @login="handleLogin"
      @send="handleSend"
      @switch-skin="openSkinSwitcher"
      @open-settings="openSettings"
      @modal-open="expandWindow"
      @modal-close="restoreWindow"
    />
    <SkinSwitcher
      v-if="showSkinSwitcher"
      @close="closeSkinSwitcher"
    />
    <SettingsPanel
      v-if="showSettings"
      @close="closeSettings"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStateMachine } from './composables/useStateMachine.js'
import { useAstrBotApi } from './composables/useAstrBotApi.js'
import { useChatHistory } from './composables/useChatHistory.js'
import { useSkinManager } from './skins/registry.js'
import { useSettings } from './composables/useSettings.js'
import { parseLastEmotion, stripEmotionTags } from './services/emotion.js'
import { AudioStreamPlayer } from './services/audioStreamPlayer.js'
import InteractionLayer from './components/InteractionLayer.vue'
import SkinSwitcher from './components/SkinSwitcher.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const { currentState, transition } = useStateMachine()
const api = useAstrBotApi()
const { messages, loadHistory, addMessage } = useChatHistory()
const { currentSkin, load: loadSkin } = useSkinManager()
const { characterSize, textBoxHeight, voiceEnabled, load: loadSettings } = useSettings()

const botOutput = ref('')
const showSkinSwitcher = ref(false)
const showSettings = ref(false)
const isSpeaking = ref(false)

// 共享单例：所有 audio_chunk 帧入队这个 player，连续播放
const audioPlayer = new AudioStreamPlayer({
  onSpeakingChange: (s) => { isSpeaking.value = s },
  onError: (err, ctx) => console.warn(`[audio] ${ctx || ''}`, err)
})

// 从 botOutput 解析出当前情绪 + 去掉情绪标签后的纯净文本（给 UI / 历史用）
const cleanedBotOutput = computed(() => stripEmotionTags(botOutput.value))
const currentEmotion = computed(() => parseLastEmotion(botOutput.value) || '平静')

const MODAL_WINDOW = { width: 340, height: 360 }

// Window dims need to fully contain:
//   - .skin-visual padding-top (12) for breathing/float animation
//   - the full character image (square, height = characterSize)
//   - 6px gap between character bottom and textbox top
//   - the textbox (textBoxHeight)
// => minHeight = characterSize + textBoxHeight + 28
function computeWindowSize() {
  const w = Math.max(200, characterSize.value + 20)
  const h = Math.max(260, characterSize.value + textBoxHeight.value + 28)
  return { w, h }
}

const petStyle = computed(() => {
  const { w, h } = computeWindowSize()
  return {
    width: `${w}px`,
    height: `${h}px`,
    '--character-size': `${characterSize.value}px`,
    '--textbox-height': `${textBoxHeight.value}px`
  }
})

watch([characterSize, textBoxHeight], () => {
  if (showSkinSwitcher.value || showSettings.value) {
    expandWindow()
    return
  }
  restoreWindow()
})

onMounted(() => {
  loadHistory()
  loadSkin()
  loadSettings().then(restoreWindow)
})

onUnmounted(() => {
  api.disconnect()
  audioPlayer.dispose().catch(() => {})
})

// ---- 窗口尺寸 ----

function expandWindow() {
  const { w, h } = computeWindowSize()
  window.electronAPI?.windowResize(
    Math.max(MODAL_WINDOW.width, w),
    Math.max(MODAL_WINDOW.height, h)
  )
}

function restoreWindow() {
  if (showSkinSwitcher.value || showSettings.value) return
  const { w, h } = computeWindowSize()
  window.electronAPI?.windowResize(w, h)
}

function openSkinSwitcher() {
  showSkinSwitcher.value = true
  expandWindow()
}

function closeSkinSwitcher() {
  showSkinSwitcher.value = false
  restoreWindow()
}

function openSettings() {
  showSettings.value = true
  expandWindow()
}

function closeSettings() {
  showSettings.value = false
  restoreWindow()
}

// ---- 登录 ----

async function handleLogin({ serverUrl, apiKey, sessionId, onError, onSuccess }) {
  api.setCredentials(serverUrl, apiKey)
  api.setSessionId(sessionId)
  const ok = await api.testConnection()
  if (ok) {
    transition('LOGIN_SUCCESS')
    api.connectWebSocket(handleWsMessage, handleWsEnd)
    onSuccess?.()
  } else {
    onError?.(api.error.value || '连接失败')
  }
}

// ---- 文本 / 多模态发送 ----

/**
 * 接收 ChatInput 通过 InteractionLayer 透传上来的 payload：
 *   { text: string, attachments: Array<{attachment_id, base64, mimeType, filename}> }
 *
 * 组装成 AstrBot Open API WS 要的 message 字段：
 *   - 纯文字 -> 仍然传字符串（保持与旧逻辑兼容）
 *   - 带图片 -> 传 message parts 数组 [{type:'plain',text},{type:'image',attachment_id}...]
 */
function handleSend(payload) {
  // 兼容老签名：如果父组件还在传字符串就包一层
  const { text, attachments } = typeof payload === 'string'
    ? { text: payload, attachments: [] }
    : payload

  // 写入本地历史（user 消息带上 base64 方便重启后还能看到图）
  const historyAttachments = (attachments || []).map(a => ({
    type: 'image',
    base64: a.base64,
    mimeType: a.mimeType,
    filename: a.filename
  }))
  addMessage('user', text, historyAttachments)

  // 组装要发给 AstrBot 的 message 字段
  let messageField
  if (attachments && attachments.length > 0) {
    messageField = []
    if (text) messageField.push({ type: 'plain', text })
    for (const a of attachments) {
      messageField.push({ type: 'image', attachment_id: a.attachment_id })
    }
  } else {
    messageField = text
  }

  botOutput.value = ''
  // 新一轮：打断上一轮可能还在播的音频
  audioPlayer.abort()

  transition('SEND_MESSAGE')
  const extras = voiceEnabled.value ? { action_type: 'live' } : undefined
  if (!api.sendMessage(messageField, extras)) {
    botOutput.value = '发送失败：WebSocket 未连接'
    setTimeout(() => {
      if (botOutput.value) addMessage('bot', botOutput.value)
      transition('REPLY_COMPLETE')
    }, 1500)
  }
}

// ---- WebSocket 消息 ----

function handleWsMessage(data) {
  if (data.type === 'audio_chunk') {
    // AstrBot live mode 推送的 TTS 音频帧（base64 wav）
    if (voiceEnabled.value && data.data) {
      audioPlayer.enqueueBase64Wav(data.data)
    }
    // audio_chunk 里 data.text 是同帧文本（CosyVoice 合成的句子原文），
    // 不要 += 到 botOutput —— 否则会和 plain 帧重复。
    return
  }
  if (data.type !== 'plain' || !data.data) return
  if (data.streaming) {
    botOutput.value += data.data
  } else {
    botOutput.value = data.data
  }
}

function handleWsEnd() {
  const replyText = stripEmotionTags(botOutput.value)
  if (replyText) {
    addMessage('bot', replyText)
  }
  transition('REPLY_COMPLETE')
  // 音频继续播放直到队列空（player.onSpeakingChange 会自动翻 isSpeaking 回 false）
}

// ---- 拖拽 ----

function startDrag(e) {
  if (e.button !== 0) return
  if (e.target.tagName !== 'IMG') return

  let lastX = e.screenX
  let lastY = e.screenY

  function onMouseMove(ev) {
    const deltaX = ev.screenX - lastX
    const deltaY = ev.screenY - lastY
    if (deltaX !== 0 || deltaY !== 0) {
      window.electronAPI?.windowDrag(deltaX, deltaY)
      lastX = ev.screenX
      lastY = ev.screenY
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html, body {
  overflow: hidden;
  background: transparent !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#desktop-pet {
  position: relative;
  -webkit-app-region: no-drag;
}
</style>
