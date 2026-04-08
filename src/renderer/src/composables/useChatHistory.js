import { ref, readonly } from 'vue'
import { get, set } from 'idb-keyval'

const STORAGE_KEY = 'desktop-pet-chat-history'
const MAX_MESSAGES = 500

export function useChatHistory() {
  const messages = ref([])

  async function loadHistory() {
    try {
      const stored = await get(STORAGE_KEY)
      if (Array.isArray(stored)) {
        messages.value = stored
      }
    } catch (e) {
      console.error('Failed to load chat history:', e)
    }
  }

  async function saveHistory() {
    try {
      const trimmed = messages.value.slice(-MAX_MESSAGES)
      await set(STORAGE_KEY, trimmed)
    } catch (e) {
      console.error('Failed to save chat history:', e)
    }
  }

  /**
   * @param {'user'|'bot'} role
   * @param {string} content 纯文本内容
   * @param {Array<{type:'image', base64:string, mimeType:string, filename?:string}>} [attachments]
   *        可选的附件数组。base64 是完整 data URI（data:image/png;base64,...），方便直接塞进 <img>
   */
  async function addMessage(role, content, attachments) {
    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      role,
      content,
      timestamp: Date.now()
    }
    if (attachments && attachments.length) {
      msg.attachments = attachments
    }
    messages.value.push(msg)
    await saveHistory()
    return msg
  }

  async function updateLastBotMessage(content) {
    const lastBot = [...messages.value].reverse().find(m => m.role === 'bot')
    if (lastBot) {
      lastBot.content = content
      await saveHistory()
    }
  }

  async function clearHistory() {
    messages.value = []
    await saveHistory()
  }

  return {
    messages: readonly(messages),
    loadHistory,
    addMessage,
    updateLastBotMessage,
    clearHistory
  }
}
