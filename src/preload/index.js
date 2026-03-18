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
