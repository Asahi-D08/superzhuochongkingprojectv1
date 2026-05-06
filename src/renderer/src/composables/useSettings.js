import { ref, readonly } from 'vue'
import { get, set } from 'idb-keyval'

const CHAR_SIZE_KEY = 'desktop-pet-character-size'
const TEXTBOX_KEY = 'desktop-pet-textbox-height'

const DEFAULT_CHAR_SIZE = 180
const DEFAULT_TEXTBOX_HEIGHT = 52

const characterSize = ref(DEFAULT_CHAR_SIZE)
const textBoxHeight = ref(DEFAULT_TEXTBOX_HEIGHT)

export function useSettings() {
  async function load() {
    const savedChar = await get(CHAR_SIZE_KEY)
    if (savedChar != null) characterSize.value = savedChar
    const savedText = await get(TEXTBOX_KEY)
    if (savedText != null) textBoxHeight.value = savedText
  }

  function setCharacterSize(val) {
    characterSize.value = val
    set(CHAR_SIZE_KEY, val)
  }

  function setTextBoxHeight(val) {
    textBoxHeight.value = val
    set(TEXTBOX_KEY, val)
  }

  function resetDefaults() {
    setCharacterSize(DEFAULT_CHAR_SIZE)
    setTextBoxHeight(DEFAULT_TEXTBOX_HEIGHT)
  }

  return {
    characterSize: readonly(characterSize),
    textBoxHeight: readonly(textBoxHeight),
    setCharacterSize,
    setTextBoxHeight,
    resetDefaults,
    load
  }
}
