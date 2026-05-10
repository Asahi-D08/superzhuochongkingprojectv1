import { ref, readonly } from 'vue'
import { get, set } from 'idb-keyval'

const CHAR_SIZE_KEY = 'desktop-pet-character-size'
const TEXTBOX_KEY = 'desktop-pet-textbox-height'
const TTS_PROVIDER_KEY = 'desktop-pet-tts-provider'
const COSY_WS_URL_KEY = 'desktop-pet-cosyvoice-ws-url'
const COSY_SPK_KEY = 'desktop-pet-cosyvoice-spk'

const DEFAULT_CHAR_SIZE = 180
const DEFAULT_TEXTBOX_HEIGHT = 52
const DEFAULT_TTS_PROVIDER = 'auto'
const DEFAULT_COSY_WS_URL = ''
const DEFAULT_COSY_SPK = ''

const characterSize = ref(DEFAULT_CHAR_SIZE)
const textBoxHeight = ref(DEFAULT_TEXTBOX_HEIGHT)
const ttsProvider = ref(DEFAULT_TTS_PROVIDER)
const cosyWsUrl = ref(DEFAULT_COSY_WS_URL)
const cosySpk = ref(DEFAULT_COSY_SPK)

export function useSettings() {
  async function load() {
    const savedChar = await get(CHAR_SIZE_KEY)
    if (savedChar != null) characterSize.value = savedChar
    const savedText = await get(TEXTBOX_KEY)
    if (savedText != null) textBoxHeight.value = savedText
    const savedTts = await get(TTS_PROVIDER_KEY)
    if (savedTts != null) ttsProvider.value = savedTts
    const savedCosyUrl = await get(COSY_WS_URL_KEY)
    if (savedCosyUrl != null) cosyWsUrl.value = savedCosyUrl
    const savedCosySpk = await get(COSY_SPK_KEY)
    if (savedCosySpk != null) cosySpk.value = savedCosySpk
  }

  function setCharacterSize(val) {
    characterSize.value = val
    set(CHAR_SIZE_KEY, val)
  }

  function setTextBoxHeight(val) {
    textBoxHeight.value = val
    set(TEXTBOX_KEY, val)
  }

  function setTtsProvider(val) {
    ttsProvider.value = val || DEFAULT_TTS_PROVIDER
    set(TTS_PROVIDER_KEY, ttsProvider.value)
  }

  function setCosyWsUrl(val) {
    cosyWsUrl.value = (val || '').trim()
    set(COSY_WS_URL_KEY, cosyWsUrl.value)
  }

  function setCosySpk(val) {
    cosySpk.value = (val || '').trim()
    set(COSY_SPK_KEY, cosySpk.value)
  }

  function resetDefaults() {
    setCharacterSize(DEFAULT_CHAR_SIZE)
    setTextBoxHeight(DEFAULT_TEXTBOX_HEIGHT)
    setTtsProvider(DEFAULT_TTS_PROVIDER)
    setCosyWsUrl(DEFAULT_COSY_WS_URL)
    setCosySpk(DEFAULT_COSY_SPK)
  }

  return {
    characterSize: readonly(characterSize),
    textBoxHeight: readonly(textBoxHeight),
    ttsProvider: readonly(ttsProvider),
    cosyWsUrl: readonly(cosyWsUrl),
    cosySpk: readonly(cosySpk),
    setCharacterSize,
    setTextBoxHeight,
    setTtsProvider,
    setCosyWsUrl,
    setCosySpk,
    resetDefaults,
    load
  }
}
