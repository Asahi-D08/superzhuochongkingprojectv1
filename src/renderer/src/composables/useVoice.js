import { ref, readonly } from 'vue'
import { encodeWav, mergeFloat32Chunks } from '../services/audio/wav.js'

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

    const wavBlob = encodeWav(mergeFloat32Chunks(recordedChunks), 16000)
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

  return {
    isRecording: readonly(isRecording),
    error: readonly(error),
    startRecording,
    stopRecording,
    cancelRecording,
    playAudio
  }
}
