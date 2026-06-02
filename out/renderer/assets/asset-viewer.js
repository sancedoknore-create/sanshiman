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

  // ============== MiniLightbox ==============
  const MiniLightbox = (function () {
    let currentOverlay = null;
    let escHandler = null;

    function close() {
      if (escHandler) {
        document.removeEventListener('keydown', escHandler);
        escHandler = null;
      }
      if (currentOverlay) {
        // 显式释放视频，避免 rapid open/close 时浏览器仍在 fetch/decode
        const video = currentOverlay.querySelector('video');
        if (video) {
          try { video.pause(); video.removeAttribute('src'); video.load(); } catch {}
        }
        if (currentOverlay.parentNode) {
          currentOverlay.parentNode.removeChild(currentOverlay);
        }
      }
      currentOverlay = null;
    }

    function open({ url, isVideo }) {
      // 已有 overlay 先关掉
      close();

      const overlay = document.createElement('div');
      overlay.className = 'sv-lightbox-overlay';
      overlay.tabIndex = -1;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'sv-lightbox-close';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('aria-label', '关闭');
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        close();
      });

      let content;
      if (isVideo) {
        content = document.createElement('video');
        content.controls = true;
        content.autoplay = true;
        content.muted = true;
        content.playsInline = true;
      } else {
        content = document.createElement('img');
        content.alt = '预览';
      }
      content.className = 'sv-lightbox-content';
      content.src = url;
      // 点内容不关闭，只点背景才关闭
      content.addEventListener('click', function (e) { e.stopPropagation(); });

      overlay.appendChild(closeBtn);
      overlay.appendChild(content);

      // 点背景关闭
      overlay.addEventListener('click', function () { close(); });

      // ESC 关闭。
      // 注意：document 层 stopPropagation 阻止 window 层（如现有 app lightbox）
      // 的同事件链监听器，但不会阻止同样挂在 document 上的其他监听器。
      // 如果未来 NodeAugmenter 也在 document 上挂 ESC 处理，需切到 stopImmediatePropagation。
      escHandler = function (e) {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      };
      document.addEventListener('keydown', escHandler);

      document.body.appendChild(overlay);
      currentOverlay = overlay;
    }

    return { open, close };
  })();

  window.sanshimanAssetViewer.MiniLightbox = MiniLightbox;

  console.log('[asset-viewer] loaded v' + VERSION);
})();
