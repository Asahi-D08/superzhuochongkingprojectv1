import { describe, expect, it } from 'vitest'
import { createSpeechProvider } from './speechProviderFactory.js'

describe('createSpeechProvider', () => {
  it('uses browser local TTS by default without STT', () => {
    const provider = createSpeechProvider()

    expect(provider.id).toBe('browser')
    expect(provider.label).toBe('浏览器本地语音')
    expect(provider.canSpeak).toBe(true)
    expect(provider.canTranscribe).toBe(false)
  })

  it('uses AstrBot voice when server credentials are present', () => {
    const provider = createSpeechProvider({
      provider: 'astrbot',
      serverUrl: 'http://localhost:6185/',
      apiKey: 'abk_test'
    })

    expect(provider.id).toBe('astrbot')
    expect(provider.label).toBe('AstrBot 语音')
    expect(provider.canSpeak).toBe(true)
    expect(provider.canTranscribe).toBe(true)
  })
})
