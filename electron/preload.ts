import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 添加需要暴露给渲染进程的API
  platform: process.platform,
})
