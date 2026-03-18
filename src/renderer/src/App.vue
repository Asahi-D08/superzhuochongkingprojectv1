<template>
  <div
    id="desktop-pet"
    @mousedown="startDrag"
  >
    <IdleState
      v-if="currentState === STATES.IDLE"
      @login-success="handleLogin"
    />
    <StandbyState
      v-else-if="currentState === STATES.STANDBY"
      :messages="messages"
      @send="handleSend"
    />
    <SpeakingState
      v-else-if="currentState === STATES.SPEAKING"
      :output-text="botOutput"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useStateMachine, STATES } from './composables/useStateMachine.js'
import { useAstrBotApi } from './composables/useAstrBotApi.js'
import { useChatHistory } from './composables/useChatHistory.js'
import IdleState from './components/IdleState.vue'
import StandbyState from './components/StandbyState.vue'
import SpeakingState from './components/SpeakingState.vue'

const { currentState, transition } = useStateMachine()
const api = useAstrBotApi()
const { messages, loadHistory, addMessage, updateLastBotMessage } = useChatHistory()

const botOutput = ref('')

onMounted(() => {
  loadHistory()
})

async function handleLogin({ serverUrl, apiKey, onError, onSuccess }) {
  api.setCredentials(serverUrl, apiKey)
  const ok = await api.testConnection()
  if (ok) {
    transition('LOGIN_SUCCESS')
    api.connectWebSocket(handleWsMessage, handleWsEnd)
    onSuccess?.()
  } else {
    onError?.(api.error.value || '连接失败')
  }
}

function handleSend(text) {
  addMessage('user', text)
  botOutput.value = ''
  transition('SEND_MESSAGE')
  api.sendMessage(text)
}

function handleWsMessage(data) {
  if (data.type === 'plain' && data.data) {
    if (data.streaming) {
      botOutput.value += data.data
    } else {
      botOutput.value = data.data
    }
  }
}

function handleWsEnd() {
  if (botOutput.value) {
    addMessage('bot', botOutput.value)
  }
  transition('REPLY_COMPLETE')
}

function startDrag(e) {
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
  width: 350px;
  height: 450px;
  display: flex;
  flex-direction: column;
  -webkit-app-region: no-drag;
}
</style>
