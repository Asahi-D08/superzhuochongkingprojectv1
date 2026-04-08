<template>
  <div class="login-overlay" @click.self="$emit('close')">
    <div class="login-form">
      <h3>连接到 AstrBot</h3>

      <div class="form-group">
        <label>API Key</label>
        <input
          v-model="apiKeyInput"
          type="password"
          placeholder="输入 API Key"
          @keyup.enter="handleLogin"
        />
      </div>

      <div class="form-group">
        <label>小米 API Key（语音，可选）</label>
        <input
          v-model="mimoApiKey"
          type="password"
          placeholder="输入小米 API Key"
          @keyup.enter="handleLogin"
        />
      </div>

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
import { ref } from 'vue'

const emit = defineEmits(['login', 'close'])

const serverUrl = ref('https://astrbot.losingfire.com')
const apiKeyInput = ref('')
const mimoApiKey = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!apiKeyInput.value) {
    errorMsg.value = '请填写 API Key'
    return
  }
  loading.value = true
  errorMsg.value = ''
  emit('login', {
    serverUrl: serverUrl.value,
    apiKey: apiKeyInput.value,
    mimoApiKey: mimoApiKey.value,
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
  width: 280px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.login-form h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
  text-align: center;
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
.form-group input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
}
.form-group input:focus {
  border-color: #6A5ACD;
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
