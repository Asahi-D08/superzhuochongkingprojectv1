import { ref, readonly } from 'vue'

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

export function useVoice() {
  const isRecording = ref(false)
  const error = ref('')

  let mediaStream = null
  let audioContext = null
  let scriptProcessor = null
  let recordedChunks = []

  // ---- 录音 ----

  async function startRecording() {
    error.value = ''
    recordedChunks = []

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true }
      })

      audioContext = new AudioContext({ sampleRate: 16000 })
      const source = audioContext.createMediaStreamSource(mediaStream)

      // ScriptProcessorNode 收集 PCM 数据
      scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1)
      scriptProcessor.onaudioprocess = (e) => {
        const pcm = e.inputBuffer.getChannelData(0)
        recordedChunks.push(new Float32Array(pcm))
      }

      source.connect(scriptProcessor)
      scriptProcessor.connect(audioContext.destination)
      isRecording.value = true
    } catch (e) {
      error.value = '无法访问麦克风: ' + e.message
      throw e
    }
  }

  async function stopRecording() {
    isRecording.value = false

    if (scriptProcessor) {
      scriptProcessor.disconnect()
      scriptProcessor = null
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop())
      mediaStream = null
    }

    // 合并 PCM 并转为 WAV Blob
    const wavBlob = encodeWav(mergeChunks(recordedChunks), 16000)
    recordedChunks = []

    if (audioContext) {
      await audioContext.close()
      audioContext = null
    }

    return wavBlob
  }

  function cancelRecording() {
    isRecording.value = false
    if (scriptProcessor) { scriptProcessor.disconnect(); scriptProcessor = null }
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null }
    if (audioContext) { audioContext.close(); audioContext = null }
    recordedChunks = []
  }

  // ---- STT: DashScope Paraformer (OpenAI 兼容) ----

  async function speechToText(wavBlob, apiKey) {
    error.value = ''
    if (!apiKey) {
      error.value = '未配置 DashScope Key'
      throw new Error(error.value)
    }

    const formData = new FormData()
    formData.append('file', wavBlob, 'recording.wav')
    formData.append('model', 'paraformer-realtime-v2')

    try {
      const res = await fetch(`${DASHSCOPE_BASE}/audio/transcriptions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`STT 失败 (${res.status}): ${body}`)
      }

      const data = await res.json()
      return (data.text || '').trim()
    } catch (e) {
      error.value = 'STT 错误: ' + e.message
      throw e
    }
  }

  // ---- TTS: DashScope CosyVoice (OpenAI 兼容) ----

  async function textToSpeech(text, apiKey) {
    error.value = ''
    if (!apiKey) {
      error.value = '未配置 DashScope Key'
      throw new Error(error.value)
    }

    try {
      const res = await fetch(`${DASHSCOPE_BASE}/audio/speech`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'cosyvoice-v1',
          input: text,
          voice: 'longxiaochun'
        })
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`TTS 失败 (${res.status}): ${body}`)
      }

      return await res.arrayBuffer()
    } catch (e) {
      error.value = 'TTS 错误: ' + e.message
      throw e
    }
  }

  // ---- 播放音频 ----

  async function playAudio(audioBuffer) {
    const ctx = new AudioContext()
    const decoded = await ctx.decodeAudioData(audioBuffer)
    const source = ctx.createBufferSource()
    source.buffer = decoded
    source.connect(ctx.destination)

    return new Promise((resolve) => {
      source.onended = () => {
        ctx.close()
        resolve()
      }
      source.start()
    })
  }

  // ---- 工具函数 ----

  function mergeChunks(chunks) {
    const length = chunks.reduce((sum, c) => sum + c.length, 0)
    const result = new Float32Array(length)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result
  }

  function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    // WAV header
    writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(view, 8, 'WAVE')
    writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM
    view.setUint16(22, 1, true) // mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(view, 36, 'data')
    view.setUint32(40, samples.length * 2, true)

    // PCM data
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }

  function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  return {
    isRecording: readonly(isRecording),
    error: readonly(error),
    startRecording,
    stopRecording,
    cancelRecording,
    speechToText,
    textToSpeech,
    playAudio
  }
}
