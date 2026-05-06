import { describe, expect, it } from 'vitest'
import { encodeWav, mergeFloat32Chunks } from './wav.js'

function readString(view, offset, length) {
  return Array.from({ length }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join('')
}

describe('wav audio helpers', () => {
  it('merges Float32 chunks in order', () => {
    const merged = mergeFloat32Chunks([
      new Float32Array([0.1, 0.2]),
      new Float32Array([0.3])
    ])

    expect(Array.from(merged)).toEqual([
      expect.closeTo(0.1),
      expect.closeTo(0.2),
      expect.closeTo(0.3)
    ])
  })

  it('encodes mono 16-bit PCM WAV at 16 kHz', async () => {
    const blob = encodeWav(new Float32Array([0, 1, -1]), 16000)
    const view = new DataView(await blob.arrayBuffer())

    expect(blob.type).toBe('audio/wav')
    expect(readString(view, 0, 4)).toBe('RIFF')
    expect(readString(view, 8, 4)).toBe('WAVE')
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(readString(view, 36, 4)).toBe('data')
    expect(view.getUint32(40, true)).toBe(6)
  })
})
