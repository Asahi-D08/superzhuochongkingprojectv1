<template>
  <div class="skin-visual">
    <template v-if="state === 'idle'">
      <div class="book-container idle-book">
        <img :src="bookClosed" alt="closed book" class="book-img" draggable="false" />
      </div>
    </template>
    <template v-else>
      <div class="character-container">
        <img :src="character" alt="character" class="character-img" draggable="false" />
      </div>
    </template>
  </div>
</template>

<script setup>
import bookClosed from './assets/book-closed.png'
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
  justify-content: flex-end;
  padding-bottom: 56px;
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
  z-index: 2;
}
.character-img {
  width: 180px;
  height: auto;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}
</style>
