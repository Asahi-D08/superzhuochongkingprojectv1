<template>
  <div
    id="desktop-pet"
    @mousedown="startDrag"
    @contextmenu.prevent
  >
    <component :is="currentSkin.component" :state="currentState" />
    <InteractionLayer
      :state="currentState"
      :messages="messages"
      :bot-output="botOutput"
      :has-voice="!!mimoApiKey"
      @login="handleLogin"
      @send="handleSend"
      @start-voice="handleStartVoice"
      @stop-voice="handleStopVoice"
      @cancel-voice="handleCancelVoice"
      @switch-skin="showSkinSwitcher = true"
    />
    <SkinSwitcher
      v-if="showSkinSwitcher"
      @close="showSkinSwitcher = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { get, set } from 'idb-keyval'
import { useStateMachine } from './composables/useStateMachine.js'
import { useAstrBotApi } from './composables/useAstrBotApi.js'
import { useChatHistory } from './composables/useChatHistory.js'
import { useVoice } from './composables/useVoice.js'
import { useSkinManager } from './skins/registry.js'
import InteractionLayer from './components/InteractionLayer.vue'
import SkinSwitcher from './components/SkinSwitcher.vue'

const { currentState, transition } = useStateMachine()
const api = useAstrBotApi()
const { messages, loadHistory, addMessage } = useChatHistory()
const { currentSkin, load: loadSkin } = useSkinManager()
const voice = useVoice()

const botOutput = ref('')
const showSkinSwitcher = ref(false)
const mimoApiKey = ref('')

onMounted(async () => {
  loadHistory()
  loadSkin()
  mimoApiKey.value = (await get('desktop-pet-mimo-key')) || ''
})

onUnmounted(() => {
  api.disconnect()
})

// ---- 登录 ----

async function handleLogin({ serverUrl, apiKey, mimoApiKey: mimoKey, onError, onSuccess }) {
  api.setCredentials(serverUrl, apiKey)
  const ok = await api.testConnection()
  if (ok) {
    transition('LOGIN_SUCCESS')
    api.connectWebSocket(handleWsMessage, handleWsEnd)
    if (mimoKey) {
      mimoApiKey.value = mimoKey
      await set('desktop-pet-mimo-key', mimoKey)
    }
    onSuccess?.()
  } else {
    onError?.(api.error.value || '连接失败')
  }
}

// ---- 文本发送 ----

function handleSend(text) {
  addMessage('user', text)
  botOutput.value = ''
  transition('SEND_MESSAGE')
  if (!api.sendMessage(text)) {
    botOutput.value = '发送失败：WebSocket 未连接'
    setTimeout(() => {
      if (botOutput.value) addMessage('bot', botOutput.value)
      transition('REPLY_COMPLETE')
    }, 1500)
  }
}

// ---- 语音 ----

async function handleStartVoice() {
  try {
    await voice.startRecording()
    transition('START_LISTENING')
  } catch {
    // 麦克风权限拒绝等
  }
}

async function handleStopVoice() {
  try {
    const wavBlob = await voice.stopRecording()
    transition('STOP_LISTENING')
    botOutput.value = '语音识别中...'

    // STT via 小米 API
    const text = await api.speechToText(wavBlob, mimoApiKey.value)
    if (!text || text.trim() === '') {
      botOutput.value = '未识别到语音内容'
      addMessage('bot', botOutput.value)
      transition('REPLY_COMPLETE')
      return
    }

    // 发送识别出的文本
    addMessage('user', text)
    botOutput.value = ''
    transition('SEND_MESSAGE')
    if (!api.sendMessage(text)) {
      botOutput.value = '发送失败：WebSocket 未连接'
      addMessage('bot', botOutput.value)
      transition('REPLY_COMPLETE')
    }
  } catch (err) {
    console.error('Voice error:', err)
    botOutput.value = api.error.value || '语音处理失败'
    addMessage('bot', botOutput.value)
    transition('REPLY_COMPLETE')
  }
}

function handleCancelVoice() {
  voice.cancelRecording()
  transition('CANCEL_LISTENING')
}

// ---- WebSocket 消息 ----

function handleWsMessage(data) {
  if (data.type === 'plain' && data.data) {
    if (data.streaming) {
      botOutput.value += data.data
    } else {
      botOutput.value = data.data
    }
  }
}

async function handleWsEnd() {
  const replyText = botOutput.value
  if (replyText) {
    addMessage('bot', replyText)
  }

  // TTS via 小米 API
  if (mimoApiKey.value && replyText) {
    try {
      const audio = await api.textToSpeech(replyText, mimoApiKey.value)
      await voice.playAudio(audio)
    } catch {
      // TTS 失败不影响主流程
    }
  }

  transition('REPLY_COMPLETE')
}

// ---- 拖拽 ----

function startDrag(e) {
  if (e.button !== 0) return
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
    return
  }

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
  width: 200px;
  height: 360px;
  position: relative;
  -webkit-app-region: no-drag;
}
</style>
