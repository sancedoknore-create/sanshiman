"use strict";
import electron from "electron";
import path from "path";
import fs from "fs";

const LOG_DIR = (() => {
  const d = path.join(electron.app.getPath("userData"), "logs");
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
})();
const LOG_MAX_LINE = 8192;
const LOG_MAX_FILE = 5 * 1024 * 1024;
const _logBufs = { main: [], renderer: [] };
let _logBufSizes = { main: 0, renderer: 0 };
let _logFlushing = false;

// 保存原 console 引用（必须在覆写之前抓取）
const _origConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
};

// 重入保护：覆写后的 console 在 _appendLog / _flushLog 出错时再次触发
// console.error，会无限递归。这个 flag 让覆写函数在内部链路内仅写原 console。
let _inOverride = false;

function _formatLog(kind, args) {
  const ts = new Date().toISOString();
  const line = args.map((a) => {
    if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack || ""}`;
    if (typeof a === "string") return a;
    try { return JSON.stringify(a); } catch { return String(a); }
  }).join(" ");
  return (`${ts} [${kind}] ${line}\n`).slice(0, LOG_MAX_LINE);
}

function _appendLog(bufName, entry) {
  const arr = _logBufs[bufName];
  if (!arr) return;
  if (arr.length >= 20000) { const removed = arr.shift(); _logBufSizes[bufName] -= (removed || "").length; }
  arr.push(entry);
  _logBufSizes[bufName] += entry.length;
  if (_logBufSizes[bufName] >= 65536) _flushLog(bufName);
}

function _rotateLog(kind) {
  const fp = path.join(LOG_DIR, `${kind}.log`);
  try {
    if (fs.existsSync(fp) && fs.statSync(fp).size >= LOG_MAX_FILE) {
      const bak = fp + ".1";
      try { if (fs.existsSync(bak)) fs.unlinkSync(bak); } catch (e) {
        _origConsole.warn("[logger] rotate unlink failed:", e.message);
      }
      fs.renameSync(fp, bak);
    }
  } catch (e) {
    _origConsole.warn("[logger] rotate failed:", e.message);
  }
  return fp;
}

// 异步写入：不阻塞主进程；失败时通过 _origConsole 报告（避免再走覆写后的 console 触发递归）。
function _flushLog(bufName) {
  const arr = _logBufs[bufName];
  if (!arr || arr.length === 0) return Promise.resolve();
  const batch = arr.splice(0);
  _logBufSizes[bufName] = 0;
  const fp = _rotateLog(bufName);
  return fs.promises.appendFile(fp, batch.join(""), "utf-8").catch((e) => {
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

// 覆写 console — 同时写入文件 + 调用原始输出。
// 重入保护：若覆写内部链路自己又触发了 console（典型场景：_appendLog 抛异常被 catch 然后 console.error），
// 直接走 _origConsole，绝不再次进入 _appendLog。
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

export { LOG_DIR, _appendLog, _formatLog, _flushAllLogs, _origConsole, _flushTimer, _flushLog };
