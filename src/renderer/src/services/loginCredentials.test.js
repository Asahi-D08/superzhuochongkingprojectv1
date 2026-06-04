import { describe, it, expect } from 'vitest'
import { getExpectedPassword, verifySessionPassword } from './loginCredentials.js'

describe('loginCredentials', () => {
  it('returns configured password for known QQ numbers', () => {
    expect(getExpectedPassword('3816250798')).toBe('828408')
    expect(getExpectedPassword('3596028040')).toBe('1300762304ok')
  })

  it('returns default password for other QQ numbers', () => {
    expect(getExpectedPassword('123456789')).toBe('111')
    expect(getExpectedPassword('')).toBe('111')
  })

  it('verifies password against expected value', () => {
    expect(verifySessionPassword('3816250798', '828408')).toBe(true)
    expect(verifySessionPassword('3816250798', '111')).toBe(false)
    expect(verifySessionPassword('999999999', '111')).toBe(true)
    expect(verifySessionPassword('999999999', '828408')).toBe(false)
  })
})
