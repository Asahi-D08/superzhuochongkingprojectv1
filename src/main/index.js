import { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } from 'electron'
import { join } from 'path'

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
      contextIsolation: true,
      webSecurity: false
    }
  })

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  mainWindow.setPosition(screenWidth - 400, screenHeight - 500)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
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
