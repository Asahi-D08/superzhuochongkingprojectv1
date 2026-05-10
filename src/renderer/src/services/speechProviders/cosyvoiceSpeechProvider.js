/**
 * CosyVoice (本地局域网) 流式语音 provider。
 *
 * 协议见 docs/superpowers/specs/2026-05-10-cosyvoice-bridge-design.md。
 * 服务端：Linux + GPU + cosyvoice_tts_server.server。
 *
 * 用法：
 *   const provider = createCosyvoiceSpeechProvider({ wsUrl, spk })
 *   const session = provider.createStream({
 *     onAudio: ({ buffer, sentence, emotion }) => playQueue.push(buffer),
 *     onError: (err) => ...,
 *     onEnd:  () => ...,
 *   })
 *   session.appendText('<高兴>今天天气')
 *   session.appendText('真好。')
 *   await session.end()
 *
 * 也兼容旧的非流式接口 `synthesize(text)` / `speak(text, {playAudio})`。
 */

const PROTOCOL_FORMAT = 'wav'

export function normalizeWsUrl(input) {
  let url = String(input || '').trim()
  if (!url) return ''
  if (!/^wss?:\/\//i.test(url)) {
    url = 'ws://' + url
  }
  return url.replace(/\/+$/, '')
}

export function createCosyvoiceSpeechProvider(settings = {}) {
  const wsUrl = normalizeWsUrl(settings.wsUrl)
  const spk = String(settings.spk || '').trim()
  const wsCtor = settings.WebSocket || globalThis.WebSocket
  const sampleRate = Number(settings.sampleRate) || 24000

  return {
    id: 'cosyvoice',
    label: 'CosyVoice 本地',
    canSpeak: Boolean(wsUrl && spk && wsCtor),
    canTranscribe: false,

    /** 流式接口：返回 session 句柄。生命周期 = 一次回复。 */
    createStream({
      spk: spkOverride,
      onAudio,
      onSentence,
      onError,
      onEnd,
      onAborted
    } = {}) {
      const useSpk = String(spkOverride || spk).trim()
      if (!wsUrl || !useSpk) {
        const err = new Error('未配置 CosyVoice 服务地址或说话人')
        if (onError) setTimeout(() => onError(err), 0)
        return makeNoopSession(err)
      }
      return openSession({
        wsUrl,
        spk: useSpk,
        sampleRate,
        wsCtor,
        onAudio,
        onSentence,
        onError,
        onEnd,
        onAborted
      })
    },

    /** 旧的非流式 fallback：整段文本一次喂入，返回拼好的完整 wav。 */
    async synthesize(text) {
      const content = String(text || '').trim()
      if (!content) return new ArrayBuffer(0)
      return await new Promise((resolve, reject) => {
        const buffers = []
        const session = this.createStream({
          onAudio: ({ buffer }) => buffers.push(buffer),
          onError: (err) => reject(err),
          onEnd: () => resolve(concatWavBuffers(buffers))
        })
        session.appendText(content)
        session.end()
      })
    },

    async speak(text, { playAudio } = {}) {
      const buffer = await this.synthesize(text)
      if (playAudio && buffer.byteLength > 0) {
        await playAudio(buffer)
      }
      return buffer
    }
  }
}

// ---- internal ----

function makeNoopSession(err) {
  return {
    appendText() {},
    end() { return Promise.resolve() },
    abort() {},
    error: err
  }
}

function openSession({ wsUrl, spk, sampleRate, wsCtor,
                       onAudio, onSentence, onError, onEnd, onAborted }) {
  const ws = new wsCtor(wsUrl)
  if ('binaryType' in ws) ws.binaryType = 'arraybuffer'

  let pendingMeta = null
  let opened = false
  let ended = false
  let closedReason = null
  const pendingTexts = []          // queued before open
  let endRequested = false         // user already called end()
  const endPromise = makeDeferred()

  ws.onopen = () => {
    opened = true
    safeSendJson({
      type: 'begin',
      spk,
      format: PROTOCOL_FORMAT,
      sample_rate: sampleRate,
      client_id: 'pet-' + simpleId()
    })
    while (pendingTexts.length) {
      safeSendJson({ type: 'text', data: pendingTexts.shift() })
    }
    if (endRequested) safeSendJson({ type: 'end' })
  }

  ws.onmessage = (event) => {
    const data = event.data
    if (typeof data === 'string') {
      let msg
      try { msg = JSON.parse(data) } catch { return }
      handleControlMessage(msg)
    } else if (data instanceof ArrayBuffer) {
      handleAudioFrame(data)
    } else if (typeof Blob !== 'undefined' && data instanceof Blob) {
      data.arrayBuffer().then(handleAudioFrame).catch(reportError)
    }
  }

  ws.onclose = () => {
    if (!ended) {
      reportError(new Error(closedReason || 'WebSocket closed unexpectedly'))
    }
    finishOnce()
  }

  ws.onerror = () => {
    reportError(new Error('WebSocket connection error'))
  }

  function handleControlMessage(msg) {
    if (!msg || typeof msg.type !== 'string') return
    switch (msg.type) {
      case 'begin_ack':
        return
      case 'meta':
        pendingMeta = msg
        if (onSentence) {
          try { onSentence({ text: msg.text, emotion: msg.emotion, index: msg.sentence_index }) }
          catch (e) { reportError(e) }
        }
        return
      case 'end':
        ended = true
        closedReason = null
        if (onEnd) { try { onEnd() } catch (e) { reportError(e) } }
        endPromise.resolve()
        try { ws.close() } catch {}
        return
      case 'aborted':
        ended = true
        if (onAborted) { try { onAborted() } catch (e) { reportError(e) } }
        endPromise.resolve()
        try { ws.close() } catch {}
        return
      case 'error':
        reportError(new Error(msg.message || 'CosyVoice server error'))
        return
      case 'pong':
        return
      default:
        return
    }
  }

  function handleAudioFrame(arrayBuffer) {
    if (!pendingMeta) return     // unexpected binary, drop
    const meta = pendingMeta
    pendingMeta = null
    if (onAudio) {
      try {
        onAudio({
          buffer: arrayBuffer,
          sentence: meta.text || '',
          emotion: meta.emotion || null,
          index: meta.sentence_index ?? 0,
          format: meta.format || PROTOCOL_FORMAT,
          sampleRate: meta.sample_rate || sampleRate,
          durationMs: meta.duration_ms || 0
        })
      } catch (e) {
        reportError(e)
      }
    }
  }

  function safeSendJson(obj) {
    if (ws.readyState !== 1) return false
    try {
      ws.send(JSON.stringify(obj))
      return true
    } catch (e) {
      reportError(e)
      return false
    }
  }

  function reportError(err) {
    closedReason = err && err.message ? err.message : String(err)
    if (onError) {
      try { onError(err) } catch {}
    }
    finishOnce()
  }

  function finishOnce() {
    if (!endPromise.settled) endPromise.resolve()
  }

  return {
    appendText(chunk) {
      const text = String(chunk || '')
      if (!text) return
      if (opened) safeSendJson({ type: 'text', data: text })
      else pendingTexts.push(text)
    },
    end() {
      endRequested = true
      if (opened) safeSendJson({ type: 'end' })
      return endPromise.promise
    },
    abort() {
      ended = true
      if (opened && ws.readyState === 1) {
        safeSendJson({ type: 'abort' })
      }
      try { ws.close() } catch {}
      finishOnce()
    }
  }
}

function makeDeferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  const wrapped = { promise, settled: false }
  wrapped.resolve = (v) => { wrapped.settled = true; resolve(v) }
  wrapped.reject = (e) => { wrapped.settled = true; reject(e) }
  return wrapped
}

function simpleId() {
  return Math.random().toString(36).slice(2, 10)
}

/** 拼接多个 wav ArrayBuffer 为一个（按顺序串成同采样率单流）。MVP 仅串接 PCM 数据。 */
export function concatWavBuffers(buffers) {
  if (!buffers.length) return new ArrayBuffer(0)
  if (buffers.length === 1) return buffers[0]
  const parts = []
  let sampleRate = 0
  let channels = 1
  let bitsPerSample = 16
  for (const buf of buffers) {
    const dv = new DataView(buf)
    const fmtOffset = findChunk(dv, 'fmt ')
    const dataOffset = findChunk(dv, 'data')
    if (fmtOffset < 0 || dataOffset < 0) continue
    sampleRate = dv.getUint32(fmtOffset + 12, true)
    channels = dv.getUint16(fmtOffset + 10, true)
    bitsPerSample = dv.getUint16(fmtOffset + 22, true)
    const dataSize = dv.getUint32(dataOffset + 4, true)
    parts.push(new Uint8Array(buf, dataOffset + 8, dataSize))
  }
  const totalData = parts.reduce((acc, p) => acc + p.length, 0)
  const wav = new Uint8Array(44 + totalData)
  writeWavHeader(wav, totalData, sampleRate, channels, bitsPerSample)
  let off = 44
  for (const p of parts) { wav.set(p, off); off += p.length }
  return wav.buffer
}

function findChunk(dv, fourcc) {
  let off = 12
  const limit = dv.byteLength - 8
  while (off <= limit) {
    const id = String.fromCharCode(
      dv.getUint8(off), dv.getUint8(off + 1), dv.getUint8(off + 2), dv.getUint8(off + 3))
    const size = dv.getUint32(off + 4, true)
    if (id === fourcc) return off
    off += 8 + size
  }
  return -1
}

function writeWavHeader(out, dataSize, sampleRate, channels, bitsPerSample) {
  const dv = new DataView(out.buffer, out.byteOffset, 44)
  const byteRate = sampleRate * channels * bitsPerSample / 8
  const blockAlign = channels * bitsPerSample / 8
  const enc = (s) => Array.from(s).forEach((c, i) => dv.setUint8(i, c.charCodeAt(0)))
  enc('RIFF'); dv.setUint32(4, 36 + dataSize, true)
  for (let i = 0; i < 4; i++) dv.setUint8(8 + i, 'WAVE'.charCodeAt(i))
  for (let i = 0; i < 4; i++) dv.setUint8(12 + i, 'fmt '.charCodeAt(i))
  dv.setUint32(16, 16, true)
  dv.setUint16(20, 1, true)
  dv.setUint16(22, channels, true)
  dv.setUint32(24, sampleRate, true)
  dv.setUint32(28, byteRate, true)
  dv.setUint16(32, blockAlign, true)
  dv.setUint16(34, bitsPerSample, true)
  for (let i = 0; i < 4; i++) dv.setUint8(36 + i, 'data'.charCodeAt(i))
  dv.setUint32(40, dataSize, true)
}
