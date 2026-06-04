import { ref, readonly } from 'vue'
import { get, set } from 'idb-keyval'

const CHAR_SIZE_KEY = 'desktop-pet-character-size'
const TEXTBOX_KEY = 'desktop-pet-textbox-height'
const VOICE_ENABLED_KEY = 'desktop-pet-voice-enabled'
const DEBUG_MODE_KEY = 'desktop-pet-debug-mode'
const REPLY_TIMEOUT_KEY = 'desktop-pet-reply-timeout'

const DEFAULT_CHAR_SIZE = 180
const DEFAULT_TEXTBOX_HEIGHT = 52
const DEFAULT_VOICE_ENABLED = false
const DEFAULT_DEBUG_MODE = false
// 等待 bot 回复的最长秒数；0 表示不限制（永远等待）
const DEFAULT_REPLY_TIMEOUT = 30

const characterSize = ref(DEFAULT_CHAR_SIZE)
const textBoxHeight = ref(DEFAULT_TEXTBOX_HEIGHT)
const voiceEnabled = ref(DEFAULT_VOICE_ENABLED)
const debugMode = ref(DEFAULT_DEBUG_MODE)
const replyTimeout = ref(DEFAULT_REPLY_TIMEOUT)

export function useSettings() {
  async function load() {
    const savedChar = await get(CHAR_SIZE_KEY)
    if (savedChar != null) characterSize.value = savedChar
    const savedText = await get(TEXTBOX_KEY)
    if (savedText != null) textBoxHeight.value = savedText
    const savedVoice = await get(VOICE_ENABLED_KEY)
    if (savedVoice != null) voiceEnabled.value = Boolean(savedVoice)
    const savedDebug = await get(DEBUG_MODE_KEY)
    if (savedDebug != null) debugMode.value = Boolean(savedDebug)
    const savedReplyTimeout = await get(REPLY_TIMEOUT_KEY)
    if (savedReplyTimeout != null) replyTimeout.value = Number(savedReplyTimeout)
  }

  function setCharacterSize(val) {
    characterSize.value = val
    set(CHAR_SIZE_KEY, val)
  }

  function setTextBoxHeight(val) {
    textBoxHeight.value = val
    set(TEXTBOX_KEY, val)
  }

  function setVoiceEnabled(val) {
    const v = Boolean(val)
    voiceEnabled.value = v
    set(VOICE_ENABLED_KEY, v)
  }

  function setDebugMode(val) {
    const v = Boolean(val)
    debugMode.value = v
    set(DEBUG_MODE_KEY, v)
  }

  function setReplyTimeout(val) {
    const v = Math.max(0, Math.round(Number(val) || 0))
    replyTimeout.value = v
    set(REPLY_TIMEOUT_KEY, v)
  }

  function resetDefaults() {
    setCharacterSize(DEFAULT_CHAR_SIZE)
    setTextBoxHeight(DEFAULT_TEXTBOX_HEIGHT)
    setVoiceEnabled(DEFAULT_VOICE_ENABLED)
    setDebugMode(DEFAULT_DEBUG_MODE)
    setReplyTimeout(DEFAULT_REPLY_TIMEOUT)
  }

  return {
    characterSize: readonly(characterSize),
    textBoxHeight: readonly(textBoxHeight),
    voiceEnabled: readonly(voiceEnabled),
    debugMode: readonly(debugMode),
    replyTimeout: readonly(replyTimeout),
    setCharacterSize,
    setTextBoxHeight,
    setVoiceEnabled,
    setDebugMode,
    setReplyTimeout,
    resetDefaults,
    load
  }
}
