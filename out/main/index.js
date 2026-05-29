"use strict";
const electron$1 = require("electron");
const path$1 = require("path");
const fs$1 = require("fs");
const crypto = require("crypto");
const Database = require("better-sqlite3");
let db = null;
try {
  let runMigrations = function() {
    if (currentVersion < 1) {
      const migrateColumn = (table, column, type, defaultVal) => {
        const cols = db.prepare(`PRAGMA table_info(${table})`).all();
        if (!cols.find((c) => c.name === column)) {
          const def = defaultVal !== void 0 ? ` DEFAULT ${defaultVal}` : "";
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${def}`);
          /* @__PURE__ */ console.log(`[Database] 迁移 v1: ${table} 添加列 ${column}`);
        }
      };
      const tx = db.transaction(() => {
        migrateColumn("nodes", "project_id", "TEXT");
        migrateColumn("nodes", "settings", "TEXT");
        migrateColumn("nodes", "data", "TEXT");
        migrateColumn("nodes", "frames", "TEXT");
        migrateColumn("nodes", "selected_keyframes", "TEXT");
        migrateColumn("nodes", "video_meta", "TEXT");
        migrateColumn("nodes", "width", "REAL");
        migrateColumn("nodes", "height", "REAL");
        migrateColumn("nodes", "created_at", "INTEGER");
        migrateColumn("connections", "project_id", "TEXT");
        migrateColumn("connections", "source_handle", "TEXT", "'default'");
        migrateColumn("connections", "target_handle", "TEXT", "'default'");
        migrateColumn("connections", "input_type", "TEXT", "'default'");
        migrateColumn("history", "project_id", "TEXT");
        migrateColumn("history", "source_node_id", "TEXT");
        migrateColumn("history", "duration_ms", "INTEGER");
        migrateColumn("history", "error_msg", "TEXT");
        migrateColumn("history", "original_payload", "TEXT");
        migrateColumn("history", "metadata", "TEXT");
      });
      tx();
    }
    if (currentVersion < DB_VERSION) {
      db.pragma(`user_version = ${DB_VERSION}`);
      /* @__PURE__ */ console.log(`[Database] 版本迁移: ${currentVersion} → ${DB_VERSION}`);
    }
  };
  const dbPath = !electron$1.app.isPackaged ? path$1.join(process.cwd(), "canvas_data.db") : path$1.join(electron$1.app.getPath("userData"), "canvas_data.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    -- 项目表
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '未命名项目',
      created_at INTEGER,
      updated_at INTEGER
    );

    -- 节点表（完整属性）
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      type TEXT NOT NULL,
      x REAL DEFAULT 0,
      y REAL DEFAULT 0,
      width REAL,
      height REAL,
      content TEXT,
      settings TEXT,
      data TEXT,
      frames TEXT,
      selected_keyframes TEXT,
      video_meta TEXT,
      created_at INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- 连接表
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      source TEXT,
      target TEXT,
      source_handle TEXT DEFAULT 'default',
      target_handle TEXT DEFAULT 'default',
      input_type TEXT DEFAULT 'default',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- 生成历史表
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      type TEXT,
      url TEXT,
      prompt TEXT,
      status TEXT,
      model_id TEXT,
      model_name TEXT,
      source_node_id TEXT,
      duration_ms INTEGER,
      error_msg TEXT,
      original_payload TEXT,
      created_at INTEGER,
      metadata TEXT
    );

    -- 资源缓存表
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      file_path TEXT,
      ai_prompt TEXT,
      type TEXT,
      created_at INTEGER
    );

    -- 键值设置表（用于迁移 localStorage）
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER
    );
  `);
  const DB_VERSION = 1;
  const currentVersion = db.pragma("user_version", { simple: true });
  runMigrations();
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project_id);
    CREATE INDEX IF NOT EXISTS idx_connections_project ON connections(project_id);
    CREATE INDEX IF NOT EXISTS idx_connections_source ON connections(source);
    CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target);
    CREATE INDEX IF NOT EXISTS idx_history_project ON history(project_id);
    CREATE INDEX IF NOT EXISTS idx_history_status ON history(status);
    CREATE INDEX IF NOT EXISTS idx_history_source_node ON history(source_node_id);
  `);
  const _walTimer = setInterval(
    () => {
      try {
        db.pragma("wal_checkpoint(PASSIVE)");
      } catch (e) {
        console.warn("[Database] WAL checkpoint 失败:", e.message);
      }
    },
    5 * 60 * 1e3
  );
  electron$1.app.on("before-quit", () => {
    try {
      clearInterval(_walTimer);
    } catch {
    }
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch (e) {
      console.warn("[Database] before-quit checkpoint 失败:", e.message);
    }
    try {
      db.close();
    } catch (e) {
      console.warn("[Database] before-quit close 失败:", e.message);
    }
  });
  /* @__PURE__ */ console.log(`SQLite Database initialized at: ${dbPath} (version: ${DB_VERSION})`);
} catch (err) {
  console.error("[Database] better-sqlite3 加载失败，使用内存模式:", err.message);
  global.__DB_MEMORY_MODE__ = true;
  global.__DB_ERROR_MSG__ = err.message;
  try {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '未命名项目',
        created_at INTEGER,
        updated_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        type TEXT NOT NULL,
        x REAL DEFAULT 0, y REAL DEFAULT 0,
        width REAL, height REAL,
        content TEXT, settings TEXT, data TEXT,
        frames TEXT, selected_keyframes TEXT, video_meta TEXT,
        created_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        source TEXT, target TEXT,
        source_handle TEXT DEFAULT 'default',
        target_handle TEXT DEFAULT 'default',
        input_type TEXT DEFAULT 'default'
      );
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        type TEXT, url TEXT, prompt TEXT, status TEXT,
        model_id TEXT, model_name TEXT, source_node_id TEXT,
        duration_ms INTEGER, error_msg TEXT,
        original_payload TEXT, created_at INTEGER, metadata TEXT
      );
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        file_path TEXT, ai_prompt TEXT, type TEXT, created_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER
      );
    `);
    /* @__PURE__ */ console.log("SQLite Database initialized in memory mode (fallback)");
  } catch (err2) {
    console.error("[Database] better-sqlite3 完全不可用，数据库功能将被禁用:", err2.message);
  }
}
const _stmts = db ? {
  getAllProjects: db.prepare("SELECT * FROM projects ORDER BY updated_at DESC"),
  getProject: db.prepare("SELECT * FROM projects WHERE id = ?"),
  saveProject: db.prepare("INSERT INTO projects (id, name, created_at, updated_at) VALUES (@id, @name, @created_at, @updated_at) ON CONFLICT(id) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at"),
  deleteProject: db.prepare("DELETE FROM projects WHERE id = ?"),
  getNodesByProject: db.prepare("SELECT * FROM nodes WHERE project_id = ?"),
  saveNode: db.prepare("INSERT INTO nodes (id, project_id, type, x, y, width, height, content, settings, data, frames, selected_keyframes, video_meta, created_at) VALUES (@id, @project_id, @type, @x, @y, @width, @height, @content, @settings, @data, @frames, @selected_keyframes, @video_meta, @created_at) ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id, type=excluded.type, x=excluded.x, y=excluded.y, width=excluded.width, height=excluded.height, content=excluded.content, settings=excluded.settings, data=excluded.data, frames=excluded.frames, selected_keyframes=excluded.selected_keyframes, video_meta=excluded.video_meta"),
  deleteNode: db.prepare("DELETE FROM nodes WHERE id = ?"),
  deleteNodesByProject: db.prepare("DELETE FROM nodes WHERE project_id = ?"),
  getConnectionsByProject: db.prepare("SELECT * FROM connections WHERE project_id = ?"),
  saveConnection: db.prepare("INSERT INTO connections (id, project_id, source, target, source_handle, target_handle, input_type) VALUES (@id, @project_id, @source, @target, @source_handle, @target_handle, @input_type) ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id, source=excluded.source, target=excluded.target, source_handle=excluded.source_handle, target_handle=excluded.target_handle, input_type=excluded.input_type"),
  deleteConnection: db.prepare("DELETE FROM connections WHERE id = ?"),
  deleteConnectionsByProject: db.prepare("DELETE FROM connections WHERE project_id = ?"),
  getSetting: db.prepare("SELECT value FROM settings WHERE key = ?"),
  setSetting: db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (@key, @value, @updated_at)"),
  deleteSetting: db.prepare("DELETE FROM settings WHERE key = ?"),
  getAllSettings: db.prepare("SELECT key, value FROM settings"),
  setSettingBatch: db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (@key, @value, @updated_at)")
} : null;
function getAllProjects() {
  if (!db) return [];
  return _stmts.getAllProjects.all();
}
function getProject(id) {
  if (!db) return null;
  return _stmts.getProject.get(id);
}
function saveProject(project) {
  if (!db) return { changes: 0 };
  return _stmts.saveProject.run({
    id: project.id,
    name: project.name || "未命名项目",
    created_at: project.created_at || Date.now(),
    updated_at: project.updated_at || Date.now()
  });
}
function deleteProject(id) {
  if (!db) return { changes: 0 };
  return _stmts.deleteProject.run(id);
}
function getNodesByProject(projectId) {
  if (!db) return [];
  const rows = _stmts.getNodesByProject.all(projectId);
  return rows.map(deserializeNode);
}
function saveNode(node, projectId) {
  if (!db) return { changes: 0 };
  return _stmts.saveNode.run(serializeNode(node, projectId));
}
function saveNodesBatch(nodes, projectId) {
  if (!db) return { changes: 0 };
  const transaction = db.transaction((items) => {
    for (const node of items) {
      _stmts.saveNode.run(serializeNode(node, projectId));
    }
  });
  transaction(nodes);
  return { changes: nodes.length };
}
function deleteNode(id) {
  if (!db) return { changes: 0 };
  return _stmts.deleteNode.run(id);
}
function deleteNodesByProject(projectId) {
  if (!db) return { changes: 0 };
  return _stmts.deleteNodesByProject.run(projectId);
}
function getConnectionsByProject(projectId) {
  if (!db) return [];
  return _stmts.getConnectionsByProject.all(projectId);
}
function saveConnection(conn, projectId) {
  if (!db) return { changes: 0 };
  return _stmts.saveConnection.run({
    id: conn.id,
    project_id: projectId,
    source: conn.source || conn.from || "",
    target: conn.target || conn.to || "",
    source_handle: conn.sourceHandle || conn.source_handle || "default",
    target_handle: conn.targetHandle || conn.target_handle || "default",
    input_type: conn.inputType || conn.input_type || "default"
  });
}
function saveConnectionsBatch(connections, projectId) {
  if (!db) return { changes: 0 };
  const transaction = db.transaction((items) => {
    for (const conn of items) {
      _stmts.saveConnection.run({
        id: conn.id,
        project_id: projectId,
        source: conn.source || conn.from || "",
        target: conn.target || conn.to || "",
        source_handle: conn.sourceHandle || conn.source_handle || "default",
        target_handle: conn.targetHandle || conn.target_handle || "default",
        input_type: conn.inputType || conn.input_type || "default"
      });
    }
  });
  transaction(connections);
  return { changes: connections.length };
}
function deleteConnection(id) {
  if (!db) return { changes: 0 };
  return _stmts.deleteConnection.run(id);
}
function deleteConnectionsByProject(projectId) {
  if (!db) return { changes: 0 };
  return _stmts.deleteConnectionsByProject.run(projectId);
}
function getHistoryByProject(projectId, limit = 200) {
  if (!db) return [];
  const rows = db.prepare("SELECT * FROM history WHERE project_id = ? ORDER BY created_at DESC LIMIT ?").all(projectId, limit);
  return rows.map(deserializeHistory);
}
function getAllHistory(limit = 500) {
  if (!db) return [];
  const rows = db.prepare("SELECT * FROM history ORDER BY created_at DESC LIMIT ?").all(limit);
  return rows.map(deserializeHistory);
}
function saveHistoryItem(item, projectId) {
  if (!db) return { changes: 0 };
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO history (id, project_id, type, url, prompt, status, model_id, model_name, source_node_id, duration_ms, error_msg, original_payload, created_at, metadata)
    VALUES (@id, @project_id, @type, @url, @prompt, @status, @model_id, @model_name, @source_node_id, @duration_ms, @error_msg, @original_payload, @created_at, @metadata)
  `);
  return stmt.run(serializeHistory(item, projectId));
}
function saveHistoryBatch(items, projectId) {
  if (!db) return { changes: 0 };
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO history (id, project_id, type, url, prompt, status, model_id, model_name, source_node_id, duration_ms, error_msg, original_payload, created_at, metadata)
    VALUES (@id, @project_id, @type, @url, @prompt, @status, @model_id, @model_name, @source_node_id, @duration_ms, @error_msg, @original_payload, @created_at, @metadata)
  `);
  const transaction = db.transaction((rows) => {
    for (const item of rows) {
      stmt.run(serializeHistory(item, projectId));
    }
  });
  transaction(items);
  return { changes: items.length };
}
function deleteHistoryItem(id) {
  if (!db) return { changes: 0 };
  return db.prepare("DELETE FROM history WHERE id = ?").run(id);
}
function clearAllHistory() {
  if (!db) return { changes: 0 };
  return db.prepare("DELETE FROM history").run();
}
function serializeNode(node, projectId) {
  const pos = node.position || { x: node.x || 0, y: node.y || 0 };
  return {
    id: node.id,
    project_id: projectId,
    type: node.type || "unknown",
    x: pos.x,
    y: pos.y,
    width: node.width ?? null,
    height: node.height ?? null,
    content: node.content || null,
    settings: node.settings ? JSON.stringify(node.settings) : null,
    data: node.data ? JSON.stringify(node.data) : null,
    frames: node.frames ? JSON.stringify(node.frames) : null,
    selected_keyframes: node.selectedKeyframes ? JSON.stringify(node.selectedKeyframes) : null,
    video_meta: node.videoMeta ? JSON.stringify(node.videoMeta) : null,
    created_at: node.created_at || Date.now()
  };
}
function deserializeNode(row) {
  return {
    id: row.id,
    type: row.type,
    position: { x: row.x || 0, y: row.y || 0 },
    x: row.x || 0,
    y: row.y || 0,
    width: row.width,
    height: row.height,
    content: row.content,
    settings: safeJsonParse(row.settings),
    data: safeJsonParse(row.data) || {},
    frames: safeJsonParse(row.frames),
    selectedKeyframes: safeJsonParse(row.selected_keyframes),
    videoMeta: safeJsonParse(row.video_meta)
  };
}
function serializeHistory(item, projectId) {
  return {
    id: item.id,
    project_id: projectId || null,
    type: item.type || null,
    url: item.url || null,
    prompt: item.prompt || null,
    status: item.status || null,
    model_id: item.apiConfig?.modelId || item.model_id || null,
    model_name: item.apiConfig?.modelName || item.model_name || null,
    source_node_id: item.sourceNodeId || item.source_node_id || null,
    duration_ms: item.durationMs || item.duration_ms || null,
    error_msg: item.errorMsg || item.error_msg || null,
    original_payload: item.originalPayload ? JSON.stringify(item.originalPayload) : null,
    created_at: item.startTime || item.created_at || Date.now(),
    metadata: JSON.stringify({
      ratio: item.ratio,
      mjImages: item.mjImages,
      mjOriginalUrl: item.mjOriginalUrl,
      mjRatio: item.mjRatio,
      selectedMjImageIndex: item.selectedMjImageIndex,
      width: item.width,
      height: item.height,
      resultUrls: item.resultUrls,
      apiConfig: item.apiConfig
    })
  };
}
function deserializeHistory(row) {
  const meta = safeJsonParse(row.metadata) || {};
  return {
    id: row.id,
    type: row.type,
    url: row.url,
    prompt: row.prompt,
    status: row.status,
    sourceNodeId: row.source_node_id,
    durationMs: row.duration_ms,
    errorMsg: row.error_msg,
    originalPayload: safeJsonParse(row.original_payload),
    startTime: row.created_at,
    ratio: meta.ratio,
    mjImages: meta.mjImages,
    mjOriginalUrl: meta.mjOriginalUrl,
    mjRatio: meta.mjRatio,
    selectedMjImageIndex: meta.selectedMjImageIndex,
    width: meta.width,
    height: meta.height,
    resultUrls: meta.resultUrls,
    apiConfig: meta.apiConfig || { modelId: row.model_id, modelName: row.model_name }
  };
}
function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
function getSetting(key) {
  if (!db) return null;
  const row = _stmts.getSetting.get(key);
  return row ? row.value : null;
}
function setSetting(key, value) {
  if (!db) return { changes: 0 };
  return _stmts.setSetting.run({ key, value: String(value), updated_at: Date.now() });
}
function deleteSetting(key) {
  if (!db) return { changes: 0 };
  return _stmts.deleteSetting.run(key);
}
function getAllSettings() {
  if (!db) return {};
  const rows = _stmts.getAllSettings.all();
  const result = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}
function setSettingsBatch(entries) {
  if (!db) return { changes: 0 };
  const now = Date.now();
  const transaction = db.transaction((items) => {
    for (const { key, value } of items) {
      _stmts.setSettingBatch.run({ key, value: String(value), updated_at: now });
    }
  });
  transaction(entries);
  return { changes: entries.length };
}
const LOG_DIR = (() => {
  const d = path$1.join(electron$1.app.getPath("userData"), "logs");
  if (!fs$1.existsSync(d)) fs$1.mkdirSync(d, { recursive: true });
  return d;
})();
const LOG_MAX_LINE = 8192;
const LOG_MAX_FILE = 5 * 1024 * 1024;
const _logBufs = { main: [], renderer: [] };
let _logBufSizes = { main: 0, renderer: 0 };
let _logFlushing = false;
const _origConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console)
};
let _inOverride = false;
function _formatLog(kind, args) {
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  const line = args.map((a) => {
    if (a instanceof Error) return `${a.name}: ${a.message}
${a.stack || ""}`;
    if (typeof a === "string") return a;
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  }).join(" ");
  return `${ts} [${kind}] ${line}
`.slice(0, LOG_MAX_LINE);
}
function _appendLog(bufName, entry) {
  const arr = _logBufs[bufName];
  if (!arr) return;
  if (arr.length >= 2e4) {
    const removed = arr.shift();
    _logBufSizes[bufName] -= (removed || "").length;
  }
  arr.push(entry);
  _logBufSizes[bufName] += entry.length;
  if (_logBufSizes[bufName] >= 65536) _flushLog(bufName);
}
function _rotateLog(kind) {
  const fp = path$1.join(LOG_DIR, `${kind}.log`);
  try {
    if (fs$1.existsSync(fp) && fs$1.statSync(fp).size >= LOG_MAX_FILE) {
      const bak = fp + ".1";
      try {
        if (fs$1.existsSync(bak)) fs$1.unlinkSync(bak);
      } catch (e) {
        _origConsole.warn("[logger] rotate unlink failed:", e.message);
      }
      fs$1.renameSync(fp, bak);
    }
  } catch (e) {
    _origConsole.warn("[logger] rotate failed:", e.message);
  }
  return fp;
}
function _flushLog(bufName) {
  const arr = _logBufs[bufName];
  if (!arr || arr.length === 0) return Promise.resolve();
  const batch = arr.splice(0);
  _logBufSizes[bufName] = 0;
  const fp = _rotateLog(bufName);
  return fs$1.promises.appendFile(fp, batch.join(""), "utf-8").catch((e) => {
    _origConsole.error("[logger] appendFile failed:", e && e.message ? e.message : e);
  });
}
async function _flushAllLogs() {
  if (_logFlushing) return;
  _logFlushing = true;
  try {
    await Promise.all([_flushLog("main"), _flushLog("renderer")]);
  } finally {
    _logFlushing = false;
  }
}
const _flushTimer = setInterval(() => {
  if (!_logFlushing) {
    _flushLog("main");
    _flushLog("renderer");
  }
}, 200);
["log", "warn", "error", "debug", "info"].forEach((lvl) => {
  const orig = _origConsole[lvl] || _origConsole.log;
  console[lvl] = (...args) => {
    if (_inOverride) {
      orig(...args);
      return;
    }
    _inOverride = true;
    try {
      try {
        _appendLog("main", _formatLog(lvl.toUpperCase(), args));
      } catch (e) {
        _origConsole.error("[logger] _appendLog failed:", e && e.message ? e.message : e);
      }
      orig(...args);
    } finally {
      _inOverride = false;
    }
  };
});
const DEFAULT_FILE_EXT_WHITELIST = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".mp4",
  ".webm",
  ".mov"
];
const PRIVATE_IPV4_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0)/;
const LOOPBACK_HOSTS = /* @__PURE__ */ new Set(["localhost", "::1", "[::1]"]);
function assertSafeRelativePath(rel, root) {
  if (typeof rel !== "string" || rel.length === 0) {
    throw new Error("invalid path: must be non-empty string");
  }
  if (rel.includes("\0")) {
    throw new Error("invalid path: null byte");
  }
  if (path$1.isAbsolute(rel) || /^[a-zA-Z]:[\\/]/.test(rel)) {
    throw new Error("invalid path: absolute path not allowed");
  }
  const absRoot = path$1.resolve(root);
  const joined = path$1.resolve(absRoot, rel);
  const rootWithSep = absRoot.endsWith(path$1.sep) ? absRoot : absRoot + path$1.sep;
  if (joined !== absRoot && !joined.startsWith(rootWithSep)) {
    throw new Error(`path traversal: ${rel} resolves outside allowed root ${absRoot}`);
  }
  return joined;
}
function assertSafeAbsolutePath(abs, allowedRoots) {
  if (typeof abs !== "string" || abs.length === 0) {
    throw new Error("invalid path: must be non-empty string");
  }
  if (abs.includes("\0")) {
    throw new Error("invalid path: null byte");
  }
  if (!path$1.isAbsolute(abs)) {
    throw new Error("invalid path: not absolute, outside allowed roots");
  }
  const resolved = path$1.resolve(abs);
  for (const root of allowedRoots) {
    const r = path$1.resolve(root);
    const rWithSep = r.endsWith(path$1.sep) ? r : r + path$1.sep;
    if (resolved === r || resolved.startsWith(rWithSep)) {
      return resolved;
    }
  }
  throw new Error(`path is outside allowed roots: ${resolved}`);
}
function assertSafeDownloadUrl(input, opts = {}) {
  const { allowHttp = false, allowPrivate = false } = opts;
  if (typeof input !== "string" || input.length === 0) {
    throw new Error("invalid url: must be non-empty string");
  }
  let u;
  try {
    u = new URL(input);
  } catch {
    throw new Error(`invalid url: ${input}`);
  }
  const proto = u.protocol.toLowerCase();
  if (proto === "https:" || allowHttp && proto === "http:") ;
  else {
    throw new Error(`invalid url: protocol ${proto} not allowed`);
  }
  if (!allowPrivate) {
    const host = u.hostname.toLowerCase();
    const stripped = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
    if (LOOPBACK_HOSTS.has(host) || LOOPBACK_HOSTS.has(stripped) || PRIVATE_IPV4_RE.test(host)) {
      throw new Error(`invalid url: private/loopback host blocked (SSRF): ${host}`);
    }
  }
  return input;
}
function assertSafeFileExt(ext, whitelist = DEFAULT_FILE_EXT_WHITELIST) {
  if (typeof ext !== "string" || ext.length === 0) {
    throw new Error("invalid extension: must be non-empty string");
  }
  const norm = (ext.startsWith(".") ? ext : "." + ext).toLowerCase();
  if (norm.lastIndexOf(".") !== 0) {
    throw new Error(`invalid extension: double extension not allowed: ${ext}`);
  }
  if (!whitelist.includes(norm)) {
    throw new Error(`invalid extension: ${norm} not in whitelist`);
  }
  return norm;
}
function encodePowershellCommand(script) {
  if (typeof script !== "string") {
    throw new Error("script must be a string");
  }
  const b64 = Buffer.from(script, "utf16le").toString("base64");
  return {
    exe: "powershell.exe",
    args: ["-NoProfile", "-NonInteractive", "-STA", "-EncodedCommand", b64]
  };
}
const fsp = fs$1.promises;
const THUMB_SIZE = 160;
const THUMB_QUALITY = "good";
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
let thumbCacheDir = null;
async function ensureCacheDir() {
  if (!thumbCacheDir) {
    thumbCacheDir = path$1.join(electron$1.app.getPath("userData"), "thumbnail_cache");
  }
  await fsp.mkdir(thumbCacheDir, { recursive: true });
  return thumbCacheDir;
}
async function getThumbPath(originalPath, st) {
  const stat = st || await fsp.stat(originalPath);
  const key = `${originalPath}|${stat.mtimeMs}|${stat.size}`;
  const hash = crypto.createHash("md5").update(key).digest("hex");
  const dir = await ensureCacheDir();
  return path$1.join(dir, `${hash}.jpg`);
}
async function _exists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}
async function generateThumbnail(originalPath, size = THUMB_SIZE) {
  try {
    if (!originalPath) return { success: false, error: "文件不存在" };
    let stat;
    try {
      stat = await fsp.stat(originalPath);
    } catch {
      return { success: false, error: "文件不存在" };
    }
    const ext = path$1.extname(originalPath).toLowerCase();
    if (!IMAGE_EXTS.includes(ext)) {
      return { success: false, error: "不是图片文件" };
    }
    const thumbPath = await getThumbPath(originalPath, stat);
    if (await _exists(thumbPath)) {
      return { success: true, thumbPath };
    }
    const img = electron$1.nativeImage.createFromPath(originalPath);
    if (img.isEmpty()) {
      return { success: false, error: "无法读取图片" };
    }
    const { width, height } = img.getSize();
    let newW, newH;
    if (width <= size && height <= size) {
      return { success: true, thumbPath: originalPath };
    } else if (width < height) {
      newW = size;
      newH = Math.round(height / width * size);
    } else {
      newH = size;
      newW = Math.round(width / height * size);
    }
    const resized = img.resize({ width: newW, height: newH, quality: THUMB_QUALITY });
    const jpegBuffer = resized.toJPEG(75);
    await fsp.writeFile(thumbPath, jpegBuffer);
    return { success: true, thumbPath };
  } catch (err) {
    console.error("[ThumbnailService] Error:", err);
    return { success: false, error: err.message };
  }
}
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const url = require("url");
const utils = require("@electron-toolkit/utils");
const events = require("events");
const os = require("os");
require("crypto");
const { autoUpdater } = require("electron-updater");
let sanshimanAllowedRoots = /* @__PURE__ */ new Set();
const icon = path.join(__dirname, "../../resources/icon.ico");
class TaskExecutor {
  static DEBUG = process.env.NODE_ENV === "development" || process.env.DEBUG === "1";
  static _secrets = /* @__PURE__ */ new Set();
  static _secretsMaxLen = 50;
  static registerSecret(value) {
    if (typeof value === "string" && value.length >= 4 && value.length <= this._secretsMaxLen) {
      this._secrets.add(value);
    }
  }
  static _mask(s) {
    if (typeof s !== "string") return s;
    let out = s;
    for (const secret of this._secrets) {
      if (secret.length >= 4) {
        const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        try {
          out = out.replaceAll(escaped, "[redacted]");
        } catch {
          out = out.split(escaped).join("[redacted]");
        }
      }
    }
    return out;
  }
  static debugLog(...args) {
    if (TaskExecutor.DEBUG) console.log(...args.map((a) => TaskExecutor._mask(a)));
  }
  static debugWarn(...args) {
    if (TaskExecutor.DEBUG) console.warn(...args.map((a) => TaskExecutor._mask(a)));
  }
  static async fetchWithTimeout(url2, options = {}, timeoutMs = 3e4) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs);
    try {
      const existingSignal = options.signal;
      if (existingSignal) {
        existingSignal.addEventListener("abort", () => controller.abort(existingSignal.reason));
      }
      return await fetch(url2, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }
  static MAX_BASE64_FILE_SIZE = 20 * 1024 * 1024;
  static MAX_BASE64_BODY_SIZE = 5 * 1024 * 1024;
  static MAX_VIDEO_POLL_ATTEMPTS = 300;
  static VIDEO_POLL_INTERVAL = 3e4;
  static MAX_IMAGE_POLL_ATTEMPTS = 120;
  static MAX_NETWORK_ERRORS = 5;
  static MAX_COMPLETED_TASKS = 50;
  static MAX_FAILED_TASKS = 50;
  static THUMBNAIL_SIZE = 160;
  static THUMBNAIL_QUALITY = "good";
  static JPEG_QUALITY = 75;
  static DEFAULT_JPG_QUALITY = 95;
  static WAL_CHECKPOINT_INTERVAL = 5 * 60 * 1e3;
  static MAX_RENDERER_CRASHES = 3;
  static TASK_QUEUE_CONCURRENCY = 3;
  static resolveLocalPath(filePath) {
    if (!filePath || typeof filePath !== "string") return filePath;
    let absolutePath = filePath;
    if (absolutePath.startsWith("sanshiman://local/?path=")) {
      absolutePath = decodeURIComponent(absolutePath.replace("sanshiman://local/?path=", ""));
    } else if (absolutePath.startsWith("file://")) {
      absolutePath = decodeURIComponent(absolutePath.replace("file://", ""));
    }
    if (process.platform === "win32" && absolutePath.match(/^\/[A-Za-z]:\//)) {
      absolutePath = absolutePath.slice(1);
    }
    return absolutePath;
  }
  static async getBase64FromLocalAsync(filePath) {
    if (!filePath) return filePath;
    if (typeof filePath !== "string") return filePath;
    if (filePath.startsWith("http://") || filePath.startsWith("https://") || filePath.startsWith("data:")) {
      return filePath;
    }
    try {
      let absolutePath = this.resolveLocalPath(filePath);
      let stat;
      try {
        stat = await fs.promises.stat(absolutePath);
      } catch {
        return filePath;
      }
      if (stat.size > TaskExecutor.MAX_BASE64_FILE_SIZE) {
        console.warn(
          `[TaskExecutor] 文件过大(${(stat.size / 1024 / 1024).toFixed(1)}MB)跳过base64:`,
          absolutePath
        );
        return filePath;
      }
      const buffer = await fs.promises.readFile(absolutePath);
      const ext = path.extname(absolutePath).toLowerCase().slice(1) || "png";
      let mimeType = "image/png";
      if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
      if (ext === "webp") mimeType = "image/webp";
      if (ext === "gif") mimeType = "image/gif";
      if (ext === "mp4") mimeType = "video/mp4";
      if (ext === "mp3") mimeType = "audio/mpeg";
      if (ext === "wav") mimeType = "audio/wav";
      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    } catch (e) {
      console.warn("[TaskExecutor] Failed to read local file to base64:", e);
    }
    return filePath;
  }
  // 把本地图片上传到 volctokens 虚拟人像库，等到 active 后返回 asset://asset_xxx
  // 适用于 baseUrl 是 volctokens 的视频生成任务遇到本地真人图的场景：
  // 直接发 /v1/videos 会被真人审核拦截，必须先走素材库登记
  static async _uploadToVolctokensAsset(filePath, apiKey, videoBaseUrl) {
    if (!filePath || !apiKey) return null;
    try {
      const absolutePath = this.resolveLocalPath(filePath);
      let fileData;
      try {
        fileData = await fs.promises.readFile(absolutePath);
      } catch {
        console.warn("[TaskExecutor] volctokens 素材文件不存在:", absolutePath);
        return null;
      }
      let uploadHost = "upload.volctokens.api.mengfactory.cn";
      try {
        const u = new URL(videoBaseUrl);
        const h = u.hostname.toLowerCase();
        uploadHost = h.startsWith("upload.") ? h : "upload." + h;
      } catch {
      }
      const ext = path.extname(absolutePath).slice(1).toLowerCase() || "png";
      const mimeMap = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", bmp: "image/bmp" };
      const mime = mimeMap[ext] || "image/png";
      const baseName = path.basename(absolutePath);
      const safeName = baseName.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 60) || "image";
      const qs = new URLSearchParams({ asset_type: "Image", name: safeName });
      const fd = new FormData();
      fd.append("file", new Blob([fileData], { type: mime }), baseName);
      console.log("[TaskExecutor] volctokens 自动入库:", baseName);
      const upRes = await fetch(`https://${uploadHost}/api/volc/assets?${qs}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: fd
      });
      const upText = await upRes.text();
      let upData;
      try {
        upData = upText ? JSON.parse(upText) : {};
      } catch {
        upData = { raw: upText };
      }
      if (!upRes.ok) {
        console.warn("[TaskExecutor] volctokens 入库失败:", upRes.status, upText.slice(0, 300));
        return null;
      }
      let asset_uri = upData.asset_uri || upData.asset?.asset_uri || "";
      let asset_id = upData.asset?.asset_id || "";
      if (!asset_id && typeof asset_uri === "string" && asset_uri.startsWith("asset://")) {
        asset_id = asset_uri.slice("asset://".length);
      }
      if (!asset_uri && asset_id) asset_uri = `asset://${asset_id}`;
      let status = upData.status || upData.asset?.status || "";
      if (!asset_uri) {
        console.warn("[TaskExecutor] volctokens 入库返回无 asset_uri:", JSON.stringify(upData).slice(0, 300));
        return null;
      }
      console.log(`[TaskExecutor] volctokens 入库成功: ${asset_uri.slice(0, 60)} status=${status}`);
      let queryHost = uploadHost.startsWith("upload.") ? uploadHost.slice("upload.".length) : uploadHost;
      const POLL_MAX_MS = 6e4;
      const POLL_INTERVAL_MS = 4e3;
      const startedAt = Date.now();
      while (status !== "active" && Date.now() - startedAt < POLL_MAX_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        try {
          const qRes = await fetch(`https://${queryHost}/v1/volc/assets/${encodeURIComponent(asset_id)}?refresh=true`, {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          const qText = await qRes.text();
          let qData;
          try {
            qData = qText ? JSON.parse(qText) : {};
          } catch {
            qData = {};
          }
          status = qData.asset?.status || qData.status || status;
          console.log(`[TaskExecutor] volctokens 素材状态轮询: ${status}`);
          if (status === "failed") {
            console.warn("[TaskExecutor] volctokens 素材处理失败:", JSON.stringify(qData).slice(0, 200));
            return null;
          }
        } catch (e) {
          console.warn("[TaskExecutor] volctokens 状态查询异常:", e.message);
        }
      }
      if (status !== "active") {
        console.warn("[TaskExecutor] volctokens 素材在 60s 内未到 active，仍尝试使用:", asset_uri);
      }
      return asset_uri;
    } catch (e) {
      console.error("[TaskExecutor] volctokens 自动入库异常:", e.message);
      return null;
    }
  }
  static async _uploadImageToProxy(filePath, apiKey) {
    if (!filePath || !apiKey) return null;
    try {
      let absolutePath = this.resolveLocalPath(filePath);
      let fileData;
      try {
        fileData = await fs.promises.readFile(absolutePath);
      } catch {
        console.warn("[TaskExecutor] 文件不存在跳过上传:", absolutePath);
        return null;
      }
      const ext = path.extname(absolutePath).toLowerCase().slice(1) || "png";
      const isAudio = ext === "mp3" || ext === "mpeg" || ext === "wav" || ext === "m4a";
      let mime, uploadName;
      if (isAudio) {
        const audioMimeMap = { mp3: "audio/mpeg", mpeg: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4" };
        mime = audioMimeMap[ext] || "audio/mpeg";
        uploadName = path.basename(absolutePath);
      } else {
        const videoMimeMap = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", qt: "video/quicktime", mkv: "video/x-matroska", avi: "video/x-msvideo", m4v: "video/x-m4v", flv: "video/x-flv", "3gp": "video/3gpp", wmv: "video/x-ms-wmv" };
        if (videoMimeMap[ext]) {
          mime = videoMimeMap[ext];
        } else if (ext === "jpg" || ext === "jpeg") {
          mime = "image/jpeg";
        } else {
          mime = `image/${ext}`;
        }
        uploadName = path.basename(absolutePath);
      }
      const formData = new FormData();
      formData.append("file", new Blob([fileData], { type: mime }), uploadName);
      TaskExecutor.debugLog(`[TaskExecutor] 上传${isAudio ? "音频" : "文件"}到中转图床...`);
      const res = await fetch("https://imageproxy.zhongzhuan.chat/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (data.url && data.url.startsWith("http")) {
        TaskExecutor.debugLog("[TaskExecutor] 图床上传成功:", data.url.substring(0, 80));
        return data.url;
      }
      console.warn("[TaskExecutor] 图床响应无URL:", JSON.stringify(data).substring(0, 200));
    } catch (e) {
      console.error("[TaskExecutor] 图床上传异常:", e);
    }
    return null;
  }
  static async _uploadAudioToUguu(filePath) {
    if (!filePath) return null;
    try {
      let absolutePath = this.resolveLocalPath(filePath);
      let fileData;
      try {
        fileData = await fs.promises.readFile(absolutePath);
      } catch {
        console.warn("[TaskExecutor] 音频文件不存在:", absolutePath);
        return null;
      }
      const formData = new FormData();
      formData.append("files[]", new Blob([fileData]), path.basename(absolutePath));
      TaskExecutor.debugLog("[TaskExecutor] 上传音频到uguu.se...");
      const res = await fetch("https://uguu.se/upload", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (data.success && data.files && data.files[0] && data.files[0].url) {
        TaskExecutor.debugLog("[TaskExecutor] 音频上传成功:", data.files[0].url);
        return data.files[0].url;
      }
      console.warn("[TaskExecutor] uguu响应无URL:", JSON.stringify(data).substring(0, 200));
    } catch (e) {
      console.error("[TaskExecutor] uguu上传异常:", e);
    }
    return null;
  }
  static async _uploadAudioToCatbox(filePath) {
    if (!filePath) return null;
    try {
      let absolutePath = this.resolveLocalPath(filePath);
      let fileData;
      try {
        fileData = await fs.promises.readFile(absolutePath);
      } catch {
        console.warn("[TaskExecutor] 音频文件不存在:", absolutePath);
        return null;
      }
      const ext = path.extname(absolutePath).toLowerCase().slice(1) || "mp3";
      const mimeMap = { mp3: "audio/mpeg", mpeg: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg", flac: "audio/flac", aac: "audio/aac" };
      const mime = mimeMap[ext] || "audio/mpeg";
      const formData = new FormData();
      formData.append("reqtype", "fileupload");
      formData.append("fileToUpload", new Blob([fileData], { type: mime }), path.basename(absolutePath));
      TaskExecutor.debugLog("[TaskExecutor] 上传音频到catbox.moe...");
      const res = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const url2 = (await res.text()).trim();
      if (url2 && url2.startsWith("http")) {
        TaskExecutor.debugLog("[TaskExecutor] catbox音频上传成功:", url2);
        return url2;
      }
      console.warn("[TaskExecutor] catbox响应无URL:", url2);
    } catch (e) {
      console.error("[TaskExecutor] catbox上传异常:", e);
    }
    return null;
  }
  static async _uploadToVolctokensCDN(filePath, apiKey) {
    if (!filePath || !apiKey) return null;
    try {
      let absolutePath = this.resolveLocalPath(filePath);
      let buffer;
      try {
        buffer = await fs.promises.readFile(absolutePath);
      } catch {
        console.warn("[TaskExecutor] volctokens: audio file not found:", absolutePath);
        return null;
      }
      const ext = path.extname(absolutePath).toLowerCase().slice(1) || "mp3";
      const mimeMap = { mp3: "audio/mpeg", mpeg: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg", flac: "audio/flac", aac: "audio/aac" };
      const mime = mimeMap[ext] || "audio/mpeg";
      const rawName = path.basename(absolutePath);
      const asciiSafe = /^[\x20-\x7E]+$/.test(rawName) ? rawName : `voice.${ext}`;
      const res = await fetch("https://upload.volctokens.api.mengfactory.cn/api/upload", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": mime,
          "X-Filename": asciiSafe
        },
        body: buffer
      });
      const respText = await res.text();
      console.log(`[TaskExecutor] volctokens audio upload status=${res.status} body=${respText.slice(0, 500)}`);
      if (!res.ok) {
        console.warn("[TaskExecutor] volctokens 音频上传 HTTP 错:", res.status);
        return null;
      }
      try {
        const data = JSON.parse(respText);
        if (data.success && data.url && data.url.startsWith("http")) {
          console.log(`[TaskExecutor] volctokens 音频上传成功: ${data.url.slice(0, 120)}`);
          return data.url;
        }
        console.warn("[TaskExecutor] volctokens 上传响应缺 url 字段:", respText.slice(0, 300));
      } catch (e) {
        console.warn("[TaskExecutor] volctokens 响应非 JSON:", respText.slice(0, 300));
      }
      return null;
    } catch (e) {
      console.error("[TaskExecutor] volctokens upload error:", e.message || e);
    }
    return null;
  }
  static async _uploadToFilesAPI(filePath, rootUrl, headers, signal) {
    if (!filePath) return null;
    try {
      let absolutePath = this.resolveLocalPath(filePath);
      let buffer;
      try {
        buffer = await fs.promises.readFile(absolutePath);
      } catch {
        console.warn("[TaskExecutor] 音频文件不存在:", absolutePath);
        return null;
      }
      const ext = path.extname(absolutePath).toLowerCase().slice(1) || "mp3";
      const formData = new FormData();
      formData.append("purpose", "user_data");
      formData.append("file", new Blob([buffer], { type: `audio/${ext === "mpeg" ? "mpeg" : ext === "wav" ? "wav" : ext === "m4a" ? "mp4" : "mpeg"}` }), `upload_${Date.now()}.${ext}`);
      const uploadHeaders = { ...headers };
      delete uploadHeaders["Content-Type"];
      delete uploadHeaders["content-type"];
      const filesEndpoint = `${rootUrl}/files`;
      TaskExecutor.debugLog("[TaskExecutor] 上传音频到素材库:", filesEndpoint);
      const res = await fetch(filesEndpoint, {
        method: "POST",
        headers: uploadHeaders,
        body: formData,
        signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (data.id) {
        TaskExecutor.debugLog("[TaskExecutor] 素材库上传成功，ASSET_ID:", data.id);
        return data.id;
      }
      console.warn("[TaskExecutor] 素材库响应无ID:", JSON.stringify(data).substring(0, 200));
    } catch (e) {
      console.error("[TaskExecutor] 素材库上传异常:", e);
    }
    return null;
  }
  /**
   * This is where the heavy lifting occurs.
   * Based on the node type (e.g. video generation, image generation), we make the HTTP API requests here from Node.js rather than the Chrome Renderer.
   *
   * @param {Object} task The task definition from TaskQueue
   * @param {Object} apiConfigs Pass in the validated global apis
   * @param {Function} updateCallback Call this to stream progress (e.g. video % done)
   */
  static async execute(task, apiConfigs, updateCallback) {
    const { payload } = task;
    const {
      baseUrl,
      apiKey,
      modelId,
      type,
      prompt,
      sizeStr,
      sourceImages,
      sourceVideos,
      sourceAudios,
      imageRoles,
      duration,
      ratio,
      resolution,
      configName,
      enableWebSearch,
      generateAudio,
      seed
    } = payload;
    const targetModel = configName || modelId;
    let cleanApiKey = apiKey;
    if (typeof cleanApiKey === "string") {
      cleanApiKey = cleanApiKey.replace(
        /^(?:export\s+)?(?:[A-Za-z0-9_]+=)?["']?([^"'\s]+)["']?$/,
        "$1"
      );
    }
    TaskExecutor.registerSecret(cleanApiKey);
    let rootUrl = baseUrl.replace(/\/+$/, "");
    const URL_REWRITES = {};
    if (URL_REWRITES[rootUrl]) {
      rootUrl = URL_REWRITES[rootUrl];
    }
    const signal = task.abortController?.signal;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleanApiKey}`
    };
    try {
      updateCallback(5, `初始化任务: ${modelId}...`);
      if (type === "image" && !modelId.includes("mj")) {
        updateCallback(20, "发送图像生成请求...");
        let submitEndpoint = `${rootUrl}/v1/images/generations`;
        let submitMethod = "POST";
        let submitHeaders = { ...headers };
        let submitBody;
        const isBananaLike = modelId.includes("banana") || modelId.includes("dall-e") || modelId.includes("gpt");
        const isNanoBanana = modelId.includes("nano-banana");
        const isGeminiChat = modelId.includes("gemini-3-pro-image-preview") || modelId.includes("gemini-2.5-flash-image");
        const isJimeng = modelId.includes("jimeng");
        if (sourceImages && sourceImages.length > 0) {
          const imgSrc = sourceImages[0];
          if (isGeminiChat) {
            submitEndpoint = `${rootUrl}/v1/chat/completions`;
            let imgPayload = imgSrc.trim();
            if (!imgPayload.startsWith("http") && !imgPayload.startsWith("data:")) {
              imgPayload = await this.getBase64FromLocalAsync(imgPayload);
              if (!imgPayload.startsWith("data:") && !imgPayload.startsWith("http")) {
                imgPayload = `data:image/png;base64,${imgPayload}`;
              }
            }
            submitBody = JSON.stringify({
              model: targetModel,
              stream: false,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt || "enhance" },
                    { type: "image_url", image_url: { url: imgPayload } }
                  ]
                }
              ],
              generationConfig: {
                responseModalities: ["IMAGE"],
                imageConfig: {
                  aspectRatio: ratio || "1:1",
                  imageSize: sizeStr || "1K"
                }
              }
            });
          } else if (isBananaLike) {
            if (isNanoBanana) {
              submitEndpoint = `${rootUrl}/v1/images/generations?async=true`;
              const trimmedImg = imgSrc.trim();
              let finalImg = await this.getBase64FromLocalAsync(trimmedImg);
              if (!finalImg.startsWith("http") && !finalImg.startsWith("data:")) {
                finalImg = `data:image/png;base64,${finalImg}`;
              }
              submitBody = JSON.stringify({
                model: targetModel,
                prompt: prompt || "enhance",
                image: [finalImg],
                response_format: "url",
                image_size: sizeStr || "1K",
                aspect_ratio: ratio || "1:1"
              });
            } else {
              submitEndpoint = `${rootUrl}/v1/images/edits`;
              delete submitHeaders["Content-Type"];
              const formData = new FormData();
              formData.append("model", targetModel);
              formData.append("prompt", prompt || "enhance");
              formData.append("n", "1");
              formData.append("size", sizeStr || "1024x1024");
              let blob;
              const finalImgSrc = await this.getBase64FromLocalAsync(imgSrc);
              if (finalImgSrc.startsWith("data:")) {
                const arr = finalImgSrc.split(",");
                const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
                const bstr = Buffer.from(arr[1], "base64").toString("binary");
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                  u8arr[n] = bstr.charCodeAt(n);
                }
                blob = new Blob([u8arr], { type: mime });
              } else {
                const fetchRes = await fetch(finalImgSrc);
                blob = await fetchRes.blob();
              }
              formData.append("image", blob, "input.png");
              submitBody = formData;
            }
          } else if (isJimeng) {
            submitEndpoint = `${rootUrl}/v1/images/compositions`;
            submitBody = JSON.stringify({
              model: targetModel,
              prompt: prompt || "enhance",
              images: [await this.getBase64FromLocalAsync(imgSrc)],
              response_format: "url"
            });
          } else {
            const reqBody = {
              model: targetModel,
              prompt: prompt || "",
              n: 1,
              size: sizeStr || "1024x1024"
            };
            const finalImgSrc = await this.getBase64FromLocalAsync(imgSrc);
            if (finalImgSrc.startsWith("http") || finalImgSrc.length < TaskExecutor.MAX_BASE64_BODY_SIZE) {
              reqBody.image_url = finalImgSrc;
            } else {
              console.warn(
                "[TaskExecutor] Base64 image is too large (>5MB) for JSON body. Dropping."
              );
            }
            submitBody = JSON.stringify(reqBody);
          }
        } else {
          if (isNanoBanana) {
            submitEndpoint = `${rootUrl}/v1/images/generations?async=true`;
          }
          const reqBody = {
            model: targetModel,
            prompt: prompt || "",
            n: 1,
            ...isNanoBanana ? { image_size: sizeStr || "1K", aspect_ratio: ratio || "1:1", response_format: "url" } : { size: sizeStr || "1024x1024" }
          };
          submitBody = JSON.stringify(reqBody);
        }
        const res = await fetch(submitEndpoint, {
          method: submitMethod,
          headers: submitHeaders,
          body: submitBody,
          signal
        });
        const _imgResText = await res.text();
        let data;
        try {
          data = _imgResText ? JSON.parse(_imgResText) : {};
        } catch (e) {
          throw new Error(`服务器返回了无效的响应 (HTTP ${res.status})，可能是接口路径错误或 API Key 无效。响应内容: ${_imgResText.slice(0, 300) || "(空响应体)"}`);
        }
        if (!res.ok) {
          const _errMsg = typeof data.error === "string" ? data.error : data.error?.message || data.message || data.detail || `HTTP ${res.status}`;
          throw new Error(`API 请求失败: ${_errMsg}`);
        }
        let imageUrl = data?.data?.[0]?.url || data?.images?.[0] || data?.url || data?.data?.[0]?.image_url;
        if (!imageUrl && data?.choices?.[0]?.message?.content) {
          const content = data.choices[0].message.content;
          const base64Match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/) || content.match(/([A-Za-z0-9+/=]{100,})/);
          const markdownImgMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
          const rawUrlMatch = content.match(/(https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|gif|webp))/i);
          if (base64Match) {
            imageUrl = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/) ? content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/)[0] : `data:image/png;base64,${base64Match[1]}`;
          } else if (markdownImgMatch) {
            imageUrl = markdownImgMatch[1];
          } else if (rawUrlMatch) {
            imageUrl = rawUrlMatch[1];
          }
        }
        if (imageUrl) {
          updateCallback(100, "生成成功");
          return { success: true, resultUrl: imageUrl };
        } else {
          const taskIdForPoll = data?.id || data?.task_id;
          if (taskIdForPoll) {
            updateCallback(30, `任务已提交, 排队中 (ID: ${taskIdForPoll})`);
            return await this.pollBananaImage(
              rootUrl,
              headers,
              taskIdForPoll,
              updateCallback,
              signal
            );
          }
          throw new Error("云端未返回任何有效图像连接或任务ID");
        }
      }
      if (type === "video") {
        updateCallback(10, "提交视频生成任务...");
        const _isAiiD = rootUrl.includes("api.aiid.edu.kg");
        const _isVolcanoArk = rootUrl.includes("ark.cn-beijing.volces.com") || _isAiiD;
        const _isSeedanceRelay = rootUrl.includes("sd2.mengfactory.cn") || rootUrl.includes("api.wantongapi.com");
        const _isVolctokens = rootUrl.includes("volctokens.api.mengfactory.cn");
        const _isCoolApi = rootUrl.includes("api.mjapi.cc.cd");
        if (_isCoolApi) {
          return await this._submitCoolApiTask({
            rootUrl,
            headers,
            cleanApiKey,
            targetModel,
            modelId,
            prompt,
            duration,
            ratio,
            sizeStr,
            resolution,
            sourceImages,
            sourceVideos,
            sourceAudios,
            updateCallback,
            signal
          });
        }
        let submitEndpoint = _isVolcanoArk ? `${rootUrl}/contents/generations/tasks` : `${rootUrl}/v1/videos/generations`;
        let reqBody = {};
        if (_isSeedanceRelay) {
          submitEndpoint = `${rootUrl}/v1/videos`;
          const _durationRaw = duration ? parseInt(String(duration).replace("s", ""), 10) : 5;
          const _duration2 = Math.max(4, Math.min(15, _durationRaw));
          const _resMap2 = { "720P": "720p", "480P": "480p", "1080P": "1080p" };
          const _resolution2 = _resMap2[resolution] || (resolution ? String(resolution).toLowerCase() : "720p");
          const _rawRatio2 = ratio || sizeStr || "auto";
          const _ratio2 = _rawRatio2 === "Auto" || _rawRatio2 === "AUTO" || _rawRatio2 === "adaptive" ? "auto" : _rawRatio2;
          const _modelName = targetModel || "seedance-2-0-pro";
          const _isFastModel = _modelName.includes("fast");
          reqBody = {
            model: _modelName,
            prompt: prompt || "",
            ratio: _ratio2,
            duration: _duration2,
            reference_mode: "omni_reference"
          };
          if (!_isFastModel) {
            reqBody.resolution = _resolution2;
          }
          if (generateAudio !== void 0) reqBody.generate_audio = generateAudio;
          if (typeof seed === "number" && Number.isInteger(seed)) reqBody.seed = seed;
          if (sourceImages && sourceImages.length > 0) {
            const _imgs = sourceImages.slice(0, 9);
            for (let index = 0; index < _imgs.length; index++) {
              const imgSrc = _imgs[index];
              let finalImgSrc;
              if (imgSrc.startsWith("asset://")) {
                finalImgSrc = imgSrc;
              } else if (imgSrc.startsWith("http://") || imgSrc.startsWith("https://") || imgSrc.startsWith("data:")) {
                finalImgSrc = imgSrc;
              } else {
                const uploadedUrl = await this._uploadImageToProxy(imgSrc, cleanApiKey);
                finalImgSrc = uploadedUrl || await this.getBase64FromLocalAsync(imgSrc);
              }
              reqBody[`image_file_${index + 1}`] = finalImgSrc;
            }
          }
          if (sourceAudios && sourceAudios.length > 0) {
            const _auds = sourceAudios.slice(0, 9);
            for (let index = 0; index < _auds.length; index++) {
              const audSrc = _auds[index];
              let finalAudSrc;
              if (audSrc.startsWith("http://") || audSrc.startsWith("https://") || audSrc.startsWith("data:")) {
                finalAudSrc = audSrc;
              } else {
                finalAudSrc = await this.getBase64FromLocalAsync(audSrc);
              }
              reqBody[`audio_file_${index + 1}`] = finalAudSrc;
            }
          }
          console.log("[TaskExecutor] SeedanceRelay request:", JSON.stringify({
            endpoint: submitEndpoint,
            model: reqBody.model,
            ratio: reqBody.ratio,
            duration: reqBody.duration,
            resolution: reqBody.resolution,
            images: Object.keys(reqBody).filter((k) => k.startsWith("image_file_")).length,
            audios: Object.keys(reqBody).filter((k) => k.startsWith("audio_file_")).length
          }));
        } else if (_isVolctokens) {
          submitEndpoint = rootUrl + "/v1/videos";
          const _vtRaw = `${targetModel || ""} ${modelId || ""}`.toLowerCase();
          const _isFast = /\bfast\b/.test(_vtRaw);
          const _isPro = !_isFast && /\bpro\b/.test(_vtRaw);
          const _vtModel = _isFast ? "seedance-2-0-fast" : "seedance-2-0";
          const _vtMode = _isPro ? "pro" : "std";
          const _durSec = String(Math.max(4, Math.min(15, duration ? parseInt(String(duration).replace("s", ""), 10) : 8)));
          const _resMapV = { "720P": "720p", "480P": "480p", "1080P": "1080p" };
          let _sizeV = _resMapV[resolution] || (resolution ? String(resolution).toLowerCase() : "720p");
          if (!["480p", "720p", "1080p"].includes(_sizeV)) _sizeV = "720p";
          const _rawR = ratio || sizeStr || "16:9";
          const _ratioV = _rawR === "Auto" || _rawR === "AUTO" || _rawR === "adaptive" ? "auto" : _rawR;
          reqBody = {
            model: _vtModel,
            prompt: prompt || "",
            mode: _vtMode,
            seconds: _durSec,
            size: _sizeV,
            metadata: {
              ratio: _ratioV,
              resolution: _sizeV,
              // 默认开启同步音频（跟火山引擎分支一致）；UI 显式传 false 时才关闭
              generate_audio: generateAudio !== void 0 ? generateAudio : true
            }
          };
          const _sd = payload.seed;
          if (typeof _sd === "number" && Number.isInteger(_sd)) reqBody.metadata.seed = _sd;
          if (sourceImages && sourceImages.length > 0) {
            const arr = [];
            for (let i = 0; i < sourceImages.length; i++) {
              let s = sourceImages[i];
              if (typeof s === "string") {
                const _m = s.match(/^(asset:\/\/[A-Za-z0-9_-]+|asset-[A-Za-z0-9_-]+)/);
                if (_m) s = _m[1];
              }
              const _isVolctokensUri = s.startsWith("asset://asset_");
              const _isLocalSanshimanId = s.startsWith("asset-") || s.startsWith("asset://asset-");
              if (_isVolctokensUri) {
                arr.push(s);
              } else if (_isLocalSanshimanId) {
                throw new Error(
                  `volctokens 不识别该素材引用：${s.slice(0, 50)}…
这是叁视漫本地素材库的临时 id，volctokens 看不到对应文件。
请改用以下任一方式：
① 按 Ctrl+Q 打开虚拟人像素材库，「本地文件」模式上传图片，等到 active 后用复制好的 asset:// 引用；
② 或者把图片以本地路径/HTTPS URL 形式直接传给视频节点（不要走素材库）。`
                );
              } else if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) {
                arr.push(s);
              } else {
                const auto = await this._uploadToVolctokensAsset(s, cleanApiKey, rootUrl);
                if (auto) {
                  arr.push(auto);
                } else {
                  const up = await this._uploadImageToProxy(s, cleanApiKey);
                  arr.push(up || await this.getBase64FromLocalAsync(s));
                }
              }
            }
            reqBody.images = arr;
          }
          if (sourceAudios && sourceAudios.length > 0) {
            console.log("[TaskExecutor] volctokens sourceAudios 原始值:", JSON.stringify(sourceAudios.map((s) => typeof s === "string" ? s.slice(0, 200) : typeof s)));
            const arr = [];
            for (const s of sourceAudios) {
              let u;
              const isHttp = s.startsWith("http://") || s.startsWith("https://");
              if (s.startsWith("data:") || isHttp) {
                u = s;
              } else {
                u = await this._uploadToVolctokensCDN(s, cleanApiKey);
                if (!u) {
                  throw new Error(
                    "音频上传失败：volctokens CDN 拒绝了文件。\n可能原因：文件过大 / 格式不支持 / 网络问题。\n请尝试用 mp3 / wav 重传，文件名建议英文。"
                  );
                }
              }
              arr.push({
                type: "audio_url",
                audio_url: { url: u },
                role: "reference_audio"
              });
            }
            reqBody.metadata.content = arr;
            reqBody.metadata.generate_audio = true;
          }
          console.log("[TaskExecutor] Volctokens request (full body):", JSON.stringify(reqBody).slice(0, 2e3));
          console.log("[TaskExecutor] Volctokens request:", JSON.stringify({
            endpoint: submitEndpoint,
            model: reqBody.model,
            mode: reqBody.mode,
            seconds: reqBody.seconds,
            size: reqBody.size,
            ratio: reqBody.metadata.ratio,
            generate_audio: reqBody.metadata.generate_audio,
            imagesCount: Array.isArray(reqBody.images) ? reqBody.images.length : 0,
            imagesSample: Array.isArray(reqBody.images) ? reqBody.images.map((s) => typeof s === "string" ? s.slice(0, 80) : typeof s) : null,
            audiosCount: Array.isArray(reqBody.metadata.content) ? reqBody.metadata.content.length : 0,
            audiosSample: Array.isArray(reqBody.metadata.content) ? reqBody.metadata.content.map((c) => c?.audio_url?.url || "?") : null
          }));
        } else if (modelId.includes("seedance") || targetModel.includes("seedance") || targetModel.includes("doubao")) {
          if (_isAiiD) {
            submitEndpoint = rootUrl.includes("/api/v3") ? `${rootUrl}/contents/generations/tasks` : `${rootUrl}/api/v3/contents/generations/tasks`;
          } else {
            submitEndpoint = _isVolcanoArk ? `${rootUrl}/contents/generations/tasks` : `${rootUrl}/v1/videos/generations`;
          }
          const _resMap = { "720P": "720p", "480P": "480p", "1080P": "1080p" };
          const _resolution = _resMap[resolution] || resolution || "720p";
          const _durationRaw = duration ? parseInt(String(duration).replace("s", ""), 10) : 5;
          const _is2x = targetModel.includes("2-0") || targetModel.includes("2.0") || targetModel.includes("1-5");
          const _ratio = ratio || sizeStr || (_is2x ? "adaptive" : "16:9");
          const _contentArr = [];
          if (prompt) {
            _contentArr.push({ type: "text", text: prompt });
          }
          if (_isVolcanoArk) {
            reqBody = {
              model: targetModel,
              content: _contentArr,
              resolution: _resolution,
              ratio: _ratio,
              duration: _durationRaw,
              generate_audio: generateAudio !== void 0 ? generateAudio : true,
              watermark: false
            };
            if (_isAiiD) {
              reqBody.prompt = prompt || "生成视频";
            }
            if (enableWebSearch && _is2x) {
              reqBody.tools = [{ type: "web_search" }];
            }
          } else {
            reqBody = {
              model: targetModel,
              prompt: prompt || "请根据提供的参考内容生成视频",
              metadata: {
                content: _contentArr,
                generate_audio: generateAudio !== void 0 ? generateAudio : true,
                ratio: _ratio,
                duration: _durationRaw,
                resolution: _resolution
              }
            };
            if (enableWebSearch) {
              reqBody.metadata.tools = [{ type: "web_search" }];
            }
          }
          const _pushContent = (item) => {
            if (_isVolcanoArk) {
              reqBody.content.push(item);
            } else {
              reqBody.metadata.content.push(item);
            }
          };
          if (sourceImages && sourceImages.length > 0) {
            for (let index = 0; index < sourceImages.length; index++) {
              const imgSrc = sourceImages[index];
              const role = imageRoles && imageRoles[index] || "reference_image";
              let finalImgSrc;
              if (imgSrc.startsWith("asset-")) {
                finalImgSrc = `asset://${imgSrc}`;
              } else if (imgSrc.startsWith("http://") || imgSrc.startsWith("https://") || imgSrc.startsWith("data:")) {
                finalImgSrc = imgSrc;
              } else if (!_isVolcanoArk || _isAiiD) {
                const uploadedUrl = await this._uploadImageToProxy(imgSrc, cleanApiKey);
                finalImgSrc = uploadedUrl || await this.getBase64FromLocalAsync(imgSrc);
              } else {
                finalImgSrc = await this.getBase64FromLocalAsync(imgSrc);
              }
              _pushContent({
                type: "image_url",
                image_url: { url: finalImgSrc },
                role
              });
            }
          }
          if (sourceVideos && sourceVideos.length > 0) {
            for (let i = 0; i < sourceVideos.length; i++) {
              let videoSrc = sourceVideos[i];
              const _isLocal = videoSrc.startsWith("file://") || videoSrc.startsWith("/") || videoSrc.match(/^[a-zA-Z]:\\/) || videoSrc.includes("localhost") || videoSrc.includes("127.0.0.1") || videoSrc.startsWith("blob:");
              if (_isLocal) {
                try {
                  TaskExecutor.debugLog(`[TaskExecutor] 本地视频参考，上传到火山 Files API:`, videoSrc);
                  let buffer = null;
                  let ext = videoSrc.split(".").pop().toLowerCase();
                  if (!["mp4", "mov"].includes(ext)) ext = "mp4";
                  if (videoSrc.startsWith("http://localhost") || videoSrc.startsWith("http://127.0.0.1") || videoSrc.startsWith("blob:")) {
                    const res2 = await fetch(videoSrc);
                    buffer = Buffer.from(await res2.arrayBuffer());
                  } else {
                    const absolutePath = this.resolveLocalPath(videoSrc);
                    if (absolutePath) {
                      try {
                        buffer = await fs.promises.readFile(absolutePath);
                      } catch {
                      }
                    }
                  }
                  if (buffer) {
                    const formData = new FormData();
                    formData.append("purpose", "user_data");
                    formData.append("file", new Blob([buffer], { type: `video/${ext}` }), `upload_${Date.now()}.${ext}`);
                    const uploadHeaders = { ...headers };
                    delete uploadHeaders["Content-Type"];
                    delete uploadHeaders["content-type"];
                    updateCallback(20, `正在上传视频参考到云端素材库...`);
                    const uploadRes = await fetch("https://ark.cn-beijing.volces.com/api/v3/files", {
                      method: "POST",
                      headers: uploadHeaders,
                      body: formData,
                      signal
                    });
                    if (!uploadRes.ok) {
                      throw new Error(`HTTP ${uploadRes.status}: ${await uploadRes.text()}`);
                    }
                    const uploadData = await uploadRes.json();
                    if (uploadData.id) {
                      videoSrc = uploadData.id;
                      TaskExecutor.debugLog(`[TaskExecutor] 上传成功，ASSET_ID:`, videoSrc);
                    }
                  }
                } catch (e) {
                  console.error(`[TaskExecutor] 视频上传失败:`, e);
                  throw new Error(`火山素材库视频上传失败: ${e.message}`);
                }
              }
              _pushContent({ type: "video_url", video_url: { url: videoSrc }, role: "reference_video" });
            }
          }
          if (sourceAudios && sourceAudios.length > 0) {
            for (const audioSrc of sourceAudios) {
              let finalAudioSrc;
              if (audioSrc.startsWith("http://") || audioSrc.startsWith("https://") || audioSrc.startsWith("data:")) {
                finalAudioSrc = audioSrc;
              } else if (!_isVolcanoArk || _isAiiD) {
                let uploadedUrl = null;
                if (_isAiiD) {
                  uploadedUrl = await this._uploadAudioToCatbox(audioSrc);
                  if (!uploadedUrl) {
                    uploadedUrl = await this._uploadAudioToUguu(audioSrc);
                  }
                  if (!uploadedUrl) {
                    uploadedUrl = await this._uploadToFilesAPI(audioSrc, rootUrl, headers, signal);
                  }
                } else {
                  uploadedUrl = await this._uploadImageToProxy(audioSrc, cleanApiKey);
                }
                finalAudioSrc = uploadedUrl || await this.getBase64FromLocalAsync(audioSrc);
              } else {
                finalAudioSrc = await this.getBase64FromLocalAsync(audioSrc);
              }
              _pushContent({ type: "audio_url", audio_url: { url: finalAudioSrc }, role: "reference_audio" });
            }
          }
        } else {
          if (modelId.includes("grok") || modelId.includes("veo") || targetModel.includes("grok") || targetModel.includes("veo")) {
            submitEndpoint = `${rootUrl}/v2/videos/generations`;
          }
          reqBody = {
            model: targetModel,
            prompt: prompt || ""
          };
          if (sourceImages && sourceImages.length > 0) {
            reqBody.image_url = await this.getBase64FromLocalAsync(sourceImages[0]);
          }
        }
        TaskExecutor.debugLog(`[TaskExecutor] Preparing to fetch: ${submitEndpoint}`);
        TaskExecutor.debugLog(`[TaskExecutor] Headers:`, {
          ...headers,
          Authorization: headers.Authorization ? "Bearer ***" : void 0
        });
        TaskExecutor.debugLog(`[TaskExecutor] Body:`, JSON.stringify(reqBody, null, 2));
        let res;
        try {
          res = await fetch(submitEndpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(reqBody),
            signal
          });
        } catch (error) {
          console.error(`[TaskExecutor] fetch failed catastrophically:`, error);
          let errorDetails = error.message;
          if (error.cause) {
            errorDetails += ` | Cause: ${error.cause.message || error.cause}`;
          }
          throw new Error(
            `网络请求核心报错: ${errorDetails}`
          );
        }
        const _vidResText = await res.text();
        let data;
        try {
          data = _vidResText ? JSON.parse(_vidResText) : {};
        } catch (e) {
          throw new Error(`服务器返回了无效的响应 (HTTP ${res.status})，可能是接口路径错误或 API Key 无效。响应内容: ${_vidResText.slice(0, 300) || "(空响应体)"}`);
        }
        if (!res.ok) {
          console.error("[TaskExecutor] API error response:", _vidResText.slice(0, 500));
          const _errMsg = typeof data.error === "string" ? data.error : data.error?.message || data.message || data.detail || `HTTP ${res.status}`;
          throw new Error(`API 请求失败: ${_errMsg}`);
        }
        let jobId = data?.id || data?.data?.id || data?.task_id;
        if (typeof jobId === "string") {
          jobId = jobId.replace(/\/fetch$/, "");
        }
        if (!jobId) {
          const vidUrl = data?.data?.url || data?.url;
          if (vidUrl) {
            updateCallback(100, "生成成功");
            return { success: true, resultUrl: vidUrl };
          }
          throw new Error("无法从响应中提取任务 Job ID");
        }
        updateCallback(30, `任务已推入云端队列 (Job: ${jobId})`);
        return await this.pollVideoTask(
          rootUrl,
          headers,
          jobId,
          targetModel,
          updateCallback,
          signal
        );
      }
      throw new Error(`仅支持标准图像或视频, 当前请求异常: ${modelId} (${type})`);
    } catch (err) {
      throw new Error(err.message);
    }
  }
  // ── Cool API (api.mjapi.cc.cd) ─────────────────────────────────────────
  static async _uploadFileToCoolApi(filePath, rootUrl, apiKey) {
    try {
      const buffer = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase().replace(/^\./, "") || "png";
      const mimeMap = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        bmp: "image/bmp",
        mp4: "video/mp4",
        webm: "video/webm",
        mov: "video/quicktime",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        m4a: "audio/mp4"
      };
      const mime = mimeMap[ext] || "application/octet-stream";
      const fd = new FormData();
      fd.append("file", new Blob([buffer], { type: mime }), path.basename(filePath));
      const res = await fetch(`${rootUrl}/v1/cool/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: fd
      });
      if (!res.ok) {
        console.error(`[TaskExecutor] Cool upload HTTP ${res.status}`);
        return null;
      }
      const data = await res.json();
      return data?.file_url || null;
    } catch (e) {
      console.error("[TaskExecutor] Cool upload failed:", e && e.message);
      return null;
    }
  }
  static async _submitCoolApiTask({ rootUrl, headers, cleanApiKey, targetModel, modelId, prompt, duration, ratio, sizeStr, resolution, sourceImages, sourceVideos, sourceAudios, updateCallback, signal }) {
    const _coolModel = targetModel || modelId || "seedance_2";
    const _coolDurationRaw = duration ? parseInt(String(duration).replace("s", ""), 10) : 5;
    let _coolDuration = Math.max(1, Math.min(15, _coolDurationRaw));
    if (_coolModel === "r_sd2" && _coolDuration <= 10) {
      _coolDuration = 11;
    }
    const _resMapCool = { "720P": "720p", "480P": "480p", "1080P": "1080p" };
    let _coolResolution = _resMapCool[resolution] || (resolution ? String(resolution).toLowerCase() : void 0);
    if (!["480p", "720p", "1080p"].includes(_coolResolution)) {
      _coolResolution = "720p";
    }
    if (_coolModel === "r_sd2" && _coolResolution !== "480p" && _coolResolution !== "720p") {
      _coolResolution = "720p";
    }
    const _coolValidRatios = ["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3", "2:1"];
    const _coolRawRatio = ratio || sizeStr || "16:9";
    let _coolRatio = _coolRawRatio === "Auto" || _coolRawRatio === "AUTO" || _coolRawRatio === "adaptive" ? "16:9" : _coolRawRatio;
    if (!_coolValidRatios.includes(_coolRatio)) _coolRatio = "16:9";
    const _coolFiles = [];
    const _resolveSrc = async (src, fallbackType) => {
      if (!src) return null;
      if (src.startsWith("http://") || src.startsWith("https://")) {
        return { url: src, type: fallbackType };
      }
      if (src.startsWith("data:")) {
        return null;
      }
      const absPath = typeof TaskExecutor.resolveLocalPath === "function" ? TaskExecutor.resolveLocalPath(src) : src;
      if (absPath) {
        const uploaded = await TaskExecutor._uploadFileToCoolApi(absPath, rootUrl, cleanApiKey);
        if (uploaded) return { url: uploaded, type: fallbackType };
      }
      return null;
    };
    if (sourceImages && sourceImages.length > 0) {
      for (const img of sourceImages) {
        const f = await _resolveSrc(img, "image");
        if (f) _coolFiles.push(f);
      }
    }
    if (sourceVideos && sourceVideos.length > 0) {
      for (const v of sourceVideos) {
        const f = await _resolveSrc(v, "video");
        if (f) _coolFiles.push(f);
      }
    }
    if (sourceAudios && sourceAudios.length > 0) {
      for (const a of sourceAudios) {
        const f = await _resolveSrc(a, "audio");
        if (f) _coolFiles.push(f);
      }
    }
    const reqBody = {
      prompt: prompt || "",
      model: _coolModel,
      ratio: _coolRatio,
      duration: _coolDuration
    };
    if (_coolResolution) reqBody.resolution = _coolResolution;
    if (_coolFiles.length > 0) reqBody.files = _coolFiles;
    const submitEndpoint = `${rootUrl}/v1/cool/generate`;
    TaskExecutor.debugLog(`[TaskExecutor] Cool API submit:`, JSON.stringify({
      endpoint: submitEndpoint,
      model: reqBody.model,
      ratio: reqBody.ratio,
      duration: reqBody.duration,
      resolution: reqBody.resolution,
      files: _coolFiles.length
    }));
    const submitRes = await fetch(submitEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(reqBody),
      signal
    });
    const submitText = await submitRes.text();
    let submitData;
    try {
      submitData = submitText ? JSON.parse(submitText) : {};
    } catch {
      throw new Error(`Cool API 返回非 JSON 响应 (HTTP ${submitRes.status}): ${submitText.slice(0, 300)}`);
    }
    if (!submitRes.ok) {
      const _err = submitData?.error?.message || submitData?.message || submitData?.detail || `HTTP ${submitRes.status}`;
      throw new Error(`Cool API 提交失败: ${_err}`);
    }
    const taskId = submitData?.task_id;
    if (!taskId) throw new Error("Cool API 提交成功但未返回 task_id");
    updateCallback(30, `Cool API 任务已提交 (ID: ${taskId})`);
    return await TaskExecutor.pollCoolApiTask(rootUrl, headers, taskId, updateCallback, signal);
  }
  static async pollCoolApiTask(rootUrl, headers, taskId, updateCallback, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error("Task Cancelled locally"));
      }
      let attempts = 0;
      const maxAttempts = TaskExecutor.MAX_VIDEO_POLL_ATTEMPTS;
      let errorCount = 0;
      let progress = 30;
      const pollEndpoint = `${rootUrl}/v1/cool/task/${taskId}`;
      const COOL_FAIL_STATUSES = ["FAILED", "ERROR", "CANCELLED", "CANCELED", "EXPIRED", "TIMEOUT", "TIMED_OUT", "REJECTED", "INVALID", "BLOCKED", "FORBIDDEN", "ABORTED", "INTERNAL_ERROR", "INSUFFICIENT_QUOTA", "RATE_LIMITED"];
      const timer = setInterval(async () => {
        try {
          attempts++;
          if (attempts > maxAttempts) {
            clearInterval(timer);
            return reject(new Error("Cool API 视频轮询超时"));
          }
          const res = await TaskExecutor.fetchWithTimeout(pollEndpoint, { method: "GET", headers, signal }, 3e4);
          if (!res.ok) {
            errorCount++;
            console.error(`[TaskExecutor] [Cool Poll ${attempts}] HTTP ${res.status}, 连续错误: ${errorCount}`);
            if (errorCount >= 5) {
              clearInterval(timer);
              return reject(new Error(`Cool API 轮询接口异常 (HTTP ${res.status})，已停止`));
            }
            return;
          }
          let data;
          try {
            data = await res.json();
          } catch {
            errorCount++;
            if (errorCount >= 5) {
              clearInterval(timer);
              return reject(new Error("Cool API 轮询返回非 JSON，已停止"));
            }
            return;
          }
          errorCount = 0;
          const status = String(data?.status || "").toUpperCase();
          TaskExecutor.debugLog(`[TaskExecutor] [Cool Poll ${attempts}]`, status);
          const independentErr = data?.error || data?.error_message || data?.fail_reason;
          if (independentErr && status !== "SUCCESS") {
            clearInterval(timer);
            return reject(new Error(typeof independentErr === "string" ? independentErr : independentErr.message || "Cool API 报错"));
          }
          if (status === "SUCCESS") {
            clearInterval(timer);
            const finalUrl = data?.result?.url;
            if (finalUrl) {
              updateCallback(100, "视频生成完毕");
              resolve({ success: true, resultUrl: finalUrl });
            } else {
              reject(new Error("Cool API 任务完成但未返回视频链接"));
            }
          } else if (COOL_FAIL_STATUSES.includes(status)) {
            clearInterval(timer);
            reject(new Error(typeof data?.error === "string" ? data.error : data?.error?.message || data?.message || `Cool API 任务${status.toLowerCase()}`));
          } else {
            progress = Math.min(95, progress + 1);
            const hint = status === "PENDING" ? "Cool API 排队中..." : "Cool API 生成中...";
            updateCallback(progress, hint);
          }
        } catch (err) {
          if (err.name === "AbortError") {
            clearInterval(timer);
            return reject(new Error("Task Cancelled locally"));
          }
          console.error("[Engine] Cool Poll Network Error:", err);
          errorCount++;
          if (errorCount >= 5) {
            clearInterval(timer);
            reject(new Error("Cool API 轮询连续网络错误，已停止: " + err.message));
          }
        }
      }, 5e3);
      if (signal) {
        signal.addEventListener("abort", () => clearInterval(timer), { once: true });
      }
    });
  }
  static async pollVideoTask(rootUrl, headers, jobId, targetModel, updateCallback, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error("Task Cancelled locally"));
      }
      let attempts = 0;
      const maxAttempts = TaskExecutor.MAX_VIDEO_POLL_ATTEMPTS;
      let progress = 30;
      let errorCount = 0;
      const _isAiiDPoll = rootUrl.includes("api.aiid.edu.kg");
      const _isVolcanoArkPoll = rootUrl.includes("ark.cn-beijing.volces.com") || _isAiiDPoll;
      const _isVolctokensPoll = rootUrl.includes("volctokens.api.mengfactory.cn");
      let pollEndpoint = _isVolcanoArkPoll ? `${rootUrl}/contents/generations/tasks/${jobId}` : `${rootUrl}/v1/videos/${jobId}`;
      if (targetModel.includes("seedance") || targetModel.includes("doubao")) {
        if (_isAiiDPoll) {
          pollEndpoint = rootUrl.includes("/api/v3") ? `${rootUrl}/contents/generations/tasks/${jobId}` : `${rootUrl}/api/v3/contents/generations/tasks/${jobId}`;
        } else {
          pollEndpoint = _isVolcanoArkPoll ? `${rootUrl}/contents/generations/tasks/${jobId}` : `${rootUrl}/v1/videos/${jobId}`;
        }
      } else if (targetModel.includes("grok") || targetModel.includes("veo")) {
        pollEndpoint = `${rootUrl}/v2/videos/generations/${jobId}`;
      }
      const timer = setInterval(async () => {
        try {
          attempts++;
          if (attempts > maxAttempts) {
            clearInterval(timer);
            return reject(new Error("视频生成超时"));
          }
          const res = await TaskExecutor.fetchWithTimeout(pollEndpoint, {
            method: "GET",
            headers,
            signal
          }, 45e3);
          if (!res.ok) {
            errorCount++;
            console.error(`[TaskExecutor] [Video Poll ${attempts}] HTTP ${res.status}, 连续错误: ${errorCount}`);
            if (errorCount >= 5) {
              clearInterval(timer);
              return reject(new Error(`视频轮询接口异常 (HTTP ${res.status})，已停止`));
            }
            return;
          }
          let data;
          try {
            data = await res.json();
          } catch {
            errorCount++;
            console.error(`[TaskExecutor] [Video Poll ${attempts}] 响应非 JSON, 连续错误: ${errorCount}`);
            if (errorCount >= 5) {
              clearInterval(timer);
              return reject(new Error("视频轮询接口返回非 JSON 数据，已停止"));
            }
            return;
          }
          errorCount = 0;
          TaskExecutor.debugLog(`[TaskExecutor] [Video Poll ${attempts}]`, data.status || data.state);
          if (attempts === 1 || attempts === 3 || attempts === 8) {
            try {
              const topKeys = data && typeof data === "object" ? Object.keys(data) : [];
              const dataKeys = data && data.data && typeof data.data === "object" ? Object.keys(data.data) : [];
              console.log(`[VideoPoll diag #${attempts}] topKeys=${JSON.stringify(topKeys)} dataKeys=${JSON.stringify(dataKeys)} sample=${JSON.stringify(data).slice(0, 400)}`);
            } catch {
            }
          }
          const status = (data?.data?.status || data?.status || data?.task_status || "").toUpperCase();
          const independentErr = data?.data?.fail_reason || data?.fail_reason || data?.error_message || data?.data?.error_message || data?.data?.error?.message || data?.error?.message || (typeof data?.error === "string" ? data.error : null);
          if (independentErr && status !== "SUCCESS" && status !== "SUCCEEDED" && status !== "COMPLETED" && status !== "FINISHED") {
            clearInterval(timer);
            return reject(new Error(String(independentErr)));
          }
          const FAIL_STATUSES = ["FAILED", "ERROR", "CANCELLED", "CANCELED", "EXPIRED", "TIMEOUT", "TIMED_OUT", "REJECTED", "INVALID", "BLOCKED", "FORBIDDEN", "ABORTED", "INTERNAL_ERROR", "INSUFFICIENT_QUOTA", "RATE_LIMITED"];
          if (status === "SUCCESS" || status === "SUCCEEDED" || status === "COMPLETED" || status === "FINISHED") {
            clearInterval(timer);
            const finalUrl = data?.result?.url || data?.video?.url || data?.data?.video?.url || data?.metadata?.url || data?.content?.video_url || data?.data?.data?.video_url || data?.data?.video_url || data?.data?.url || data?.data?.output?.video_url || data?.data?.output || data?.result?.video_url || data?.result_url || data?.data?.result_url || data?.video_url || data?.url || data?.output || data?.data?.videos?.[0]?.url || data?.data?.videos?.[0];
            /* @__PURE__ */ console.log("[TaskExecutor] Task completed:", TaskExecutor._mask(JSON.stringify({
              status,
              finalUrl: finalUrl?.substring(0, 100),
              rawSample: JSON.stringify(data).substring(0, 200)
            })));
            if (finalUrl) {
              updateCallback(100, "视频生成完毕");
              resolve({ success: true, resultUrl: finalUrl });
            } else {
              const debugPayload = JSON.stringify(data).substring(0, 300);
              console.error(
                "[TaskExecutor] No video URL found in response:",
                JSON.stringify(data, null, 2)
              );
              reject(new Error(`云端任务完成, 但提取流地址失败! 请将此行截图反馈: ${debugPayload}`));
            }
          } else if (FAIL_STATUSES.includes(status)) {
            clearInterval(timer);
            const rawDump = (() => {
              try {
                return JSON.stringify(data).slice(0, 300);
              } catch {
                return String(data).slice(0, 300);
              }
            })();
            console.error("[TaskExecutor] Video task FAILED, raw response:", rawDump);
            const errorStr = data?.data?.fail_reason || data?.fail_reason || data?.error?.message || data?.data?.error?.message || data?.message || data?.error || `服务侧发生未知错误 (status=${status}, raw=${rawDump})`;
            reject(new Error(errorStr));
          } else {
            let serverProgress;
            const cands = [
              data?.progress,
              data?.percent,
              data?.task_progress,
              data?.process,
              data?.data?.progress,
              data?.data?.percent,
              data?.data?.task_progress,
              data?.data?.process,
              data?.result?.progress,
              data?.output?.progress
            ];
            for (const c of cands) {
              if (typeof c === "number" && c >= 0 && c <= 100) {
                serverProgress = c;
                break;
              }
            }
            let hint;
            if (typeof serverProgress === "number") {
              progress = Math.round(serverProgress);
              hint = "构架场景中...";
              if (progress > 50) hint = "正在渲染帧序列...";
              if (progress > 85) hint = "打包流媒体中...";
            } else {
              progress = Math.min(95, progress + 1);
              hint = "等待服务器进度...";
            }
            updateCallback(progress, hint);
          }
        } catch (err) {
          if (err.name === "AbortError") {
            clearInterval(timer);
            return reject(new Error("Task Cancelled locally"));
          }
          console.error("[Engine] Video Poll Network Error:", err);
          errorCount++;
          if (errorCount >= 5) {
            clearInterval(timer);
            reject(new Error("视频轮询连续网络错误，已停止: " + err.message));
          }
        }
      }, _isVolctokensPoll ? 15e3 : 3e4);
      if (signal) {
        signal.addEventListener("abort", () => clearInterval(timer), { once: true });
      }
    });
  }
  static async pollBananaImage(rootUrl, headers, taskId, updateCallback, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error("Task Cancelled locally"));
      }
      let attempts = 0;
      let progress = 30;
      let errorCount = 0;
      const timer = setInterval(async () => {
        try {
          attempts++;
          if (attempts > TaskExecutor.MAX_IMAGE_POLL_ATTEMPTS) {
            clearInterval(timer);
            return reject(new Error("图像轮询超时"));
          }
          const res = await TaskExecutor.fetchWithTimeout(`${rootUrl}/v1/images/tasks/${taskId}`, { headers, signal }, 3e4);
          if (!res.ok) {
            errorCount++;
            console.error(`[TaskExecutor] [Image Poll ${attempts}] HTTP ${res.status}, 连续错误: ${errorCount}`);
            if (errorCount >= 5) {
              clearInterval(timer);
              return reject(new Error(`图像轮询接口异常 (HTTP ${res.status})，已停止`));
            }
            return;
          }
          let data;
          try {
            data = await res.json();
          } catch {
            errorCount++;
            console.error(`[TaskExecutor] [Image Poll ${attempts}] 响应非 JSON, 连续错误: ${errorCount}`);
            if (errorCount >= 5) {
              clearInterval(timer);
              return reject(new Error("图像轮询接口返回非 JSON 数据，已停止"));
            }
            return;
          }
          errorCount = 0;
          TaskExecutor.debugLog(`[TaskExecutor] [Image Poll ${attempts}]`, data.status || data.state);
          const status = (data?.data?.status || data?.status || "").toUpperCase();
          const independentErr = data?.data?.fail_reason || data?.fail_reason || data?.error_message || data?.data?.error_message || data?.data?.error?.message || data?.error?.message || (typeof data?.error === "string" ? data.error : null);
          if (independentErr && status !== "SUCCESS" && status !== "SUCCEEDED" && status !== "COMPLETED") {
            clearInterval(timer);
            return reject(new Error(String(independentErr)));
          }
          const FAIL_STATUSES_IMG = ["FAILED", "ERROR", "CANCELLED", "CANCELED", "EXPIRED", "TIMEOUT", "TIMED_OUT", "REJECTED", "INVALID", "BLOCKED", "FORBIDDEN", "ABORTED", "INTERNAL_ERROR", "INSUFFICIENT_QUOTA", "RATE_LIMITED"];
          if (status === "SUCCESS" || status === "SUCCEEDED" || status === "COMPLETED") {
            clearInterval(timer);
            const imageUrl = data?.data?.url || data?.url || data?.data?.[0]?.url || data?.data?.[0]?.image_url || data?.image_url || data?.data?.image_url || data?.images?.[0]?.url || data?.images?.[0] || data?.data?.images?.[0]?.url || data?.data?.images?.[0] || data?.output || data?.data?.output || data?.data?.result?.url || data?.data?.data?.data?.[0]?.url || data?.data?.data?.[0]?.url || data?.data?.data?.images?.[0]?.url;
            try {
              if (!electron.app.isPackaged) {
                fs.writeFileSync(
                  path.join(electron.app.getPath("userData"), "banana_debug.json"),
                  JSON.stringify(data, null, 2)
                );
              }
            } catch (e) {
              console.error("Failed to write banana_debug.json", e);
            }
            if (imageUrl) {
              updateCallback(100, "生成成功");
              resolve({ success: true, resultUrl: imageUrl });
            } else {
              console.error(
                "[TaskExecutor] No image URL found in response:",
                JSON.stringify(data, null, 2)
              );
              reject(new Error("图像任务完成但未返回URL"));
            }
          } else if (FAIL_STATUSES_IMG.includes(status)) {
            clearInterval(timer);
            const errorStr = data?.data?.fail_reason || data?.fail_reason || data?.error?.message || data?.data?.error?.message || data?.message || data?.error || `图像生成失败 (status=${status})`;
            reject(new Error(String(errorStr)));
          } else {
            let serverProgress;
            const cands = [
              data?.progress,
              data?.percent,
              data?.task_progress,
              data?.process,
              data?.data?.progress,
              data?.data?.percent,
              data?.data?.task_progress,
              data?.data?.process,
              data?.result?.progress,
              data?.output?.progress
            ];
            for (const c of cands) {
              if (typeof c === "number" && c >= 0 && c <= 100) {
                serverProgress = c;
                break;
              }
            }
            if (attempts === 1 || attempts === 3 || attempts === 8) {
              try {
                const topKeys = data && typeof data === "object" ? Object.keys(data) : [];
                const dataKeys = data && data.data && typeof data.data === "object" ? Object.keys(data.data) : [];
                console.log(`[ImagePoll diag #${attempts}] topKeys=${JSON.stringify(topKeys)} dataKeys=${JSON.stringify(dataKeys)} sample=${JSON.stringify(data).slice(0, 400)}`);
              } catch {
              }
            }
            let hint;
            if (typeof serverProgress === "number") {
              progress = Math.round(serverProgress);
              hint = "生成中...";
            } else {
              progress = Math.min(95, progress + 1);
              hint = "等待服务器进度...";
            }
            updateCallback(progress, hint);
          }
        } catch (err) {
          if (err.name === "AbortError") {
            clearInterval(timer);
            return reject(new Error("Task Cancelled locally"));
          }
          console.error("[Engine] Image Poll Network Error:", err);
          errorCount++;
          if (errorCount >= 5) {
            clearInterval(timer);
            reject(new Error("图像轮询连续网络错误，已停止: " + err.message));
          }
        }
      }, 1e4);
      if (signal) {
        signal.addEventListener("abort", () => clearInterval(timer), { once: true });
      }
    });
  }
}
class TaskQueue extends events.EventEmitter {
  constructor(concurrency = 3) {
    super();
    this.concurrency = concurrency;
    this.activeTasks = /* @__PURE__ */ new Map();
    this.waitingQueue = [];
    this.completedTasks = /* @__PURE__ */ new Map();
    this.failedTasks = /* @__PURE__ */ new Map();
  }
  submitTask(taskPayload) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const abortController = new AbortController();
    const task = {
      id: taskId,
      status: "waiting",
      progress: 0,
      createdAt: Date.now(),
      payload: taskPayload,
      abortController
    };
    this.waitingQueue.push(task);
    this.emit("task-updated", task);
    this.processQueue();
    return taskId;
  }
  processQueue() {
    if (this.activeTasks.size >= this.concurrency) {
      return;
    }
    if (this.waitingQueue.length === 0) {
      this.emit("queue-empty");
      return;
    }
    const task = this.waitingQueue.shift();
    this.activeTasks.set(task.id, task);
    task.status = "processing";
    this.emit("task-updated", task);
    this.executeTask(task);
  }
  async executeTask(task) {
    try {
      const result = await TaskExecutor.execute(task, {}, (progress, message) => {
        if (this.activeTasks.has(task.id)) {
          task.progress = progress;
          if (message) task.statusMessage = message;
          this.emit("task-updated", task);
        }
      });
      if (!this.activeTasks.has(task.id)) {
        throw new Error("Task Cancelled locally");
      }
      task.status = "completed";
      task.resultUrl = result.resultUrl;
      /* @__PURE__ */ console.log("[TaskQueue] Task completed:", TaskExecutor._mask(JSON.stringify({
        id: task.id,
        status: task.status,
        resultUrl: task.resultUrl?.substring(0, 50),
        payload: task.payload
      })));
      this.activeTasks.delete(task.id);
      this.completedTasks.set(task.id, task);
      if (this.completedTasks.size > 50) {
        const oldest = this.completedTasks.keys().next().value;
        this.completedTasks.delete(oldest);
      }
      this.emit("task-updated", task);
    } catch (error) {
      task.status = "failed";
      task.error = error.message;
      this.activeTasks.delete(task.id);
      this.failedTasks.set(task.id, task);
      if (this.failedTasks.size > 50) {
        const oldest = this.failedTasks.keys().next().value;
        this.failedTasks.delete(oldest);
      }
      this.emit("task-updated", task);
    } finally {
      this.processQueue();
    }
  }
  cancelTask(taskId) {
    const waitIndex = this.waitingQueue.findIndex((t) => t.id === taskId);
    if (waitIndex !== -1) {
      const task = this.waitingQueue.splice(waitIndex, 1)[0];
      task.status = "cancelled";
      this.emit("task-updated", task);
      return true;
    }
    if (this.activeTasks.has(taskId)) {
      const task = this.activeTasks.get(taskId);
      task.abortController?.abort();
      this.activeTasks.delete(taskId);
      task.status = "cancelled";
      this.emit("task-updated", task);
      this.processQueue();
      return true;
    }
    return false;
  }
  getStatus() {
    return {
      active: Array.from(this.activeTasks.values()),
      waiting: this.waitingQueue,
      completed: Array.from(this.completedTasks.values()).slice(-20),
      // Only keep last 20 for memory
      failed: Array.from(this.failedTasks.values()).slice(-20)
    };
  }
}
const globalTaskQueue = new TaskQueue();
let ipcCallCount = 0;
function incrementIpcCount() {
  ipcCallCount++;
}
const appStartTime = Date.now();
async function collectStats() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  let dbStats = null;
  try {
    if (!db) throw new Error("db not initialized");
    const tables = ["projects", "nodes", "connections", "history", "assets", "settings"];
    const tableCounts = {};
    for (const table of tables) {
      try {
        const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        tableCounts[table] = row.count;
      } catch {
        tableCounts[table] = -1;
      }
    }
    const dbPath = !electron.app.isPackaged ? path.join(process.cwd(), "canvas_data.db") : path.join(electron.app.getPath("userData"), "canvas_data.db");
    let dbFileSize = 0;
    let walFileSize = 0;
    try {
      const dbStat = await fs.promises.stat(dbPath).catch(() => null);
      if (dbStat) dbFileSize = dbStat.size;
      const walStat = await fs.promises.stat(dbPath + "-wal").catch(() => null);
      if (walStat) walFileSize = walStat.size;
    } catch {
    }
    dbStats = { tableCounts, dbFileSize, walFileSize };
  } catch (e) {
    dbStats = { error: e.message };
  }
  let engineStats = { active: 0, waiting: 0, completed: 0, failed: 0 };
  try {
    const status = globalTaskQueue.getStatus();
    engineStats = {
      active: status.active?.length || 0,
      waiting: status.waiting?.length || 0,
      completed: status.completed?.length || 0,
      failed: status.failed?.length || 0
    };
  } catch {
  }
  let cacheStats = { images: { count: 0, size: 0 }, videos: { count: 0, size: 0 } };
  try {
    const cacheBase = path.join(electron.app.getPath("userData"), "LocalCache");
    const scanDir = async (dirPath) => {
      let count = 0;
      let size = 0;
      try {
        const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
        for (const dirent of files) {
          if (dirent.isFile()) {
            try {
              const stat = await fs.promises.stat(path.join(dirPath, dirent.name));
              count++;
              size += stat.size;
            } catch {
            }
          }
        }
      } catch {
      }
      return { count, size };
    };
    cacheStats.images = await scanDir(path.join(cacheBase, "images"));
    cacheStats.videos = await scanDir(path.join(cacheBase, "videos"));
  } catch {
  }
  const cpus = os.cpus();
  return {
    system: {
      platform: process.platform,
      osVersion: os.release(),
      arch: os.arch(),
      cpuModel: cpus[0]?.model || "Unknown",
      cpuCores: cpus.length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      v8Version: process.versions.v8
    },
    process: {
      uptime: Date.now() - appStartTime,
      pid: process.pid,
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      cpuUser: cpuUsage.user,
      cpuSystem: cpuUsage.system
    },
    database: dbStats,
    engine: engineStats,
    ipc: {
      registeredChannels: 38,
      totalCalls: ipcCallCount
    },
    cache: cacheStats,
    timestamp: Date.now()
  };
}
let currentConfig = null;
function setupIpcHandlers() {
  const originalHandle = electron.ipcMain.handle.bind(electron.ipcMain);
  electron.ipcMain.handle = (channel, handler) => {
    return originalHandle(channel, async (...args) => {
      incrementIpcCount();
      return handler(...args);
    });
  };
  let _seedanceAssetsWin = null;
  globalThis._openSeedanceAssetsWindow = function() {
    if (_seedanceAssetsWin && !_seedanceAssetsWin.isDestroyed()) {
      _seedanceAssetsWin.focus();
      return;
    }
    _seedanceAssetsWin = new electron.BrowserWindow({
      width: 1100,
      height: 720,
      title: "Seedance 虚拟人像素材库",
      backgroundColor: "#0f1117",
      webPreferences: {
        preload: path.join(__dirname, "seedance-assets-preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });
    _seedanceAssetsWin.removeMenu();
    _seedanceAssetsWin.loadFile(path.join(__dirname, "seedance-assets.html"));
    _seedanceAssetsWin.on("closed", () => {
      _seedanceAssetsWin = null;
    });
  };
  async function _seedanceFetch(method, url2, apiKey, opts) {
    opts = opts || {};
    const headers = { "Authorization": `Bearer ${apiKey}` };
    if (opts.json) headers["Content-Type"] = "application/json";
    let data;
    try {
      const res = await fetch(url2, { method, headers, body: opts.body });
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      if (!res.ok) {
        const msg = data?.error?.message || data?.message || data?.error || `HTTP ${res.status}`;
        return { ok: false, error: typeof msg === "string" ? msg : JSON.stringify(msg), status: res.status, data };
      }
      return { ok: true, data, status: res.status };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }
  electron.ipcMain.handle("seedance:assets:pickFile", async (_e) => {
    try {
      const parent = electron.BrowserWindow.fromWebContents(_e.sender) || _seedanceAssetsWin || electron.BrowserWindow.getFocusedWindow() || electron.BrowserWindow.getAllWindows()[0];
      const opts = {
        title: "选择图片素材",
        properties: ["openFile"],
        filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "gif"] }]
      };
      const r = parent ? await electron.dialog.showOpenDialog(parent, opts) : await electron.dialog.showOpenDialog(opts);
      if (r.canceled || !r.filePaths || !r.filePaths.length) return null;
      return r.filePaths[0];
    } catch (e) {
      console.warn("[Seedance] pickFile failed:", e && (e.message || e));
      return null;
    }
  });
  function _sdDetectVolctokens(baseUrl) {
    let host = "";
    try {
      host = new URL(baseUrl).hostname.toLowerCase();
    } catch {
      return null;
    }
    if (!host.includes("volctokens")) return null;
    const isUpload = host.startsWith("upload.");
    const mainHost = isUpload ? host.slice("upload.".length) : host;
    const uploadHost = isUpload ? host : "upload." + host;
    return {
      isVolctokens: true,
      mainBase: `https://${mainHost}`,
      uploadBase: `https://${uploadHost}`
    };
  }
  electron.ipcMain.handle("seedance:assets:create", async (_e, p) => {
    try {
      const baseRaw = String(p.baseUrl || "").replace(/\/+$/, "");
      const vt = _sdDetectVolctokens(baseRaw);
      const isVolctokens = !!vt;
      const target = isVolctokens ? `${vt.uploadBase}/api/volc/assets` : `${baseRaw}/v1/volc/assets`;
      if (p.mode === "url") {
        if (isVolctokens) {
          return { ok: false, error: "volctokens 上传仅支持本地文件，请切换到「本地文件」模式" };
        }
        const body = { url: p.url, asset_type: p.asset_type || "Image" };
        if (p.name) body.name = p.name;
        if (p.description) body.description = p.description;
        const r2 = await _seedanceFetch("POST", target, p.apiKey, { json: true, body: JSON.stringify(body) });
        return _sdNormalizeCreateResponse(r2);
      }
      assertSafeAbsolutePath(p.filePath, Array.from(sanshimanAllowedRoots));
      const buf = await fs.promises.readFile(p.filePath);
      const ext = path.extname(p.filePath).slice(1).toLowerCase() || "png";
      const mimeMap = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", bmp: "image/bmp" };
      const mime = mimeMap[ext] || "image/png";
      let url2 = target;
      let fd;
      if (isVolctokens) {
        const qs = new URLSearchParams();
        qs.set("asset_type", p.asset_type || "Image");
        if (p.name) qs.set("name", p.name);
        if (p.description) qs.set("description", p.description);
        url2 = `${target}?${qs.toString()}`;
        fd = new FormData();
        fd.append("file", new Blob([buf], { type: mime }), path.basename(p.filePath));
      } else {
        fd = new FormData();
        fd.append("file", new Blob([buf], { type: mime }), path.basename(p.filePath));
        fd.append("asset_type", p.asset_type || "Image");
        if (p.name) fd.append("name", p.name);
        if (p.description) fd.append("description", p.description);
      }
      const r = await _seedanceFetch("POST", url2, p.apiKey, { body: fd });
      console.log("[Seedance] assets:create →", url2.replace(/\?.*$/, "?…"), "status=", r?.status, r?.ok ? "OK" : "ERR " + (r?.error || ""));
      return _sdNormalizeCreateResponse(r);
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });
  function _sdNormalizeCreateResponse(r) {
    if (!r || !r.ok) return r;
    const d = r.data || {};
    let asset_uri = d.asset_uri || d.asset?.asset_uri || "";
    let asset_id = d.asset?.asset_id || "";
    if (!asset_id && asset_uri.startsWith("asset://")) {
      asset_id = asset_uri.slice("asset://".length);
    }
    if (!asset_uri && asset_id) asset_uri = `asset://${asset_id}`;
    const status = d.status || d.asset?.status || "";
    return { ok: true, status: r.status, data: d, asset_uri, asset_id, asset_status: status };
  }
  electron.ipcMain.handle("seedance:assets:list", async (_e, p) => {
    try {
      const baseRaw = String(p.baseUrl || "").replace(/\/+$/, "");
      const vt = _sdDetectVolctokens(baseRaw);
      const listBase = vt ? vt.mainBase : baseRaw;
      const qs = new URLSearchParams();
      ["asset_type", "status", "search", "sort_by", "sort_order"].forEach((k) => {
        if (p[k]) qs.set(k, p[k]);
      });
      if (p.page) qs.set("page", String(p.page));
      if (p.page_size) qs.set("page_size", String(p.page_size));
      const q = qs.toString();
      const url2 = `${listBase}/v1/volc/assets${q ? `?${q}` : ""}`;
      const r = await _seedanceFetch("GET", url2, p.apiKey);
      console.log("[Seedance] assets:list →", url2.replace(/\?.*$/, q ? "?…" : ""), "status=", r?.status, r?.ok ? `OK (${r?.data?.assets?.length ?? "?"} items)` : "ERR " + (r?.error || ""));
      return r;
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });
  electron.ipcMain.handle("seedance:assets:get", async (_e, p) => {
    try {
      const baseRaw = String(p.baseUrl || "").replace(/\/+$/, "");
      const vt = _sdDetectVolctokens(baseRaw);
      const queryBase = vt ? vt.mainBase : baseRaw;
      const tail = p.refresh ? "?refresh=true" : "";
      return await _seedanceFetch("GET", `${queryBase}/v1/volc/assets/${encodeURIComponent(p.asset_id)}${tail}`, p.apiKey);
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });
  electron.ipcMain.handle("seedance:assets:delete", async (_e, p) => {
    try {
      const baseRaw = String(p.baseUrl || "").replace(/\/+$/, "");
      const vt = _sdDetectVolctokens(baseRaw);
      const deleteBase = vt ? vt.mainBase : baseRaw;
      const r = await _seedanceFetch("DELETE", `${deleteBase}/v1/volc/assets/${encodeURIComponent(p.asset_id)}`, p.apiKey);
      console.log("[Seedance] assets:delete →", p.asset_id?.slice(0, 30), "status=", r?.status, r?.ok ? "OK" : "ERR " + (r?.error || ""));
      return r;
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });
  electron.ipcMain.handle("seedance:assets:copyText", async (_e, text) => {
    try {
      electron.clipboard.writeText(String(text || ""));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  electron.ipcMain.handle("seedance:open-asset-library", () => {
    globalThis._openSeedanceAssetsWindow();
    return true;
  });
  const _SD_DEFAULT_ACCEL = "CommandOrControl+Q";
  const _sdConfigPath = path.join(electron.app.getPath("userData"), "seedance-config.json");
  function _readSdConfig() {
    try {
      const txt = fs.readFileSync(_sdConfigPath, "utf8");
      const j = JSON.parse(txt);
      return j && typeof j === "object" ? j : {};
    } catch {
      return {};
    }
  }
  function _writeSdConfig(obj) {
    try {
      fs.writeFileSync(_sdConfigPath, JSON.stringify(obj, null, 2), "utf8");
      return true;
    } catch (e) {
      console.warn("[Seedance] 写配置失败:", e);
      return false;
    }
  }
  globalThis._sdGetShortcut = function() {
    const cfg = _readSdConfig();
    return cfg.shortcut && typeof cfg.shortcut === "string" ? cfg.shortcut : _SD_DEFAULT_ACCEL;
  };
  let _sdCurrentShortcut = null;
  globalThis._sdRegisterShortcut = function(accel) {
    try {
      if (_sdCurrentShortcut) {
        try {
          electron.globalShortcut.unregister(_sdCurrentShortcut);
        } catch {
        }
      }
      const ok = electron.globalShortcut.register(accel, () => {
        if (typeof globalThis._openSeedanceAssetsWindow === "function") globalThis._openSeedanceAssetsWindow();
      });
      if (ok) {
        _sdCurrentShortcut = accel;
        console.log(`[Seedance] 已注册快捷键 ${accel}`);
        return { ok: true, accelerator: accel };
      } else {
        console.warn(`[Seedance] 快捷键 ${accel} 注册失败（可能被占用）`);
        return { ok: false, error: `快捷键 ${accel} 注册失败，可能被其他程序占用`, accelerator: _sdCurrentShortcut };
      }
    } catch (e) {
      return { ok: false, error: e.message || String(e), accelerator: _sdCurrentShortcut };
    }
  };
  electron.ipcMain.handle("seedance:shortcut:get", () => {
    return { ok: true, accelerator: globalThis._sdGetShortcut(), active: _sdCurrentShortcut, default: _SD_DEFAULT_ACCEL };
  });
  electron.ipcMain.handle("seedance:shortcut:set", (_e, p) => {
    const accel = String(p && p.accelerator || "").trim();
    if (!accel) return { ok: false, error: "快捷键不能为空" };
    const r = globalThis._sdRegisterShortcut(accel);
    if (r.ok) {
      const cfg = _readSdConfig();
      cfg.shortcut = accel;
      _writeSdConfig(cfg);
    }
    return r;
  });
  electron.ipcMain.handle("seedance:shortcut:reset", () => {
    const r = globalThis._sdRegisterShortcut(_SD_DEFAULT_ACCEL);
    if (r.ok) {
      const cfg = _readSdConfig();
      delete cfg.shortcut;
      _writeSdConfig(cfg);
    }
    return r;
  });
  const defaultSavePath = path.join(electron.app.getPath("userData"), "LocalCache");
  const _saveConfigPath = path.join(electron.app.getPath("userData"), "save-config.json");
  let _diskSavedConfig = {};
  try {
    if (fs.existsSync(_saveConfigPath)) {
      _diskSavedConfig = JSON.parse(fs.readFileSync(_saveConfigPath, "utf-8")) || {};
    }
  } catch (e) {
    console.error(`[savePath] read save-config.json failed:`, e && e.message);
  }
  const _savedImagePath = _diskSavedConfig.image_save_path || getSetting("image_save_path");
  const _savedVideoPath = _diskSavedConfig.video_save_path || getSetting("video_save_path");
  const _savedConvertPng = _diskSavedConfig.convert_png_to_jpg ?? getSetting("convert_png_to_jpg");
  const _savedJpgQuality = _diskSavedConfig.jpg_quality ?? getSetting("jpg_quality");
  console.log(`[savePath] startup: disk-image="${_diskSavedConfig.image_save_path}" disk-video="${_diskSavedConfig.video_save_path}" db-image="${getSetting("image_save_path")}"`);
  currentConfig = {
    image_save_path: _savedImagePath || path.join(defaultSavePath, "images"),
    video_save_path: _savedVideoPath || path.join(defaultSavePath, "videos"),
    convert_png_to_jpg: _savedConvertPng === null || _savedConvertPng === void 0 ? true : _savedConvertPng === "true" || _savedConvertPng === true || _savedConvertPng === "1",
    jpg_quality: _savedJpgQuality ? parseInt(String(_savedJpgQuality), 10) || 95 : 95
  };
  console.log(`[savePath] currentConfig now: image="${currentConfig.image_save_path}" video="${currentConfig.video_save_path}"`);
  function _persistSaveConfig() {
    try {
      fs.writeFileSync(_saveConfigPath, JSON.stringify({
        image_save_path: currentConfig.image_save_path,
        video_save_path: currentConfig.video_save_path,
        convert_png_to_jpg: currentConfig.convert_png_to_jpg,
        jpg_quality: currentConfig.jpg_quality
      }, null, 2), "utf-8");
      console.log(`[savePath] persisted to ${_saveConfigPath}`);
    } catch (e) {
      console.error(`[savePath] write save-config.json failed:`, e && e.message);
    }
  }
  const ensureDirs = () => {
    if (!fs.existsSync(currentConfig.image_save_path)) {
      fs.mkdirSync(currentConfig.image_save_path, { recursive: true });
    }
    if (!fs.existsSync(currentConfig.video_save_path)) {
      fs.mkdirSync(currentConfig.video_save_path, { recursive: true });
    }
  };
  ensureDirs();
  electron.ipcMain.handle("cache:openDirectory", async (event, currentPath) => {
    const defaultPath = currentPath || electron.app.getPath("home");
    const { canceled, filePaths } = await electron.dialog.showOpenDialog({
      defaultPath,
      properties: ["openDirectory"]
    });
    if (canceled || filePaths.length === 0) {
      return { success: false };
    }
    return { success: true, path: filePaths[0] };
  });
  electron.ipcMain.handle("cache:openFiles", async (event, options = {}) => {
    const { filters, multiple = true } = options;
    const dialogOptions = {
      properties: multiple ? ["openFile", "multiSelections"] : ["openFile"]
    };
    if (filters) {
      dialogOptions.filters = filters;
    }
    const { canceled, filePaths } = await electron.dialog.showOpenDialog(dialogOptions);
    if (canceled || filePaths.length === 0) {
      return { success: false, paths: [] };
    }
    return { success: true, paths: filePaths };
  });
  electron.ipcMain.handle("cache:ping", () => {
    return {
      status: "ok",
      image_save_path: currentConfig.image_save_path,
      video_save_path: currentConfig.video_save_path,
      convert_png_to_jpg: currentConfig.convert_png_to_jpg,
      pil_available: false
    };
  });
  electron.ipcMain.handle("cache:config", (event, newConfig) => {
    try {
      console.log(`[savePath] cache:config received:`, JSON.stringify(newConfig));
      let changed = false;
      if (newConfig.imageSavePath) {
        currentConfig.image_save_path = newConfig.imageSavePath;
        sanshimanAllowedRoots.add(path.resolve(newConfig.imageSavePath));
        setSetting("image_save_path", newConfig.imageSavePath);
        changed = true;
      }
      if (newConfig.videoSavePath) {
        currentConfig.video_save_path = newConfig.videoSavePath;
        sanshimanAllowedRoots.add(path.resolve(newConfig.videoSavePath));
        setSetting("video_save_path", newConfig.videoSavePath);
        changed = true;
      }
      if (typeof newConfig.convertPngToJpg === "boolean") {
        currentConfig.convert_png_to_jpg = newConfig.convertPngToJpg;
        setSetting("convert_png_to_jpg", newConfig.convertPngToJpg ? "true" : "false");
        changed = true;
      }
      if (newConfig.jpgQuality) {
        currentConfig.jpg_quality = newConfig.jpgQuality;
        setSetting("jpg_quality", String(newConfig.jpgQuality));
        changed = true;
      }
      ensureDirs();
      if (changed) _persistSaveConfig();
      return { success: true, config: currentConfig };
    } catch (e) {
      console.error(`[savePath] cache:config error:`, e);
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("cache:save-thumbnail", async (event, { id, content, category }) => {
    try {
      if (!id || !content) return { success: false, error: "缺少必要参数" };
      const base64Data = content.replace(/^data:([A-Za-z-+/]+);base64,/, "");
      const fileName = `${category}_thumb_${id.replace(/[^a-zA-Z0-9_-]/g, "")}.jpg`;
      const filePath = path.join(currentConfig.image_save_path, fileName);
      await fs.promises.writeFile(filePath, base64Data, "base64");
      return { success: true, url: filePath, path: filePath };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("cache:save-cache", async (event, { id, content, category, ext, type }) => {
    try {
      if (!id || !content) return { success: false, error: "缺少必要参数" };
      const isVideo = type === "video";
      const targetDir = isVideo ? currentConfig.video_save_path : currentConfig.image_save_path;
      const rawExt = ext || (isVideo ? ".mp4" : ".jpg");
      const writeExt = assertSafeFileExt(rawExt);
      const fileName = `${category}_${id.replace(/[^a-zA-Z0-9_-]/g, "")}${writeExt}`;
      const filePath = path.join(targetDir, fileName);
      const base64Data = content.replace(/^data:([A-Za-z-+/]+);base64,/, "");
      await fs.promises.writeFile(filePath, base64Data, "base64");
      return { success: true, url: filePath, path: filePath };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("cache:download-url", async (event, { url: url2, id, type }) => {
    /* @__PURE__ */ console.log("[cache:download-url] Called with:", { url: url2?.substring(0, 50), id, type });
    try {
      if (!url2 || !id) {
        console.error("[cache:download-url] Missing params");
        return { success: false, error: "缺少必要参数" };
      }
      assertSafeDownloadUrl(url2);
      const isVideo = type === "video";
      const targetDir = isVideo ? currentConfig.video_save_path : currentConfig.image_save_path;
      /* @__PURE__ */ console.log("[cache:download-url] Target dir:", targetDir);
      let ext = isVideo ? ".mp4" : ".jpg";
      try {
        const urlObj = new URL(url2);
        const pathExt = path.extname(urlObj.pathname);
        if (pathExt) ext = assertSafeFileExt(pathExt);
      } catch {
      }
      const fileName = `gen_${id.replace(/[^a-zA-Z0-9_-]/g, "")}${ext}`;
      const filePath = path.join(targetDir, fileName);
      const res = await fetch(url2);
      if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
      const MAX_BYTES = 200 * 1024 * 1024;
      const lenHeader = res.headers.get("content-length");
      if (lenHeader && parseInt(lenHeader, 10) > MAX_BYTES) {
        throw new Error(`Download too large: ${lenHeader} bytes > ${MAX_BYTES}`);
      }
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > MAX_BYTES) {
        throw new Error(`Download too large: ${buffer.byteLength} bytes > ${MAX_BYTES}`);
      }
      await fs.promises.writeFile(filePath, Buffer.from(buffer));
      const sanshimanUrl = `sanshiman://local/?path=${encodeURIComponent(filePath)}`;
      let thumbPath = null;
      if (!isVideo) {
        try {
          const thumbResult = await generateThumbnail(filePath);
          if (thumbResult.success && thumbResult.thumbPath !== filePath) {
            thumbPath = thumbResult.thumbPath;
          }
        } catch (e) {
          console.warn("[cache:download-url] Thumbnail generation failed:", e.message);
        }
      }
      return { success: true, url: sanshimanUrl, path: filePath, thumbPath };
    } catch (e) {
      console.error("Download error:", e);
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("system:show-item-in-folder", (event, absolutePath) => {
    try {
      const userDataDir = electron.app.getPath("userData");
      const homeDir = electron.app.getPath("home");
      const resolvedPath = path.resolve(absolutePath);
      const allowedDirs = [
        userDataDir,
        currentConfig?.image_save_path,
        currentConfig?.video_save_path,
        homeDir
      ].filter(Boolean);
      const isAllowed = allowedDirs.some((dir) => resolvedPath.startsWith(path.resolve(dir)));
      if (!isAllowed) {
        console.warn("[Security] showItemInFolder blocked for path outside allowed dirs:", resolvedPath);
        return { success: false, error: "路径不在允许范围内" };
      }
      electron.shell.showItemInFolder(resolvedPath);
      return { success: true };
    } catch (e) {
      console.error("Failed to show item in folder:", e);
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("cache:check", (event, { basePath }) => {
    try {
      const fullPath = path.join(electron.app.getPath("userData"), "LocalCache", basePath);
      if (fs.existsSync(fullPath)) {
        const sanshimanUrl = `sanshiman://local/?path=${encodeURIComponent(fullPath)}`;
        return { exists: true, url: sanshimanUrl, path: fullPath };
      }
      return { exists: false };
    } catch (e) {
      console.error("[ipcHandlers] cache:check error:", e);
      return { exists: false, error: e.message };
    }
  });
  electron.ipcMain.handle("cache:delete-batch", (event, { files }) => {
    try {
      const cacheRoot = path.join(electron.app.getPath("userData"), "LocalCache");
      const results = files.map((f) => {
        try {
          if (f.path) {
            const fullPath = assertSafeRelativePath(f.path, cacheRoot);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
          }
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      });
      return { success: true, results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("cache:clear-generated", async () => {
    try {
      const dirs = [
        currentConfig.image_save_path,
        currentConfig.video_save_path,
        path.join(electron.app.getPath("userData"), "thumbnail_cache")
      ];
      let totalFiles = 0;
      let totalBytes = 0;
      for (const dir of dirs) {
        try {
          await fs.promises.access(dir);
        } catch {
          continue;
        }
        const files = await fs.promises.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          try {
            const stat = await fs.promises.stat(filePath);
            if (stat.isFile()) {
              totalBytes += stat.size;
              await fs.promises.unlink(filePath);
              totalFiles++;
            }
          } catch (e) {
            console.warn("[cache:clear-generated] Failed to delete:", filePath, e.message);
          }
        }
      }
      return { success: true, deletedFiles: totalFiles, freedBytes: totalBytes };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("cache:clear-history", async () => {
    try {
      const result = clearAllHistory();
      return { success: true, changes: result.changes };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("engine:submit-task", (event, payload) => {
    try {
      const taskId = globalTaskQueue.submitTask(payload);
      return { success: true, taskId };
    } catch (e) {
      console.error("Task Submission Error:", e);
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("engine:cancel-task", (event, taskId) => {
    try {
      const success = globalTaskQueue.cancelTask(taskId);
      return { success };
    } catch (e) {
      console.error("[ipcHandlers] cancel-task error:", e);
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("engine:get-status", () => {
    return { success: true, status: globalTaskQueue.getStatus() };
  });
  globalTaskQueue.on("task-updated", (task) => {
    /* @__PURE__ */ console.log("[ipcHandlers] Broadcasting task-updated:", {
      id: task.id,
      status: task.status,
      progress: task.progress,
      resultUrl: task.resultUrl?.substring(0, 50),
      error: task.error,
      hasPayload: !!task.payload,
      payloadNodeId: task.payload?.nodeId,
      payloadHistoryTaskId: task.payload?.historyTaskId
    });
    electron.BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("engine:task-update", task);
    });
  });
  electron.ipcMain.handle("db:projects:list", () => getAllProjects());
  electron.ipcMain.handle("db:projects:get", (_, id) => getProject(id));
  electron.ipcMain.handle("db:projects:save", (_, project) => saveProject(project));
  electron.ipcMain.handle("db:projects:delete", (_, id) => deleteProject(id));
  electron.ipcMain.handle("db:nodes:list", (_, projectId) => getNodesByProject(projectId));
  electron.ipcMain.handle("db:nodes:save", (_, { node, projectId }) => saveNode(node, projectId));
  electron.ipcMain.handle(
    "db:nodes:saveBatch",
    (_, { nodes, projectId }) => saveNodesBatch(nodes, projectId)
  );
  electron.ipcMain.handle("db:nodes:delete", (_, id) => deleteNode(id));
  electron.ipcMain.handle("db:nodes:deleteByProject", (_, projectId) => deleteNodesByProject(projectId));
  electron.ipcMain.handle("db:connections:list", (_, projectId) => getConnectionsByProject(projectId));
  electron.ipcMain.handle(
    "db:connections:save",
    (_, { connection, projectId }) => saveConnection(connection, projectId)
  );
  electron.ipcMain.handle(
    "db:connections:saveBatch",
    (_, { connections, projectId }) => saveConnectionsBatch(connections, projectId)
  );
  electron.ipcMain.handle("db:connections:delete", (_, id) => deleteConnection(id));
  electron.ipcMain.handle(
    "db:connections:deleteByProject",
    (_, projectId) => deleteConnectionsByProject(projectId)
  );
  electron.ipcMain.handle(
    "db:history:list",
    (_, { projectId, limit }) => getHistoryByProject(projectId, limit)
  );
  electron.ipcMain.handle("db:history:listAll", (_, limit) => getAllHistory(limit));
  electron.ipcMain.handle("db:history:save", (_, { item, projectId }) => saveHistoryItem(item, projectId));
  electron.ipcMain.handle(
    "db:history:saveBatch",
    (_, { items, projectId }) => saveHistoryBatch(items, projectId)
  );
  electron.ipcMain.handle("db:history:delete", (_, id) => deleteHistoryItem(id));
  electron.ipcMain.handle("db:settings:get", (_, key) => getSetting(key));
  electron.ipcMain.handle("db:settings:set", (_, { key, value }) => {
    const r = setSetting(key, value);
    if (typeof key === "string" && key.endsWith("ApiUrl")) _customApiHostsCache = null;
    return r;
  });
  electron.ipcMain.handle("db:settings:delete", (_, key) => deleteSetting(key));
  electron.ipcMain.handle("db:settings:getAll", () => getAllSettings());
  electron.ipcMain.handle("db:settings:setBatch", (_, entries) => {
    const r = setSettingsBatch(entries);
    try {
      if (Array.isArray(entries) && entries.some((e) => e && typeof e.key === "string" && e.key.endsWith("ApiUrl"))) {
        _customApiHostsCache = null;
      }
    } catch {
    }
    return r;
  });
  electron.ipcMain.handle("safeStorage:isAvailable", () => electron.safeStorage.isEncryptionAvailable());
  electron.ipcMain.handle("safeStorage:encrypt", (_, plainText) => {
    if (!electron.safeStorage.isEncryptionAvailable()) {
      throw new Error("safeStorage 加密不可用");
    }
    const encrypted = electron.safeStorage.encryptString(plainText);
    return encrypted.toString("base64");
  });
  electron.ipcMain.handle("safeStorage:decrypt", (_, base64Cipher) => {
    if (!electron.safeStorage.isEncryptionAvailable()) {
      throw new Error("safeStorage 解密不可用");
    }
    const buffer = Buffer.from(base64Cipher, "base64");
    return electron.safeStorage.decryptString(buffer);
  });
  electron.ipcMain.handle("monitor:get-stats", async () => {
    return await collectStats();
  });
  electron.ipcMain.handle("thumbnail:generate", async (_, { filePath, size }) => {
    const ext = path.extname(filePath).toLowerCase();
    const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
    if (!imageExts.includes(ext)) {
      return { success: false, error: "不是图片文件" };
    }
    return await generateThumbnail(filePath, size);
  });
  if (currentConfig?.image_save_path) sanshimanAllowedRoots.add(path.resolve(currentConfig.image_save_path));
  if (currentConfig?.video_save_path) sanshimanAllowedRoots.add(path.resolve(currentConfig.video_save_path));
  electron.ipcMain.handle("fs:validate-project-dir", (_, dirPath) => {
    const s = (dirPath || "").trim();
    if (!s) return { ok: false, reason: "EMPTY", message: "请填写项目目录" };
    if (!path.isAbsolute(s)) return { ok: false, reason: "NOT_ABSOLUTE", message: "请使用绝对路径" };
    if (!electron.app.isPackaged) {
      const installDir = path.resolve(path.dirname(process.execPath));
      const resolved = path.resolve(s);
      const check = (base) => {
        const b = path.resolve(base);
        return resolved === b || resolved.startsWith(b.endsWith(path.sep) ? b : b + path.sep);
      };
      if (check(installDir)) {
        return { ok: false, reason: "UNDER_INSTALL_DIR", message: `不能把项目放在应用安装目录里（${installDir}）。卸载或升级时这里会被清空，项目数据会丢失。` };
      }
      if (process.platform === "win32") {
        const sysDirs = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.SystemRoot].filter(Boolean);
        for (const d of sysDirs) {
          if (check(d)) {
            return { ok: false, reason: "UNDER_INSTALL_DIR", message: `不能把项目放在系统目录里（${d}）。Windows 会限制写入并可能在更新时清理。` };
          }
        }
      }
    }
    try {
      const probe = path.join(s, `.wlmj_probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      if (fs.existsSync(s)) {
        fs.writeFileSync(probe, "");
        fs.unlinkSync(probe);
      } else {
        let parent = path.dirname(s);
        const root = path.parse(s).root;
        while (parent && parent !== root && !fs.existsSync(parent)) {
          parent = path.dirname(parent);
        }
        if (!fs.existsSync(parent)) return { ok: false, reason: "PARENT_MISSING", message: "父级目录不存在，请检查盘符/路径是否正确" };
        fs.writeFileSync(path.join(parent, `.wlmj_probe_${Date.now()}`), "");
        fs.unlinkSync(path.join(parent, `.wlmj_probe_${Date.now()}`));
      }
    } catch (e) {
      return { ok: false, reason: "WRITE_FAILED", message: "目录不可写：" + (e instanceof Error ? e.message : String(e)) };
    }
    return { ok: true };
  });
  electron.ipcMain.on("logger:append", (event, level, args) => {
    try {
      const frame = event.senderFrame;
      if (!frame || typeof frame.parent !== "undefined" && frame.parent) return;
      const arr = Array.isArray(args) ? args : [args];
      const MAX_ITEMS = 32;
      const MAX_ITEM_LEN = 8192;
      const safe = arr.slice(0, MAX_ITEMS).map((a) => {
        if (typeof a === "string") return a.length > MAX_ITEM_LEN ? a.slice(0, MAX_ITEM_LEN) + "…[truncated]" : a;
        try {
          const s = JSON.stringify(a);
          return s && s.length > MAX_ITEM_LEN ? s.slice(0, MAX_ITEM_LEN) + "…[truncated]" : s;
        } catch {
          return String(a).slice(0, MAX_ITEM_LEN);
        }
      });
      _appendLog("renderer", _formatLog(String(level).toUpperCase(), safe));
    } catch {
    }
  });
  electron.ipcMain.handle("logger:get-dir", () => LOG_DIR);
  electron.ipcMain.handle("logger:open-dir", async () => {
    try {
      await electron.shell.openPath(LOG_DIR);
    } catch {
    }
  });
  electron.ipcMain.handle("clipboard:copy-image", async (_, base64Data) => {
    try {
      const buf = Buffer.from(base64Data, "base64");
      const img = electron.nativeImage.createFromBuffer(buf);
      if (img.isEmpty()) return { ok: false, error: "无效的图片数据" };
      if (process.platform === "win32") {
        const tmpPath = path.join(electron.app.getPath("temp"), `manju-copy-${Date.now()}.png`);
        await fs.promises.writeFile(tmpPath, buf);
        const psScript = [
          "Add-Type -AssemblyName System.Windows.Forms",
          "Add-Type -AssemblyName System.Drawing",
          `$img = [System.Drawing.Image]::FromFile(${JSON.stringify(tmpPath)})`,
          "$d = New-Object System.Windows.Forms.DataObject",
          "$d.SetImage($img)",
          "$f = New-Object System.Collections.Specialized.StringCollection",
          `$f.Add(${JSON.stringify(tmpPath)}) | Out-Null`,
          "$d.SetFileDropList($f)",
          "[System.Windows.Forms.Clipboard]::SetDataObject($d, $true)",
          "$img.Dispose()"
        ].join("; ");
        const { exe, args } = encodePowershellCommand(psScript);
        await new Promise((resolve) => {
          const childProcess = require("child_process");
          childProcess.execFile(exe, args, { windowsHide: true }, () => resolve());
        });
        try {
          await fs.promises.unlink(tmpPath);
        } catch {
        }
        return { ok: true };
      }
      electron.clipboard.writeImage(img);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  });
  electron.ipcMain.handle("shell:open-external", async (_, url2) => {
    try {
      assertSafeDownloadUrl(String(url2 || ""), { allowHttp: true });
    } catch (e) {
      return { ok: false, error: e.message };
    }
    try {
      await electron.shell.openExternal(url2);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  electron.ipcMain.handle("shell:open-path", async (_, filePath) => {
    try {
      const s = String(filePath || "").trim();
      if (!s) return "empty path";
      const resolved = path.resolve(s);
      const ext = path.extname(resolved).toLowerCase();
      const _OPEN_PATH_ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".mp4", ".webm", ".mov", ".ogg", ".mp3", ".wav", ".txt", ".md", ".json", ".log", ".pdf"];
      if (!_OPEN_PATH_ALLOWED_EXTS.includes(ext)) {
        console.warn("[Security] shell:open-path blocked non-allowed extension:", resolved);
        return "forbidden extension";
      }
      const inWhitelist = Array.from(sanshimanAllowedRoots).some((root) => {
        const r = path.resolve(root);
        return resolved === r || resolved.startsWith(r.endsWith(path.sep) ? r : r + path.sep);
      });
      if (!inWhitelist) {
        console.warn("[Security] shell:open-path blocked path outside whitelist:", resolved);
        return "forbidden path";
      }
      return await electron.shell.openPath(resolved);
    } catch {
      return "failed";
    }
  });
  electron.ipcMain.handle("app:get-version", () => electron.app.getVersion());
  electron.ipcMain.handle("app:get-arch", () => process.arch);
  electron.ipcMain.handle("app:is-packaged", () => electron.app.isPackaged);
  electron.ipcMain.handle("updater-check", async () => {
    if (!electron.app.isPackaged) return { ok: false, error: "开发模式不支持自动更新" };
    try {
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, version: result?.updateInfo?.version };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  electron.ipcMain.handle("updater-quit-install", () => {
    if (!electron.app.isPackaged) return { ok: false, error: "开发模式不支持" };
    try {
      autoUpdater.quitAndInstall();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  electron.ipcMain.handle("updater-download", async () => {
    if (!electron.app.isPackaged) return { ok: false, error: "开发模式不支持" };
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  electron.ipcMain.handle("window:minimize", (event) => {
    electron.BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  electron.ipcMain.handle("window:maximize", (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    win?.isMaximized() ? win.unmaximize() : win?.maximize();
  });
  electron.ipcMain.handle("window:close", (event) => {
    electron.BrowserWindow.fromWebContents(event.sender)?.close();
  });
  electron.ipcMain.handle("window:is-maximized", (event) => {
    return electron.BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });
  electron.ipcMain.handle("dialog:save-file", async (event, options) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender) ?? electron.BrowserWindow.getFocusedWindow();
    const result = await electron.dialog.showSaveDialog(win, options ?? {});
    return result.canceled ? null : result.filePath;
  });
  electron.ipcMain.handle("system:get-info", () => ({
    platform: process.platform,
    home: electron.app.getPath("home"),
    appData: electron.app.getPath("appData"),
    userData: electron.app.getPath("userData"),
    localAppData: process.env.LOCALAPPDATA || "",
    env: { HOME: process.env.HOME || "", USERPROFILE: process.env.USERPROFILE || "" }
  }));
  electron.ipcMain.handle("app:get-default-project-dir", () => {
    try {
      return path.join(electron.app.getPath("documents"), "叁视漫", "projects");
    } catch {
      return path.join(electron.app.getPath("home"), "叁视漫", "projects");
    }
  });
}
process.on("uncaughtException", (error) => {
  try {
    _appendLog("main", _formatLog("UNCAUGHT", [error]));
  } catch {
  }
  _origConsole.error("[主进程] 未捕获异常:", error);
});
process.on("unhandledRejection", (reason) => {
  try {
    _appendLog("main", _formatLog("UNHANDLED_REJECTION", [reason]));
  } catch {
  }
  _origConsole.error("[主进程] 未处理的 Promise 拒绝:", reason);
});
electron.app.commandLine.appendSwitch("enable-gpu-rasterization");
electron.app.commandLine.appendSwitch("enable-zero-copy");
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    if (global.__DB_MEMORY_MODE__) {
      electron.dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "数据库警告",
        message: "数据库加载失败，当前使用内存模式运行",
        detail: `错误信息: ${global.__DB_ERROR_MSG__ || "未知"}

当前会话的所有数据将在关闭应用后丢失。
建议检查磁盘空间或文件权限后重启应用。`,
        buttons: ["我知道了"]
      });
    }
  });
  mainWindow.on("close", (e) => {
    try {
      mainWindow.webContents.send("app-before-close");
    } catch (err) {
      console.warn("[主进程] 发送关闭保存信号失败:", err.message);
    }
  });
  let crashCount = 0;
  let lastCrashAt = 0;
  const CRASH_BACKOFF_MS = [1e3, 2e3, 4e3, 8e3, 3e4];
  const MAX_CRASH_RELOADS = 5;
  const CRASH_RESET_WINDOW = 6e4;
  mainWindow.webContents.on("render-process-gone", (event, details) => {
    console.error("[主进程] 渲染进程崩溃:", details.reason);
    if (details.reason !== "clean-exit" && crashCount < MAX_CRASH_RELOADS) {
      const now = Date.now();
      if (now - lastCrashAt > CRASH_RESET_WINDOW) crashCount = 0;
      crashCount++;
      lastCrashAt = now;
      const delay = CRASH_BACKOFF_MS[Math.min(crashCount - 1, CRASH_BACKOFF_MS.length - 1)];
      console.warn(`[主进程] 尝试重载 (${crashCount}/${MAX_CRASH_RELOADS})，延迟 ${delay / 1e3}s`);
      setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      }, delay);
    } else if (crashCount >= MAX_CRASH_RELOADS) {
      console.error("[主进程] 渲染进程连续崩溃超过限制，停止重载");
    }
  });
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error("[主进程] 页面加载失败:", errorCode, errorDescription);
    setTimeout(() => {
      if (!mainWindow.isDestroyed()) {
        if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
          mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
        } else {
          mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
        }
      }
    }, 2e3);
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsedUrl = new URL(details.url);
      if (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") {
        electron.shell.openExternal(details.url);
      } else {
        console.warn("[Security] Blocked openExternal for non-http URL:", details.url);
      }
    } catch (e) {
      console.warn("[Security] Invalid URL blocked:", details.url);
    }
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (e, navUrl) => {
    try {
      const u = new URL(navUrl);
      const ok = u.protocol === "https:" || u.protocol === "http:" || u.protocol === "sanshiman:" || u.protocol === "file:" || u.protocol === "devtools:";
      if (!ok) {
        e.preventDefault();
        console.warn("[Security] Blocked navigation to non-allowed protocol:", navUrl);
      }
    } catch {
      e.preventDefault();
      console.warn("[Security] Blocked navigation to invalid URL:", navUrl);
    }
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  if (utils.is.dev) {
    mainWindow.webContents.openDevTools();
  }
}
electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: "sanshiman",
    privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: false }
  }
]);
const _gotSingleInstanceLock = electron.app.requestSingleInstanceLock();
if (!_gotSingleInstanceLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", () => {
    const wins = electron.BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      const w = wins[0];
      try {
        if (w.isMinimized()) w.restore();
      } catch {
      }
      try {
        w.focus();
      } catch {
      }
    }
  });
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.sanshiman.app");
  electron.Menu.setApplicationMenu(null);
  const _CORS_ALLOWED_HOST_SUFFIXES = [
    "volces.com",
    "mengfactory.cn",
    "aiid.edu.kg",
    "midjourney.com",
    "aliyun.com",
    "alibaba.com",
    "aliyuncs.com",
    "bytedance.com",
    "byteimg.com",
    "volccdn.com",
    "openai.com",
    "anthropic.com",
    "deepseek.com",
    "googleapis.com",
    "google.com",
    "gstatic.com",
    "catbox.moe",
    "uguu.se",
    "zhongzhuan.chat",
    "sanshiman.com"
  ];
  let _customApiHostsCache2 = null;
  let _customApiHostsLoadAt = 0;
  function _getCustomApiHosts() {
    const now = Date.now();
    if (_customApiHostsCache2 && now - _customApiHostsLoadAt < 3e4) return _customApiHostsCache2;
    const set = /* @__PURE__ */ new Set();
    try {
      for (const key of ["tapnow_chatApiUrl", "tapnow_imageApiUrl", "tapnow_videoApiUrl"]) {
        const v = getSetting(key);
        if (v && typeof v === "string") {
          try {
            set.add(new URL(v).hostname.toLowerCase());
          } catch {
          }
        }
      }
    } catch {
    }
    _customApiHostsCache2 = set;
    _customApiHostsLoadAt = now;
    return set;
  }
  function _isCorsAllowed(host) {
    if (!host) return false;
    const h = host.toLowerCase();
    if (_CORS_ALLOWED_HOST_SUFFIXES.some((s) => h === s || h.endsWith("." + s))) return true;
    try {
      if (_getCustomApiHosts().has(h)) return true;
    } catch {
    }
    return false;
  }
  electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    const url2 = details.url || "";
    const isExternalHttp = url2.startsWith("http://") || url2.startsWith("https://");
    const isLocalDev = url2.includes("localhost") || url2.includes("127.0.0.1") || url2.includes("://0.0.0.0");
    if (isExternalHttp && !isLocalDev) {
      let host = "";
      try {
        host = new URL(url2).hostname;
      } catch {
      }
      if (_isCorsAllowed(host)) {
        const hasACAO = Object.keys(responseHeaders).some(
          (key) => key.toLowerCase() === "access-control-allow-origin"
        );
        if (!hasACAO) {
          responseHeaders["Access-Control-Allow-Origin"] = ["*"];
        }
      }
    }
    callback({ responseHeaders });
  });
  sanshimanAllowedRoots = /* @__PURE__ */ new Set([
    path.resolve(electron.app.getPath("userData")),
    path.resolve(electron.app.getPath("home")),
    path.resolve(electron.app.getPath("appData")),
    // fallback 搜索目录也预先注册
    path.resolve(electron.app.getPath("appData"), "sanshiman"),
    path.resolve(electron.app.getPath("appData"), "Electron")
  ]);
  electron.protocol.handle("sanshiman", (request) => {
    try {
      const requestUrl = new URL(request.url);
      let filePath = requestUrl.searchParams.get("path");
      if (!filePath) {
        filePath = request.url.replace(/^sanshiman:\/\/\/?/i, "");
        try {
          filePath = decodeURIComponent(filePath);
          if (filePath.startsWith("local/")) {
            filePath = filePath.replace("local/", "");
          }
        } catch {
        }
      }
      if (process.platform === "win32") {
        if (filePath.startsWith("/")) {
          filePath = filePath.slice(1);
        }
        if (/^[a-zA-Z][/\\]/.test(filePath)) {
          filePath = filePath[0] + ":" + filePath.slice(1);
        }
      }
      if (process.platform === "darwin" || process.platform === "linux") {
        try {
          filePath = decodeURIComponent(filePath);
        } catch {
        }
      }
      if (!fs.existsSync(filePath)) {
        let filename = path.basename(filePath);
        try {
          filename = decodeURIComponent(filename);
        } catch {
        }
        const isVideo = filename.toLowerCase().endsWith(".mp4") || filename.toLowerCase().endsWith(".webm") || filename.toLowerCase().endsWith(".mov");
        const fallbackSubdir = isVideo ? path.join("LocalCache", "videos") : path.join("LocalCache", "images");
        const possibleDirs = [
          path.join(electron.app.getPath("userData"), fallbackSubdir),
          path.join(electron.app.getPath("appData"), "sanshiman", fallbackSubdir),
          path.join(electron.app.getPath("appData"), "sanshiman", fallbackSubdir),
          path.join(electron.app.getPath("appData"), "Electron", fallbackSubdir)
        ];
        let foundFallback = null;
        for (const dir of possibleDirs) {
          const attempt = path.join(dir, filename);
          if (fs.existsSync(attempt)) {
            foundFallback = attempt;
            break;
          }
          const attemptWithUnder = path.join(dir, filename.replace(/ /g, "_"));
          if (fs.existsSync(attemptWithUnder)) {
            foundFallback = attemptWithUnder;
            break;
          }
        }
        if (foundFallback) {
          /* @__PURE__ */ console.log(`[Sanshiman Protocol] Fallback resolved to: ${foundFallback}`);
          return serveFileWithRange(request, foundFallback);
        }
        console.warn(`[Sanshiman Protocol] File not found: ${filePath}`);
        return new Response("File not found", { status: 404 });
      }
      const _resolvedFilePath = path.resolve(filePath);
      const _fileExt = path.extname(_resolvedFilePath).toLowerCase();
      const _allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".mp4", ".webm", ".mov", ".ogg", ".mp3", ".wav", ".ico"];
      if (!_allowedExts.includes(_fileExt)) {
        console.warn("[Sanshiman Protocol] Blocked non-media file:", _resolvedFilePath);
        return new Response("Forbidden", { status: 403 });
      }
      const _isAllowed = Array.from(sanshimanAllowedRoots).some((root) => {
        const _r = path.resolve(root);
        return _resolvedFilePath === _r || _resolvedFilePath.startsWith(_r.endsWith(path.sep) ? _r : _r + path.sep);
      });
      if (!_isAllowed) {
        console.warn("[Sanshiman Protocol] Blocked path outside whitelist:", _resolvedFilePath);
        return new Response("Forbidden", { status: 403 });
      }
      return serveFileWithRange(request, filePath);
    } catch (err) {
      console.error("[Sanshiman Protocol] Error:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  });
  function serveFileWithRange(request, targetPath) {
    const ext = path.extname(targetPath).toLowerCase();
    const isVideo = [".mp4", ".webm", ".mov", ".ogg"].includes(ext);
    if (!isVideo) {
      return electron.net.fetch(url.pathToFileURL(targetPath).toString());
    }
    try {
      const stat = fs.statSync(targetPath);
      const fileSize = stat.size;
      const range = request.headers.get("range");
      const mimeTypes = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".ogg": "video/ogg"
      };
      const contentType = mimeTypes[ext] || "video/mp4";
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (start >= fileSize || start < 0) {
          return new Response("Requested range not satisfiable", {
            status: 416,
            headers: { "Content-Range": `bytes */${fileSize}` }
          });
        }
        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(targetPath, { start, end });
        const readableStream = new ReadableStream({
          start(controller) {
            fileStream.pause();
            fileStream.on("data", (chunk) => {
              controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
              if (controller.desiredSize <= 0) fileStream.pause();
            });
            fileStream.on("end", () => controller.close());
            fileStream.on("error", (err) => controller.error(err));
          },
          pull() {
            fileStream.resume();
          },
          cancel() {
            fileStream.destroy();
          }
        });
        return new Response(readableStream, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*",
            "Timing-Allow-Origin": "*"
          }
        });
      } else {
        const fileStream = fs.createReadStream(targetPath);
        const readableStream = new ReadableStream({
          start(controller) {
            fileStream.pause();
            fileStream.on("data", (chunk) => {
              controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
              if (controller.desiredSize <= 0) fileStream.pause();
            });
            fileStream.on("end", () => controller.close());
            fileStream.on("error", (err) => controller.error(err));
          },
          pull() {
            fileStream.resume();
          },
          cancel() {
            fileStream.destroy();
          }
        });
        return new Response(readableStream, {
          status: 200,
          headers: {
            "Content-Length": fileSize,
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*",
            "Timing-Allow-Origin": "*"
          }
        });
      }
    } catch (e) {
      console.error(`[Sanshiman Protocol Stream Error] ${targetPath}:`, e);
      return new Response("Error reading file", { status: 500 });
    }
  }
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.on("ping", () => /* @__PURE__ */ console.log("pong"));
  setupIpcHandlers();
  createWindow();
  if (electron.app.isPackaged) {
    autoUpdater.autoDownload = false;
    autoUpdater.on("update-available", (info) => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      if (win) win.webContents.send("updater-message", { type: "update-available", version: info.version });
      if (!win) return;
      electron.dialog.showMessageBox(win, {
        type: "info",
        title: "发现新版本",
        message: `发现新版本 v${info.version}`,
        detail: "是否立即下载更新？下载过程在后台进行，不影响使用。",
        buttons: ["稍后再说", "立即下载"],
        defaultId: 1,
        cancelId: 0
      }).then(({ response }) => {
        if (response === 1) {
          autoUpdater.downloadUpdate().catch((err) => {
            electron.dialog.showErrorBox("更新下载失败", err.message);
          });
        }
      });
    });
    autoUpdater.on("download-progress", (progress) => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      if (win) win.webContents.send("updater-message", { type: "download-progress", progress });
    });
    autoUpdater.on("update-downloaded", () => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      if (win) win.webContents.send("updater-message", { type: "update-downloaded" });
      if (!win) return;
      electron.dialog.showMessageBox(win, {
        type: "info",
        title: "更新下载完成",
        message: "更新已下载完毕",
        detail: "点击 [立即重启] 安装更新并重启应用。",
        buttons: ["稍后重启", "立即重启"],
        defaultId: 1,
        cancelId: 0
      }).then(({ response }) => {
        if (response === 1) {
          autoUpdater.quitAndInstall();
        }
      });
    });
    autoUpdater.on("error", (err) => {
      console.error("[autoUpdater]", err.message);
      const win = electron.BrowserWindow.getAllWindows()[0];
      if (win) win.webContents.send("updater-message", { type: "error", error: err.message });
    });
    const updateTimer = setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {
      });
    }, 5e3);
    electron.app.on("before-quit", () => {
      clearTimeout(updateTimer);
    });
  }
  try {
    const _accel = typeof globalThis._sdGetShortcut === "function" ? globalThis._sdGetShortcut() : "CommandOrControl+Shift+A";
    const _r = globalThis._sdRegisterShortcut(_accel);
    if (!_r.ok) {
      console.warn(`[Seedance] 配置快捷键 ${_accel} 注册失败，尝试默认值`);
      if (_accel !== "CommandOrControl+Shift+A") {
        globalThis._sdRegisterShortcut("CommandOrControl+Shift+A");
      }
    }
  } catch (e) {
    console.warn("[Seedance] 快捷键注册异常:", e);
  }
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  try {
    electron.globalShortcut.unregisterAll();
  } catch {
  }
  clearInterval(_flushTimer);
  _flushAllLogs();
});
