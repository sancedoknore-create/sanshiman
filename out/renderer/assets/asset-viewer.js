/* 资产查看器节点注入层
   把 input-image 节点切到「查看器形态」：眼睛按钮、引导气泡、resize 把手、mini-lightbox、按比例初始尺寸。
   不动 minified bundle、不动 main、不动 SQLite。状态持久化在 localStorage。 */
(function () {
  'use strict';

  const VERSION = '1.0.0';

  // ============== ViewerStateStore ==============
  // 按 nodeId 索引：{ [nodeId]: { viewer: bool, w?: number, h?: number } }
  const STORE_KEY = 'sanshiman_viewer_nodes';

  const ViewerStateStore = (function () {
    let cache = null;

    function load() {
      if (cache) return cache;
      try {
        const raw = localStorage.getItem(STORE_KEY);
        cache = raw ? JSON.parse(raw) : {};
        if (typeof cache !== 'object' || cache === null) cache = {};
      } catch (e) {
        console.warn('[asset-viewer] localStorage corrupt, resetting:', e.message);
        cache = {};
      }
      return cache;
    }

    function persist() {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(cache));
      } catch (e) {
        console.warn('[asset-viewer] localStorage write failed:', e.message);
      }
    }

    return {
      get(nodeId) {
        const all = load();
        const entry = all[nodeId];
        return entry ? { ...entry } : null;
      },
      set(nodeId, state) {
        const all = load();
        all[nodeId] = { ...(all[nodeId] || {}), ...state };
        persist();
      },
      toggle(nodeId) {
        const all = load();
        const current = all[nodeId] || {};
        const next = !current.viewer;
        all[nodeId] = { ...current, viewer: next };
        persist();
        return next;
      },
      delete(nodeId) {
        const all = load();
        delete all[nodeId];
        persist();
      },
      _all() { return load(); },
    };
  })();

  // —— 暴露给测试和未来扩展用的命名空间
  window.sanshimanAssetViewer = { version: VERSION };
  window.sanshimanAssetViewer.ViewerStateStore = ViewerStateStore;

  console.log('[asset-viewer] loaded v' + VERSION);
})();
