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

  // ============== NodeAugmenter ==============
  const MANAGED_ATTR = 'data-sv-managed';
  const VIEWER_ATTR = 'data-viewer-only';
  const MIN_SIZE = 120; // resize 最小尺寸（px），留够 lightbox 触发区
  let isResizing = false; // 防止双手柄同时按下导致 prev style 错乱

  function isInputImageNode(el) {
    if (!el || el.nodeType !== 1) return false;
    if (!el.hasAttribute('data-id')) return false;
    const id = el.getAttribute('data-id') || '';
    if (!id.startsWith('node_')) return false;

    // 主路径：data-node-type
    const t = el.getAttribute('data-node-type');
    if (t === 'input-image' || t === 'video-input') return true;
    if (t) return false; // 明确写了别的类型，不是我们的菜

    // 兜底：节点内有 img/video + 有 .react-flow__handle
    const hasMedia = el.querySelector('img, video');
    const hasHandle = el.querySelector('.react-flow__handle');
    return !!(hasMedia && hasHandle);
  }

  function applyViewerState(el, nodeId) {
    const state = ViewerStateStore.get(nodeId);
    if (state && state.viewer) {
      el.setAttribute(VIEWER_ATTR, 'true');
    } else {
      el.removeAttribute(VIEWER_ATTR);
    }
  }

  function injectEyeButton(el, nodeId) {
    if (el.querySelector(':scope > .sv-toggle-btn')) return; // 幂等
    const btn = document.createElement('button');
    btn.className = 'sv-toggle-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', '切换查看器形态');
    btn.title = '切换查看器形态';
    btn.textContent = '👁';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      ViewerStateStore.toggle(nodeId);
      applyViewerState(el, nodeId);
      maybeInitSize(el, nodeId);
    });
    // mousedown 也阻止冒泡 — ReactFlow 在 mousedown 上启动节点拖动
    btn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    el.appendChild(btn);
  }

  function decodePathFromContent(url) {
    // url 形如 sanshiman://local/?path=<encoded>
    if (!url) return '';
    try {
      const u = new URL(url);
      const p = u.searchParams.get('path');
      if (p !== null) {
        const decoded = decodeURIComponent(p);
        const parts = decoded.split(/[/\\]/).filter(Boolean);
        return parts[parts.length - 1] || '';
      }
    } catch {}
    // 兜底：从 url 末尾切
    const parts = url.split(/[/\\?]/).filter(Boolean);
    return parts[parts.length - 1] || '';
  }

  function injectFilenameLabel(el) {
    if (el.querySelector(':scope > .sv-filename')) return;
    const media = el.querySelector('img, video');
    if (!media) return;
    const filename = decodePathFromContent(media.src);
    if (!filename) return;
    const label = document.createElement('div');
    label.className = 'sv-filename';
    label.textContent = filename;
    label.title = filename;
    el.appendChild(label);
  }

  function injectCenterClickHandler(el, nodeId) {
    if (el.dataset.svClickWired === '1') return;
    el.dataset.svClickWired = '1';

    // 监听器一旦挂上就常驻；切出查看器形态时按 attr 判断短路即可。
    el.addEventListener('click', function (e) {
      // 只在查看器形态下触发
      if (el.getAttribute(VIEWER_ATTR) !== 'true') return;
      // 排除按钮和把手
      const t = e.target;
      if (t.closest('.sv-toggle-btn')) return;
      if (t.closest('.sv-resize-handle')) return;
      if (t.closest('.sv-onboard-bubble')) return;
      const media = el.querySelector('img, video');
      if (!media) return;
      const url = media.src;
      const isVideo = media.tagName === 'VIDEO';
      MiniLightbox.open({ url, isVideo });
    });
  }

  function startResize(el, nodeId, signX, signY, startX, startY) {
    if (isResizing) return; // 双手柄并发保护
    isResizing = true;
    const startW = el.offsetWidth || 200;
    const startH = el.offsetHeight || 200;
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = (signX * signY > 0) ? 'nwse-resize' : 'nesw-resize';

    function cleanup() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onUp);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      isResizing = false;
    }

    function onMove(e) {
      const dx = (e.clientX - startX) * signX;
      const dy = (e.clientY - startY) * signY;
      const w = Math.max(MIN_SIZE, startW + dx);
      const h = Math.max(MIN_SIZE, startH + dy);
      el.style.width = w + 'px';
      el.style.height = h + 'px';
    }

    function onUp() {
      cleanup();
      // 注：onMove 没跑过的时候 style.width/height 仍是 startResize 之前的值（可能是空），
      //     parseInt 会回退到 offsetWidth/offsetHeight，这是预期行为。
      const w = parseInt(el.style.width, 10) || el.offsetWidth;
      const h = parseInt(el.style.height, 10) || el.offsetHeight;
      ViewerStateStore.set(nodeId, { w, h });
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    // 拖到窗口外松开 → window blur，避免卡住
    window.addEventListener('blur', onUp);
  }

  function injectResizeHandles(el, nodeId) {
    if (el.querySelector(':scope > .sv-resize-handle')) return; // 幂等
    // 只保留 BR 角：避免 TL/TR/BL 拖动时对面顶角不锚定造成的违和感（外部注入层够不着 ReactFlow node.position）。
    const h = document.createElement('div');
    h.className = 'sv-resize-handle sv-rh-br';
    h.dataset.svCorner = 'br';
    h.addEventListener('mousedown', function (e) {
      e.stopPropagation();
      e.preventDefault();
      startResize(el, nodeId, 1, 1, e.clientX, e.clientY);
    });
    el.appendChild(h);
  }

  // ============== 自动尺寸初始化 ==============
  let measureImageFactory = function () { return new Image(); };

  function maybeInitSize(el, nodeId) {
    if (el.getAttribute(VIEWER_ATTR) !== 'true') return;
    const saved = ViewerStateStore.get(nodeId);
    if (saved && saved.w && saved.h) {
      el.style.width = saved.w + 'px';
      el.style.height = saved.h + 'px';
      return;
    }
    const media = el.querySelector('img, video');
    if (!media) return;
    const url = media.src;

    const probe = measureImageFactory();
    probe.onload = function () {
      const nw = probe.naturalWidth || 0;
      const nh = probe.naturalHeight || 0;
      let w = 320, h = 320;
      if (nw && nh) {
        if (nw >= nh) { w = 320; h = Math.max(MIN_SIZE, Math.round(320 * nh / nw)); }
        else          { h = 320; w = Math.max(MIN_SIZE, Math.round(320 * nw / nh)); }
      }
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      ViewerStateStore.set(nodeId, { w, h });
    };
    probe.onerror = function () {
      el.style.width = '240px';
      el.style.height = '240px';
      ViewerStateStore.set(nodeId, { w: 240, h: 240 });
    };
    probe.src = url;
  }

  // ============== Onboard 引导气泡 ==============
  function injectOnboardBubble(el, nodeId) {
    if (el.querySelector(':scope > .sv-onboard-bubble')) return;
    const bubble = document.createElement('div');
    bubble.className = 'sv-onboard-bubble';

    const action = document.createElement('span');
    action.className = 'sv-onboard-action';
    action.textContent = '🔍 当查看器';
    action.addEventListener('click', function (e) {
      e.stopPropagation();
      ViewerStateStore.toggle(nodeId);
      applyViewerState(el, nodeId);
      maybeInitSize(el, nodeId);
      removeBubble();
    });

    const close = document.createElement('span');
    close.className = 'sv-onboard-close';
    close.textContent = '✕';
    close.addEventListener('click', function (e) {
      e.stopPropagation();
      removeBubble();
    });

    function removeBubble() {
      if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
      clearTimeout(autoTimer);
    }

    bubble.appendChild(action);
    bubble.appendChild(close);
    el.appendChild(bubble);

    const autoTimer = setTimeout(removeBubble, 5000);
  }

  function augment(el) {
    if (!isInputImageNode(el)) return;
    if (el.getAttribute(MANAGED_ATTR) === '1') return; // 幂等
    // NOTE: React 重渲染若替换内部 DOM，marker 仍在但注入的子元素会消失。
    // Task 8 的 MutationObserver 需检测注入物丢失并清除 MANAGED_ATTR 后重跑 augment。

    const nodeId = el.getAttribute('data-id');
    el.setAttribute(MANAGED_ATTR, '1');
    applyViewerState(el, nodeId);
    injectEyeButton(el, nodeId);
    injectFilenameLabel(el);
    injectCenterClickHandler(el, nodeId);
    injectResizeHandles(el, nodeId);

    // 应用持久化的尺寸
    const state = ViewerStateStore.get(nodeId);
    if (state && state.w && state.h) {
      el.style.width = state.w + 'px';
      el.style.height = state.h + 'px';
    }

    // 后续任务在这里加：引导气泡、自动尺寸
  }

  const NodeAugmenter = {
    augment,
    isInputImageNode,
    _maybeInitSize: maybeInitSize,
    _setMeasureImageFactory(factory) { measureImageFactory = factory; },
  };
  window.sanshimanAssetViewer.NodeAugmenter = NodeAugmenter;

  // ============== Startup grace + MutationObserver ==============
  const STARTUP_GRACE_MS = 3000;
  let startupDone = false;
  setTimeout(function () { startupDone = true; }, STARTUP_GRACE_MS);

  function isStartupGraceActive() {
    if (window.__SV_TEST_SKIP_GRACE) return false;
    return !startupDone;
  }

  function processNode(el, isInitialScan) {
    if (!isInputImageNode(el)) return;
    const wasManaged = el.getAttribute(MANAGED_ATTR) === '1';
    augment(el);
    if (!wasManaged && !isInitialScan && !isStartupGraceActive()) {
      const nodeId = el.getAttribute('data-id');
      const state = ViewerStateStore.get(nodeId);
      if (!state || !state.viewer) {
        // 等节点动画稳定 200ms 再弹
        setTimeout(function () {
          if (el.isConnected) injectOnboardBubble(el, nodeId);
        }, 200);
      }
    }
  }

  function observeAndAugment() {
    if (window.__sv_observed) return;
    window.__sv_observed = true;

    const observer = new MutationObserver(function (mutations) {
      for (const m of mutations) {
        for (const added of m.addedNodes) {
          if (added.nodeType !== 1) continue;
          processNode(added, false);
          if (added.querySelectorAll) {
            const inner = added.querySelectorAll('[data-id^="node_"]');
            inner.forEach(n => processNode(n, false));
          }
        }
      }
    });

    function attachObserver() {
      const roots = document.querySelectorAll('.react-flow');
      if (roots.length === 0) {
        // 画布还没渲染，再等等
        setTimeout(attachObserver, 200);
        return;
      }
      roots.forEach(r => observer.observe(r, { childList: true, subtree: true }));
      // 初始扫描
      roots.forEach(r => {
        r.querySelectorAll('[data-id^="node_"]').forEach(n => processNode(n, true));
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachObserver);
    } else {
      attachObserver();
    }
  }

  observeAndAugment();

  console.log('[asset-viewer] loaded v' + VERSION);
})();
