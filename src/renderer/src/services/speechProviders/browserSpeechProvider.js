export function createBrowserSpeechProvider({ speechSynthesis = globalThis.speechSynthesis } = {}) {
  return {
    id: 'browser',
    label: '浏览器本地语音',
    canSpeak: true,
    canTranscribe: false,
    async speak(text) {
      const content = String(text || '').trim()
      if (!content) return
      if (!speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
        throw new Error('当前环境不支持本地语音输出')
      }

      await new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(content)
        utterance.lang = 'zh-CN'
        utterance.onend = resolve
        utterance.onerror = () => reject(new Error('本地语音输出失败'))
        speechSynthesis.cancel()
        speechSynthesis.speak(utterance)
      })
    }
  }
}
