import { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } from 'electron'
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
  const icon = nativeImage.createEmpty()
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
