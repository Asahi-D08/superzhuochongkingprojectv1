# Voice Module Refactor Design

## Goal

Refactor the desktop pet voice path so AstrBot chat connectivity, recording/playback, and speech providers are separate concerns. Preserve the existing visual style and interaction flow while making local voice output work without a third-party speech API key.

## Current Problems

- `useAstrBotApi.js` mixes AstrBot chat/file APIs with MiMo STT/TTS calls.
- `useVoice.js` contains DashScope STT/TTS functions, but `App.vue` calls the MiMo functions on the AstrBot API composable instead.
- `testConnection()` calls `/api/v1/im/bots`, which requires the `im` API scope even when the app only needs `chat` for text chat.
- Voice availability is tied to a MiMo API key, so local text-to-speech cannot be exposed.

## Architecture

Keep the existing Electron/Vue shell and UI styling. Split voice into focused modules:

- `useAstrBotApi.js`: AstrBot Open API only. It owns credentials, WebSocket chat, file upload, session ID, and a chat-scope health check.
- `useAudioRecorder.js`: browser microphone capture, WAV encoding, cancellation, and audio playback.
- `services/speechProviders/`: provider adapters behind a small interface:
  - `browserSpeechProvider.js`: local TTS using `window.speechSynthesis`.
  - `mimoSpeechProvider.js`: MiMo STT/TTS using AstrBot-compatible payloads and `https://api.xiaomimimo.com/v1/chat/completions`.
  - `speechProviderFactory.js`: selects provider from saved settings.
- `useSpeech.js`: Vue orchestration state for selected speech provider.

## Data Flow

Text chat remains unchanged: input -> AstrBot WebSocket -> streaming text -> history.

Voice input:

1. UI starts recording through `useAudioRecorder`.
2. Stop returns a WAV blob.
3. If the selected provider supports STT, transcribe it and send the text to AstrBot.
4. If no STT provider is configured, show a clear message instead of failing silently.

Voice output:

1. AstrBot returns bot text.
2. `useSpeech.speak(replyText)` uses the selected provider.
3. Browser speech plays locally by default. MiMo may return audio bytes for playback.
4. TTS failure is non-fatal and does not block returning to standby.

## UI Behavior

Keep existing layout and colors. Replace the login form's narrow "MiMo API Key" wording with a general voice section:

- voice output defaults to browser local speech;
- optional MiMo API key enables cloud STT and MiMo TTS;
- microphone button appears only when STT is available.

## Error Handling

AstrBot connection checks should validate `chat` scope, not `im`. Upload errors remain scoped to file upload. Speech provider errors should set user-readable Chinese messages and never disconnect chat.

## Testing

Add Vitest for pure modules. Cover:

- AstrBot health check uses `GET /api/v1/chat/sessions` with `username`;
- MiMo API URL normalization and STT/TTS payloads;
- speech provider factory defaults to browser local TTS and exposes STT only when configured;
- WAV encoder rejects empty recording input or returns valid WAV headers.
