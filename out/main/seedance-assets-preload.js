"use strict";
// Preload for the Seedance asset library popup window.
// Exposes a minimal IPC surface to call /v1/volc/assets endpoints via the main process.
const { contextBridge, ipcRenderer } = require("electron");

const API = {
  pickFile: () => ipcRenderer.invoke("seedance:assets:pickFile"),
  create:   (params) => ipcRenderer.invoke("seedance:assets:create", params),
  list:     (params) => ipcRenderer.invoke("seedance:assets:list", params),
  get:      (params) => ipcRenderer.invoke("seedance:assets:get", params),
  delete:   (params) => ipcRenderer.invoke("seedance:assets:delete", params),
  copyText: (text)   => ipcRenderer.invoke("seedance:assets:copyText", text),
  shortcut: {
    get:   ()       => ipcRenderer.invoke("seedance:shortcut:get"),
    set:   (accel)  => ipcRenderer.invoke("seedance:shortcut:set", { accelerator: accel }),
    reset: ()       => ipcRenderer.invoke("seedance:shortcut:reset"),
  },
};

try {
  contextBridge.exposeInMainWorld("seedanceAssets", API);
} catch (e) {
  // Fallback if contextIsolation is disabled
  window.seedanceAssets = API;
}
