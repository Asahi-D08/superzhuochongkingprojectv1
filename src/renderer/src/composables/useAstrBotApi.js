import { ref, readonly } from 'vue'

export function useAstrBotApi() {
  const serverUrl = ref('')
  const apiKey = ref('')
  const connected = ref(false)
  const username = ref('desktop-pet-user')
  const sessionId = ref('')
  const error = ref('')

  let ws = null
  let reconnectTimer = null
  let reconnectAttempts = 0
  let intentionalClose = false
  const MAX_RECONNECT_ATTEMPTS = 5

  function setCredentials(url, key) {
    serverUrl.value = String(url || '').trim().replace(/\/+$/, '')
    apiKey.value = String(key || '').trim()
  }

  /** 登录时设定发往 AstrBot 的 session_id（如 QQ 号），不再被 WS 下发的 session 覆盖 */
  function setSessionId(id) {
    sessionId.value = (id ?? '').trim()
  }

  async function testConnection() {
    error.value = ''
    try {
      const query = new URLSearchParams({
        page: '1',
        page_size: '1',
        username: username.value
      })
      const res = await fetch(`${serverUrl.value}/api/v1/chat/sessions?${query.toString()}`, {
        headers: { 'X-API-Key': apiKey.value }
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(formatConnectionError(res.status, res.statusText, body))
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

  function formatConnectionError(status, statusText, body) {
    const message = extractResponseMessage(body)
    if (status === 401) {
      if (message === 'Invalid API key') {
        return 'API Key 无效，请检查是否复制完整、没有多余空格，并确认以 abk_ 开头'
      }
      if (message === 'Missing API key') {
        return '未发送 API Key，请重新填写并确认不是空值'
      }
      return `认证失败 (${status})：${message || statusText || '请检查 API Key'}`
    }
    if (status === 403) {
      return `API Key 权限不足：${message || '请确认包含 chat/file 权限'}`
    }
    return `HTTP ${status}: ${message || statusText || '连接失败'}`
  }

  function extractResponseMessage(body) {
    if (!body) return ''
    try {
      const data = JSON.parse(body)
      return data?.message || body
    } catch {
      return body
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

        // session_id 由用户在登录页填写，不使用服务端消息覆盖

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
      session_id: sessionId.value ? sessionId.value : undefined,
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

  return {
    serverUrl: readonly(serverUrl),
    apiKey: readonly(apiKey),
    connected: readonly(connected),
    sessionId: readonly(sessionId),
    error: readonly(error),
    username,
    setCredentials,
    setSessionId,
    testConnection,
    connectWebSocket,
    sendMessage,
    disconnect,
    uploadFile
  }
}
