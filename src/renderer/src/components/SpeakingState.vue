<template>
  <div class="speaking-state">
    <div class="character-container">
      <img :src="assets.character" alt="character" class="character-img speaking" draggable="false" />
    </div>
    <div class="book-container">
      <img :src="assets.bookOpen" alt="open book" class="book-img" draggable="false" />
    </div>
    <MessageOutput :text="outputText" :is-typing="true" />
  </div>
</template>

<script setup>
import assets from '../config/assets.config.js'
import MessageOutput from './MessageOutput.vue'

defineProps({
  outputText: { type: String, default: '' }
})
</script>

<style scoped>
.speaking-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding-top: 10px;
  user-select: none;
  pointer-events: none;
}
.character-container {
  animation: float 2s ease-in-out infinite;
  z-index: 2;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.character-img.speaking {
  animation: speak-bounce 0.4s ease-in-out infinite alternate;
}
@keyframes speak-bounce {
  from { transform: scale(1); }
  to { transform: scale(1.03); }
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
