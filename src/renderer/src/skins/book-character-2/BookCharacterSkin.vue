<template>
  <div class="skin-visual">
    <template v-if="state === 'idle'">
      <div class="book-container idle-book">
        <img :src="bookClosed" alt="closed book" class="book-img" draggable="false" />
      </div>
    </template>
    <template v-else>
      <div class="character-container" :class="{ speaking: state === 'speaking', listening: state === 'listening' }">
        <img :src="character" alt="character" class="character-img" draggable="false" />
      </div>
      <div class="book-container">
        <img :src="bookOpen" alt="open book" class="book-img-open" draggable="false" />
      </div>
    </template>
  </div>
</template>

<script setup>
import bookClosed from './assets/book-closed.png'
import bookOpen from './assets/book-open.png'
import character from './assets/character.png'

defineProps({
  state: { type: String, required: true }
})
</script>

<style scoped>
.skin-visual {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.idle-book {
  transition: transform 0.3s ease;
}
.idle-book:hover {
  transform: scale(1.05);
}
.book-img {
  width: 80px;
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}

.character-container {
  animation: float 3s ease-in-out infinite;
  z-index: 2;
}
.character-container.speaking {
  animation: float 2s ease-in-out infinite;
}
.character-container.speaking .character-img {
  animation: speak-bounce 0.4s ease-in-out infinite alternate;
}
.character-container.listening {
  animation: float 2.5s ease-in-out infinite;
}
.character-container.listening .character-img {
  animation: listen-pulse 1.2s ease-in-out infinite;
}
@keyframes listen-pulse {
  0%, 100% { filter: drop-shadow(0 4px 6px rgba(106,90,205,0.2)); }
  50% { filter: drop-shadow(0 4px 12px rgba(106,90,205,0.6)); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes speak-bounce {
  from { transform: scale(1); }
  to { transform: scale(1.03); }
}
.character-img {
  width: 50px;
  height: auto;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}

.book-container {
  z-index: 1;
}
.book-img-open {
  width: 100px;
  height: auto;
  margin-top: -6px;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}
</style>
