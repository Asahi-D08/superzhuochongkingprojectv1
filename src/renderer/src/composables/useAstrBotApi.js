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
    if (ws) {
      ws.close()
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
      scheduleReconnect(onMessage, onEnd)
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
    if (ws) {
      ws.close()
      ws = null
    }
    connected.value = false
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
    disconnect
  }
}
