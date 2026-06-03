"use strict";
import electron from "electron";
import path from "path";
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
  const dbPath = !electron.app.isPackaged ? path.join(process.cwd(), "canvas_data.db") : path.join(electron.app.getPath("userData"), "canvas_data.db");
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
  electron.app.on("before-quit", () => {
    try { clearInterval(_walTimer); } catch {}
    try { db.pragma("wal_checkpoint(TRUNCATE)"); } catch (e) {
      console.warn("[Database] before-quit checkpoint 失败:", e.message);
    }
    try { db.close(); } catch (e) {
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

export {
  db,
  getAllProjects, getProject, saveProject, deleteProject,
  getNodesByProject, saveNode, saveNodesBatch, deleteNode, deleteNodesByProject,
  getConnectionsByProject, saveConnection, saveConnectionsBatch, deleteConnection, deleteConnectionsByProject,
  getHistoryByProject, getAllHistory, saveHistoryItem, saveHistoryBatch, deleteHistoryItem, clearAllHistory,
  getSetting, setSetting, deleteSetting, getAllSettings, setSettingsBatch,
};
