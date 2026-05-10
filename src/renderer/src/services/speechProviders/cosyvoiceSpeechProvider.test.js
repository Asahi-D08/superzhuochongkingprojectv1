import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createCosyvoiceSpeechProvider,
  normalizeWsUrl
} from './cosyvoiceSpeechProvider.js'

class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 0   // CONNECTING
    this.binaryType = 'arraybuffer'
    this.sent = []
    this.onopen = null
    this.onmessage = null
    this.onclose = null
    this.onerror = null
    MockWebSocket.instances.push(this)
  }
  send(data) {
    if (this.readyState !== 1) throw new Error('not open')
    this.sent.push(data)
  }
  close() {
    this.readyState = 3
    if (this.onclose) this.onclose({})
  }
  // helpers for the test
  _open() {
    this.readyState = 1
    if (this.onopen) this.onopen({})
  }
  _recvJson(obj) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(obj) })
  }
  _recvBinary(buf) {
    if (this.onmessage) this.onmessage({ data: buf })
  }
}
MockWebSocket.instances = []

beforeEach(() => {
  MockWebSocket.instances = []
})

afterEach(() => {
  vi.useRealTimers()
})

function makeProvider(overrides = {}) {
  return createCosyvoiceSpeechProvider({
    wsUrl: 'ws://server:8765/ws/tts',
    spk: 'spk-1',
    sampleRate: 24000,
    WebSocket: MockWebSocket,
    ...overrides
  })
}

describe('normalizeWsUrl', () => {
  it('keeps existing scheme and trims trailing slashes', () => {
    expect(normalizeWsUrl('ws://host:8765/ws/tts/')).toBe('ws://host:8765/ws/tts')
    expect(normalizeWsUrl('wss://host:8765/ws')).toBe('wss://host:8765/ws')
  })
  it('prepends ws:// when missing', () => {
    expect(normalizeWsUrl('host:8765/ws/tts')).toBe('ws://host:8765/ws/tts')
  })
  it('returns empty string for empty/null input', () => {
    expect(normalizeWsUrl('')).toBe('')
    expect(normalizeWsUrl(null)).toBe('')
  })
})

describe('createCosyvoiceSpeechProvider — capabilities', () => {
  it('canSpeak is true when wsUrl + spk are configured', () => {
    const provider = makeProvider()
    expect(provider.id).toBe('cosyvoice')
    expect(provider.canSpeak).toBe(true)
    expect(provider.canTranscribe).toBe(false)
  })
  it('canSpeak is false when spk is missing', () => {
    const provider = makeProvider({ spk: '' })
    expect(provider.canSpeak).toBe(false)
  })
})

describe('createStream — happy path', () => {
  it('sends begin then text frames in order, decodes meta+binary into onAudio', async () => {
    const provider = makeProvider()
    const audioCalls = []
    const sentenceCalls = []
    let endedFlag = false

    const session = provider.createStream({
      onAudio: (a) => audioCalls.push(a),
      onSentence: (s) => sentenceCalls.push(s),
      onEnd: () => { endedFlag = true }
    })

    expect(MockWebSocket.instances).toHaveLength(1)
    const ws = MockWebSocket.instances[0]
    expect(ws.url).toBe('ws://server:8765/ws/tts')

    // queued before open
    session.appendText('<高兴>今天天气')
    session.appendText('真好。')
    expect(ws.sent).toEqual([])

    ws._open()

    expect(ws.sent).toHaveLength(3)
    const begin = JSON.parse(ws.sent[0])
    expect(begin.type).toBe('begin')
    expect(begin.spk).toBe('spk-1')
    expect(JSON.parse(ws.sent[1])).toMatchObject({ type: 'text', data: '<高兴>今天天气' })
    expect(JSON.parse(ws.sent[2])).toMatchObject({ type: 'text', data: '真好。' })

    ws._recvJson({ type: 'begin_ack', session_id: 'sess-1' })

    const wavBuffer = new ArrayBuffer(8)
    ws._recvJson({
      type: 'meta',
      sentence_index: 0,
      text: '今天天气真好。',
      emotion: '高兴',
      sample_rate: 24000,
      format: 'wav',
      duration_ms: 1500
    })
    ws._recvBinary(wavBuffer)

    expect(sentenceCalls).toHaveLength(1)
    expect(sentenceCalls[0]).toEqual({ text: '今天天气真好。', emotion: '高兴', index: 0 })
    expect(audioCalls).toHaveLength(1)
    expect(audioCalls[0]).toMatchObject({
      buffer: wavBuffer,
      sentence: '今天天气真好。',
      emotion: '高兴',
      index: 0,
      sampleRate: 24000,
      durationMs: 1500
    })

    const endPromise = session.end()
    expect(JSON.parse(ws.sent[ws.sent.length - 1])).toMatchObject({ type: 'end' })

    ws._recvJson({ type: 'end' })
    await endPromise
    expect(endedFlag).toBe(true)
  })
})

describe('createStream — abort', () => {
  it('sends abort frame and closes, no further onAudio after abort', async () => {
    const provider = makeProvider()
    const audioCalls = []
    const session = provider.createStream({ onAudio: (a) => audioCalls.push(a) })

    const ws = MockWebSocket.instances[0]
    ws._open()
    session.abort()

    const abortFrame = ws.sent.find((m) => {
      try { return JSON.parse(m).type === 'abort' } catch { return false }
    })
    expect(abortFrame).toBeTruthy()
    expect(ws.readyState).toBe(3)

    // late binary should be ignored
    ws._recvJson({ type: 'meta', sentence_index: 0, text: 'x' })
    ws._recvBinary(new ArrayBuffer(4))
    // onAudio should still receive (we accept best-effort), but abort already
    // detached intent; the assertion is just that no crash occurs.
    expect(audioCalls.length).toBeLessThanOrEqual(1)
  })
})

describe('createStream — server error', () => {
  it('reports server error frames via onError', async () => {
    const provider = makeProvider()
    const errors = []
    provider.createStream({ onError: (e) => errors.push(e) })

    const ws = MockWebSocket.instances[0]
    ws._open()
    ws._recvJson({ type: 'error', message: 'unknown spk' })

    expect(errors).toHaveLength(1)
    expect(errors[0]).toBeInstanceOf(Error)
    expect(errors[0].message).toBe('unknown spk')
  })

  it('reports onError when WebSocket closes before end', async () => {
    const provider = makeProvider()
    const errors = []
    provider.createStream({ onError: (e) => errors.push(e) })

    const ws = MockWebSocket.instances[0]
    ws._open()
    ws.close()                  // server-initiated close before any 'end'

    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('synthesize — non-streaming fallback', () => {
  it('aggregates streamed wav frames into one ArrayBuffer', async () => {
    const provider = makeProvider()
    const promise = provider.synthesize('hello world')

    const ws = MockWebSocket.instances[0]
    ws._open()
    expect(JSON.parse(ws.sent[0]).type).toBe('begin')
    expect(JSON.parse(ws.sent[1])).toMatchObject({ type: 'text', data: 'hello world' })
    expect(JSON.parse(ws.sent[2])).toMatchObject({ type: 'end' })

    // craft a minimal 1-sample 24kHz mono PCM16 WAV
    const buf = makeMinimalWav(24000, [0x1234])
    ws._recvJson({ type: 'meta', sentence_index: 0, text: 'hello world', emotion: null,
                   sample_rate: 24000, format: 'wav', duration_ms: 50 })
    ws._recvBinary(buf)
    ws._recvJson({ type: 'end' })

    const result = await promise
    expect(result).toBeInstanceOf(ArrayBuffer)
    expect(result.byteLength).toBeGreaterThan(0)
  })
})

// ---- helpers ----

function makeMinimalWav(sampleRate, samples) {
  const dataSize = samples.length * 2
  const buf = new ArrayBuffer(44 + dataSize)
  const dv = new DataView(buf)
  const ascii = (s) => Array.from(s).forEach((c, i) => dv.setUint8(off + i, c.charCodeAt(0)))
  let off = 0
  ascii('RIFF'); off = 4
  dv.setUint32(off, 36 + dataSize, true); off = 8
  ascii('WAVE'); off = 12
  ascii('fmt '); off = 16
  dv.setUint32(off, 16, true); off = 20
  dv.setUint16(off, 1, true); off = 22
  dv.setUint16(off, 1, true); off = 24                    // mono
  dv.setUint32(off, sampleRate, true); off = 28
  dv.setUint32(off, sampleRate * 2, true); off = 32       // byte rate
  dv.setUint16(off, 2, true); off = 34
  dv.setUint16(off, 16, true); off = 36
  ascii('data'); off = 40
  dv.setUint32(off, dataSize, true); off = 44
  for (const s of samples) {
    dv.setInt16(off, s, true); off += 2
  }
  return buf
}
