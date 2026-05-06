# Voice Module Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split voice responsibilities from AstrBot chat, fix chat-scope connection validation, and enable local browser TTS by default.

**Architecture:** Keep the existing UI shell. Add testable speech provider and audio utility modules, then rewire Vue composables to use them. AstrBot API code remains responsible only for AstrBot Open API chat and file operations.

**Tech Stack:** Electron, Vue 3 Composition API, Vite, Vitest, browser Web Audio, browser SpeechSynthesis.

---

### Task 1: Test Harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.mjs`
- Create: `src/renderer/src/services/speechProviders/speechProviderFactory.test.js`

- [ ] Add `vitest` as a dev dependency and an `npm test` script.
- [ ] Configure Vitest with jsdom.
- [ ] Write an initial failing test that imports `createSpeechProvider()` and expects the default provider to support TTS but not STT.
- [ ] Run `npm test -- --run` and verify it fails because the module is missing.

### Task 2: Speech Provider Modules

**Files:**
- Create: `src/renderer/src/services/speechProviders/browserSpeechProvider.js`
- Create: `src/renderer/src/services/speechProviders/mimoSpeechProvider.js`
- Create: `src/renderer/src/services/speechProviders/speechProviderFactory.js`
- Test: `src/renderer/src/services/speechProviders/*.test.js`

- [ ] Implement `browserSpeechProvider` with `id`, `label`, `canSpeak: true`, `canTranscribe: false`, and `speak(text)`.
- [ ] Implement MiMo helpers: `buildMiMoApiUrl()`, `buildMiMoHeaders()`, `buildMiMoSttPayload()`, `buildMiMoTtsPayload()`, `extractMiMoTranscription()`, `extractMiMoAudioData()`.
- [ ] Implement `createSpeechProvider(settings)` so `browser` is the default and MiMo is selected only when an API key is present.
- [ ] Run tests and verify provider behavior.

### Task 3: Audio Utility Split

**Files:**
- Create: `src/renderer/src/services/audio/wav.js`
- Replace: `src/renderer/src/composables/useVoice.js` with focused recording/playback behavior.
- Test: `src/renderer/src/services/audio/wav.test.js`

- [ ] Move WAV merge/encode helpers into `services/audio/wav.js`.
- [ ] Test WAV headers for mono 16 kHz PCM.
- [ ] Keep `useVoice()` focused on `startRecording`, `stopRecording`, `cancelRecording`, and `playAudio`.
- [ ] Remove DashScope STT/TTS from `useVoice.js`.

### Task 4: AstrBot API Boundary

**Files:**
- Modify: `src/renderer/src/composables/useAstrBotApi.js`
- Test: `src/renderer/src/composables/useAstrBotApi.test.js`

- [ ] Change `testConnection()` to call `/api/v1/chat/sessions?page=1&page_size=1&username=desktop-pet-user`.
- [ ] Remove MiMo `speechToText()` and `textToSpeech()` from `useAstrBotApi.js`.
- [ ] Keep upload and WebSocket behavior intact.
- [ ] Test request URL, headers, and success/error handling.

### Task 5: Vue Wiring and UI Text

**Files:**
- Modify: `src/renderer/src/App.vue`
- Modify: `src/renderer/src/components/LoginForm.vue`
- Modify: `src/renderer/src/components/InteractionLayer.vue`

- [ ] Rename `mimoApiKey` state to `voiceApiKey` where it leaves the provider boundary.
- [ ] Use `createSpeechProvider()` or `useSpeech()` from `App.vue`.
- [ ] Show the microphone only when the provider can transcribe.
- [ ] Use browser local TTS for bot replies by default.
- [ ] Keep current styles and layout constraints.

### Task 6: Verification

**Files:**
- All touched files.

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Review `git diff` to ensure no unrelated user edits were reverted.
- [ ] Record any manual verification still required for microphone permissions and AstrBot credentials.
