import { createAstrBotSpeechProvider } from './astrbotSpeechProvider.js'
import { createBrowserSpeechProvider } from './browserSpeechProvider.js'
import { createMiMoSpeechProvider } from './mimoSpeechProvider.js'

export function createSpeechProvider(settings = {}) {
  const providerId = settings.provider || 'browser'

  if (providerId === 'mimo' && settings.apiKey) {
    return createMiMoSpeechProvider(settings)
  }

  if (providerId === 'astrbot' && settings.serverUrl && settings.apiKey) {
    return createAstrBotSpeechProvider(settings)
  }

  return createBrowserSpeechProvider()
}
