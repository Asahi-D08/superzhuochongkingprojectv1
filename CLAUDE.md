# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Desktop pet application ("chaojizhuocongdawang") built with Electron + Vue 3. A transparent, always-on-top, frameless window that renders an interactive character which chats via AstrBot's Open API over WebSocket. This is an open-source teaching project (GitHub: superzhuochongkingprojectv1).

## Commands

```bash
npm run dev      # Start in development mode (electron-vite dev)
npm run build    # Production build (electron-vite build)
npm run preview  # Preview production build
```

No test framework is configured.

## Architecture

### Electron Layers (electron-vite)

- **Main process** (`src/main/index.js`): Creates frameless transparent window, system tray, and IPC handlers for window dragging/resizing.
- **Preload** (`src/preload/index.js`): Exposes `window.electronAPI` with `windowDrag()` and `windowResize()` via context bridge.
- **Renderer** (`src/renderer/`): Vue 3 SPA.

### State Machine (3 states)

The app is driven by a finite state machine (`composables/useStateMachine.js`):

```
IDLE --LOGIN_SUCCESS--> STANDBY --SEND_MESSAGE--> SPEAKING --REPLY_COMPLETE--> STANDBY
```

- **IDLE**: Shows closed book. Right-click opens login form (AstrBot server URL + API key).
- **STANDBY**: Shows open book + character + chat input. User can send messages or view history.
- **SPEAKING**: Shows bot reply with typewriter effect. No user interaction until reply completes.

### Composables

- `useStateMachine.js` — State transitions with validation
- `useAstrBotApi.js` — AstrBot REST (login validation via `GET /api/v1/im/bots`) and WebSocket (`/api/v1/chat/ws`) with exponential backoff reconnect
- `useChatHistory.js` — Chat persistence in IndexedDB via `idb-keyval` (max 500 messages)

### AstrBot API Integration

- **Auth**: `X-API-Key` header for REST, `api_key` query param for WebSocket
- **WebSocket protocol**: Send `{ t: "send", message, username, session_id, enable_streaming: true }`, receive `{ type: "plain"|"end"|"complete"|"error"|"session_id", data, streaming }`

### Skin System (可插拔皮肤)

视觉渲染与交互逻辑完全分离：

- **App.vue** 组合两层：`<component :is="currentSkin.component">` (皮肤视觉) + `<InteractionLayer>` (交互 UI)
- **皮肤**在 `skins/` 目录下，每个皮肤导出 `{ id, name, component }`，组件接收 `{ state }` prop 渲染对应视觉
- **InteractionLayer** 根据 state 切换 LoginForm / ChatInput+ChatHistory / MessageOutput
- **useSkinManager** (`skins/registry.js`) 管理皮肤列表、运行时切换、IndexedDB 持久化

添加新皮肤：在 `skins/` 创建文件夹 → 写 Vue 组件(接收 state prop) → 导出 `{ id, name, component }` → 在 `registry.js` 注册

## Language

UI text and error messages are in Chinese (zh-CN). Maintain this convention.
