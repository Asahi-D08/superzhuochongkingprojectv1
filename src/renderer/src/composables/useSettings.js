import { ref, readonly } from 'vue'
import { get, set } from 'idb-keyval'

const CHAR_SIZE_KEY = 'desktop-pet-character-size'
const TEXTBOX_KEY = 'desktop-pet-textbox-height'
const VOICE_ENABLED_KEY = 'desktop-pet-voice-enabled'

const DEFAULT_CHAR_SIZE = 180
const DEFAULT_TEXTBOX_HEIGHT = 52
const DEFAULT_VOICE_ENABLED = false

const characterSize = ref(DEFAULT_CHAR_SIZE)
const textBoxHeight = ref(DEFAULT_TEXTBOX_HEIGHT)
const voiceEnabled = ref(DEFAULT_VOICE_ENABLED)

export function useSettings() {
  async function load() {
    const savedChar = await get(CHAR_SIZE_KEY)
    if (savedChar != null) characterSize.value = savedChar
    const savedText = await get(TEXTBOX_KEY)
    if (savedText != null) textBoxHeight.value = savedText
    const savedVoice = await get(VOICE_ENABLED_KEY)
    if (savedVoice != null) voiceEnabled.value = Boolean(savedVoice)
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

  function resetDefaults() {
    setCharacterSize(DEFAULT_CHAR_SIZE)
    setTextBoxHeight(DEFAULT_TEXTBOX_HEIGHT)
    setVoiceEnabled(DEFAULT_VOICE_ENABLED)
  }

  return {
    characterSize: readonly(characterSize),
    textBoxHeight: readonly(textBoxHeight),
    voiceEnabled: readonly(voiceEnabled),
    setCharacterSize,
    setTextBoxHeight,
    setVoiceEnabled,
    resetDefaults,
    load
  }
}
