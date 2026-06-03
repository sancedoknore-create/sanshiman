# 资产查看器节点（Asset Viewer Node）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**：在叁视漫画布的 input-image 节点上，新增"查看器形态"——眼睛按钮一键切换，独立 mini-lightbox 全屏预览，按图片比例自动初始化尺寸，四角可拖拽缩放。

**Architecture**：纯 renderer 注入层 —— 在 `out/renderer/index.html` 加载新增的 `asset-viewer.js` + `asset-viewer.css`，不动 minified bundle、不动 main 进程、不动 SQLite 持久化。MutationObserver 监听画布 DOM 增强 input-image 节点；查看器状态存 `localStorage["sanshiman_viewer_nodes"]` 按 nodeId 索引。

**Tech Stack**：原生 JS（IIFE，不依赖任何打包）、原生 CSS、localStorage、MutationObserver、`new Image()` / `<video>` metadata —— 全部浏览器内置 API。

**Spec**：`docs/superpowers/specs/2026-06-02-asset-viewer-node-design.md`

**Test setup**：项目用 vitest + jsdom，include 为 `src/**/*.{test,spec}.{js,jsx}`。我们的源文件放在 `out/renderer/assets/`（与现有 missing-image.js / starfield-bg.js 一致），测试文件放在 `src/renderer/asset-viewer/__tests__/`。`asset-viewer.js` 末尾加条件 export 让 vitest 能 require。

**Commit 约定**：按用户偏好「不主动发布」，所有 commit 步骤只在本地，**不 push、不发 release**。`src/` 当前 untracked，新建测试文件需要 `git add` 后才能跟踪。每个任务完成后做 commit 检查点。

---

## Task 1：搭骨架 + 接到 index.html

**目标**：创建空的 asset-viewer.js / asset-viewer.css 文件，IIFE 起来不报错；index.html 引用上去；打开应用 DevTools console 能看到 `[asset-viewer] loaded`。

**Files:**
- Create: `out/renderer/assets/asset-viewer.js`
- Create: `out/renderer/assets/asset-viewer.css`
- Modify: `out/renderer/index.html`（head 加 link，body 末尾加 script）
- Create: `src/renderer/asset-viewer/__tests__/skeleton.test.js`

- [ ] **Step 1.1：写失败测试 — IIFE 加载后 window 上挂 sanshimanAssetViewer**

`src/renderer/asset-viewer/__tests__/skeleton.test.js`：

```javascript
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('asset-viewer skeleton', () => {
  beforeAll(() => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
      'utf-8'
    )
    // 在 jsdom window 里执行 IIFE
    new Function(code).call(window)
  })

  it('exposes sanshimanAssetViewer namespace on window', () => {
    expect(window.sanshimanAssetViewer).toBeDefined()
    expect(window.sanshimanAssetViewer.version).toBeTypeOf('string')
  })
})
```

- [ ] **Step 1.2：跑测试确认失败**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/skeleton.test.js 2>&1 | tail -20`
Expected: FAIL — 文件不存在 / `sanshimanAssetViewer is undefined`

- [ ] **Step 1.3：写最小骨架**

`out/renderer/assets/asset-viewer.js`：

```javascript
/* 资产查看器节点注入层
   把 input-image 节点切到「查看器形态」：眼睛按钮、引导气泡、resize 把手、mini-lightbox、按比例初始尺寸。
   不动 minified bundle、不动 main、不动 SQLite。状态持久化在 localStorage。 */
(function () {
  'use strict';

  const VERSION = '1.0.0';

  // —— 暴露给测试和未来扩展用的命名空间
  window.sanshimanAssetViewer = { version: VERSION };

  console.log('[asset-viewer] loaded v' + VERSION);
})();
```

`out/renderer/assets/asset-viewer.css`：

```css
/* 资产查看器节点样式 — 占位，Task 4 起逐步填充 */
```

- [ ] **Step 1.4：跑测试确认通过**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/skeleton.test.js 2>&1 | tail -20`
Expected: PASS — `1 passed`

- [ ] **Step 1.5：把 CSS link 加到 index.html head**

修改 `out/renderer/index.html`：在 `<link rel="stylesheet" href="./assets/missing-image.css">` 这一行后面追加一行：

```html
    <link rel="stylesheet" href="./assets/asset-viewer.css">
```

- [ ] **Step 1.6：把 JS script 加到 index.html body 末尾**

修改 `out/renderer/index.html`：在 `<script src="./assets/missing-image.js"></script>` 这一行后面追加一行：

```html
    <script src="./assets/asset-viewer.js"></script>
```

- [ ] **Step 1.7：手动验证 — 打开应用看 console**

启动应用 → 打开 DevTools console → 看到 `[asset-viewer] loaded v1.0.0` → 没有报错。

如果在不能交互打开应用的环境，跳过此步，靠下游测试覆盖。

- [ ] **Step 1.8：Commit**

```bash
cd /d/sanshiman/resources/app
git add out/renderer/index.html out/renderer/assets/asset-viewer.js out/renderer/assets/asset-viewer.css src/renderer/asset-viewer
git commit -m "feat(viewer): scaffold asset-viewer injection (Task 1)"
```

---

## Task 2：ViewerStateStore — localStorage 读写

**目标**：封装一个简单的状态存储，按 nodeId 存 `{ viewer: bool, w?: number, h?: number }`。

**Files:**
- Modify: `out/renderer/assets/asset-viewer.js`
- Create: `src/renderer/asset-viewer/__tests__/viewer-state-store.test.js`

- [ ] **Step 2.1：写失败测试 — get / set / toggle / delete**

`src/renderer/asset-viewer/__tests__/viewer-state-store.test.js`：

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('ViewerStateStore', () => {
  let store

  beforeEach(() => {
    localStorage.clear()
    delete window.sanshimanAssetViewer
    const code = fs.readFileSync(
      path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
      'utf-8'
    )
    new Function(code).call(window)
    store = window.sanshimanAssetViewer.ViewerStateStore
  })

  it('returns null for unknown nodeId', () => {
    expect(store.get('node_unknown')).toBeNull()
  })

  it('set + get round trip', () => {
    store.set('node_a', { viewer: true, w: 320, h: 180 })
    expect(store.get('node_a')).toEqual({ viewer: true, w: 320, h: 180 })
  })

  it('persists across re-init via localStorage', () => {
    store.set('node_b', { viewer: true, w: 200, h: 200 })
    // 模拟刷新页面：重置 namespace，重新执行 IIFE
    delete window.sanshimanAssetViewer
    const code = fs.readFileSync(
      path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
      'utf-8'
    )
    new Function(code).call(window)
    const fresh = window.sanshimanAssetViewer.ViewerStateStore
    expect(fresh.get('node_b')).toEqual({ viewer: true, w: 200, h: 200 })
  })

  it('toggle flips viewer flag and returns new value', () => {
    expect(store.toggle('node_c')).toBe(true)
    expect(store.get('node_c').viewer).toBe(true)
    expect(store.toggle('node_c')).toBe(false)
    expect(store.get('node_c').viewer).toBe(false)
  })

  it('delete removes the entry', () => {
    store.set('node_d', { viewer: true })
    store.delete('node_d')
    expect(store.get('node_d')).toBeNull()
  })

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('sanshiman_viewer_nodes', '{ not json')
    delete window.sanshimanAssetViewer
    const code = fs.readFileSync(
      path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
      'utf-8'
    )
    new Function(code).call(window)
    const fresh = window.sanshimanAssetViewer.ViewerStateStore
    // 不抛异常，回退到空 store
    expect(fresh.get('anything')).toBeNull()
  })
})
```

- [ ] **Step 2.2：跑测试确认失败**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/viewer-state-store.test.js 2>&1 | tail -25`
Expected: FAIL — `ViewerStateStore is undefined`

- [ ] **Step 2.3：实现 ViewerStateStore**

在 `out/renderer/assets/asset-viewer.js` 的 IIFE 内，`const VERSION` 之后插入：

```javascript
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
        return all[nodeId] || null;
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

  // 暴露给测试 + 调试
  window.sanshimanAssetViewer.ViewerStateStore = ViewerStateStore;
```

- [ ] **Step 2.4：跑测试确认通过**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/viewer-state-store.test.js 2>&1 | tail -25`
Expected: PASS — `6 passed`

- [ ] **Step 2.5：Commit**

```bash
cd /d/sanshiman/resources/app
git add out/renderer/assets/asset-viewer.js src/renderer/asset-viewer/__tests__/viewer-state-store.test.js
git commit -m "feat(viewer): add ViewerStateStore with localStorage persistence (Task 2)"
```

---

## Task 3：MiniLightbox — 全屏预览 overlay

**目标**：纯 DOM 的全屏预览组件，能展示图片/视频，ESC / 点背景 / 点 ✕ 都能关。不依赖 zustand。

**Files:**
- Modify: `out/renderer/assets/asset-viewer.js`
- Modify: `out/renderer/assets/asset-viewer.css`
- Create: `src/renderer/asset-viewer/__tests__/mini-lightbox.test.js`

- [ ] **Step 3.1：写失败测试 — open / close / ESC / click outside**

`src/renderer/asset-viewer/__tests__/mini-lightbox.test.js`：

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

function loadModule() {
  delete window.sanshimanAssetViewer
  const code = fs.readFileSync(
    path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
    'utf-8'
  )
  new Function(code).call(window)
  return window.sanshimanAssetViewer
}

describe('MiniLightbox', () => {
  let lb

  beforeEach(() => {
    document.body.innerHTML = ''
    lb = loadModule().MiniLightbox
  })

  afterEach(() => {
    lb.close()
  })

  it('open with image creates overlay with <img>', () => {
    lb.open({ url: 'sanshiman://local/?path=foo.png', isVideo: false })
    const overlay = document.querySelector('.sv-lightbox-overlay')
    expect(overlay).toBeTruthy()
    const img = overlay.querySelector('img.sv-lightbox-content')
    expect(img).toBeTruthy()
    expect(img.src).toContain('sanshiman://local/?path=foo.png')
  })

  it('open with video creates overlay with <video controls autoplay muted>', () => {
    lb.open({ url: 'sanshiman://local/?path=clip.mp4', isVideo: true })
    const video = document.querySelector('.sv-lightbox-overlay video.sv-lightbox-content')
    expect(video).toBeTruthy()
    expect(video.controls).toBe(true)
    expect(video.autoplay).toBe(true)
    expect(video.muted).toBe(true)
  })

  it('close removes overlay', () => {
    lb.open({ url: 'foo.png', isVideo: false })
    lb.close()
    expect(document.querySelector('.sv-lightbox-overlay')).toBeNull()
  })

  it('Escape key closes', () => {
    lb.open({ url: 'foo.png', isVideo: false })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(document.querySelector('.sv-lightbox-overlay')).toBeNull()
  })

  it('clicking overlay backdrop closes', () => {
    lb.open({ url: 'foo.png', isVideo: false })
    const overlay = document.querySelector('.sv-lightbox-overlay')
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.querySelector('.sv-lightbox-overlay')).toBeNull()
  })

  it('clicking the image (inner content) does NOT close', () => {
    lb.open({ url: 'foo.png', isVideo: false })
    const img = document.querySelector('.sv-lightbox-content')
    img.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    // 还在
    expect(document.querySelector('.sv-lightbox-overlay')).toBeTruthy()
  })

  it('opening when one is already open replaces it (no double overlay)', () => {
    lb.open({ url: 'a.png', isVideo: false })
    lb.open({ url: 'b.png', isVideo: false })
    const overlays = document.querySelectorAll('.sv-lightbox-overlay')
    expect(overlays.length).toBe(1)
    expect(overlays[0].querySelector('img').src).toContain('b.png')
  })
})
```

- [ ] **Step 3.2：跑测试确认失败**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/mini-lightbox.test.js 2>&1 | tail -30`
Expected: FAIL — `MiniLightbox is undefined`

- [ ] **Step 3.3：实现 MiniLightbox**

在 `out/renderer/assets/asset-viewer.js` 的 IIFE 内，`window.sanshimanAssetViewer.ViewerStateStore = ViewerStateStore;` 之后插入：

```javascript
  // ============== MiniLightbox ==============
  const MiniLightbox = (function () {
    let currentOverlay = null;
    let escHandler = null;

    function close() {
      if (escHandler) {
        document.removeEventListener('keydown', escHandler);
        escHandler = null;
      }
      if (currentOverlay && currentOverlay.parentNode) {
        currentOverlay.parentNode.removeChild(currentOverlay);
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

      // ESC 关闭
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
```

- [ ] **Step 3.4：跑测试确认通过**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/mini-lightbox.test.js 2>&1 | tail -25`
Expected: PASS — `7 passed`

- [ ] **Step 3.5：加 lightbox 视觉样式**

在 `out/renderer/assets/asset-viewer.css` 末尾追加：

```css
/* ============== MiniLightbox ============== */
.sv-lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(2, 3, 8, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: sv-lightbox-fade-in 0.2s ease-out;
}

@keyframes sv-lightbox-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.sv-lightbox-content {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  box-shadow: 0 0 40px rgba(100, 200, 255, 0.25);
  border-radius: 4px;
}

.sv-lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(20, 25, 40, 0.85);
  color: rgba(180, 220, 255, 0.9);
  border: 1px solid rgba(100, 200, 255, 0.45);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px rgba(100, 200, 255, 0.25);
  transition: all 0.2s ease;
}
.sv-lightbox-close:hover {
  background: rgba(60, 30, 80, 0.85);
  color: #fff;
  box-shadow: 0 0 14px rgba(180, 100, 220, 0.5);
}
```

- [ ] **Step 3.6：Commit**

```bash
cd /d/sanshiman/resources/app
git add out/renderer/assets/asset-viewer.js out/renderer/assets/asset-viewer.css src/renderer/asset-viewer/__tests__/mini-lightbox.test.js
git commit -m "feat(viewer): add MiniLightbox component (Task 3)"
```

---

## Task 4：节点识别 + DOM 标记

**目标**：MutationObserver 监听 `.react-flow` 容器，发现新增的 `[data-id^="node_"]` 元素，识别 input-image 类型并打上 `data-sv-managed="1"` 标记（幂等）。`augment(nodeEl)` 函数后续任务在它基础上加按钮和样式。

**Files:**
- Modify: `out/renderer/assets/asset-viewer.js`
- Create: `src/renderer/asset-viewer/__tests__/node-augmenter.test.js`

- [ ] **Step 4.1：写失败测试 — augment 给 input-image 节点打标记**

`src/renderer/asset-viewer/__tests__/node-augmenter.test.js`：

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'

function loadModule() {
  delete window.sanshimanAssetViewer
  const code = fs.readFileSync(
    path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
    'utf-8'
  )
  new Function(code).call(window)
  return window.sanshimanAssetViewer
}

function makeNodeEl({ id, type = 'input-image', withImg = true, withHandle = true }) {
  const el = document.createElement('div')
  el.setAttribute('data-id', id)
  if (type) el.setAttribute('data-node-type', type)
  if (withImg) {
    const img = document.createElement('img')
    img.src = 'sanshiman://local/?path=foo.png'
    el.appendChild(img)
  }
  if (withHandle) {
    const h = document.createElement('div')
    h.className = 'react-flow__handle'
    el.appendChild(h)
  }
  return el
}

describe('NodeAugmenter.augment', () => {
  let aug, store

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    const mod = loadModule()
    aug = mod.NodeAugmenter
    store = mod.ViewerStateStore
  })

  it('marks input-image node as managed', () => {
    const el = makeNodeEl({ id: 'node_1' })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-sv-managed')).toBe('1')
  })

  it('augment is idempotent — calling twice does not re-mark or duplicate', () => {
    const el = makeNodeEl({ id: 'node_1' })
    document.body.appendChild(el)
    aug.augment(el)
    aug.augment(el)
    expect(el.querySelectorAll('[data-sv-managed]').length).toBe(0) // marker is on el itself, no children dupe
    // 后续任务会加按钮，到时再加去重断言
  })

  it('skips non-input-image node types', () => {
    const el = makeNodeEl({ id: 'node_2', type: 'gen-image' })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-sv-managed')).toBeNull()
  })

  it('fallback recognises node when data-node-type missing but has img + handle', () => {
    const el = makeNodeEl({ id: 'node_3', type: null })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-sv-managed')).toBe('1')
  })

  it('skips nodes without img or handle', () => {
    const el = makeNodeEl({ id: 'node_4', type: null, withImg: false })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-sv-managed')).toBeNull()
  })

  it('applies viewer state to DOM if store has entry', () => {
    store.set('node_5', { viewer: true })
    const el = makeNodeEl({ id: 'node_5' })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-viewer-only')).toBe('true')
  })
})
```

- [ ] **Step 4.2：跑测试确认失败**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/node-augmenter.test.js 2>&1 | tail -30`
Expected: FAIL — `NodeAugmenter is undefined`

- [ ] **Step 4.3：实现 NodeAugmenter.augment（识别 + 标记 + 应用 viewer 状态）**

在 `out/renderer/assets/asset-viewer.js` 的 IIFE 内，`window.sanshimanAssetViewer.MiniLightbox = MiniLightbox;` 之后插入：

```javascript
  // ============== NodeAugmenter ==============
  const MANAGED_ATTR = 'data-sv-managed';
  const VIEWER_ATTR = 'data-viewer-only';

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

  function augment(el) {
    if (!isInputImageNode(el)) return;
    if (el.getAttribute(MANAGED_ATTR) === '1') return; // 幂等

    const nodeId = el.getAttribute('data-id');
    el.setAttribute(MANAGED_ATTR, '1');
    applyViewerState(el, nodeId);

    // 后续任务在这里加：眼睛按钮、引导气泡、resize 把手、点击 lightbox、自动尺寸
  }

  const NodeAugmenter = { augment, isInputImageNode };
  window.sanshimanAssetViewer.NodeAugmenter = NodeAugmenter;
```

- [ ] **Step 4.4：跑测试确认通过**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/node-augmenter.test.js 2>&1 | tail -25`
Expected: PASS — `6 passed`

- [ ] **Step 4.5：Commit**

```bash
cd /d/sanshiman/resources/app
git add out/renderer/assets/asset-viewer.js src/renderer/asset-viewer/__tests__/node-augmenter.test.js
git commit -m "feat(viewer): node identification + viewer state application (Task 4)"
```

---

## Task 5：眼睛按钮 + 切换查看器形态

**目标**：augment 时给节点注入眼睛按钮；点击切换 ViewerStateStore；DOM 上的 `data-viewer-only` 跟着变；CSS 接管视觉切换。

**Files:**
- Modify: `out/renderer/assets/asset-viewer.js`
- Modify: `out/renderer/assets/asset-viewer.css`
- Modify: `src/renderer/asset-viewer/__tests__/node-augmenter.test.js`

- [ ] **Step 5.1：扩展失败测试 — 眼睛按钮存在 + 点击切换**

在 `src/renderer/asset-viewer/__tests__/node-augmenter.test.js` 文件 `describe('NodeAugmenter.augment', ...)` 块的最后一个 it 之后追加：

```javascript
  it('adds eye toggle button after augment', () => {
    const el = makeNodeEl({ id: 'node_eye_1' })
    document.body.appendChild(el)
    aug.augment(el)
    const btn = el.querySelector('.sv-toggle-btn')
    expect(btn).toBeTruthy()
    expect(btn.getAttribute('aria-label')).toMatch(/查看器|viewer/i)
  })

  it('eye toggle flips viewer-only attribute on click', () => {
    const el = makeNodeEl({ id: 'node_eye_2' })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-viewer-only')).toBeNull()

    const btn = el.querySelector('.sv-toggle-btn')
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.getAttribute('data-viewer-only')).toBe('true')
    expect(store.get('node_eye_2').viewer).toBe(true)

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.getAttribute('data-viewer-only')).toBeNull()
    expect(store.get('node_eye_2').viewer).toBe(false)
  })

  it('eye toggle click does not bubble to node (stopPropagation)', () => {
    const el = makeNodeEl({ id: 'node_eye_3' })
    document.body.appendChild(el)
    aug.augment(el)

    let nodeReceivedClick = false
    el.addEventListener('click', () => { nodeReceivedClick = true })
    const btn = el.querySelector('.sv-toggle-btn')
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(nodeReceivedClick).toBe(false)
  })

  it('augment idempotent — second call does not duplicate eye button', () => {
    const el = makeNodeEl({ id: 'node_eye_4' })
    document.body.appendChild(el)
    aug.augment(el)
    aug.augment(el)
    expect(el.querySelectorAll('.sv-toggle-btn').length).toBe(1)
  })
```

- [ ] **Step 5.2：跑测试确认新增 4 条失败**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/node-augmenter.test.js 2>&1 | tail -30`
Expected: 4 个新测试 FAIL（`.sv-toggle-btn` 不存在）

- [ ] **Step 5.3：实现眼睛按钮注入**

在 `out/renderer/assets/asset-viewer.js` 内，把 `function augment(el)` 替换为：

```javascript
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
    });
    // mousedown 也阻止冒泡 — ReactFlow 在 mousedown 上启动节点拖动
    btn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    el.appendChild(btn);
  }

  function augment(el) {
    if (!isInputImageNode(el)) return;
    if (el.getAttribute(MANAGED_ATTR) === '1') return;

    const nodeId = el.getAttribute('data-id');
    el.setAttribute(MANAGED_ATTR, '1');
    applyViewerState(el, nodeId);
    injectEyeButton(el, nodeId);

    // 后续任务：引导气泡、resize 把手、点击 lightbox、自动尺寸
  }
```

- [ ] **Step 5.4：跑测试确认全部通过**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/node-augmenter.test.js 2>&1 | tail -25`
Expected: PASS — `10 passed`

- [ ] **Step 5.5：加眼睛按钮 + 查看器形态视觉样式**

在 `out/renderer/assets/asset-viewer.css` 末尾追加：

```css
/* ============== 眼睛切换按钮 ============== */
.sv-toggle-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(20, 25, 40, 0.85);
  color: rgba(180, 220, 255, 0.85);
  border: 1px solid rgba(100, 200, 255, 0.45);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  box-shadow: 0 0 6px rgba(100, 200, 255, 0.2);
  transition: all 0.2s ease;
  padding: 0;
}
.sv-toggle-btn:hover {
  background: rgba(60, 30, 80, 0.85);
  color: #fff;
  border-color: rgba(180, 100, 220, 0.6);
  box-shadow: 0 0 12px rgba(180, 100, 220, 0.5);
}

/* ============== 查看器形态：data-viewer-only="true" ============== */
[data-viewer-only="true"] {
  border: 1px solid rgba(100, 200, 255, 0.5) !important;
  box-shadow:
    0 0 12px rgba(100, 200, 255, 0.25),
    0 0 24px rgba(180, 100, 220, 0.15) !important;
  border-radius: 6px !important;
}

/* 隐藏查看器形态的连接桩 */
[data-viewer-only="true"] .react-flow__handle {
  display: none !important;
}

/* 选中态加紫色外环 */
.react-flow__node.selected [data-viewer-only="true"],
[data-viewer-only="true"].selected {
  box-shadow:
    0 0 0 2px rgba(180, 100, 220, 0.7),
    0 0 18px rgba(100, 200, 255, 0.35) !important;
}
```

- [ ] **Step 5.6：Commit**

```bash
cd /d/sanshiman/resources/app
git add out/renderer/assets/asset-viewer.js out/renderer/assets/asset-viewer.css src/renderer/asset-viewer/__tests__/node-augmenter.test.js
git commit -m "feat(viewer): eye toggle button + viewer-only visual styling (Task 5)"
```

---

## Task 6：节点中央点击 → MiniLightbox + 文件名标签

**目标**：查看器形态下，节点中央（不是按钮、不是把手）点击 → 触发 MiniLightbox；底部加文件名标签。

**Files:**
- Modify: `out/renderer/assets/asset-viewer.js`
- Modify: `out/renderer/assets/asset-viewer.css`
- Modify: `src/renderer/asset-viewer/__tests__/node-augmenter.test.js`

- [ ] **Step 6.1：扩展失败测试 — 文件名标签 + 点击触发 lightbox**

在 `node-augmenter.test.js` 末尾追加：

```javascript
  function getMediaUrl(el) {
    const m = el.querySelector('img, video')
    return m ? m.src : null
  }

  it('extracts filename from img src into label', () => {
    const el = makeNodeEl({ id: 'node_fn_1' })
    // 替换 img.src 让文件名容易认
    el.querySelector('img').src = 'sanshiman://local/?path=' + encodeURIComponent('C:/foo/bar/abc.png')
    document.body.appendChild(el)
    store.set('node_fn_1', { viewer: true })
    aug.augment(el)
    const label = el.querySelector('.sv-filename')
    expect(label).toBeTruthy()
    expect(label.textContent).toBe('abc.png')
  })

  it('filename label hidden when not in viewer mode', () => {
    const el = makeNodeEl({ id: 'node_fn_2' })
    document.body.appendChild(el)
    aug.augment(el)
    const label = el.querySelector('.sv-filename')
    // 标签可以始终在 DOM 里，但靠 CSS 在非查看器形态下隐藏
    // 测试只确认：data-viewer-only 没设
    expect(el.getAttribute('data-viewer-only')).toBeNull()
  })

  it('clicking node center in viewer mode opens lightbox', () => {
    const el = makeNodeEl({ id: 'node_lb_1' })
    el.querySelector('img').src = 'sanshiman://local/?path=foo.png'
    document.body.appendChild(el)
    store.set('node_lb_1', { viewer: true })
    aug.augment(el)

    const target = el.querySelector('.sv-center-clickable') || el.querySelector('img')
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(document.querySelector('.sv-lightbox-overlay')).toBeTruthy()
    // 清理
    window.sanshimanAssetViewer.MiniLightbox.close()
  })

  it('clicking node center in non-viewer mode does NOT open lightbox', () => {
    const el = makeNodeEl({ id: 'node_lb_2' })
    document.body.appendChild(el)
    aug.augment(el)

    const img = el.querySelector('img')
    img.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.querySelector('.sv-lightbox-overlay')).toBeNull()
  })

  it('clicking eye button does not also open lightbox', () => {
    const el = makeNodeEl({ id: 'node_lb_3' })
    document.body.appendChild(el)
    store.set('node_lb_3', { viewer: true })
    aug.augment(el)

    const btn = el.querySelector('.sv-toggle-btn')
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.querySelector('.sv-lightbox-overlay')).toBeNull()
  })
```

- [ ] **Step 6.2：跑测试确认新 5 条失败**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/node-augmenter.test.js 2>&1 | tail -30`
Expected: 5 个新测试 FAIL

- [ ] **Step 6.3：实现文件名 + 中央点击触发 lightbox**

在 `out/renderer/assets/asset-viewer.js` 内，`function injectEyeButton` 之后插入：

```javascript
  function decodePathFromContent(url) {
    // url 形如 sanshiman://local/?path=<encoded>
    if (!url) return '';
    try {
      const u = new URL(url);
      const p = u.searchParams.get('path');
      if (p) {
        const decoded = decodeURIComponent(p);
        // 路径分隔符可能是 / 或 \
        const parts = decoded.split(/[/\\]/);
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
    const label = document.createElement('div');
    label.className = 'sv-filename';
    label.textContent = filename;
    label.title = filename;
    el.appendChild(label);
  }

  function injectCenterClickHandler(el, nodeId) {
    if (el.dataset.svClickWired === '1') return;
    el.dataset.svClickWired = '1';

    el.addEventListener('click', function (e) {
      // 只在查看器形态下触发
      if (el.getAttribute(VIEWER_ATTR) !== 'true') return;
      // 排除按钮和把手
      const t = e.target;
      if (t.closest('.sv-toggle-btn')) return;
      if (t.closest('.sv-resize-handle')) return;
      if (t.closest('.sv-onboard-bubble')) return;
      // 触发 lightbox
      const media = el.querySelector('img, video');
      if (!media) return;
      const url = media.src;
      const isVideo = media.tagName === 'VIDEO';
      MiniLightbox.open({ url, isVideo });
    });
  }
```

把 `function augment(el)` 替换为：

```javascript
  function augment(el) {
    if (!isInputImageNode(el)) return;
    if (el.getAttribute(MANAGED_ATTR) === '1') return;

    const nodeId = el.getAttribute('data-id');
    el.setAttribute(MANAGED_ATTR, '1');
    applyViewerState(el, nodeId);
    injectEyeButton(el, nodeId);
    injectFilenameLabel(el);
    injectCenterClickHandler(el, nodeId);

    // 后续任务：引导气泡、resize 把手、自动尺寸
  }
```

- [ ] **Step 6.4：跑测试确认全部通过**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/node-augmenter.test.js 2>&1 | tail -25`
Expected: PASS — `15 passed`

- [ ] **Step 6.5：加文件名标签样式 + 视频节点中心标记**

在 `out/renderer/assets/asset-viewer.css` 末尾追加：

```css
/* ============== 文件名标签 ============== */
.sv-filename {
  position: absolute;
  bottom: 4px;
  left: 6px;
  right: 6px;
  font-family: 'Courier New', monospace;
  font-size: 10px;
  color: rgba(180, 200, 230, 0.75);
  background: rgba(10, 12, 20, 0.7);
  padding: 2px 6px;
  border-radius: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  z-index: 10;
  display: none; /* 默认隐藏，仅查看器形态显示 */
}
[data-viewer-only="true"] .sv-filename {
  display: block;
}

/* 查看器形态下，节点本身鼠标 cursor 变 zoom-in 提示能点击 */
[data-viewer-only="true"] {
  cursor: zoom-in;
}
[data-viewer-only="true"] .sv-toggle-btn,
[data-viewer-only="true"] .sv-resize-handle {
  cursor: pointer;
}
```

- [ ] **Step 6.6：Commit**

```bash
cd /d/sanshiman/resources/app
git add out/renderer/assets/asset-viewer.js out/renderer/assets/asset-viewer.css src/renderer/asset-viewer/__tests__/node-augmenter.test.js
git commit -m "feat(viewer): center click opens lightbox + filename label (Task 6)"
```

---

## Task 7：四角拖拽缩放

**目标**：查看器形态下，四角各加一个 8×8 把手，按下拖动改节点尺寸；松手写回 ViewerStateStore；不触发 ReactFlow 节点拖动。

**Files:**
- Modify: `out/renderer/assets/asset-viewer.js`
- Modify: `out/renderer/assets/asset-viewer.css`
- Modify: `src/renderer/asset-viewer/__tests__/node-augmenter.test.js`

- [ ] **Step 7.1：扩展失败测试 — 把手存在 + 拖动改尺寸 + stopPropagation**

在 `node-augmenter.test.js` 末尾追加：

```javascript
  it('inserts 4 resize handles after augment', () => {
    const el = makeNodeEl({ id: 'node_rs_1' })
    document.body.appendChild(el)
    aug.augment(el)
    const handles = el.querySelectorAll('.sv-resize-handle')
    expect(handles.length).toBe(4)
    expect(el.querySelector('.sv-rh-tl')).toBeTruthy()
    expect(el.querySelector('.sv-rh-tr')).toBeTruthy()
    expect(el.querySelector('.sv-rh-bl')).toBeTruthy()
    expect(el.querySelector('.sv-rh-br')).toBeTruthy()
  })

  it('br handle drag enlarges node and persists', () => {
    const el = makeNodeEl({ id: 'node_rs_2' })
    el.style.width = '200px'
    el.style.height = '150px'
    document.body.appendChild(el)
    aug.augment(el)

    const br = el.querySelector('.sv-rh-br')
    // 起始
    br.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 200, clientY: 150 }))
    // 拖到右下 +50/+30
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 250, clientY: 180 }))
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 250, clientY: 180 }))

    expect(parseInt(el.style.width, 10)).toBe(250)
    expect(parseInt(el.style.height, 10)).toBe(180)
    const saved = store.get('node_rs_2')
    expect(saved.w).toBe(250)
    expect(saved.h).toBe(180)
  })

  it('resize is clamped to minimum 120x120', () => {
    const el = makeNodeEl({ id: 'node_rs_3' })
    el.style.width = '200px'
    el.style.height = '200px'
    document.body.appendChild(el)
    aug.augment(el)

    const br = el.querySelector('.sv-rh-br')
    br.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 200, clientY: 200 }))
    // 拖到很小
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 50 }))
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 50, clientY: 50 }))

    expect(parseInt(el.style.width, 10)).toBe(120)
    expect(parseInt(el.style.height, 10)).toBe(120)
  })

  it('handle mousedown does NOT propagate (so ReactFlow does not move node)', () => {
    const el = makeNodeEl({ id: 'node_rs_4' })
    document.body.appendChild(el)
    aug.augment(el)

    let nodeReceived = false
    el.addEventListener('mousedown', () => { nodeReceived = true })

    const br = el.querySelector('.sv-rh-br')
    br.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 0, clientY: 0 }))
    expect(nodeReceived).toBe(false)
    // 清理 — 抛个 mouseup 让监听器解绑
    document.dispatchEvent(new MouseEvent('mouseup'))
  })
```

- [ ] **Step 7.2：跑测试确认新 4 条失败**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/node-augmenter.test.js 2>&1 | tail -30`
Expected: 4 个新测试 FAIL

- [ ] **Step 7.3：实现 resize 把手**

在 `out/renderer/assets/asset-viewer.js` 内，`function injectCenterClickHandler` 之后插入：

```javascript
  function injectResizeHandles(el, nodeId) {
    if (el.querySelector(':scope > .sv-resize-handle')) return; // 幂等
    const corners = [
      ['tl', -1, -1],
      ['tr',  1, -1],
      ['bl', -1,  1],
      ['br',  1,  1],
    ];
    for (const [pos, sx, sy] of corners) {
      const h = document.createElement('div');
      h.className = 'sv-resize-handle sv-rh-' + pos;
      h.dataset.svCorner = pos;
      h.addEventListener('mousedown', function (e) {
        e.stopPropagation();
        e.preventDefault();
        startResize(el, nodeId, sx, sy, e.clientX, e.clientY);
      });
      el.appendChild(h);
    }
  }

  function startResize(el, nodeId, signX, signY, startX, startY) {
    const startW = el.offsetWidth || 200;
    const startH = el.offsetHeight || 200;
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = (signX * signY > 0) ? 'nwse-resize' : 'nesw-resize';

    function onMove(e) {
      const dx = (e.clientX - startX) * signX;
      const dy = (e.clientY - startY) * signY;
      let w = Math.max(120, startW + dx);
      let h = Math.max(120, startH + dy);
      el.style.width = w + 'px';
      el.style.height = h + 'px';
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      const w = parseInt(el.style.width, 10) || el.offsetWidth;
      const h = parseInt(el.style.height, 10) || el.offsetHeight;
      ViewerStateStore.set(nodeId, { w, h });
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
```

把 `function augment(el)` 替换为：

```javascript
  function augment(el) {
    if (!isInputImageNode(el)) return;
    if (el.getAttribute(MANAGED_ATTR) === '1') return;

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

    // 后续任务：引导气泡、自动尺寸初始化
  }
```

- [ ] **Step 7.4：跑测试确认全部通过**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/node-augmenter.test.js 2>&1 | tail -25`
Expected: PASS — `19 passed`

- [ ] **Step 7.5：加 resize 把手样式**

在 `out/renderer/assets/asset-viewer.css` 末尾追加：

```css
/* ============== Resize 把手（仅查看器形态显示） ============== */
.sv-resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(100, 200, 255, 0.85);
  border: 1px solid rgba(180, 220, 255, 1);
  box-shadow: 0 0 4px rgba(100, 200, 255, 0.7);
  z-index: 25;
  display: none;
  pointer-events: auto;
}
[data-viewer-only="true"] .sv-resize-handle {
  display: block;
}
.sv-rh-tl { top: -4px;    left: -4px;    cursor: nwse-resize; }
.sv-rh-tr { top: -4px;    right: -4px;   cursor: nesw-resize; }
.sv-rh-bl { bottom: -4px; left: -4px;    cursor: nesw-resize; }
.sv-rh-br { bottom: -4px; right: -4px;   cursor: nwse-resize; }

.sv-resize-handle:hover {
  background: rgba(180, 100, 220, 0.9);
  box-shadow: 0 0 8px rgba(180, 100, 220, 0.7);
}
```

- [ ] **Step 7.6：Commit**

```bash
cd /d/sanshiman/resources/app
git add out/renderer/assets/asset-viewer.js out/renderer/assets/asset-viewer.css src/renderer/asset-viewer/__tests__/node-augmenter.test.js
git commit -m "feat(viewer): four-corner resize handles with persistence (Task 7)"
```

---

## Task 8：MutationObserver 实时观察 + 自动尺寸 + 引导气泡

**目标**：把 augment 接到 MutationObserver；启动后头 3 秒内的节点不弹引导气泡（视为 SQLite 重新加载）；新建节点弹 5 秒气泡；查看器形态下若没尺寸记录，按图片实际比例算长边 320 的初始尺寸。

**Files:**
- Modify: `out/renderer/assets/asset-viewer.js`
- Create: `src/renderer/asset-viewer/__tests__/observer-and-onboard.test.js`
- Modify: `out/renderer/assets/asset-viewer.css`

- [ ] **Step 8.1：写失败测试 — observer / onboard / autosize**

`src/renderer/asset-viewer/__tests__/observer-and-onboard.test.js`：

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

function loadModule(opts = {}) {
  delete window.sanshimanAssetViewer
  // 测试钩子：禁用 3 秒启动等待，让所有节点都视为新建
  if (opts.skipStartupGrace) window.__SV_TEST_SKIP_GRACE = true
  else delete window.__SV_TEST_SKIP_GRACE
  const code = fs.readFileSync(
    path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
    'utf-8'
  )
  new Function(code).call(window)
  return window.sanshimanAssetViewer
}

function makeNodeEl(id) {
  const el = document.createElement('div')
  el.setAttribute('data-id', id)
  el.setAttribute('data-node-type', 'input-image')
  const img = document.createElement('img')
  img.src = 'sanshiman://local/?path=foo.png'
  el.appendChild(img)
  const h = document.createElement('div')
  h.className = 'react-flow__handle'
  el.appendChild(h)
  return el
}

describe('MutationObserver auto-augment', () => {
  let canvas

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    canvas = document.createElement('div')
    canvas.className = 'react-flow'
    document.body.appendChild(canvas)
  })

  it('augments nodes added to .react-flow after init', async () => {
    loadModule()
    const el = makeNodeEl('node_obs_1')
    canvas.appendChild(el)
    // MutationObserver 是异步的
    await new Promise(r => setTimeout(r, 20))
    expect(el.getAttribute('data-sv-managed')).toBe('1')
  })

  it('augments nodes already present at init (initial scan)', async () => {
    const el = makeNodeEl('node_obs_2')
    canvas.appendChild(el)
    loadModule()
    await new Promise(r => setTimeout(r, 20))
    expect(el.getAttribute('data-sv-managed')).toBe('1')
  })
})

describe('Onboard bubble', () => {
  let canvas

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    canvas = document.createElement('div')
    canvas.className = 'react-flow'
    document.body.appendChild(canvas)
  })

  it('does NOT show onboard bubble during 3-second startup grace', async () => {
    loadModule() // grace ON
    const el = makeNodeEl('node_ob_1')
    canvas.appendChild(el)
    await new Promise(r => setTimeout(r, 30))
    expect(el.querySelector('.sv-onboard-bubble')).toBeNull()
  })

  it('shows onboard bubble for nodes added AFTER startup grace', async () => {
    loadModule({ skipStartupGrace: true })
    const el = makeNodeEl('node_ob_2')
    canvas.appendChild(el)
    await new Promise(r => setTimeout(r, 30))
    expect(el.querySelector('.sv-onboard-bubble')).toBeTruthy()
  })

  it('clicking onboard bubble switches to viewer mode and dismisses bubble', async () => {
    const mod = loadModule({ skipStartupGrace: true })
    const el = makeNodeEl('node_ob_3')
    canvas.appendChild(el)
    await new Promise(r => setTimeout(r, 30))
    const bubble = el.querySelector('.sv-onboard-bubble')
    expect(bubble).toBeTruthy()
    // 点气泡正文（不是 ✕）
    const action = bubble.querySelector('.sv-onboard-action')
    action.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.getAttribute('data-viewer-only')).toBe('true')
    expect(el.querySelector('.sv-onboard-bubble')).toBeNull()
  })

  it('clicking bubble close dismisses without switching', async () => {
    loadModule({ skipStartupGrace: true })
    const el = makeNodeEl('node_ob_4')
    canvas.appendChild(el)
    await new Promise(r => setTimeout(r, 30))
    const close = el.querySelector('.sv-onboard-close')
    close.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.getAttribute('data-viewer-only')).toBeNull()
    expect(el.querySelector('.sv-onboard-bubble')).toBeNull()
  })
})

describe('Auto initial size by image aspect ratio', () => {
  let canvas

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    canvas = document.createElement('div')
    canvas.className = 'react-flow'
    document.body.appendChild(canvas)
  })

  it('sets size proportional to image natural ratio when entering viewer mode without saved size', async () => {
    const mod = loadModule()
    const aug = mod.NodeAugmenter
    const store = mod.ViewerStateStore

    // 模拟 1920x1080 → 长边 320，短边按比例
    const fakeImg = { naturalWidth: 1920, naturalHeight: 1080, addEventListener() {} }
    aug._setMeasureImageFactory(() => fakeImg)
    // 立刻触发 onload 回调
    aug._setMeasureImageFactory(() => {
      const o = { naturalWidth: 1920, naturalHeight: 1080 }
      Object.defineProperty(o, 'src', {
        set(v) { setTimeout(() => o.onload && o.onload(), 0) },
      })
      return o
    })

    const el = makeNodeEl('node_sz_1')
    canvas.appendChild(el)
    await new Promise(r => setTimeout(r, 20))
    // 切到查看器模式
    el.querySelector('.sv-toggle-btn').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    // 等异步尺寸回写
    await new Promise(r => setTimeout(r, 20))

    const w = parseInt(el.style.width, 10)
    const h = parseInt(el.style.height, 10)
    expect(w).toBe(320)
    expect(h).toBe(180) // 320 * 1080 / 1920
    const saved = store.get('node_sz_1')
    expect(saved.w).toBe(320)
    expect(saved.h).toBe(180)
  })

  it('uses fallback 240x240 when image fails to load', async () => {
    const mod = loadModule()
    const aug = mod.NodeAugmenter
    aug._setMeasureImageFactory(() => {
      const o = {}
      Object.defineProperty(o, 'src', {
        set(v) { setTimeout(() => o.onerror && o.onerror(), 0) },
      })
      return o
    })

    const el = makeNodeEl('node_sz_2')
    canvas.appendChild(el)
    await new Promise(r => setTimeout(r, 20))
    el.querySelector('.sv-toggle-btn').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(r => setTimeout(r, 20))

    expect(parseInt(el.style.width, 10)).toBe(240)
    expect(parseInt(el.style.height, 10)).toBe(240)
  })

  it('does NOT recompute size when saved dimensions exist', async () => {
    const mod = loadModule()
    const store = mod.ViewerStateStore
    store.set('node_sz_3', { viewer: true, w: 500, h: 300 })

    const el = makeNodeEl('node_sz_3')
    canvas.appendChild(el)
    await new Promise(r => setTimeout(r, 30))
    expect(parseInt(el.style.width, 10)).toBe(500)
    expect(parseInt(el.style.height, 10)).toBe(300)
  })
})
```

- [ ] **Step 8.2：跑测试确认失败**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/observer-and-onboard.test.js 2>&1 | tail -30`
Expected: 多条 FAIL（observer 不存在 / 引导气泡不存在 / 自动尺寸不存在）

- [ ] **Step 8.3：实现 observer + onboard + autosize**

在 `out/renderer/assets/asset-viewer.js` 内，`function injectResizeHandles` 之后、`function augment` 之前插入：

```javascript
  // ============== Onboard 引导气泡 ==============
  const ONBOARD_DURATION_MS = 5000;

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
    }

    bubble.appendChild(action);
    bubble.appendChild(close);
    el.appendChild(bubble);

    setTimeout(removeBubble, ONBOARD_DURATION_MS);
  }

  // ============== Auto 初始尺寸 ==============
  let measureImageFactory = () => new Image();

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
        if (nw >= nh) { w = 320; h = Math.max(120, Math.round(320 * nh / nw)); }
        else          { h = 320; w = Math.max(120, Math.round(320 * nw / nh)); }
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

  // 测试钩子：替换 measure 工厂以注入 mock Image
  NodeAugmenter._setMeasureImageFactory = function (factory) { measureImageFactory = factory; };

  // ============== Startup grace + Observer ==============
  const STARTUP_GRACE_MS = 3000;
  let startupDone = false;

  function isStartupGraceActive() {
    if (window.__SV_TEST_SKIP_GRACE) return false;
    return !startupDone;
  }

  function observeAndAugment() {
    const ALREADY_FLAG = '__sv_observed';
    if (window[ALREADY_FLAG]) return;
    window[ALREADY_FLAG] = true;

    function findRoots() {
      return document.querySelectorAll('.react-flow');
    }

    function processNode(el, isInitialScan) {
      if (!isInputImageNode(el)) return;
      const wasManaged = el.getAttribute(MANAGED_ATTR) === '1';
      augment(el);
      // 仅对真正新建的节点（非启动期、非已有）显示引导气泡
      if (!wasManaged && !isInitialScan && !isStartupGraceActive()) {
        const nodeId = el.getAttribute('data-id');
        const state = ViewerStateStore.get(nodeId);
        if (!state || !state.viewer) {
          injectOnboardBubble(el, nodeId);
        }
      }
    }

    const observer = new MutationObserver(function (mutations) {
      for (const m of mutations) {
        for (const added of m.addedNodes) {
          if (added.nodeType !== 1) continue;
          // 节点本身
          processNode(added, false);
          // 子树里也找
          if (added.querySelectorAll) {
            const inner = added.querySelectorAll('[data-id^="node_"]');
            inner.forEach(n => processNode(n, false));
          }
        }
      }
    });

    function attachObserver() {
      const roots = findRoots();
      if (roots.length === 0) {
        // 画布还没渲染，等一下再试
        setTimeout(attachObserver, 200);
        return;
      }
      roots.forEach(r => observer.observe(r, { childList: true, subtree: true }));
      // 初始扫描已存在的节点
      roots.forEach(r => {
        r.querySelectorAll('[data-id^="node_"]').forEach(n => processNode(n, true));
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachObserver);
    } else {
      attachObserver();
    }

    // 启动期结束
    setTimeout(function () { startupDone = true; }, STARTUP_GRACE_MS);
  }

  // 测试环境也启动 observer（jsdom 支持 MutationObserver）
  observeAndAugment();
```

把 `function augment(el)` 替换为：

```javascript
  function augment(el) {
    if (!isInputImageNode(el)) return;
    if (el.getAttribute(MANAGED_ATTR) === '1') return;

    const nodeId = el.getAttribute('data-id');
    el.setAttribute(MANAGED_ATTR, '1');
    applyViewerState(el, nodeId);
    injectEyeButton(el, nodeId);
    injectFilenameLabel(el);
    injectCenterClickHandler(el, nodeId);
    injectResizeHandles(el, nodeId);
    maybeInitSize(el, nodeId);
  }
```

并把眼睛按钮的 click 处理（在 `injectEyeButton` 内）扩展为切换后也调一次 `maybeInitSize`：

```javascript
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      ViewerStateStore.toggle(nodeId);
      applyViewerState(el, nodeId);
      maybeInitSize(el, nodeId);
    });
```

- [ ] **Step 8.4：跑测试确认全部通过**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__/observer-and-onboard.test.js 2>&1 | tail -30`
Expected: PASS — 全部新测试通过

- [ ] **Step 8.5：跑完整测试套件，确认其他测试没回归**

Run: `cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__ 2>&1 | tail -30`
Expected: 全部 PASS

- [ ] **Step 8.6：加引导气泡样式**

在 `out/renderer/assets/asset-viewer.css` 末尾追加：

```css
/* ============== Onboard 引导气泡 ============== */
.sv-onboard-bubble {
  position: absolute;
  top: -36px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(60, 30, 100, 0.95) 0%, rgba(20, 40, 80, 0.95) 100%);
  border: 1px solid rgba(180, 100, 220, 0.6);
  border-radius: 14px;
  padding: 4px 10px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
  color: rgba(200, 230, 255, 0.95);
  white-space: nowrap;
  box-shadow: 0 0 12px rgba(180, 100, 220, 0.4);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: sv-onboard-fade-in 0.3s ease-out;
}
.sv-onboard-action {
  cursor: pointer;
  padding: 2px 4px;
}
.sv-onboard-action:hover {
  color: rgba(180, 220, 255, 1);
  text-shadow: 0 0 6px rgba(100, 200, 255, 0.7);
}
.sv-onboard-close {
  cursor: pointer;
  opacity: 0.6;
  padding: 0 2px;
  font-size: 10px;
}
.sv-onboard-close:hover {
  opacity: 1;
  color: rgba(255, 100, 100, 0.9);
}
@keyframes sv-onboard-fade-in {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

- [ ] **Step 8.7：Commit**

```bash
cd /d/sanshiman/resources/app
git add out/renderer/assets/asset-viewer.js out/renderer/assets/asset-viewer.css src/renderer/asset-viewer/__tests__/observer-and-onboard.test.js
git commit -m "feat(viewer): MutationObserver + onboard bubble + auto initial size (Task 8)"
```

---

## Task 9：人工验证 + 修复发现

**目标**：用户在真实应用里走完验证清单，发现哪里不对就回头改。

**Files:** 无新文件，按需 modify

- [ ] **Step 9.1：启动应用**

```bash
cd /d/sanshiman && "./叁视漫.exe" &
```

或直接双击 `D:\sanshiman\叁视漫.exe`。

- [ ] **Step 9.2：按 spec 第 9 节走完验证清单**

```
☐ 1. 拖一张图到画布 → 出现 input-image 节点（行为不变）
☐ 2. 节点右上角看到眼睛按钮 + 5 秒小气泡"🔍 当查看器"
☐ 3. 点眼睛按钮 → 节点形态变化（cyan 边框、连接桩消失、底部出现文件名）
☐ 4. 节点中央点击 → 全屏 mini-lightbox 弹出，ESC 关闭
☐ 5. 节点四角拖动 → 尺寸改变；松手不会让节点跑位
☐ 6. 关闭应用重开 → 查看器形态保留，尺寸保留
☐ 7. 拖视频进来同样验证 1-6（视频在 lightbox 里能播放）
☐ 8. 旧的、之前已经存在的 input-image 节点 → 也有眼睛按钮可切换
☐ 9. 失效图（之前 missing-image 处理的）切到查看器形态后仍正常显示占位
```

- [ ] **Step 9.3：发现问题就 debug**

最常见的两类问题：
1. **节点没被识别**：DevTools 里看节点 DOM，确认有没有 `data-id` 和 `data-node-type`；如果都缺，调整 `isInputImageNode` 的兜底分支
2. **按钮被节点内 React 渲染覆盖**：用 MutationObserver 重新检查节点子树，如果 React 重渲染删除了我们的 DOM，需要在 mutations 里检测到并重新 augment

- [ ] **Step 9.4：清理 console 日志**

测试通过后，把 `console.log('[asset-viewer] loaded v...')` 留着（开发者诊断有用），其他 debug log 清理。

- [ ] **Step 9.5：最终 commit**

```bash
cd /d/sanshiman/resources/app
git add -A
git commit -m "feat(viewer): manual verification fixes (Task 9)"
```

---

## 不发布

按用户偏好，**所有 commit 不 push、不发 release**。修改只在本地 `D:\sanshiman\resources\app\` 生效。如果用户重装应用，需要重新做这些注入修改（除非在 src 里建好然后跑完整 build:win 重打包，等用户明确说才做）。

---

## 验证全套测试通过

完成所有任务后跑一次：

```bash
cd /d/sanshiman/resources/app && npx vitest run src/renderer/asset-viewer/__tests__ 2>&1 | tail -10
```

Expected: 所有任务的测试都 PASS。


## File Structure

**新增（2 个）**：
- `out/renderer/assets/asset-viewer.js` — 注入逻辑（IIFE，包含 ViewerStateStore + MiniLightbox + NodeAugmenter）
- `out/renderer/assets/asset-viewer.css` — 视觉样式

**修改（1 处）**：
- `out/renderer/index.html` — `<head>` 加 CSS link、`<body>` 末尾加 script

**职责拆分**（都在 asset-viewer.js 内，按 IIFE 内部模块组织）：
1. `ViewerStateStore` —— localStorage 读写，按 nodeId 索引
2. `MiniLightbox` —— 全屏预览 overlay
3. `NodeAugmenter` —— DOM 注入（眼睛按钮、引导气泡、resize 把手、文件名、尺寸初始化）

---
