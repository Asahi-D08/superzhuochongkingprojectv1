<template>
  <div class="history-overlay" @click.self="$emit('close')">
    <div class="history-panel">
      <div class="history-header">
        <h3>聊天记录</h3>
        <button class="btn-close" @click="$emit('close')">✕</button>
      </div>
      <div class="history-messages" ref="messagesRef">
        <div v-if="messages.length === 0" class="empty-hint">暂无聊天记录</div>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-item"
          :class="msg.role"
        >
          <span class="role-label">{{ msg.role === 'user' ? '你' : 'Bot' }}</span>
          <p class="message-text">{{ msg.content }}</p>
          <span class="timestamp">{{ formatTime(msg.timestamp) }}</span>
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
.history-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  z-index: 100;
}
.history-panel {
  background: #fff;
  border-radius: 12px;
  width: 300px;
  max-height: 380px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.history-header h3 {
  margin: 0;
  font-size: 14px;
  color: #333;
}
.btn-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #999;
}
.history-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
.empty-hint {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px 0;
}
.message-item {
  margin-bottom: 12px;
}
.message-item.user .role-label { color: #6A5ACD; }
.message-item.bot .role-label { color: #e67e22; }
.role-label {
  font-size: 11px;
  font-weight: 600;
}
.message-text {
  margin: 2px 0;
  font-size: 13px;
  color: #333;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
.timestamp {
  font-size: 10px;
  color: #bbb;
}
</style>
