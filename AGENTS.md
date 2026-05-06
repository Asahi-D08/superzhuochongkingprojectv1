# Repository Guidelines

## Project Structure & Module Organization

This is an Electron + Vue 3 desktop pet that connects to AstrBot through Open API.

- `src/main/index.js`: Electron main process, transparent frameless window, tray, and IPC handlers.
- `src/preload/index.js`: safe bridge exposing `window.electronAPI` to the renderer.
- `src/renderer/src/App.vue`: app shell that combines the active skin with the interaction layer.
- `src/renderer/src/components/`: UI components such as login, chat input, history, skin switching, and message output.
- `src/renderer/src/composables/`: reusable state and service logic for AstrBot API, voice, state machine, and history.
- `src/renderer/src/skins/`: pluggable skins. Each skin has its own folder, Vue component, assets, and `index.js`.
- `docs/plans/`: design and implementation notes.
- `out/`: generated build output. Do not edit by hand.

## Build, Test, and Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start Electron/Vite in development mode
npm test          # Run Vitest unit tests
npm run build     # Build main, preload, and renderer bundles into out/
npm run preview   # Preview the production build
```

Before submitting changes, run `npm test -- --run` and `npm run build`.

## Coding Style & Naming Conventions

Use Vue 3 Composition API and keep reusable stateful logic in composables. Use two-space indentation in Vue, JavaScript, JSON, and CSS. Prefer single quotes in JavaScript, matching the current codebase. Component files use PascalCase, such as `ChatInput.vue`; composables use `useXxx.js`; skin directories use kebab-case, such as `book-character`.

Keep UI text and user-facing errors in Chinese unless the surrounding feature is already English.

## Testing Guidelines

Vitest covers renderer-side unit tests under `src/renderer/src/**/*.test.js`. For complex logic, prefer small pure functions and test provider/API behavior directly. Manually verify affected flows in development mode: login, chat send, image upload, skin switching, window drag/resize, and voice controls when touched. Document checks in the pull request.

## Commit & Pull Request Guidelines

Recent history uses short imperative commits in English and Chinese, for example `added photo reading feature`, `adjusted layout`, and `修复判定范围过大的问题`. Keep commits focused; use `feat:` or `fix:` when helpful.

Pull requests should include a summary, changed areas, verification, and screenshots for UI changes. Mention AstrBot API scope or configuration changes explicitly.

## Security & Configuration Tips

Do not commit API keys, local AstrBot tokens, or generated `out/` artifacts. Store runtime credentials through the app UI or local storage only. Be careful when changing `webSecurity`, preload APIs, or file upload handling because those affect Electron security boundaries.
