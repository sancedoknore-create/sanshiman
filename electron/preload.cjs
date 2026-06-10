const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
  },
  upload: {
    /** 将 base64 数据保存到磁盘，返回绝对文件路径 */
    save: (base64Data, fileName) => ipcRenderer.invoke('upload:save', base64Data, fileName),
    /** 删除磁盘上的文件 */
    delete: (filePath) => ipcRenderer.invoke('upload:delete', filePath),
    /** 从磁盘读取文件，返回 { data: base64, size: number } */
    read: (filePath) => ipcRenderer.invoke('upload:read', filePath),
  },
})
