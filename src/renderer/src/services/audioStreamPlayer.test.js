import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioStreamPlayer, __internal } from './audioStreamPlayer.js'

/**
 * Minimal stub of WebAudio used in these tests.
 *
 * - `decodeAudioData` resolves asynchronously, but we can control the order
 *   via a registered resolver list so we can simulate out-of-order decoding.
 * - `createBufferSource` returns an object that records `start`/`stop`/`onended`.
 *   Calling helper `__finish(source)` mimics the natural end of playback.
 */
function makeStubContext() {
  const decodeResolvers = []
  const sources = []
  const ctx = {
    state: 'running',
    destination: {},
    decodeAudioData(arrayBuffer) {
      return new Promise((resolve, reject) => {
        decodeResolvers.push({ arrayBuffer, resolve, reject })
      })
    },
    createBufferSource() {
      const src = {
        buffer: null,
        connected: null,
        started: false,
        stopped: false,
        onended: null,
        connect(dest) { this.connected = dest },
        disconnect() { this.connected = null },
        start() { this.started = true },
        stop() { this.stopped = true }
      }
      sources.push(src)
      return src
    },
    async close() { ctx.state = 'closed' }
  }
  return { ctx, decodeResolvers, sources }
}

/** Synthetic 4-byte audio buffer marker (decoded result is irrelevant) */
function fakeAudioBuffer(label) {
  return { duration: 0.1, length: 100, sampleRate: 24000, __label: label }
}

const BASE64_HELLO = btoa('hello-wav-bytes')

describe('base64ToArrayBuffer', () => {
  it('round-trips ascii through base64', () => {
    const buf = __internal.base64ToArrayBuffer(btoa('abc'))
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([97, 98, 99]))
  })
})

describe('AudioStreamPlayer', () => {
  let stub, speakingStates, errors, player

  beforeEach(() => {
    stub = makeStubContext()
    speakingStates = []
    errors = []
    player = new AudioStreamPlayer({
      audioContext: stub.ctx,
      onSpeakingChange: (s) => speakingStates.push(s),
      onError: (e, c) => errors.push({ msg: e.message, ctx: c })
    })
  })

  it('plays queued chunks in enqueue order even when decode finishes out-of-order', async () => {
    const p1 = player.enqueueBase64Wav(BASE64_HELLO)
    const p2 = player.enqueueBase64Wav(BASE64_HELLO)
    const p3 = player.enqueueBase64Wav(BASE64_HELLO)
    await Promise.resolve()
    expect(speakingStates).toEqual([true])
    expect(stub.decodeResolvers.length).toBe(3)

    // Resolve out of order: second decode first, then first, then third.
    stub.decodeResolvers[1].resolve(fakeAudioBuffer('B'))
    await Promise.resolve()
    // Head is still waiting → nothing should be playing yet.
    expect(stub.sources.length).toBe(0)

    stub.decodeResolvers[0].resolve(fakeAudioBuffer('A'))
    await Promise.resolve(); await Promise.resolve()
    // First buffer started.
    expect(stub.sources.length).toBe(1)
    expect(stub.sources[0].buffer.__label).toBe('A')
    expect(stub.sources[0].started).toBe(true)

    // Finish A → B should auto-start.
    stub.sources[0].onended()
    expect(stub.sources.length).toBe(2)
    expect(stub.sources[1].buffer.__label).toBe('B')

    // Finish B → still waiting on C decode.
    stub.sources[1].onended()
    expect(stub.sources.length).toBe(2)

    stub.decodeResolvers[2].resolve(fakeAudioBuffer('C'))
    await Promise.resolve(); await Promise.resolve()
    expect(stub.sources.length).toBe(3)
    stub.sources[2].onended()

    await Promise.all([p1, p2, p3])
    // After the last chunk finishes we should drop back to speaking=false.
    expect(speakingStates.at(-1)).toBe(false)
  })

  it('abort stops current playback, discards in-flight decodes, and flips speaking=false', async () => {
    const p1 = player.enqueueBase64Wav(BASE64_HELLO)
    const p2 = player.enqueueBase64Wav(BASE64_HELLO)
    await Promise.resolve()
    stub.decodeResolvers[0].resolve(fakeAudioBuffer('A'))
    await Promise.resolve(); await Promise.resolve()
    expect(stub.sources[0].started).toBe(true)

    player.abort()
    expect(stub.sources[0].stopped).toBe(true)
    expect(speakingStates.at(-1)).toBe(false)

    // Resolve the second decode AFTER abort — should be silently discarded.
    stub.decodeResolvers[1].resolve(fakeAudioBuffer('B'))
    await Promise.all([p1, p2])
    // No new source should have started.
    expect(stub.sources.length).toBe(1)
  })

  it('decode failure is reported and skips that chunk; subsequent chunks still play', async () => {
    const p1 = player.enqueueBase64Wav(BASE64_HELLO)
    const p2 = player.enqueueBase64Wav(BASE64_HELLO)
    await Promise.resolve()

    stub.decodeResolvers[0].reject(new Error('decode boom'))
    await Promise.resolve(); await Promise.resolve()
    expect(errors.length).toBe(1)
    expect(errors[0].ctx).toBe('decode')

    stub.decodeResolvers[1].resolve(fakeAudioBuffer('B'))
    await Promise.resolve(); await Promise.resolve()
    expect(stub.sources.length).toBe(1)
    expect(stub.sources[0].buffer.__label).toBe('B')
    stub.sources[0].onended()
    await Promise.all([p1, p2])
    expect(speakingStates.at(-1)).toBe(false)
  })

  it('empty / null input is a no-op', async () => {
    await player.enqueueBase64Wav('')
    await player.enqueueBase64Wav(null)
    expect(speakingStates).toEqual([])
    expect(stub.decodeResolvers.length).toBe(0)
  })

  it('dispose closes the context only when not injected', async () => {
    const myStub = makeStubContext()
    const owning = new AudioStreamPlayer()
    // Inject context via _ensureContext fallback — simulate via direct assign
    owning._ctx = myStub.ctx
    owning._injectedContext = null
    await owning.dispose()
    expect(myStub.ctx.state).toBe('closed')

    // Injected context (our existing player) is NOT closed.
    await player.dispose()
    expect(stub.ctx.state).toBe('running')
  })
})
