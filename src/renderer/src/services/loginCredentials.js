/** QQ 号（Session ID）→ 登录密码；未列出的 QQ 号使用默认密码 */
const SESSION_PASSWORDS = {
  3816250798: '828408',
  3596028040: '1300762304ok'
}

const DEFAULT_PASSWORD = '111'

export function getExpectedPassword(sessionId) {
  const id = String(sessionId ?? '').trim()
  return SESSION_PASSWORDS[id] ?? DEFAULT_PASSWORD
}

export function verifySessionPassword(sessionId, password) {
  return String(password ?? '') === getExpectedPassword(sessionId)
}
