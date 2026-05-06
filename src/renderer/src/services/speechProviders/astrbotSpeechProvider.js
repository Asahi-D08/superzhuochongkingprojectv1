export function createAstrBotSpeechProvider(settings = {}) {
  const serverUrl = normalizeServerUrl(settings.serverUrl)
  const apiKey = settings.apiKey
  const fetchImpl = settings.fetch || globalThis.fetch

  return {
    id: 'astrbot',
    label: 'AstrBot 语音',
    canSpeak: Boolean(serverUrl && apiKey),
    canTranscribe: Boolean(serverUrl && apiKey),
    async transcribe(audioBlob) {
      if (!fetchImpl) throw new Error('当前环境不支持网络请求')
      const formData = new FormData()
      formData.append('file', audioBlob, 'voice.wav')
      const data = await requestAstrBot(fetchImpl, `${serverUrl}/api/v1/voice/transcriptions`, {
        method: 'POST',
        headers: buildApiKeyHeaders(apiKey),
        body: formData
      })
      const text = data?.data?.text
      if (typeof text !== 'string' || !text.trim()) {
        throw new Error('语音识别返回为空')
      }
      return text.trim()
    },
    async synthesize(text) {
      if (!fetchImpl) throw new Error('当前环境不支持网络请求')
      const content = String(text || '').trim()
      if (!content) return new ArrayBuffer(0)
      const res = await fetchImpl(`${serverUrl}/api/v1/voice/speech`, {
        method: 'POST',
        headers: {
          ...buildApiKeyHeaders(apiKey),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: content })
      })
      if (!res.ok) {
        const body = await readResponseText(res)
        throw new Error(`AstrBot 语音输出失败 (${res.status}): ${extractErrorMessage(body)}`)
      }
      return res.arrayBuffer()
    },
    async speak(text, { playAudio } = {}) {
      const audioBuffer = await this.synthesize(text)
      if (playAudio && audioBuffer.byteLength > 0) {
        await playAudio(audioBuffer)
      }
      return audioBuffer
    }
  }
}

export function normalizeServerUrl(serverUrl) {
  return String(serverUrl || '').trim().replace(/\/+$/, '')
}

export function buildApiKeyHeaders(apiKey) {
  return { 'X-API-Key': apiKey }
}

async function requestAstrBot(fetchImpl, url, options) {
  const res = await fetchImpl(url, options)
  const body = await readResponseText(res)
  const data = parseJson(body)

  if (!res.ok) {
    throw new Error(`AstrBot 请求失败 (${res.status}): ${extractErrorMessage(body, data)}`)
  }
  if (data?.status !== 'ok') {
    throw new Error(data?.message || 'AstrBot 返回异常')
  }
  return data
}

async function readResponseText(res) {
  return typeof res.text === 'function' ? await res.text() : ''
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function extractErrorMessage(body, data = parseJson(body)) {
  return data?.message || body || '未知错误'
}
