/**
 * 顺序播放队列 + CosyVoice 流式 session 的胶水。
 *
 * 把每段 sentence wav 推进队列，按到达顺序播完一段再播下一段。提供 abort()
 * 用于打断当前回复。
 */
import { ref, readonly } from 'vue'

export function useTtsStream({ playAudio } = {}) {
  if (typeof playAudio !== 'function') {
    throw new Error('useTtsStream requires playAudio')
  }

  const isSpeaking = ref(false)
  const queueLength = ref(0)

  let queue = []
  let playing = false
  let session = null
  let abortToken = 0          // bumped on abort to drop in-flight playback

  async function pump(token) {
    if (playing) return
    playing = true
    isSpeaking.value = true
    try {
      while (queue.length) {
        if (token !== abortToken) break
        const item = queue.shift()
        queueLength.value = queue.length
        try {
          await playAudio(item.buffer)
        } catch (e) {
          // swallow per-segment errors; keep queue moving
          console.warn('[useTtsStream] playAudio error:', e)
        }
      }
    } finally {
      playing = false
      isSpeaking.value = queue.length > 0 || (session && !session._ended)
    }
  }

  /**
   * 用一个 provider.createStream 建立 session 并把音频段串到队列。
   * provider 必须是已经传入正确 spk/wsUrl 的 cosyvoiceSpeechProvider。
   * 调用方可继续 appendText / end / abort。
   */
  function start(provider, { onSentence, onError, onEnd } = {}) {
    abortAndClear()
    const token = ++abortToken
    let endResolve
    const endPromise = new Promise((r) => { endResolve = r })

    session = provider.createStream({
      onAudio: ({ buffer, sentence, emotion, index }) => {
        if (token !== abortToken) return
        queue.push({ buffer, sentence, emotion, index })
        queueLength.value = queue.length
        pump(token)
      },
      onSentence,
      onError: (err) => { if (onError) onError(err) },
      onEnd: () => {
        if (session) session._ended = true
        if (onEnd) onEnd()
        endResolve()
      },
      onAborted: () => {
        if (session) session._ended = true
        endResolve()
      }
    })
    if (session) {
      session._ended = false
      session._endPromise = endPromise
    }
    return session
  }

  function appendText(text) {
    if (!session) return
    session.appendText(text)
  }

  /** 通知 server 输入结束，但播放队列继续清空。返回完整结束（音频也播完）的 promise。 */
  async function end() {
    if (!session) return
    const sess = session
    sess.end()
    await sess._endPromise
    while (playing || queue.length) {
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  /** 立即打断：停止接受新段，丢掉队列里没播的段。当前正在播的一段会播完。 */
  function abortAndClear() {
    abortToken++
    queue = []
    queueLength.value = 0
    if (session) {
      try { session.abort() } catch {}
      session = null
    }
  }

  return {
    isSpeaking: readonly(isSpeaking),
    queueLength: readonly(queueLength),
    start,
    appendText,
    end,
    abort: abortAndClear
  }
}
