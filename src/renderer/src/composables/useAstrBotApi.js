import { ref, readonly } from 'vue'

export function useAstrBotApi() {
  const serverUrl = ref('')
  const apiKey = ref('')
  const connected = ref(false)
  const username = ref('desktop-pet-user')
  const sessionId = ref('')
  const error = ref('')

  let ws = null
  let liveWs = null
  let reconnectTimer = null
  let reconnectAttempts = 0
  let intentionalClose = false
  const MAX_RECONNECT_ATTEMPTS = 5

  function setCredentials(url, key) {
    serverUrl.value = url.replace(/\/+$/, '')
    apiKey.value = key
  }

  async function testConnection() {
    error.value = ''
    try {
      const res = await fetch(`${serverUrl.value}/api/v1/im/bots`, {
        headers: { 'X-API-Key': apiKey.value }
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()
      if (data.status === 'ok') {
        connected.value = true
        return true
      }
      throw new Error(data.message || 'Unknown error')
    } catch (e) {
      error.value = e.message || '连接失败'
      connected.value = false
      return false
    }
  }

  function connectWebSocket(onMessage, onEnd) {
    intentionalClose = false
    if (ws) {
      intentionalClose = true
      ws.close()
      intentionalClose = false
    }

    const wsProtocol = serverUrl.value.startsWith('https') ? 'wss' : 'ws'
    const wsHost = serverUrl.value.replace(/^https?:\/\//, '')
    const wsUrl = `${wsProtocol}://${wsHost}/api/v1/chat/ws?api_key=${encodeURIComponent(apiKey.value)}`

    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      reconnectAttempts = 0
      connected.value = true
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'error') {
          error.value = data.data || 'WebSocket error'
          return
        }

        if (data.type === 'session_id' && data.session_id) {
          sessionId.value = data.session_id
        }

        if (data.type === 'end' || (data.type === 'complete' && !data.streaming)) {
          onEnd?.(data)
          return
        }

        onMessage?.(data)
      } catch (e) {
        console.error('Failed to parse WS message:', e)
      }
    }

    ws.onclose = () => {
      connected.value = false
      if (!intentionalClose) {
        scheduleReconnect(onMessage, onEnd)
      }
    }

    ws.onerror = () => {
      error.value = 'WebSocket 连接错误'
    }
  }

  function scheduleReconnect(onMessage, onEnd) {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
    reconnectAttempts++
    reconnectTimer = setTimeout(() => {
      connectWebSocket(onMessage, onEnd)
    }, delay)
  }

  function sendMessage(message) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      error.value = 'WebSocket 未连接'
      return false
    }

    const payload = {
      t: 'send',
      message,
      username: username.value,
      session_id: sessionId.value || undefined,
      enable_streaming: true
    }

    ws.send(JSON.stringify(payload))
    return true
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    intentionalClose = true
    if (ws) {
      ws.close()
      ws = null
    }
    connected.value = false
  }

  /**
   * 上传一个 Blob/File 到 AstrBot Open API，返回 attachment_id。
   * 上传成功后，可在 sendMessage 里用 { type: 'image', attachment_id } 引用。
   *
   * @param {Blob | File} blob 要上传的文件（粘贴得到的图片是 File）
   * @param {string} [filename] 可选文件名；Blob 没有 name 时用来兜底
   * @returns {Promise<{ attachment_id: string, filename: string, type: string }>}
   */
  async function uploadFile(blob, filename) {
    if (!serverUrl.value || !apiKey.value) {
      throw new Error('未配置服务器地址或 API Key')
    }

    const formData = new FormData()
    // 后端读取 post_data["file"]（open_api.py → chat.py post_file），字段名必须是 "file"
    formData.append('file', blob, filename || blob.name || 'upload.bin')

    const res = await fetch(`${serverUrl.value}/api/v1/file`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey.value },
      body: formData
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`上传失败 (${res.status}): ${body}`)
    }

    const data = await res.json()
    if (data.status !== 'ok' || !data.data?.attachment_id) {
      throw new Error(data.message || '上传返回异常')
    }
    return data.data
  }

  async function speechToText(audioBlob, mimoApiKey) {
    error.value = ''
    if (!mimoApiKey) {
      error.value = '未配置小米 API Key'
      throw new Error(error.value)
    }

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.wav')
      formData.append('model', 'whisper-1')

      const res = await fetch('https://api.xiaoai.mi.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${mimoApiKey}` },
        body: formData
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`STT 失败 (${res.status}): ${body}`)
      }

      const data = await res.json()
      return (data.text || '').trim()
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function textToSpeech(text, mimoApiKey) {
    error.value = ''
    if (!mimoApiKey) {
      error.value = '未配置小米 API Key'
      throw new Error(error.value)
    }

    try {
      const res = await fetch('https://api.xiaoai.mi.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mimoApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'alloy'
        })
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`TTS 失败 (${res.status}): ${body}`)
      }

      return await res.arrayBuffer()
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  return {
    serverUrl: readonly(serverUrl),
    apiKey: readonly(apiKey),
    connected: readonly(connected),
    sessionId: readonly(sessionId),
    error: readonly(error),
    username,
    setCredentials,
    testConnection,
    connectWebSocket,
    sendMessage,
    disconnect,
    uploadFile,
    speechToText,
    textToSpeech
  }
}
