// 解析 AI 文本中的情绪标签，例如 <开心>...</开心>、<伤心>。
//
// - parseLastEmotion: 取**最后一个**出现的情绪标签作为当前情绪（流式输出最新优先）
// - stripEmotionTags: 去掉所有情绪标签 + 末尾未闭合的半截标签（如流式中的 "<开"）
// - extractQuotedText: 只保留双引号内的对话正文（支持流式未闭合引号）
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

/**
 * 从 bot 回复里提取双引号内的展示文本。
 * - 含双引号时：只返回引号内内容（流式时可仅有开引号）
 * - 不含双引号时：原样返回（兼容错误提示等无引号输出）
 */
export function extractQuotedText(text) {
  if (!text) return ''
  if (!text.includes('"')) return text

  const segments = []
  let i = 0

  while (i < text.length) {
    const start = text.indexOf('"', i)
    if (start === -1) break

    let j = start + 1
    let content = ''

    while (j < text.length) {
      if (text[j] === '\\' && j + 1 < text.length) {
        content += text[j + 1]
        j += 2
        continue
      }
      if (text[j] === '"') {
        segments.push(content)
        i = j + 1
        break
      }
      content += text[j]
      j++
    }

    if (j >= text.length) {
      segments.push(content)
      break
    }
  }

  return segments.join('')
}

/** 供 UI / 聊天记录使用的最终展示文本 */
export function formatBotDisplayText(text, { debug = false } = {}) {
  if (debug) return text || ''
  return extractQuotedText(stripEmotionTags(text))
}
