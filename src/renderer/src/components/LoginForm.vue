<template>
  <div class="login-overlay" @click.self="$emit('close')">
    <div class="login-form">
      <h3>连接到 AstrBot</h3>
      <p class="server-hint">服务端：{{ serverUrl }}</p>

      <div class="form-group">
        <label for="api-key-input">API Key</label>
        <input
          id="api-key-input"
          v-model="apiKeyInput"
          type="password"
          autocomplete="current-password"
          placeholder="输入 API Key"
          @keyup.enter="handleLogin"
        />
      </div>

      <div class="form-group">
        <label for="session-id-input">Session ID（输入 QQ 号）</label>
        <input
          id="session-id-input"
          v-model="sessionIdInput"
          type="text"
          inputmode="numeric"
          autocomplete="username"
          placeholder="例如：123456789"
          @keyup.enter="handleLogin"
        />
      </div>

      <div class="section-title">语音合成</div>

      <div class="form-group">
        <label for="tts-provider-select">TTS 来源</label>
        <select
          id="tts-provider-select"
          :value="ttsProvider"
          @change="setTtsProvider($event.target.value)"
        >
          <option value="auto">自动（AstrBot / 浏览器）</option>
          <option value="cosyvoice">CosyVoice 本地（局域网）</option>
          <option value="browser">仅浏览器内置</option>
        </select>
      </div>

      <template v-if="ttsProvider === 'cosyvoice'">
        <div class="form-group">
          <label for="cosy-ws-input">WebSocket 地址</label>
          <input
            id="cosy-ws-input"
            :value="cosyWsUrl"
            type="text"
            placeholder="ws://192.168.x.x:8765/ws/tts"
            @change="setCosyWsUrl($event.target.value)"
          />
        </div>
        <div class="form-group">
          <label for="cosy-spk-input">说话人 ID</label>
          <input
            id="cosy-spk-input"
            :value="cosySpk"
            type="text"
            placeholder="0000040.wav_0000000000_0000171840"
            @change="setCosySpk($event.target.value)"
          />
          <p class="field-hint">服务端 spk2info.pt 中已 enroll 的 ID</p>
        </div>
      </template>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <div class="form-actions">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn-confirm" :disabled="loading" @click="handleLogin">
          {{ loading ? '连接中...' : '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useSettings } from '../composables/useSettings.js'

const emit = defineEmits(['login', 'close'])

const serverUrl = 'https://astrbot.losingfire.com'
const apiKeyInput = ref('')
const sessionIdInput = ref('')
const errorMsg = ref('')
const loading = ref(false)

const {
  ttsProvider,
  cosyWsUrl,
  cosySpk,
  setTtsProvider,
  setCosyWsUrl,
  setCosySpk,
  load: loadSettings
} = useSettings()

// 登录页可能在 App 第一次 loadSettings 完成之前就被打开（idle 状态下右键直接出现）。
// 主动 load 一次保证下拉框预填的是用户上次选择，而不是 'auto'。
onMounted(() => { loadSettings() })

async function handleLogin() {
  const normalizedApiKey = apiKeyInput.value.trim()
  const sessionId = sessionIdInput.value.trim()
  if (!normalizedApiKey) {
    errorMsg.value = '请填写 API Key'
    return
  }
  if (!normalizedApiKey.startsWith('abk_')) {
    errorMsg.value = 'API Key 格式不正确，应以 abk_ 开头'
    return
  }
  if (!sessionId) {
    errorMsg.value = '请填写 Session ID（QQ 号）'
    return
  }
  if (ttsProvider.value === 'cosyvoice') {
    if (!cosyWsUrl.value) {
      errorMsg.value = '已选择 CosyVoice，请填写 WebSocket 地址'
      return
    }
    if (!cosySpk.value) {
      errorMsg.value = '已选择 CosyVoice，请填写说话人 ID'
      return
    }
  }
  loading.value = true
  errorMsg.value = ''
  emit('login', {
    serverUrl,
    apiKey: normalizedApiKey,
    sessionId,
    voiceApiKey: '',
    onError: (msg) => {
      errorMsg.value = msg
      loading.value = false
    },
    onSuccess: () => {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
}
.login-form {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  width: 300px;
  max-height: 92vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.login-form h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
  text-align: center;
}
.server-hint {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: #666;
  text-align: center;
  word-break: break-all;
}
.section-title {
  margin: 16px 0 8px;
  padding-top: 10px;
  border-top: 1px solid #eee;
  font-size: 12px;
  color: #888;
  font-weight: 600;
}
.form-group {
  margin-bottom: 12px;
}
.form-group label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}
.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
  background: #fff;
  color: #333;
  transition: border-color 0.2s;
}
.form-group input:focus,
.form-group select:focus {
  border-color: #6A5ACD;
}
.field-hint {
  margin: 4px 0 0;
  font-size: 11px;
  color: #999;
}
.error {
  color: #e74c3c;
  font-size: 12px;
  margin: 8px 0;
}
.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}
.btn-cancel, .btn-confirm {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.btn-cancel {
  background: #f0f0f0;
  color: #666;
}
.btn-confirm {
  background: #6A5ACD;
  color: #fff;
}
.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
