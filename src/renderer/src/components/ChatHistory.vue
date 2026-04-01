<template>
  <div class="chat-history">
    <div class="history-header">
      <button class="btn-back" @click="$emit('close')">← 返回</button>
    </div>
    <div class="history-messages" ref="messagesRef">
      <div v-if="messages.length === 0" class="empty-hint">暂无聊天记录</div>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="bubble-row"
        :class="msg.role"
      >
        <div class="bubble">
          <p class="bubble-text">{{ msg.content }}</p>
          <span class="bubble-time">{{ formatTime(msg.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, nextTick } from 'vue'

defineProps({
  messages: { type: Array, default: () => [] }
})
defineEmits(['close'])

const messagesRef = ref(null)

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
})
</script>

<style scoped>
.chat-history {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.history-header {
  padding: 8px;
  flex-shrink: 0;
}

.btn-back {
  background: none;
  border: none;
  font-size: 12px;
  color: #6A5ACD;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.btn-back:hover {
  background: rgba(106, 90, 205, 0.1);
}

.history-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px 10px;
}

.empty-hint {
  text-align: center;
  color: #999;
  font-size: 11px;
  padding: 40px 0;
}

.bubble-row {
  display: flex;
  margin-bottom: 8px;
}
.bubble-row.user {
  justify-content: flex-end;
}
.bubble-row.bot {
  justify-content: flex-start;
}

.bubble {
  max-width: 75%;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 11px;
  line-height: 1.4;
  word-break: break-word;
}
.bubble-row.user .bubble {
  background: #6A5ACD;
  color: #fff;
  border-bottom-right-radius: 3px;
}
.bubble-row.bot .bubble {
  background: #f0f0f0;
  color: #333;
  border-bottom-left-radius: 3px;
}

.bubble-text {
  margin: 0;
  white-space: pre-wrap;
}

.bubble-time {
  display: block;
  font-size: 9px;
  margin-top: 3px;
  opacity: 0.6;
}
.bubble-row.user .bubble-time {
  text-align: right;
}
</style>
