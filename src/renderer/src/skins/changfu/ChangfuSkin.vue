<template>
  <div class="skin-visual">
    <template v-if="state === 'idle'">
      <div class="book-container idle-book">
        <img
          v-if="bookClosedSrc"
          :src="bookClosedSrc"
          alt="closed book"
          class="book-img"
          draggable="false"
        />
      </div>
    </template>
    <template v-else>
      <div class="character-container">
        <img
          v-if="currentCharacter"
          :src="currentCharacter"
          alt="character"
          class="character-img"
          draggable="false"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import bookClosedRaw from './book-closed.jpg'
import { chromaKeyBlackToTransparent } from '../../services/imageChroma.js'

const props = defineProps({
  state: { type: String, required: true },
  emotion: { type: String, default: '平静' }
})

// 自动扫描 changfu 下所有情绪子文件夹中的 png：
//   './开心/开心3_1.png' → emotionPools['开心'] = [src1, src2, ...]
const allImages = import.meta.glob('./*/*.png', { eager: true, import: 'default' })
const emotionPools = {}
for (const [path, src] of Object.entries(allImages)) {
  const match = path.match(/^\.\/([^/]+)\//)
  if (!match) continue
  const emotion = match[1]
  if (!emotionPools[emotion]) emotionPools[emotion] = []
  emotionPools[emotion].push(src)
}

const FALLBACK_EMOTION = '平静'

function pickRandom(emotion, exclude) {
  const pool =
    emotionPools[emotion] ||
    emotionPools[FALLBACK_EMOTION] ||
    Object.values(emotionPools)[0] ||
    []
  if (pool.length === 0) return ''
  if (pool.length === 1) return pool[0]
  const candidates = exclude ? pool.filter(s => s !== exclude) : pool
  const list = candidates.length > 0 ? candidates : pool
  return list[Math.floor(Math.random() * list.length)]
}

const currentCharacter = ref(pickRandom(props.emotion || FALLBACK_EMOTION))

// 立绘切换完全由 AI 输出的情绪标签控制；不再因为状态切换而抽图
watch(
  () => props.emotion,
  (newEmotion) => {
    if (!newEmotion) return
    currentCharacter.value = pickRandom(newEmotion, currentCharacter.value)
  }
)

// idle 状态用的"合上的书"：原图是黑底 JPEG，运行时用 canvas 把黑色像素设为透明，
// 输出 dataURL 给 <img> 用，这样 Electron 透明窗口下背景就消失了
const bookClosedSrc = ref(bookClosedRaw)
onMounted(async () => {
  try {
    bookClosedSrc.value = await chromaKeyBlackToTransparent(bookClosedRaw, 32)
  } catch (err) {
    console.warn('[changfu] book chroma key failed, fallback to raw image:', err)
  }
})
</script>

<style scoped>
.skin-visual {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 12px;
  pointer-events: none;
}

.idle-book {
  transition: transform 0.3s ease;
  pointer-events: auto;
}
.idle-book:hover {
  transform: scale(1.05);
}
.book-img {
  width: calc(var(--character-size, 180px) * 0.7);
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  pointer-events: auto;
  user-select: none;
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
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
  pointer-events: auto;
}
</style>
