const DEFAULT_API_BASE = 'https://api.xiaomimimo.com/v1'
const DEFAULT_STT_MODEL = 'mimo-v2-omni'
const DEFAULT_TTS_MODEL = 'mimo-v2-tts'
const DEFAULT_TTS_VOICE = 'mimo_default'
const DEFAULT_TTS_FORMAT = 'wav'
const DEFAULT_STT_SYSTEM_PROMPT = 'You are a speech transcription assistant. Transcribe the spoken content from the audio exactly and return only the transcription text.'
const DEFAULT_STT_USER_PROMPT = 'Please transcribe the content of the audio and return only the transcription text.'

export function buildMiMoApiUrl(apiBase = DEFAULT_API_BASE) {
  const normalized = String(apiBase || DEFAULT_API_BASE).replace(/\/+$/, '')
  if (normalized.endsWith('/chat/completions')) return normalized
  return `${normalized}/chat/completions`
}

export function buildMiMoHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  }
}

export function buildMiMoSttPayload(audioBase64, options = {}) {
  return {
    model: options.model || DEFAULT_STT_MODEL,
    messages: [
      {
        role: 'system',
        content: options.systemPrompt || DEFAULT_STT_SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: {
              data: audioBase64
            }
          },
          {
            type: 'text',
            text: options.userPrompt || DEFAULT_STT_USER_PROMPT
          }
        ]
      }
    ],
    max_completion_tokens: 1024
  }
}

export function buildMiMoTtsPayload(text, options = {}) {
  const messages = []
  const seedText = String(options.seedText || '').trim()
  if (seedText) {
    messages.push({ role: 'user', content: seedText })
  }

  messages.push({
    role: 'assistant',
    content: `${buildStylePrefix(options)}${text}`
  })

  return {
    model: options.model || DEFAULT_TTS_MODEL,
    messages,
    audio: {
      format: options.format || DEFAULT_TTS_FORMAT,
      voice: options.voice || DEFAULT_TTS_VOICE
    }
  }
}

export function extractMiMoTranscription(data) {
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('语音识别返回为空')
  }
  return content.trim()
}

export function extractMiMoAudioData(data) {
  const audioData = data?.choices?.[0]?.message?.audio?.data
  if (!audioData) {
    throw new Error('语音合成返回为空')
  }
  return audioData
}

export function createMiMoSpeechProvider(settings = {}) {
  const apiKey = settings.apiKey
  if (!apiKey) {
    throw new Error('未配置 MiMo API Key')
  }

  const fetchImpl = settings.fetch || globalThis.fetch

  return {
    id: 'mimo',
    label: 'MiMo 语音',
    canSpeak: true,
    canTranscribe: true,
    async transcribe(audioBlob) {
      const audioBase64 = await blobToBase64(audioBlob)
      const data = await postMiMoJson(fetchImpl, settings, buildMiMoSttPayload(audioBase64, settings.stt))
      return extractMiMoTranscription(data)
    },
    async synthesize(text) {
      const data = await postMiMoJson(fetchImpl, settings, buildMiMoTtsPayload(text, settings.tts))
      return base64ToArrayBuffer(extractMiMoAudioData(data))
    },
    async speak(text, { playAudio } = {}) {
      const audioBuffer = await this.synthesize(text)
      if (playAudio) {
        await playAudio(audioBuffer)
      }
      return audioBuffer
    }
  }
}

function buildStylePrefix(options) {
  const styleParts = []
  if (options.stylePrompt?.trim()) styleParts.push(options.stylePrompt.trim())
  if (options.dialect?.trim()) styleParts.push(options.dialect.trim())
  const styleContent = styleParts.join(' ').trim()
  if (!styleContent) return ''
  if (styleContent.includes('唱歌')) return '<style>唱歌</style>'
  return `<style>${styleContent}</style>`
}

async function postMiMoJson(fetchImpl, settings, payload) {
  if (!fetchImpl) throw new Error('当前环境不支持网络请求')
  const res = await fetchImpl(buildMiMoApiUrl(settings.apiBase), {
    method: 'POST',
    headers: buildMiMoHeaders(settings.apiKey),
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`MiMo 请求失败 (${res.status}): ${body}`)
  }
  return res.json()
}

function base64ToArrayBuffer(base64) {
  if (typeof atob === 'undefined' && typeof Buffer !== 'undefined') {
    const buffer = Buffer.from(base64, 'base64')
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',').pop() : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
