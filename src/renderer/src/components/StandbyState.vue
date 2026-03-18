<template>
  <div class="standby-state" @contextmenu.prevent="showHistory = true">
    <div class="character-container">
      <img :src="assets.character" alt="character" class="character-img" draggable="false" />
    </div>
    <div class="book-container">
      <img :src="assets.bookOpen" alt="open book" class="book-img" draggable="false" />
    </div>
    <ChatInput @send="handleSend" />
    <ChatHistory
      v-if="showHistory"
      :messages="messages"
      @close="showHistory = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import assets from '../config/assets.config.js'
import ChatInput from './ChatInput.vue'
import ChatHistory from './ChatHistory.vue'

defineProps({
  messages: { type: Array, default: () => [] }
})

const emit = defineEmits(['send'])
const showHistory = ref(false)

function handleSend(text) {
  emit('send', text)
}
</script>

<style scoped>
.standby-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding-top: 10px;
  user-select: none;
}
.character-container {
  animation: float 3s ease-in-out infinite;
  z-index: 2;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.character-img {
  width: 80px;
  height: auto;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}
.book-container {
  margin-top: -10px;
  z-index: 1;
}
.book-img {
  width: 180px;
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}
</style>
