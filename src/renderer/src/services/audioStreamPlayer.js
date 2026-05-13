/**
 * AudioStreamPlayer
 *
 * 接收 AstrBot 后端通过 WebSocket 推送的 `audio_chunk` 帧 —— 每个 chunk 是
 * 一段独立的 WAV 文件（base64 编码）。我们要做的事：
 *
 * 1. 把 base64 → ArrayBuffer
 * 2. `AudioContext.decodeAudioData` 解码成 AudioBuffer（异步）
 * 3. 维护一个顺序播放队列：上一段 `onended` 时启动下一段
 * 4. 维护 "isSpeaking" 观察接口，给 UI 显示"正在说话"指示器
 * 5. `abort()`：立即停止当前播放、清空队列、丢弃在途解码
 *
 * 这个类不依赖 Vue，方便测试。`isSpeaking` 变化通过回调暴露。
 */

function base64ToArrayBuffer(b64) {
  const binary = atob(b64)
  const len = binary.length
  const buf = new ArrayBuffer(len)
  const view = new Uint8Array(buf)
  for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i)
  return buf
}

export class AudioStreamPlayer {
  /**
   * @param {object} opts
   * @param {(speaking: boolean) => void} [opts.onSpeakingChange] - 状态回调
   * @param {(err: Error, ctx?: string) => void} [opts.onError]   - 错误回调
   * @param {AudioContext} [opts.audioContext]                    - 注入用（测试）
   */
  constructor({ onSpeakingChange, onError, audioContext } = {}) {
    this._injectedContext = audioContext || null
    this._ctx = audioContext || null
    this._onSpeakingChange = onSpeakingChange || (() => {})
    this._onError = onError || ((e) => console.warn('[audio] error:', e))
    /** chunk id 递增，用于 abort 隔离 */
    this._epoch = 0
    /** 待播 AudioBuffer 顺序队列 */
    this._queue = []
    this._currentSource = null
    this._playing = false
    this._speaking = false
  }

  /** 返回当前是否处于播放中（含队列里还有等待的）状态 */
  get isSpeaking() { return this._speaking }

  /** 懒创建 AudioContext —— 避免 Electron / Chromium 在用户首次手势前禁用 */
  _ensureContext() {
    if (this._ctx) return this._ctx
    const Ctor = (typeof globalThis !== 'undefined' &&
      (globalThis.AudioContext || globalThis.webkitAudioContext)) || null
    if (!Ctor) throw new Error('AudioContext is not available in this environment')
    this._ctx = new Ctor()
    return this._ctx
  }

  /**
   * 把一段 base64 编码的 wav chunk 入队。解码异步，但**入队顺序由调用顺序决定**：
   * 即使后到的 chunk 解码先完成，也会按 enqueue 顺序播放。
   * @param {string} base64Wav
   */
  async enqueueBase64Wav(base64Wav) {
    if (!base64Wav) return
    const epoch = this._epoch
    const slot = { buffer: null, ready: false }
    this._queue.push(slot)
    if (!this._speaking) {
      this._speaking = true
      this._onSpeakingChange(true)
    }

    try {
      const arrayBuffer = base64ToArrayBuffer(base64Wav)
      const ctx = this._ensureContext()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      if (epoch !== this._epoch) return
      slot.buffer = audioBuffer
      slot.ready = true
      this._pump()
    } catch (e) {
      slot.ready = true
      slot.failed = true
      this._onError(e, 'decode')
      this._pump()
    }
  }

  /** 试图启动下一段播放 —— 只在队头 ready 时启动 */
  _pump() {
    if (this._playing) return
    while (this._queue.length && this._queue[0].ready && (!this._queue[0].buffer || this._queue[0].failed)) {
      this._queue.shift()
    }
    if (!this._queue.length || !this._queue[0].ready) {
      if (!this._queue.length && this._speaking) {
        this._speaking = false
        this._onSpeakingChange(false)
      }
      return
    }
    const slot = this._queue.shift()
    const ctx = this._ensureContext()
    const source = ctx.createBufferSource()
    source.buffer = slot.buffer
    source.connect(ctx.destination)
    this._currentSource = source
    this._playing = true
    source.onended = () => {
      if (this._currentSource !== source) return
      this._currentSource = null
      this._playing = false
      this._pump()
    }
    try {
      source.start(0)
    } catch (e) {
      this._currentSource = null
      this._playing = false
      this._onError(e, 'start')
      this._pump()
    }
  }

  /**
   * 立即停止：增 epoch 让在途的 decodeAudioData 完成后被丢弃，
   * 清空队列，停掉当前 source，发出 speaking=false。
   */
  abort() {
    this._epoch++
    this._queue = []
    if (this._currentSource) {
      try { this._currentSource.onended = null } catch { /* noop */ }
      try { this._currentSource.stop(0) } catch { /* noop */ }
      try { this._currentSource.disconnect() } catch { /* noop */ }
      this._currentSource = null
    }
    this._playing = false
    if (this._speaking) {
      this._speaking = false
      this._onSpeakingChange(false)
    }
  }

  /** 释放 AudioContext（仅在退出页面/卸载时调用） */
  async dispose() {
    this.abort()
    if (this._ctx && !this._injectedContext) {
      try { await this._ctx.close() } catch { /* noop */ }
    }
    this._ctx = null
  }
}

export const __internal = { base64ToArrayBuffer }
