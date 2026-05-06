import { describe, expect, it, vi } from 'vitest'
import {
  buildApiKeyHeaders,
  createAstrBotSpeechProvider,
  normalizeServerUrl
} from './astrbotSpeechProvider.js'

describe('AstrBot speech provider', () => {
  it('normalizes server URL and builds API key headers', () => {
    expect(normalizeServerUrl('http://localhost:6185///')).toBe('http://localhost:6185')
    expect(buildApiKeyHeaders('abk_test')).toEqual({ 'X-API-Key': 'abk_test' })
  })

  it('posts uploaded audio to AstrBot transcription endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ status: 'ok', data: { text: '你好' } })
    })
    const provider = createAstrBotSpeechProvider({
      serverUrl: 'http://localhost:6185/',
      apiKey: 'abk_test',
      fetch: fetchMock
    })

    const text = await provider.transcribe(new Blob(['fake'], { type: 'audio/wav' }))

    expect(text).toBe('你好')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:6185/api/v1/voice/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-API-Key': 'abk_test' },
        body: expect.any(FormData)
      })
    )
  })

  it('posts text to AstrBot speech endpoint and returns audio bytes', async () => {
    const audioBuffer = new ArrayBuffer(4)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => audioBuffer
    })
    const provider = createAstrBotSpeechProvider({
      serverUrl: 'http://localhost:6185',
      apiKey: 'abk_test',
      fetch: fetchMock
    })

    const result = await provider.synthesize('你好')

    expect(result).toBe(audioBuffer)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:6185/api/v1/voice/speech',
      {
        method: 'POST',
        headers: {
          'X-API-Key': 'abk_test',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: '你好' })
      }
    )
  })
})
