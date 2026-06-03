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

    // 实际 DOM 结构（来自 minified bundle）：
    //   <div class="react-flow__node" data-id="node_xxx">     ← el（外层）
    //     <div class="node-wrapper" data-node-type="..." data-node-id="node_xxx">  ← inner
    //       ...
    //
    // 因此 data-node-type 不在 el 上，要去找直接子 .node-wrapper 或 [data-node-type]。

    // 主路径 1：el 自己就有 data-node-type（防御性兼容直接挂在 el 上的情形）
    let t = el.getAttribute('data-node-type');
    // 主路径 2：el 内查找 [data-node-type]
    if (!t) {
      const inner = el.querySelector('[data-node-type]');
      if (inner) t = inner.getAttribute('data-node-type');
    }
    if (t === 'input-image' || t === 'video-input') return true;
    if (t) return false; // 明确写了别的类型，不是我们的菜

    // 兜底：节点内有 img/video（handle 在 minified bundle 里 className 不一定是 .react-flow__handle，放宽）
    // 但要排除生成节点 — 生成节点有 textarea / 模型选择 select，不应该被当作纯查看器
    if (el.querySelector('textarea, select, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"])')) return false;
    return !!el.querySelector('img, video');
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

  // ============== input-image 节点 fallback 渲染 ==============
  // 当 bundle 还没实现 input-image / video-input 的 React 组件时，
  // 节点内容区会显示 "Unknown node type: input-image"。这里检测这种情况，
  // 把内容区替换成实际的 <img> / <video>，让节点能用起来。
  // 等以后 bundle 真正实现了组件，此函数就成 no-op（不会再匹配到 unknown 文本）。
  //
  // 数据获取策略：input-image 节点的 React props 里不直接带 content；
  // 走到 .react-flow 容器的 props.nodes 数组里按 nodeId 查（zustand store 经 props 透传过来的）。
  let _flowNodesCache = { nodes: null, ts: 0 };
  function _getFlowNodes() {
    // 缓存 100ms 避免每次 augment 都重走 fiber
    const now = Date.now();
    if (_flowNodesCache.nodes && now - _flowNodesCache.ts < 100) {
      return _flowNodesCache.nodes;
    }
    const flow = document.querySelector('.react-flow');
    if (!flow) return null;
    const fk = Object.keys(flow).find(function (k) { return k.startsWith('__reactFiber'); });
    if (!fk) return null;
    let cur = flow[fk];
    for (let i = 0; i < 30 && cur; i++) {
      const p = cur.memoizedProps;
      if (p && Array.isArray(p.nodes)) {
        _flowNodesCache = { nodes: p.nodes, ts: now };
        return p.nodes;
      }
      cur = cur.return;
    }
    return null;
  }

  function injectFallbackMediaRenderer(el, nodeId) {
    if (el.querySelector('.sv-fallback-media')) return; // 幂等
    // 找节点内文本含 "Unknown node type" 的容器
    const innerWrappers = el.querySelectorAll('.node-wrapper > div');
    let unknownContainer = null;
    for (const w of innerWrappers) {
      if (w.textContent && w.textContent.includes('Unknown node type')) {
        unknownContainer = w;
        break;
      }
    }
    if (!unknownContainer) return;

    // 从 .react-flow props.nodes 数组里查这个 nodeId
    const allNodes = _getFlowNodes();
    if (!allNodes) return;
    const node = allNodes.find(function (n) { return n && n.id === nodeId; });
    if (!node) return;
    const content = node.content;
    if (!content) return;
    const type = node.type;

    const isVideo = (type === 'video-input') ||
      /\.(mp4|webm|mov|ogg)(\?|$)/i.test(content);
    const wrap = document.createElement('div');
    wrap.className = 'sv-fallback-media';

    let media;
    if (isVideo) {
      media = document.createElement('video');
      media.controls = true;
      media.muted = true;
      media.playsInline = true;
      media.preload = 'metadata';
    } else {
      media = document.createElement('img');
      media.alt = '';
      media.draggable = false;
    }
    media.src = content;
    wrap.appendChild(media);

    // 把 Unknown node type 容器替换为我们的渲染
    unknownContainer.innerHTML = '';
    unknownContainer.appendChild(wrap);
  }

  // ============== 自动尺寸初始化 ==============
  let measureImageFactory = function () { return new Image(); };
  let measureVideoFactory = function () { return document.createElement('video'); };

  function _applyMeasured(el, nodeId, nw, nh) {
    let w = 320, h = 320;
    if (nw && nh) {
      if (nw >= nh) { w = 320; h = Math.max(MIN_SIZE, Math.round(320 * nh / nw)); }
      else          { h = 320; w = Math.max(MIN_SIZE, Math.round(320 * nw / nh)); }
    }
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    ViewerStateStore.set(nodeId, { w, h });
  }

  function _applyFallback(el, nodeId) {
    el.style.width = '240px';
    el.style.height = '240px';
    ViewerStateStore.set(nodeId, { w: 240, h: 240 });
  }

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
    const isVideo = media.tagName === 'VIDEO';

    if (isVideo) {
      // 视频用 detached <video> + loadedmetadata 读 videoWidth/videoHeight
      const probe = measureVideoFactory();
      probe.onloadedmetadata = function () {
        _applyMeasured(el, nodeId, probe.videoWidth || 0, probe.videoHeight || 0);
      };
      probe.onerror = function () { _applyFallback(el, nodeId); };
      probe.preload = 'metadata';
      probe.muted = true;
      probe.src = url;
    } else {
      // 图片用 detached Image()
      const probe = measureImageFactory();
      probe.onload = function () {
        _applyMeasured(el, nodeId, probe.naturalWidth || 0, probe.naturalHeight || 0);
      };
      probe.onerror = function () { _applyFallback(el, nodeId); };
      probe.src = url;
    }
  }

  // ============== Onboard 引导气泡 ==============
  function injectOnboardBubble(el, nodeId) {
    // :scope > 限制只查直接子节点，避免误命中其他子节点里的 onboard bubble（防 nested observer 误判）
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
    injectFallbackMediaRenderer(el, nodeId);

    // 应用持久化的尺寸
    const state = ViewerStateStore.get(nodeId);
    if (state && state.w && state.h) {
      el.style.width = state.w + 'px';
      el.style.height = state.h + 'px';
    }
  }

  const NodeAugmenter = {
    augment,
    isInputImageNode,
    _maybeInitSize: maybeInitSize,
    _setMeasureImageFactory(factory) { measureImageFactory = factory; },
    _setMeasureVideoFactory(factory) { measureVideoFactory = factory; },
  };
  window.sanshimanAssetViewer.NodeAugmenter = NodeAugmenter;

  // ============== Startup grace + MutationObserver ==============
  // 启动 3 秒内出现的节点视为「项目还原加载」，不弹引导气泡 — 避免 SQLite 重新加载几十个节点时屏幕被气泡淹没。
  const STARTUP_GRACE_MS = 3000;
  let startupDone = false;
  setTimeout(function () { startupDone = true; }, STARTUP_GRACE_MS);

  function isStartupGraceActive() {
    // 测试专用旁路：让单元测试无需等 3 秒就能验证动态新增节点的引导气泡
    if (window.__SV_TEST_SKIP_GRACE) return false;
    return !startupDone;
  }

  function unmanageNode(el) {
    const nodeId = el.getAttribute('data-id');
    el.removeAttribute(MANAGED_ATTR);
    el.removeAttribute(VIEWER_ATTR);
    delete el.dataset.svClickWired;
    delete el.dataset.svIdRetries;
    el.querySelectorAll(':scope > .sv-toggle-btn, :scope > .sv-resize-handle, :scope > .sv-filename, :scope > .sv-onboard-bubble, :scope > .sv-fallback-media').forEach(function (n) {
      n.parentNode && n.parentNode.removeChild(n);
    });
    if (nodeId) ViewerStateStore.delete(nodeId);
  }

  function processNode(el, isInitialScan) {
    // 时序兜底：外层 .react-flow__node 可能先于 inner .node-wrapper（带 data-node-type）挂载，
    // 第一拍识别会失败。重试 5 次（5 × 100ms = 500ms 上限）等 React 把内部 DOM 补齐。
    if (!isInputImageNode(el)) {
      // 之前被误标过（生成节点出结果后兜底逻辑把它当成 input-image）→ 清理掉
      if (el.getAttribute(MANAGED_ATTR) === '1') {
        unmanageNode(el);
        return;
      }
      const retries = parseInt(el.dataset.svIdRetries || '0', 10);
      if (retries >= 5) return;
      el.dataset.svIdRetries = String(retries + 1);
      setTimeout(function () {
        if (el.isConnected) processNode(el, isInitialScan);
      }, 100);
      return;
    }
    delete el.dataset.svIdRetries;
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

    let retriesLeft = 50; // 50 × 200ms = 10s 上限，防止无限等待
    function attachObserver() {
      // 测试中允许通过 window.__sv_observed = false + 重新 init 抢占
      if (window.__sv_attach_cancelled) return;
      const roots = document.querySelectorAll('.react-flow');
      if (roots.length === 0) {
        if (--retriesLeft <= 0) return; // 兜底放弃
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
