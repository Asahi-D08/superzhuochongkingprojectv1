import { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } from 'electron'
import { join } from 'path'

let mainWindow = null
let tray = null

const WINDOW_BOUNDS = {
  minWidth: 200,
  minHeight: 220,
  maxWidth: 420,
  maxHeight: 420
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 200,
    height: 260,
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
      contextIsolation: true,
      webSecurity: false
    }
  })

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  mainWindow.setPosition(screenWidth - 250, screenHeight - 300)

  // 置顶到最高层级，使其悬浮在全屏 / 无边框全屏程序之上。
  // 'screen-saver' 是 Electron 暴露的最高 z-order 级别。
  enforceAlwaysOnTop()
  // 在所有虚拟桌面 / 全屏空间可见（主要影响 macOS，Windows 上无副作用）。
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  // 全屏程序出现时常会抢占 topmost，失焦后重新置顶兜底。
  mainWindow.on('blur', enforceAlwaysOnTop)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    enforceAlwaysOnTop()
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function enforceAlwaysOnTop() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  // flag=true，level='screen-saver' 让窗口浮在全屏程序上方
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
}

function createTrayIcon() {
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const inBook = x >= 2 && x <= 13 && y >= 3 && y <= 13
      if (inBook) {
        canvas[i] = 139; canvas[i + 1] = 69; canvas[i + 2] = 19; canvas[i + 3] = 255
      } else {
        canvas[i + 3] = 0
      }
    }
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size })
}

function createTray() {
  const icon = createTrayIcon()
  tray = new Tray(icon)
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
    const nextWidth = clamp(Math.round(width), WINDOW_BOUNDS.minWidth, WINDOW_BOUNDS.maxWidth)
    const nextHeight = clamp(Math.round(height), WINDOW_BOUNDS.minHeight, WINDOW_BOUNDS.maxHeight)
    const bounds = mainWindow.getBounds()
    const { workArea } = screen.getDisplayMatching(bounds)
    const rightGap = workArea.x + workArea.width - (bounds.x + bounds.width)
    const bottomGap = workArea.y + workArea.height - (bounds.y + bounds.height)
    const nextX = clamp(workArea.x + workArea.width - nextWidth - rightGap, workArea.x, workArea.x + workArea.width - nextWidth)
    const nextY = clamp(workArea.y + workArea.height - nextHeight - bottomGap, workArea.y, workArea.y + workArea.height - nextHeight)

    mainWindow.setBounds({
      x: nextX,
      y: nextY,
      width: nextWidth,
      height: nextHeight
    })
    enforceAlwaysOnTop()
  })
}

function clamp(value, min, max) {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

app.whenReady().then(() => {
  setupIPC()
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  app.quit()
})
