"use strict";
// Preload for the Seedance asset library popup window.
// Exposes a minimal IPC surface to call /v1/volc/assets endpoints via the main process.
// contextIsolation 强制为 true（弹窗 webPreferences 已硬化），不再保留 window 直挂 fallback。
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
  // OS-level 加密桥（safeStorage）。HTML 端用这个保 sk-... 之类敏感字符串。
  secrets: {
    isAvailable: async () => {
      try { return await ipcRenderer.invoke("safeStorage:isAvailable"); }
      catch { return false; }
    },
    encrypt: async (plain) => {
      try {
        const cipher = await ipcRenderer.invoke("safeStorage:encrypt", plain);
        return { ok: true, cipher };
      } catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
      }
    },
    decrypt: async (cipherBase64) => {
      try {
        const plain = await ipcRenderer.invoke("safeStorage:decrypt", cipherBase64);
        return { ok: true, plain };
      } catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
      }
    },
  },
};

try {
  contextBridge.exposeInMainWorld("seedanceAssets", API);
} catch (e) {
  // contextIsolation 应当为 true，走到这里通常说明 preload 加载异常。直接抛出而非静默挂 window。
  console.error("[seedance-assets-preload] contextBridge.exposeInMainWorld failed:", e);
  throw e;
}
