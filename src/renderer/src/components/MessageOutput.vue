<template>
  <div class="message-output">
    <div class="output-content">
      <span>{{ displayedText }}</span>
      <span v-if="isTyping" class="cursor">|</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  isTyping: { type: Boolean, default: false }
})

const displayedText = ref('')
let charIndex = 0
let typeTimer = null

watch(() => props.text, (newText) => {
  if (props.isTyping && newText.length > displayedText.value.length) {
    typeNextChars(newText)
  } else if (!props.isTyping) {
    displayedText.value = newText
  }
}, { immediate: true })

function typeNextChars(fullText) {
  if (typeTimer) clearTimeout(typeTimer)
  charIndex = displayedText.value.length

  function step() {
    if (charIndex < fullText.length) {
      const chunkSize = Math.min(3, fullText.length - charIndex)
      displayedText.value = fullText.slice(0, charIndex + chunkSize)
      charIndex += chunkSize
      typeTimer = setTimeout(step, 30)
    }
  }
  step()
}

onUnmounted(() => {
  if (typeTimer) clearTimeout(typeTimer)
})
</script>

<style scoped>
.message-output {
  width: 100%;
  padding: 0 8px 8px 8px;
  box-sizing: border-box;
}
.output-content {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  min-height: 40px;
  max-height: 120px;
  overflow-y: auto;
  word-break: break-word;
  white-space: pre-wrap;
}
.cursor {
  animation: blink 0.8s infinite;
  color: #6A5ACD;
}
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
