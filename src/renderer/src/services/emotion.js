// 解析 AI 文本中的情绪标签，例如 <开心>...</开心>、<伤心>。
//
// - parseLastEmotion: 取**最后一个**出现的情绪标签作为当前情绪（流式输出最新优先）
// - stripEmotionTags: 去掉所有情绪标签 + 末尾未闭合的半截标签（如流式中的 "<开"）
//
// 标签内容只匹配中文字符，避免误伤 HTML 标签如 <br>、<p>。

const EMOTION_TAG_RE = /<\/?([\u4e00-\u9fa5]+)>/g
const TRAILING_PARTIAL_TAG_RE = /<[^>]*$/

export function parseLastEmotion(text) {
  if (!text) return null
  let match
  let last = null
  EMOTION_TAG_RE.lastIndex = 0
  while ((match = EMOTION_TAG_RE.exec(text)) !== null) {
    if (!match[0].startsWith('</')) {
      last = match[1]
    }
  }
  return last
}

export function stripEmotionTags(text) {
  if (!text) return ''
  return text
    .replace(EMOTION_TAG_RE, '')
    .replace(TRAILING_PARTIAL_TAG_RE, '')
}
