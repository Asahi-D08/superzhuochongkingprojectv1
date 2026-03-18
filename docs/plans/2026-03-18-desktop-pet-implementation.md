# 桌面宠物 (Desktop Pet) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Electron desktop pet app that connects to AstrBot via Open API for AI chat, with 3 visual states (idle/standby/speaking), transparent always-on-top window, and local chat history.

**Architecture:** Electron main process manages a transparent frameless window + system tray. Vue 3 renderer implements a state machine with 3 states. WebSocket connects to AstrBot for streaming chat. IndexedDB stores chat history locally.

**Tech Stack:** Electron 33, electron-vite, Vue 3 (Composition API), Vite, idb-keyval (IndexedDB), WebSocket API

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.mjs`
- Create: `src/main/index.js` (empty placeholder)
- Create: `src/preload/index.js` (empty placeholder)
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.js`
- Create: `src/renderer/src/App.vue`

**Step 1: Initialize package.json**

Run:
```bash
cd /Users/_key/code/astrdev/chaojizhuocongdawang
npm init -y
```

**Step 2: Install dependencies**

Run:
```bash
npm install --save-dev electron electron-vite vite @vitejs/plugin-vue
npm install vue idb-keyval
```

**Step 3: Create electron.vite.config.mjs**

Create file `electron.vite.config.mjs`:

```javascript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve('src/renderer'),
    build: {
      rollupOptions: {
        input: resolve('src/renderer/index.html')
      }
    },
    plugins: [vue()]
  }
})
```

**Step 4: Create renderer entry HTML**

Create file `src/renderer/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Desktop Pet</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

**Step 5: Create Vue entry**

Create file `src/renderer/src/main.js`:

```javascript
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

Create file `src/renderer/src/App.vue`:

```vue
<template>
  <div id="desktop-pet">
    <p>Desktop Pet Loading...</p>
  </div>
</template>

<script setup>
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
}
#desktop-pet {
  width: 100vw;
  height: 100vh;
}
</style>
```

**Step 6: Create placeholder main/preload**

Create file `src/main/index.js`:

```javascript
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 500,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
```

Create file `src/preload/index.js`:

```javascript
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform
})
```

**Step 7: Add scripts to package.json**

Update `package.json` to add `"main": "./src/main/index.js"` and scripts:

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview"
  }
}
```

**Step 8: Install electron-toolkit utils**

Run:
```bash
npm install --save-dev @electron-toolkit/utils
```

**Step 9: Verify app launches**

Run: `npm run dev`
Expected: A transparent window opens showing "Desktop Pet Loading..."

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Electron + Vue 3 project with electron-vite"
```

---

### Task 2: Electron Main Process (Window + Tray)

**Files:**
- Modify: `src/main/index.js`

**Step 1: Implement full main process with tray and drag support**

Replace `src/main/index.js`:

```javascript
import { app, BrowserWindow, Tray, Menu, ipcMain, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let mainWindow = null
let tray = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 350,
    height: 450,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  mainWindow.setPosition(screenWidth - 400, screenHeight - 500)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray() {
  tray = new Tray(join(__dirname, '../../resources/tray-icon.png'))
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示', click: () => mainWindow?.show() },
    { label: '退出', click: () => app.quit() }
  ])
  tray.setToolTip('桌面宠物')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => mainWindow?.show())
}

function setupIPC() {
  ipcMain.on('window-drag', (_event, { deltaX, deltaY }) => {
    if (!mainWindow) return
    const [x, y] = mainWindow.getPosition()
    mainWindow.setPosition(x + deltaX, y + deltaY)
  })

  ipcMain.on('window-resize', (_event, { width, height }) => {
    if (!mainWindow) return
    mainWindow.setSize(Math.round(width), Math.round(height))
  })
}

app.whenReady().then(() => {
  setupIPC()
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  app.quit()
})
```

**Step 2: Create tray icon placeholder**

Run:
```bash
mkdir -p resources
```

Create a simple 16x16 PNG placeholder at `resources/tray-icon.png`. For now, generate a minimal one or use a 1-pixel PNG.

**Step 3: Verify tray and window positioning**

Run: `npm run dev`
Expected: Window appears at bottom-right of screen, tray icon visible, right-click tray shows menu

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Electron main process with tray, drag IPC, and window positioning"
```

---

### Task 3: Preload Script (IPC Bridge)

**Files:**
- Modify: `src/preload/index.js`

**Step 1: Implement full IPC bridge**

Replace `src/preload/index.js`:

```javascript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  windowDrag(deltaX, deltaY) {
    ipcRenderer.send('window-drag', { deltaX, deltaY })
  },

  windowResize(width, height) {
    ipcRenderer.send('window-resize', { width, height })
  }
})
```

**Step 2: Verify IPC is accessible**

Run: `npm run dev`, open DevTools (add `mainWindow.webContents.openDevTools()` temporarily), check `window.electronAPI` exists in console.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add preload IPC bridge for window drag and resize"
```

---

### Task 4: Asset Config + Placeholder Images

**Files:**
- Create: `src/renderer/src/config/assets.config.js`
- Create: `src/renderer/src/assets/book-closed.svg`
- Create: `src/renderer/src/assets/book-open.svg`
- Create: `src/renderer/src/assets/character.svg`

**Step 1: Create asset config**

Create file `src/renderer/src/config/assets.config.js`:

```javascript
import bookClosed from '../assets/book-closed.svg'
import bookOpen from '../assets/book-open.svg'
import character from '../assets/character.svg'

const assets = {
  bookClosed,
  bookOpen,
  character
}

export default assets
```

**Step 2: Create placeholder SVG assets**

Create `src/renderer/src/assets/book-closed.svg` (simple closed book):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="120" height="140">
  <rect x="15" y="10" width="90" height="120" rx="4" fill="#8B4513" stroke="#5C2E00" stroke-width="2"/>
  <rect x="20" y="15" width="80" height="110" rx="2" fill="#D2691E"/>
  <line x1="60" y1="15" x2="60" y2="125" stroke="#5C2E00" stroke-width="1" opacity="0.3"/>
  <rect x="30" y="50" width="60" height="8" rx="2" fill="#FFF8DC" opacity="0.6"/>
  <rect x="35" y="65" width="50" height="6" rx="2" fill="#FFF8DC" opacity="0.4"/>
</svg>
```

Create `src/renderer/src/assets/book-open.svg` (simple open book):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140" width="200" height="140">
  <path d="M10,20 Q100,10 100,15 L100,130 Q100,125 10,135 Z" fill="#FFF8DC" stroke="#8B4513" stroke-width="2"/>
  <path d="M190,20 Q100,10 100,15 L100,130 Q100,125 190,135 Z" fill="#FFF8DC" stroke="#8B4513" stroke-width="2"/>
  <line x1="100" y1="15" x2="100" y2="130" stroke="#8B4513" stroke-width="2"/>
  <line x1="25" y1="45" x2="85" y2="42" stroke="#D2B48C" stroke-width="2" opacity="0.5"/>
  <line x1="25" y1="60" x2="85" y2="57" stroke="#D2B48C" stroke-width="2" opacity="0.5"/>
  <line x1="25" y1="75" x2="85" y2="72" stroke="#D2B48C" stroke-width="2" opacity="0.5"/>
  <line x1="115" y1="42" x2="175" y2="45" stroke="#D2B48C" stroke-width="2" opacity="0.5"/>
  <line x1="115" y1="57" x2="175" y2="60" stroke="#D2B48C" stroke-width="2" opacity="0.5"/>
  <line x1="115" y1="72" x2="175" y2="75" stroke="#D2B48C" stroke-width="2" opacity="0.5"/>
</svg>
```

Create `src/renderer/src/assets/character.svg` (simple chibi character placeholder):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
  <circle cx="50" cy="35" r="25" fill="#FFE4C4" stroke="#D2691E" stroke-width="1.5"/>
  <circle cx="40" cy="30" r="4" fill="#333"/>
  <circle cx="60" cy="30" r="4" fill="#333"/>
  <circle cx="41" cy="29" r="1.5" fill="#FFF"/>
  <circle cx="61" cy="29" r="1.5" fill="#FFF"/>
  <path d="M44,42 Q50,48 56,42" fill="none" stroke="#D2691E" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M25,18 Q30,0 50,5 Q70,0 75,18" fill="#6A5ACD" stroke="none"/>
  <path d="M38,58 L35,95 Q50,100 65,95 L62,58" fill="#6A5ACD" stroke="none"/>
  <line x1="35" y1="95" x2="30" y2="115" stroke="#FFE4C4" stroke-width="6" stroke-linecap="round"/>
  <line x1="65" y1="95" x2="70" y2="115" stroke="#FFE4C4" stroke-width="6" stroke-linecap="round"/>
  <line x1="33" y1="65" x2="18" y2="80" stroke="#FFE4C4" stroke-width="5" stroke-linecap="round"/>
  <line x1="67" y1="65" x2="82" y2="80" stroke="#FFE4C4" stroke-width="5" stroke-linecap="round"/>
</svg>
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add asset config and placeholder SVG images"
```

---

### Task 5: State Machine Composable

**Files:**
- Create: `src/renderer/src/composables/useStateMachine.js`

**Step 1: Implement state machine**

Create file `src/renderer/src/composables/useStateMachine.js`:

```javascript
import { ref, readonly } from 'vue'

export const STATES = {
  IDLE: 'idle',
  STANDBY: 'standby',
  SPEAKING: 'speaking'
}

const TRANSITIONS = {
  [STATES.IDLE]: { LOGIN_SUCCESS: STATES.STANDBY },
  [STATES.STANDBY]: { SEND_MESSAGE: STATES.SPEAKING },
  [STATES.SPEAKING]: { REPLY_COMPLETE: STATES.STANDBY }
}

export function useStateMachine() {
  const currentState = ref(STATES.IDLE)

  function transition(event) {
    const allowed = TRANSITIONS[currentState.value]
    if (!allowed || !allowed[event]) {
      console.warn(`Invalid transition: ${currentState.value} + ${event}`)
      return false
    }
    currentState.value = allowed[event]
    return true
  }

  function reset() {
    currentState.value = STATES.IDLE
  }

  return {
    currentState: readonly(currentState),
    transition,
    reset,
    STATES
  }
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add state machine composable with idle/standby/speaking states"
```

---

### Task 6: AstrBot API Composable

**Files:**
- Create: `src/renderer/src/composables/useAstrBotApi.js`

**Step 1: Implement API composable**

Create file `src/renderer/src/composables/useAstrBotApi.js`:

```javascript
import { ref, readonly } from 'vue'

export function useAstrBotApi() {
  const serverUrl = ref('')
  const apiKey = ref('')
  const connected = ref(false)
  const username = ref('desktop-pet-user')
  const sessionId = ref('')
  const error = ref('')

  let ws = null
  let reconnectTimer = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 5

  function setCredentials(url, key) {
    serverUrl.value = url.replace(/\/+$/, '')
    apiKey.value = key
  }

  async function testConnection() {
    error.value = ''
    try {
      const res = await fetch(`${serverUrl.value}/api/v1/im/bots`, {
        headers: { 'X-API-Key': apiKey.value }
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()
      if (data.status === 'ok') {
        connected.value = true
        return true
      }
      throw new Error(data.message || 'Unknown error')
    } catch (e) {
      error.value = e.message || '连接失败'
      connected.value = false
      return false
    }
  }

  function connectWebSocket(onMessage, onEnd) {
    if (ws) {
      ws.close()
    }

    const wsProtocol = serverUrl.value.startsWith('https') ? 'wss' : 'ws'
    const wsHost = serverUrl.value.replace(/^https?:\/\//, '')
    const wsUrl = `${wsProtocol}://${wsHost}/api/v1/chat/ws?api_key=${encodeURIComponent(apiKey.value)}`

    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      reconnectAttempts = 0
      connected.value = true
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'error') {
          error.value = data.data || 'WebSocket error'
          return
        }

        if (data.type === 'session_id' && data.session_id) {
          sessionId.value = data.session_id
        }

        if (data.type === 'end' || (data.type === 'complete' && !data.streaming)) {
          onEnd?.(data)
          return
        }

        onMessage?.(data)
      } catch (e) {
        console.error('Failed to parse WS message:', e)
      }
    }

    ws.onclose = () => {
      connected.value = false
      scheduleReconnect(onMessage, onEnd)
    }

    ws.onerror = () => {
      error.value = 'WebSocket 连接错误'
    }
  }

  function scheduleReconnect(onMessage, onEnd) {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
    reconnectAttempts++
    reconnectTimer = setTimeout(() => {
      connectWebSocket(onMessage, onEnd)
    }, delay)
  }

  function sendMessage(message) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      error.value = 'WebSocket 未连接'
      return false
    }

    const payload = {
      t: 'send',
      message,
      username: username.value,
      session_id: sessionId.value || undefined,
      enable_streaming: true
    }

    ws.send(JSON.stringify(payload))
    return true
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (ws) {
      ws.close()
      ws = null
    }
    connected.value = false
  }

  return {
    serverUrl: readonly(serverUrl),
    apiKey: readonly(apiKey),
    connected: readonly(connected),
    sessionId: readonly(sessionId),
    error: readonly(error),
    username,
    setCredentials,
    testConnection,
    connectWebSocket,
    sendMessage,
    disconnect
  }
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add AstrBot API composable with WebSocket chat support"
```

---

### Task 7: Chat History Composable

**Files:**
- Create: `src/renderer/src/composables/useChatHistory.js`

**Step 1: Implement chat history with IndexedDB**

Create file `src/renderer/src/composables/useChatHistory.js`:

```javascript
import { ref, readonly } from 'vue'
import { get, set } from 'idb-keyval'

const STORAGE_KEY = 'desktop-pet-chat-history'
const MAX_MESSAGES = 500

export function useChatHistory() {
  const messages = ref([])

  async function loadHistory() {
    try {
      const stored = await get(STORAGE_KEY)
      if (Array.isArray(stored)) {
        messages.value = stored
      }
    } catch (e) {
      console.error('Failed to load chat history:', e)
    }
  }

  async function saveHistory() {
    try {
      const trimmed = messages.value.slice(-MAX_MESSAGES)
      await set(STORAGE_KEY, trimmed)
    } catch (e) {
      console.error('Failed to save chat history:', e)
    }
  }

  async function addMessage(role, content) {
    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      role,
      content,
      timestamp: Date.now()
    }
    messages.value.push(msg)
    await saveHistory()
    return msg
  }

  async function updateLastBotMessage(content) {
    const lastBot = [...messages.value].reverse().find(m => m.role === 'bot')
    if (lastBot) {
      lastBot.content = content
      await saveHistory()
    }
  }

  async function clearHistory() {
    messages.value = []
    await saveHistory()
  }

  return {
    messages: readonly(messages),
    loadHistory,
    addMessage,
    updateLastBotMessage,
    clearHistory
  }
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add chat history composable with IndexedDB persistence"
```

---

### Task 8: Login Form Component

**Files:**
- Create: `src/renderer/src/components/LoginForm.vue`

**Step 1: Create login form**

Create file `src/renderer/src/components/LoginForm.vue`:

```vue
<template>
  <div class="login-overlay" @click.self="$emit('close')">
    <div class="login-form">
      <h3>连接到 AstrBot</h3>

      <div class="form-group">
        <label>后端地址</label>
        <input
          v-model="serverUrl"
          type="text"
          placeholder="http://localhost:6185"
          @keyup.enter="handleLogin"
        />
      </div>

      <div class="form-group">
        <label>API Key</label>
        <input
          v-model="apiKeyInput"
          type="password"
          placeholder="输入 API Key"
          @keyup.enter="handleLogin"
        />
      </div>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <div class="form-actions">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn-confirm" :disabled="loading" @click="handleLogin">
          {{ loading ? '连接中...' : '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['login', 'close'])

const serverUrl = ref('http://localhost:6185')
const apiKeyInput = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!serverUrl.value || !apiKeyInput.value) {
    errorMsg.value = '请填写所有字段'
    return
  }
  loading.value = true
  errorMsg.value = ''
  emit('login', {
    serverUrl: serverUrl.value,
    apiKey: apiKeyInput.value,
    onError: (msg) => {
      errorMsg.value = msg
      loading.value = false
    },
    onSuccess: () => {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
}
.login-form {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  width: 280px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.login-form h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
  text-align: center;
}
.form-group {
  margin-bottom: 12px;
}
.form-group label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}
.form-group input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
}
.form-group input:focus {
  border-color: #6A5ACD;
}
.error {
  color: #e74c3c;
  font-size: 12px;
  margin: 8px 0;
}
.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}
.btn-cancel, .btn-confirm {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.btn-cancel {
  background: #f0f0f0;
  color: #666;
}
.btn-confirm {
  background: #6A5ACD;
  color: #fff;
}
.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add LoginForm component with server URL and API key inputs"
```

---

### Task 9: Idle State Component

**Files:**
- Create: `src/renderer/src/components/IdleState.vue`

**Step 1: Create idle state**

Create file `src/renderer/src/components/IdleState.vue`:

```vue
<template>
  <div class="idle-state" @contextmenu.prevent="showLogin = true">
    <div class="book-container">
      <img :src="assets.bookClosed" alt="closed book" class="book-img" draggable="false" />
    </div>
    <p class="hint">右键点击登录</p>
    <LoginForm
      v-if="showLogin"
      @login="handleLogin"
      @close="showLogin = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import assets from '../config/assets.config.js'
import LoginForm from './LoginForm.vue'

const emit = defineEmits(['loginSuccess'])
const showLogin = ref(false)

function handleLogin({ serverUrl, apiKey, onError, onSuccess }) {
  emit('loginSuccess', { serverUrl, apiKey, onError, onSuccess })
}
</script>

<style scoped>
.idle-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  cursor: default;
  user-select: none;
}
.book-container {
  transition: transform 0.3s ease;
}
.book-container:hover {
  transform: scale(1.05);
}
.book-img {
  width: 120px;
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}
.hint {
  margin-top: 12px;
  font-size: 11px;
  color: rgba(255,255,255,0.7);
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
</style>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add IdleState component with right-click login trigger"
```

---

### Task 10: Chat Input Component

**Files:**
- Create: `src/renderer/src/components/ChatInput.vue`

**Step 1: Create chat input**

Create file `src/renderer/src/components/ChatInput.vue`:

```vue
<template>
  <div class="chat-input-container">
    <textarea
      ref="inputRef"
      v-model="text"
      placeholder="输入消息..."
      rows="2"
      @keydown.enter.exact.prevent="send"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['send'])
const text = ref('')
const inputRef = ref(null)

function send() {
  const msg = text.value.trim()
  if (!msg) return
  emit('send', msg)
  text.value = ''
}

onMounted(() => {
  inputRef.value?.focus()
})

defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<style scoped>
.chat-input-container {
  width: 100%;
  padding: 0 8px 8px 8px;
  box-sizing: border-box;
}
textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(106, 90, 205, 0.3);
  border-radius: 8px;
  font-size: 13px;
  resize: none;
  outline: none;
  background: rgba(255, 255, 255, 0.95);
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.2s;
}
textarea:focus {
  border-color: #6A5ACD;
}
</style>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add ChatInput component with Enter-to-send"
```

---

### Task 11: Message Output Component (Typewriter Effect)

**Files:**
- Create: `src/renderer/src/components/MessageOutput.vue`

**Step 1: Create message output with typewriter**

Create file `src/renderer/src/components/MessageOutput.vue`:

```vue
<template>
  <div class="message-output">
    <div class="output-content">
      <span>{{ displayedText }}</span>
      <span v-if="isTyping" class="cursor">|</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  isTyping: { type: Boolean, default: false }
})

const displayedText = ref('')
let charIndex = 0
let typeTimer = null

watch(() => props.text, (newText) => {
  if (props.isTyping && newText.length > displayedText.value.length) {
    typeNextChars(newText)
  } else if (!props.isTyping) {
    displayedText.value = newText
  }
}, { immediate: true })

function typeNextChars(fullText) {
  if (typeTimer) clearTimeout(typeTimer)
  charIndex = displayedText.value.length

  function step() {
    if (charIndex < fullText.length) {
      const chunkSize = Math.min(3, fullText.length - charIndex)
      displayedText.value = fullText.slice(0, charIndex + chunkSize)
      charIndex += chunkSize
      typeTimer = setTimeout(step, 30)
    }
  }
  step()
}

onUnmounted(() => {
  if (typeTimer) clearTimeout(typeTimer)
})
</script>

<style scoped>
.message-output {
  width: 100%;
  padding: 0 8px 8px 8px;
  box-sizing: border-box;
}
.output-content {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  min-height: 40px;
  max-height: 120px;
  overflow-y: auto;
  word-break: break-word;
  white-space: pre-wrap;
}
.cursor {
  animation: blink 0.8s infinite;
  color: #6A5ACD;
}
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add MessageOutput component with typewriter effect"
```

---

### Task 12: Chat History Component

**Files:**
- Create: `src/renderer/src/components/ChatHistory.vue`

**Step 1: Create chat history panel**

Create file `src/renderer/src/components/ChatHistory.vue`:

```vue
<template>
  <div class="history-overlay" @click.self="$emit('close')">
    <div class="history-panel">
      <div class="history-header">
        <h3>聊天记录</h3>
        <button class="btn-close" @click="$emit('close')">✕</button>
      </div>
      <div class="history-messages" ref="messagesRef">
        <div v-if="messages.length === 0" class="empty-hint">暂无聊天记录</div>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-item"
          :class="msg.role"
        >
          <span class="role-label">{{ msg.role === 'user' ? '你' : 'Bot' }}</span>
          <p class="message-text">{{ msg.content }}</p>
          <span class="timestamp">{{ formatTime(msg.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, nextTick } from 'vue'

defineProps({
  messages: { type: Array, default: () => [] }
})
defineEmits(['close'])

const messagesRef = ref(null)

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
})
</script>

<style scoped>
.history-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  z-index: 100;
}
.history-panel {
  background: #fff;
  border-radius: 12px;
  width: 300px;
  max-height: 380px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.history-header h3 {
  margin: 0;
  font-size: 14px;
  color: #333;
}
.btn-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #999;
}
.history-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
.empty-hint {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px 0;
}
.message-item {
  margin-bottom: 12px;
}
.message-item.user .role-label { color: #6A5ACD; }
.message-item.bot .role-label { color: #e67e22; }
.role-label {
  font-size: 11px;
  font-weight: 600;
}
.message-text {
  margin: 2px 0;
  font-size: 13px;
  color: #333;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
.timestamp {
  font-size: 10px;
  color: #bbb;
}
</style>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add ChatHistory panel component"
```

---

### Task 13: Standby State Component

**Files:**
- Create: `src/renderer/src/components/StandbyState.vue`

**Step 1: Create standby state**

Create file `src/renderer/src/components/StandbyState.vue`:

```vue
<template>
  <div class="standby-state" @contextmenu.prevent="showHistory = true">
    <div class="character-container">
      <img :src="assets.character" alt="character" class="character-img" draggable="false" />
    </div>
    <div class="book-container">
      <img :src="assets.bookOpen" alt="open book" class="book-img" draggable="false" />
    </div>
    <ChatInput @send="handleSend" />
    <ChatHistory
      v-if="showHistory"
      :messages="messages"
      @close="showHistory = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import assets from '../config/assets.config.js'
import ChatInput from './ChatInput.vue'
import ChatHistory from './ChatHistory.vue'

defineProps({
  messages: { type: Array, default: () => [] }
})

const emit = defineEmits(['send'])
const showHistory = ref(false)

function handleSend(text) {
  emit('send', text)
}
</script>

<style scoped>
.standby-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding-top: 10px;
  user-select: none;
}
.character-container {
  animation: float 3s ease-in-out infinite;
  z-index: 2;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.character-img {
  width: 80px;
  height: auto;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}
.book-container {
  margin-top: -10px;
  z-index: 1;
}
.book-img {
  width: 180px;
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}
</style>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add StandbyState component with character, book, chat, and history"
```

---

### Task 14: Speaking State Component

**Files:**
- Create: `src/renderer/src/components/SpeakingState.vue`

**Step 1: Create speaking state**

Create file `src/renderer/src/components/SpeakingState.vue`:

```vue
<template>
  <div class="speaking-state">
    <div class="character-container">
      <img :src="assets.character" alt="character" class="character-img speaking" draggable="false" />
    </div>
    <div class="book-container">
      <img :src="assets.bookOpen" alt="open book" class="book-img" draggable="false" />
    </div>
    <MessageOutput :text="outputText" :is-typing="true" />
  </div>
</template>

<script setup>
import assets from '../config/assets.config.js'
import MessageOutput from './MessageOutput.vue'

defineProps({
  outputText: { type: String, default: '' }
})
</script>

<style scoped>
.speaking-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding-top: 10px;
  user-select: none;
  pointer-events: none;
}
.character-container {
  animation: float 2s ease-in-out infinite;
  z-index: 2;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.character-img.speaking {
  animation: speak-bounce 0.4s ease-in-out infinite alternate;
}
@keyframes speak-bounce {
  from { transform: scale(1); }
  to { transform: scale(1.03); }
}
.character-img {
  width: 80px;
  height: auto;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}
.book-container {
  margin-top: -10px;
  z-index: 1;
}
.book-img {
  width: 180px;
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}
</style>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add SpeakingState component with typewriter output"
```

---

### Task 15: Main App Assembly

**Files:**
- Modify: `src/renderer/src/App.vue`
- Modify: `src/renderer/index.html`

**Step 1: Wire everything together in App.vue**

Replace `src/renderer/src/App.vue`:

```vue
<template>
  <div
    id="desktop-pet"
    @mousedown="startDrag"
  >
    <IdleState
      v-if="currentState === STATES.IDLE"
      @login-success="handleLogin"
    />
    <StandbyState
      v-else-if="currentState === STATES.STANDBY"
      :messages="messages"
      @send="handleSend"
    />
    <SpeakingState
      v-else-if="currentState === STATES.SPEAKING"
      :output-text="botOutput"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useStateMachine, STATES } from './composables/useStateMachine.js'
import { useAstrBotApi } from './composables/useAstrBotApi.js'
import { useChatHistory } from './composables/useChatHistory.js'
import IdleState from './components/IdleState.vue'
import StandbyState from './components/StandbyState.vue'
import SpeakingState from './components/SpeakingState.vue'

const { currentState, transition } = useStateMachine()
const api = useAstrBotApi()
const { messages, loadHistory, addMessage, updateLastBotMessage } = useChatHistory()

const botOutput = ref('')

onMounted(() => {
  loadHistory()
})

async function handleLogin({ serverUrl, apiKey, onError, onSuccess }) {
  api.setCredentials(serverUrl, apiKey)
  const ok = await api.testConnection()
  if (ok) {
    transition('LOGIN_SUCCESS')
    api.connectWebSocket(handleWsMessage, handleWsEnd)
    onSuccess?.()
  } else {
    onError?.(api.error.value || '连接失败')
  }
}

function handleSend(text) {
  addMessage('user', text)
  botOutput.value = ''
  transition('SEND_MESSAGE')
  api.sendMessage(text)
}

function handleWsMessage(data) {
  if (data.type === 'plain' && data.data) {
    if (data.streaming) {
      botOutput.value += data.data
    } else {
      botOutput.value = data.data
    }
  }
}

function handleWsEnd() {
  if (botOutput.value) {
    addMessage('bot', botOutput.value)
  }
  transition('REPLY_COMPLETE')
}

function startDrag(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
    return
  }

  const startX = e.screenX
  const startY = e.screenY

  function onMouseMove(ev) {
    const deltaX = ev.screenX - startX
    const deltaY = ev.screenY - startY
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      window.electronAPI?.windowDrag(ev.screenX - startX, ev.screenY - startY)
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html, body {
  overflow: hidden;
  background: transparent !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#desktop-pet {
  width: 350px;
  height: 450px;
  display: flex;
  flex-direction: column;
  -webkit-app-region: no-drag;
}
</style>
```

**Step 2: Update index.html body style**

Update `src/renderer/index.html` to ensure transparent background:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Desktop Pet</title>
  <style>
    html, body { margin: 0; padding: 0; background: transparent !important; overflow: hidden; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

**Step 3: Verify full app flow**

Run: `npm run dev`
Expected:
1. App launches with closed book (Idle state)
2. Right-click → login form appears
3. Enter valid server URL + API key → transitions to Standby (open book + character)
4. Type message + Enter → transitions to Speaking (typewriter output)
5. After bot finishes → returns to Standby
6. Right-click in Standby → shows chat history

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: assemble full app with state machine, drag, and all components"
```

---

### Task 16: Drag Fix (Incremental Delta)

**Files:**
- Modify: `src/renderer/src/App.vue` (drag logic)

**Step 1: Fix drag to use incremental deltas**

The drag implementation in Task 15 has a bug - it sends cumulative deltas instead of incremental ones. Fix the `startDrag` function:

```javascript
function startDrag(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
    return
  }

  let lastX = e.screenX
  let lastY = e.screenY

  function onMouseMove(ev) {
    const deltaX = ev.screenX - lastX
    const deltaY = ev.screenY - lastY
    if (deltaX !== 0 || deltaY !== 0) {
      window.electronAPI?.windowDrag(deltaX, deltaY)
      lastX = ev.screenX
      lastY = ev.screenY
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "fix: use incremental deltas for window drag"
```
