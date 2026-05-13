import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAstrBotApi } from './useAstrBotApi.js'

describe('useAstrBotApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('checks connection with chat scope instead of im scope', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', data: { sessions: [] } })
    })
    vi.stubGlobal('fetch', fetchMock)
    const api = useAstrBotApi()
    api.setCredentials(' http://localhost:6185/ ', ' abk_test ')

    const ok = await api.testConnection()

    expect(ok).toBe(true)
    expect(api.connected.value).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:6185/api/v1/chat/sessions?page=1&page_size=1&username=desktop-pet-user',
      { headers: { 'X-API-Key': 'abk_test' } }
    )
  })

  it('sets readable error when connection check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify({ status: 'error', message: 'Invalid API key' })
    }))
    const api = useAstrBotApi()
    api.setCredentials('http://localhost:6185', 'abk_test')

    const ok = await api.testConnection()

    expect(ok).toBe(false)
    expect(api.connected.value).toBe(false)
    expect(api.error.value).toBe('API Key 无效，请检查是否复制完整、没有多余空格，并确认以 abk_ 开头')
  })

  it('sends the user-entered session id and does not replace it from websocket messages', () => {
    let socket
    const send = vi.fn()
    class FakeWebSocket {
      static OPEN = 1

      constructor() {
        this.readyState = FakeWebSocket.OPEN
        this.send = send
        socket = this
      }

      close() {}
    }
    vi.stubGlobal('WebSocket', FakeWebSocket)

    const api = useAstrBotApi()
    api.setCredentials('https://astrbot.losingfire.com', 'abk_user_entered')
    api.setSessionId('123456789')
    api.connectWebSocket()

    socket.onmessage({
      data: JSON.stringify({ type: 'session_id', session_id: 'server-generated' })
    })
    api.sendMessage('你好')

    expect(api.sessionId.value).toBe('123456789')
    expect(send).toHaveBeenCalledWith(JSON.stringify({
      t: 'send',
      message: '你好',
      username: 'desktop-pet-user',
      session_id: '123456789',
      enable_streaming: true
    }))
  })

  it('forwards extras (e.g. action_type:live) into the payload when provided', () => {
    const send = vi.fn()
    class FakeWebSocket {
      static OPEN = 1
      constructor() { this.readyState = FakeWebSocket.OPEN; this.send = send }
      close() {}
    }
    vi.stubGlobal('WebSocket', FakeWebSocket)

    const api = useAstrBotApi()
    api.setCredentials('https://astrbot.losingfire.com', 'abk_x')
    api.setSessionId('abc')
    api.connectWebSocket()

    api.sendMessage('こんにちは', { action_type: 'live' })

    expect(send).toHaveBeenCalledWith(JSON.stringify({
      t: 'send',
      message: 'こんにちは',
      username: 'desktop-pet-user',
      session_id: 'abc',
      enable_streaming: true,
      action_type: 'live'
    }))
  })

  it('ignores empty/null fields in extras (keeps payload clean)', () => {
    const send = vi.fn()
    class FakeWebSocket {
      static OPEN = 1
      constructor() { this.readyState = FakeWebSocket.OPEN; this.send = send }
      close() {}
    }
    vi.stubGlobal('WebSocket', FakeWebSocket)

    const api = useAstrBotApi()
    api.setCredentials('https://astrbot.losingfire.com', 'abk_x')
    api.setSessionId('abc')
    api.connectWebSocket()

    api.sendMessage('hi', { action_type: null, ignored: '', kept: 'yes' })

    expect(send).toHaveBeenCalledWith(JSON.stringify({
      t: 'send',
      message: 'hi',
      username: 'desktop-pet-user',
      session_id: 'abc',
      enable_streaming: true,
      kept: 'yes'
    }))
  })
})
