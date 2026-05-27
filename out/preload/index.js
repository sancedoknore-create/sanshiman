"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const ALLOWED_CHANNELS = [
  "cache:ping",
  "cache:config",
  "cache:openDirectory",
  "cache:openFiles",
  "cache:save-thumbnail",
  "cache:save-cache",
  "cache:check",
  "cache:delete-batch",
  "cache:clear-generated",
  "cache:clear-history",
  "cache:download-url",
  "system:show-item-in-folder",
  "engine:submit-task",
  "engine:cancel-task",
  "engine:get-status",
  "db:projects:list",
  "db:projects:get",
  "db:projects:save",
  "db:projects:delete",
  "db:nodes:list",
  "db:nodes:save",
  "db:nodes:saveBatch",
  "db:nodes:delete",
  "db:nodes:deleteByProject",
  "db:connections:list",
  "db:connections:save",
  "db:connections:saveBatch",
  "db:connections:delete",
  "db:connections:deleteByProject",
  "db:history:list",
  "db:history:listAll",
  "db:history:save",
  "db:history:saveBatch",
  "db:history:delete",
  "db:settings:get",
  "db:settings:set",
  "db:settings:delete",
  "db:settings:getAll",
  "db:settings:setBatch",
  "safeStorage:isAvailable",
  "safeStorage:encrypt",
  "safeStorage:decrypt",
  "updater-check",
  "updater-download",
  "updater-quit-install",
  "monitor:get-stats",
  "thumbnail:generate",
  "protocol:set-allowed-roots",
  "fs:validate-project-dir",
  "logger:get-dir",
  "logger:open-dir",
  "logger:append",
  "clipboard:copy-image",
  "shell:open-external",
  "shell:open-path",
  "app:get-version",
  "app:get-arch",
  "app:is-packaged",
  "app:get-default-project-dir",
  "window:minimize",
  "window:maximize",
  "window:close",
  "window:is-maximized",
  "dialog:save-file",
  "system:get-info"
];
function safeInvoke(channel, data) {
  if (!ALLOWED_CHANNELS.includes(channel)) {
    return Promise.reject(new Error(`IPC channel not allowed: ${channel}`));
  }
  return electron.ipcRenderer.invoke(channel, data);
}
const ALLOWED_ON_CHANNELS = ["engine:task-update", "updater-message", "app-before-close", "logger:append"];
function safeOn(channel, callback) {
  if (!ALLOWED_ON_CHANNELS.includes(channel)) {
    console.error(`IPC on channel not allowed: ${channel}`);
    return () => {
    };
  }
  const handler = (event, args) => callback(args);
  electron.ipcRenderer.on(channel, handler);
  return () => electron.ipcRenderer.removeListener(channel, handler);
}
function createDbAPI() {
  return {
    // 项目
    projects: {
      list: () => safeInvoke("db:projects:list"),
      get: (id) => safeInvoke("db:projects:get", id),
      save: (project) => safeInvoke("db:projects:save", project),
      delete: (id) => safeInvoke("db:projects:delete", id)
    },
    // 节点
    nodes: {
      list: (projectId) => safeInvoke("db:nodes:list", projectId),
      save: (node, projectId) => safeInvoke("db:nodes:save", { node, projectId }),
      saveBatch: (nodes, projectId) => safeInvoke("db:nodes:saveBatch", { nodes, projectId }),
      delete: (id) => safeInvoke("db:nodes:delete", id),
      deleteByProject: (projectId) => safeInvoke("db:nodes:deleteByProject", projectId)
    },
    // 连接
    connections: {
      list: (projectId) => safeInvoke("db:connections:list", projectId),
      save: (connection, projectId) => safeInvoke("db:connections:save", { connection, projectId }),
      saveBatch: (connections, projectId) => safeInvoke("db:connections:saveBatch", { connections, projectId }),
      delete: (id) => safeInvoke("db:connections:delete", id),
      deleteByProject: (projectId) => safeInvoke("db:connections:deleteByProject", projectId)
    },
    // 历史
    history: {
      list: (projectId, limit) => safeInvoke("db:history:list", { projectId, limit }),
      listAll: (limit) => safeInvoke("db:history:listAll", limit),
      save: (item, projectId) => safeInvoke("db:history:save", { item, projectId }),
      saveBatch: (items, projectId) => safeInvoke("db:history:saveBatch", { items, projectId }),
      delete: (id) => safeInvoke("db:history:delete", id)
    },
    // 设置 KV
    settings: {
      get: (key) => safeInvoke("db:settings:get", key),
      set: (key, value) => safeInvoke("db:settings:set", { key, value }),
      delete: (key) => safeInvoke("db:settings:delete", key),
      getAll: () => safeInvoke("db:settings:getAll"),
      setBatch: (entries) => safeInvoke("db:settings:setBatch", entries)
    }
  };
}
function safeSend(channel, ...args) {
  if (!ALLOWED_CHANNELS.includes(channel)) {
    return;
  }
  return electron.ipcRenderer.send(channel, ...args);
}
const api = {
  invoke: (channel, data) => safeInvoke(channel, data),
  send: (channel, ...args) => safeSend(channel, ...args),
  on: (channel, callback) => safeOn(channel, callback),
  localCacheAPI: {
    ping: () => safeInvoke("cache:ping"),
    config: (newConfig) => safeInvoke("cache:config", newConfig),
    openDirectory: (currentPath) => safeInvoke("cache:openDirectory", currentPath),
    openFiles: (options) => safeInvoke("cache:openFiles", options),
    saveThumbnail: (data) => safeInvoke("cache:save-thumbnail", data),
    saveCache: (data) => safeInvoke("cache:save-cache", data),
    checkCache: (data) => safeInvoke("cache:check", data),
    deleteBatch: (data) => safeInvoke("cache:delete-batch", data),
    clearGenerated: () => safeInvoke("cache:clear-generated"),
    clearHistory: () => safeInvoke("cache:clear-history"),
    showItemInFolder: (path) => safeInvoke("system:show-item-in-folder", path)
  },
  engineAPI: {
    submitTask: (payload) => safeInvoke("engine:submit-task", payload),
    cancelTask: (taskId) => safeInvoke("engine:cancel-task", taskId),
    getStatus: () => safeInvoke("engine:get-status"),
    onTaskUpdated: (callback) => safeOn("engine:task-update", callback)
  },
  updater: {
    onMessage: (callback) => safeOn("updater-message", callback),
    checkForUpdates: () => safeInvoke("updater-check"),
    downloadUpdate: () => safeInvoke("updater-download"),
    quitAndInstall: () => safeInvoke("updater-quit-install")
  },
  safeStorageAPI: {
    isAvailable: () => safeInvoke("safeStorage:isAvailable"),
    encrypt: (plainText) => safeInvoke("safeStorage:encrypt", plainText),
    decrypt: (base64Cipher) => safeInvoke("safeStorage:decrypt", base64Cipher)
  },
  monitorAPI: {
    getStats: () => safeInvoke("monitor:get-stats")
  },
  thumbnailAPI: {
    generate: (filePath, size) => safeInvoke("thumbnail:generate", { filePath, size })
  },
  clipboardAPI: {
    copyImage: (base64Data) => safeInvoke("clipboard:copy-image", base64Data)
  },
  shellAPI: {
    openExternal: (url) => safeInvoke("shell:open-external", url),
    openPath: (filePath) => safeInvoke("shell:open-path", filePath)
  },
  appAPI: {
    getVersion: () => safeInvoke("app:get-version"),
    getArch: () => safeInvoke("app:get-arch"),
    isPackaged: () => safeInvoke("app:is-packaged"),
    getDefaultProjectDir: () => safeInvoke("app:get-default-project-dir")
  },
  windowAPI: {
    minimize: () => safeInvoke("window:minimize"),
    maximize: () => safeInvoke("window:maximize"),
    close: () => safeInvoke("window:close"),
    isMaximized: () => safeInvoke("window:is-maximized")
  },
  dialogAPI: {
    saveFile: (options) => safeInvoke("dialog:save-file", options)
  },
  systemAPI: {
    getInfo: () => safeInvoke("system:get-info")
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
    electron.contextBridge.exposeInMainWorld("dbAPI", createDbAPI());
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
  window.dbAPI = createDbAPI();
}
