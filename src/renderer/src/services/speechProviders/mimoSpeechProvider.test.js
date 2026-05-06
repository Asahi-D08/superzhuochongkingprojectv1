import { describe, expect, it } from 'vitest'
import {
  buildMiMoApiUrl,
  buildMiMoHeaders,
  buildMiMoSttPayload,
  buildMiMoTtsPayload,
  extractMiMoAudioData,
  extractMiMoTranscription
} from './mimoSpeechProvider.js'
import { createSpeechProvider } from './speechProviderFactory.js'

describe('MiMo speech provider helpers', () => {
  it('normalizes chat completions endpoint', () => {
    expect(buildMiMoApiUrl()).toBe('https://api.xiaomimimo.com/v1/chat/completions')
    expect(buildMiMoApiUrl('https://example.test/v1/')).toBe('https://example.test/v1/chat/completions')
    expect(buildMiMoApiUrl('https://example.test/v1/chat/completions')).toBe('https://example.test/v1/chat/completions')
  })

  it('builds authorization headers with one bearer token', () => {
    expect(buildMiMoHeaders('abc')).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc'
    })
  })

  it('builds STT payload with base64 audio and prompts', () => {
    const payload = buildMiMoSttPayload('audio-base64', {
      model: 'mimo-v2-omni',
      systemPrompt: 'system',
      userPrompt: 'transcribe'
    })

    expect(payload.model).toBe('mimo-v2-omni')
    expect(payload.messages[0]).toEqual({ role: 'system', content: 'system' })
    expect(payload.messages[1].content[0]).toEqual({
      type: 'input_audio',
      input_audio: { data: 'audio-base64' }
    })
    expect(payload.messages[1].content[1]).toEqual({
      type: 'text',
      text: 'transcribe'
    })
  })

  it('builds TTS payload with voice and assistant text', () => {
    const payload = buildMiMoTtsPayload('你好', {
      model: 'mimo-v2-tts',
      voice: 'mimo_default',
      format: 'wav',
      seedText: 'seed',
      stylePrompt: '开心',
      dialect: '四川话'
    })

    expect(payload.audio).toEqual({ format: 'wav', voice: 'mimo_default' })
    expect(payload.messages[0]).toEqual({ role: 'user', content: 'seed' })
    expect(payload.messages[1]).toEqual({
      role: 'assistant',
      content: '<style>开心 四川话</style>你好'
    })
  })

  it('extracts transcription and audio data from MiMo responses', () => {
    expect(extractMiMoTranscription({
      choices: [{ message: { content: '  hello  ' } }]
    })).toBe('hello')
    expect(extractMiMoAudioData({
      choices: [{ message: { audio: { data: 'ZmFrZQ==' } } }]
    })).toBe('ZmFrZQ==')
  })
})

describe('createSpeechProvider with MiMo', () => {
  it('selects MiMo only when an API key is present', () => {
    expect(createSpeechProvider({ provider: 'mimo' }).id).toBe('browser')

    const provider = createSpeechProvider({ provider: 'mimo', apiKey: 'abc' })

    expect(provider.id).toBe('mimo')
    expect(provider.label).toBe('MiMo 语音')
    expect(provider.canSpeak).toBe(true)
    expect(provider.canTranscribe).toBe(true)
  })
})
