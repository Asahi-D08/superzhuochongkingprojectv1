<template>
  <div class="interaction-layer">
    <!-- Idle: 整个区域可右键登录 -->
    <template v-if="state === 'idle'">
      <div class="idle-overlay" @contextmenu.prevent="showLogin = true">
        <p class="hint">右键点击登录</p>
      </div>
      <LoginForm
        v-if="showLogin"
        @login="(data) => $emit('login', data)"
        @close="showLogin = false"
      />
    </template>

    <!-- Standby: 最后回复 + 输入 -->
    <template v-else-if="state === 'standby'">
      <div class="standby-ui" @contextmenu.prevent="showMenu = true">
        <div v-if="lastBotMessage && !dismissedReply" class="last-reply" @click="dismissedReply = true">
          <p class="last-reply-text">{{ lastBotMessage }}</p>
        </div>
        <div class="input-row">
          <ChatInput :upload-fn="uploadFn" @send="handleSend" />
        </div>
        <div v-if="showMenu" class="context-menu">
          <button @click="showHistory = true; showMenu = false">聊天记录</button>
          <button @click="$emit('switch-skin'); showMenu = false">切换皮肤</button>
          <button @click="$emit('open-settings'); showMenu = false">设置</button>
        </div>
      </div>
      <ChatHistory
        v-if="showHistory"
        :messages="messages"
        @close="showHistory = false"
      />
    </template>

    <!-- Speaking: 消息输出 -->
    <template v-else-if="state === 'speaking'">
      <div class="standby-ui">
        <MessageOutput :text="botOutput" :is-typing="true" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import LoginForm from './LoginForm.vue'
import ChatInput from './ChatInput.vue'
import ChatHistory from './ChatHistory.vue'
import MessageOutput from './MessageOutput.vue'

const props = defineProps({
  state: { type: String, required: true },
  messages: { type: Array, default: () => [] },
  botOutput: { type: String, default: '' },
  // 上传函数透传给 ChatInput，由 App.vue 传入 api.uploadFile
  uploadFn: { type: Function, required: true }
})

const emit = defineEmits(['login', 'send', 'switch-skin', 'open-settings'])

const showLogin = ref(false)
const showHistory = ref(false)
const showMenu = ref(false)
const dismissedReply = ref(false)

const lastBotMessage = computed(() => {
  const last = [...props.messages].reverse().find(m => m.role === 'bot')
  return last?.content || ''
})

// payload: { text: string, attachments: Array<{attachment_id, base64, mimeType, filename}> }
function handleSend(payload) {
  dismissedReply.value = true
  emit('send', payload)
}

watch(() => props.state, (newState) => {
  showMenu.value = false
})

// 仅在出现新的 bot 回复时展示「最后一条」气泡，避免每次回到 standby 都强制展开导致输入框被顶下去
watch(lastBotMessage, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    dismissedReply.value = false
  }
})
</script>

<style scoped>
.interaction-layer {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  z-index: 10;
  pointer-events: none;
}
.interaction-layer > * {
  pointer-events: auto;
}

.idle-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 12px;
  cursor: default;
}

.hint {
  font-size: 10px;
  color: rgba(255,255,255,0.7);
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  user-select: none;
}

.standby-ui {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding-right: 8px;
}
.input-row .chat-input-container {
  flex: 1;
}

.last-reply {
  margin: 0 8px 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 8px;
  cursor: pointer;
  max-height: 80px;
  overflow-y: auto;
}
.last-reply-text {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

.context-menu {
  position: absolute;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  padding: 4px 0;
  z-index: 50;
  right: 20px;
  bottom: 80px;
}
.context-menu button {
  display: block;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}
.context-menu button:hover {
  background: #f0f0f0;
}
</style>
