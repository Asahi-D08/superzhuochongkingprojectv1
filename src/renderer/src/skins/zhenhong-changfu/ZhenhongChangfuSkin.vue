<template>
  <div class="skin-visual">
    <template v-if="state === 'idle'">
      <div class="book-container idle-book">
        <img :src="bookClosed" alt="closed book" class="book-img" draggable="false" />
      </div>
    </template>
    <template v-else>
      <div class="character-container">
        <img :src="currentCharacter" alt="character" class="character-img" draggable="false" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import bookClosed from './assets/book-closed.png'
import character1 from './assets/character.png'
import character2 from './assets/character-2.png'
import character3 from './assets/character-3.png'

const props = defineProps({
  state: { type: String, required: true }
})

const characterPool = [character1, character2, character3]

function pickRandomCharacter(exclude) {
  if (characterPool.length <= 1) return characterPool[0]
  const candidates = exclude
    ? characterPool.filter(src => src !== exclude)
    : characterPool
  const idx = Math.floor(Math.random() * candidates.length)
  return candidates[idx]
}

const currentCharacter = ref(pickRandomCharacter())

watch(
  () => props.state,
  (newState, oldState) => {
    if (newState === 'speaking' && oldState !== 'speaking') {
      currentCharacter.value = pickRandomCharacter(currentCharacter.value)
    }
  }
)
</script>

<style scoped>
.skin-visual {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 贴顶对齐：窗口压矮到 220 后，角色贴顶 + 输入框贴底，中间极小缝隙 */
  justify-content: flex-start;
  /* 12px = 8px float 动画峰值 + 4px 呼吸 */
  padding-top: 12px;
  pointer-events: none;
}

.idle-book {
  transition: transform 0.3s ease;
}
.idle-book:hover {
  transform: scale(1.05);
}
.book-img {
  width: calc(var(--character-size, 180px) * 0.44);
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
  pointer-events: auto;
}

.character-container {
  position: absolute;
  left: 50%;
  bottom: calc(var(--textbox-height, 52px) + 6px);
  transform: translateX(-50%);
  z-index: 2;
}
.character-img {
  width: var(--character-size, 180px);
  height: auto;
  display: block;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
  pointer-events: auto;
}
</style>
