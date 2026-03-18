<template>
  <div class="idle-state" @contextmenu.prevent="showLogin = true">
    <div class="book-container">
      <img :src="assets.bookClosed" alt="closed book" class="book-img" draggable="false" />
    </div>
    <p class="hint">右键点击登录</p>
    <LoginForm
      v-if="showLogin"
      @login="handleLogin"
      @close="showLogin = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import assets from '../config/assets.config.js'
import LoginForm from './LoginForm.vue'

const emit = defineEmits(['loginSuccess'])
const showLogin = ref(false)

function handleLogin({ serverUrl, apiKey, onError, onSuccess }) {
  emit('loginSuccess', { serverUrl, apiKey, onError, onSuccess })
}
</script>

<style scoped>
.idle-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  cursor: default;
  user-select: none;
}
.book-container {
  transition: transform 0.3s ease;
}
.book-container:hover {
  transform: scale(1.05);
}
.book-img {
  width: 120px;
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}
.hint {
  margin-top: 12px;
  font-size: 11px;
  color: rgba(255,255,255,0.7);
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
</style>
