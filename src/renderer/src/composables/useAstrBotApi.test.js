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
})
