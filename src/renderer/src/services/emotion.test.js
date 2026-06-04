import { describe, it, expect } from 'vitest'
import {
  extractQuotedText,
  formatBotDisplayText,
  stripEmotionTags
} from './emotion.js'

describe('extractQuotedText', () => {
  it('returns full text when there are no double quotes', () => {
    expect(extractQuotedText('发送失败：WebSocket 未连接')).toBe('发送失败：WebSocket 未连接')
  })

  it('extracts dialogue inside double quotes', () => {
    expect(extractQuotedText('内心独白"你好呀！"')).toBe('你好呀！')
  })

  it('supports streaming partial quoted content', () => {
    expect(extractQuotedText('"你好')).toBe('你好')
  })

  it('concatenates multiple quoted segments', () => {
    expect(extractQuotedText('"第一句""第二句"')).toBe('第一句第二句')
  })

  it('handles escaped quotes inside dialogue', () => {
    expect(extractQuotedText('"他说\\"你好\\""')).toBe('他说"你好"')
  })
})

describe('formatBotDisplayText', () => {
  it('strips emotion tags and keeps only quoted dialogue', () => {
    expect(formatBotDisplayText('<开心>分析中..."今天天气真好！"')).toBe('今天天气真好！')
  })

  it('returns stripped text when bot reply has no quotes', () => {
    expect(formatBotDisplayText('<开心>直接回复')).toBe('直接回复')
  })

  it('returns raw text in debug mode', () => {
    const raw = '<开心>ナレーション"你好"'
    expect(formatBotDisplayText(raw, { debug: true })).toBe(raw)
  })
})

describe('stripEmotionTags', () => {
  it('removes trailing partial tags during streaming', () => {
    expect(stripEmotionTags('<开')).toBe('')
  })
})
