<template>
  <div class="chat-input-container">
    <textarea
      ref="inputRef"
      v-model="text"
      placeholder="输入消息..."
      rows="2"
      @keydown.enter.exact.prevent="send"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['send'])
const text = ref('')
const inputRef = ref(null)

function send() {
  const msg = text.value.trim()
  if (!msg) return
  emit('send', msg)
  text.value = ''
}

onMounted(() => {
  inputRef.value?.focus()
})

defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<style scoped>
.chat-input-container {
  width: 100%;
  padding: 0 8px 8px 8px;
  box-sizing: border-box;
}
textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(106, 90, 205, 0.3);
  border-radius: 8px;
  font-size: 13px;
  resize: none;
  outline: none;
  background: rgba(255, 255, 255, 0.95);
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.2s;
}
textarea:focus {
  border-color: #6A5ACD;
}
</style>
