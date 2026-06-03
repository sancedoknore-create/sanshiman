# 资产查看器节点（Asset Viewer Node）— 设计文档

**日期**：2026-06-02  
**项目**：叁视漫（sanshiman）  
**作者**：Claude (与用户协作设计)

---

## 1. 背景与目标

**当前现状**：从资产库面板拖图片/视频到画布，会创建 `input-image` / `video-input` 类型的 ReactFlow 节点。这种节点的语义是"作为生成节点的输入"——带连接桩，预期会接到生成器。

**用户诉求**：拖一张图到画布上能变成一个"图片查看器"节点 —— 不参与 AI 流程，只是单纯展示图，点击能放大预览。

**目标**：在不破坏现有"输入图节点"功能的前提下，新增一种**查看器形态**的节点，由用户在已有的 input-image 节点上一键切换；查看器节点支持自由缩放、点击全屏预览。

---

## 2. 范围决策（已与用户确认）

| 维度 | 决策 |
|---|---|
| 节点类型策略 | **C**：保留现有 input-image 节点；新增"查看器"语义，由 `data.viewerOnly` 标记区分 |
| 切换交互 | **A2**：不拦截 drop；拖图照常生成 input-image 节点 → 节点上常驻一个"眼睛"按钮可切换 → 新建节点首次出现时浮 5 秒引导气泡 |
| 查看器节点形态 | **D**：底部显示文件名（标签）+ 四角可拖拽缩放 + 点击中央全屏预览 |
| 初始尺寸 | **B**：按图片/视频实际比例初始化（长边 320），加载完成后再定 |

---

## 3. 实现路线（已确认走 A 路线）

**路线 A —— 复用 input-image 节点 + 数据标记 + DOM 注入**（采用）

renderer 是 minified bundle，画布所有节点都注册成同一个 `customNode` 类型，无法直接添加新 React 组件。采用 DOM 注入策略：

- 节点类型仍是 `input-image`（不动 ReactFlow 注册）
- "是否查看器"由额外标记区分（`data-viewer-only="true"` 写在节点 DOM 上）
- CSS 接管查看器形态的视觉变化（隐藏连接桩、改边框、加文件名）
- JS 注入：MutationObserver 监听节点出现 → 加眼睛按钮 + 引导气泡 + resize 把手 + 中央点击 → 自带 mini-lightbox
- 持久化：`localStorage["sanshiman_viewer_nodes"]` 按 `nodeId` 索引

**已知代价**：viewerOnly 状态不进 SQLite（外部注入层够不着 IPC 链路），所以：
- 项目导出 JSON 给别人看不到查看器形态（用户可接受）
- 删除节点重建后旧 localStorage 条目成无害垃圾（极少量，不优化）

---

## 4. 架构总览

```
┌─────────────────────────────────────────────┐
│  out/renderer/index.html                    │
│  ├─ <link href="asset-viewer.css">          │
│  └─ <script src="asset-viewer.js">          │
└─────────────────────────────────────────────┘
                  │
                  ▼ 注入到 renderer 运行时
┌─────────────────────────────────────────────┐
│  asset-viewer.js                            │
│  ┌──────────────────────────────────────┐  │
│  │ ViewerStateStore                     │  │
│  │ (localStorage["sanshiman_viewer_nodes"]) │
│  │   { [nodeId]: { viewer, w, h } }     │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ MutationObserver                     │  │
│  │   监听 .react-flow 子树新增节点       │  │
│  │   ↓                                  │  │
│  │ NodeAugmenter                        │  │
│  │   - 识别 input-image 类型             │  │
│  │   - 注入眼睛按钮 + 引导气泡           │  │
│  │   - 注入 resize 把手（查看器形态时）  │  │
│  │   - 注入中央点击 → MiniLightbox       │  │
│  │   - 同步 viewer-only 属性 + 尺寸样式  │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ MiniLightbox                         │  │
│  │   全屏 overlay；ESC/点外关；视频自动播 │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                  │
                  ▼ 不修改的部分
┌─────────────────────────────────────────────┐
│  ReactFlow 画布 + minified bundle           │
│   - 节点 onDrop / setNodes / 渲染都不动     │
│   - SQLite 持久化照常进行                    │
└─────────────────────────────────────────────┘
```

---

## 5. 模块详细设计

### 5.1 ViewerStateStore

**职责**：唯一的状态来源，按 nodeId 存查看器状态和尺寸。

**接口**：
```js
ViewerStateStore.get(nodeId)         // → { viewer: bool, w: number, h: number } | null
ViewerStateStore.set(nodeId, state)  // → void，写 localStorage
ViewerStateStore.toggle(nodeId)      // → bool（新值）
ViewerStateStore.delete(nodeId)      // → void，节点被删时清理
```

**存储格式**：
```json
{
  "node_1733194800000_abc123": { "viewer": true, "w": 320, "h": 180 },
  "node_1733194812345_xyz789": { "viewer": false }
}
```

**容量考量**：每条 ~80 字节，1000 个节点也只有 ~80KB，远低于 localStorage 5MB 上限。

### 5.2 NodeAugmenter

**职责**：在每个 input-image 节点 DOM 上挂载我们的增强 UI。

**节点识别**：
1. 主路径：`[data-id^="node_"]` 且 `[data-node-type="input-image"]`（ui-upgrades.css 已证明该属性存在）
2. 兜底：`[data-id^="node_"]` 且节点内有 `<img>` / `<video>` 且有 `.react-flow__handle`

**注入元素**（每个 input-image 节点都加）：
```html
<button class="sv-toggle-btn" title="切换查看器形态">👁</button>
<!-- 仅新建节点首次出现时，5s 后自动消失 -->
<div class="sv-onboard-bubble">🔍 当查看器</div>
<!-- 仅 viewer-only=true 时显示 -->
<div class="sv-resize-handle sv-rh-tl"></div>
<div class="sv-resize-handle sv-rh-tr"></div>
<div class="sv-resize-handle sv-rh-bl"></div>
<div class="sv-resize-handle sv-rh-br"></div>
<div class="sv-filename">abc.png</div>
```

**生命周期**：
1. **节点出现**：MutationObserver 命中 `[data-id^="node_"]` 入场 → `augment(nodeEl)`
2. **augment**：
   - 读 ViewerStateStore[nodeId]
   - 设置 DOM 属性 `data-viewer-only="true|false"`
   - 注入眼睛按钮（如果还没有）
   - 如果是新建节点 → 注入引导气泡（5s 自动移除；点击 → toggle 为查看器并消失）
   - 如果 `viewer=true` → 注入 resize 把手 + 文件名标签
   - 如果该节点尺寸尚未持久化 → 异步加载图片测比例 → 写 ViewerStateStore + 直接改 DOM 的 `style.width/height`
3. **节点消失**：MutationObserver 命中节点 DOM 离场 → 不立即清理 localStorage（节点可能被 ReactFlow 暂时移除再插入）；改为应用退出时扫描清理孤儿条目

**新建 vs 已有节点判定**：
- 维护 `Set<nodeId> seenNodes`
- 启动后头 3 秒内出现的所有节点视为"启动加载"，不弹引导气泡（这些是 SQLite 重新加载的旧节点）
- 3 秒后才出现的、且 nodeId 不在 seenNodes 里 → 真新建 → 显示引导气泡
- 出现过的 nodeId 加入 seenNodes，避免重渲染重复弹

### 5.3 切换交互

**眼睛按钮点击**：
1. `ViewerStateStore.toggle(nodeId)`
2. 直接改 DOM 属性 `data-viewer-only`
3. 如果切到查看器：异步算尺寸 → 写 inline style；显示文件名；显示 resize 把手
4. 如果切回输入图：移除 inline style（让 ReactFlow 接管）；隐藏文件名和把手

**新建节点引导气泡**：
- 节点首次出现后 200ms 出现（等节点动画完成）
- 5 秒自动消失（`setTimeout`）
- 点击气泡内容 → 切换为查看器形态 + 消失
- 点击 ✕ → 消失
- 鼠标移开节点也消失

### 5.4 MiniLightbox

**职责**：完全独立的全屏预览 overlay，不依赖 zustand store。

**触发**：节点中央点击（点眼睛按钮 / resize 把手时不触发，事件 stopPropagation）。

**结构**：
```html
<div class="sv-lightbox-overlay" tabindex="-1">
  <button class="sv-lightbox-close">✕</button>
  <img class="sv-lightbox-content" /> 或 <video controls autoplay muted />
</div>
```

**关闭**：ESC、点 overlay 背景、点 ✕ 按钮 → 移除 overlay DOM。

**视觉**：fixed inset-0，z-index: 9999（高于 ReactFlow），半透明深空黑背景，居中显示，max-width/height 90vw/90vh。

### 5.5 Resize 把手

**职责**：四角拖拽改节点尺寸。

**实现**：
- 把手 `mousedown` → 记录起始位置和当前尺寸 → 给 document 加 `mousemove` + `mouseup` 监听
- 给 body 加 `cursor: nwse-resize` + `user-select: none`
- mousemove：计算 delta，用 `Math.max(120, ...)` 钳到最小尺寸；直接改节点 `style.width/height`
- mouseup：写 ViewerStateStore；清理监听 + body 样式
- **关键**：把手的 `mousedown` 必须 `stopPropagation`，防止 ReactFlow 把这次拖动识别成节点移动

### 5.6 自动尺寸初始化

**触发**：节点切到查看器形态、且 ViewerStateStore 里没存过尺寸。

**实现**：
- 图片：`new Image(); img.src = node.content; img.onload = () => 按比例算`
- 视频：临时 `<video>` 元素 + `loadedmetadata` 事件读 `videoWidth/videoHeight`
- 算法：长边 = 320，短边 = 长边 × (短边原始 / 长边原始)，最小不低于 120
- 算完写 ViewerStateStore + 改 DOM inline style

**容错**：如果 `node.content` 是失效路径（之前 missing-image 处理的场景），onerror 触发 → 给个 fallback 尺寸 240×240。

---

## 6. 视觉规范（科幻+宇宙主题对齐）

**查看器节点边框**：
- 普通：1px solid `rgba(100, 200, 255, 0.4)` + box-shadow `0 0 12px rgba(100, 200, 255, 0.25)`
- 鼠标悬停：边框 cyan 强化，glow 加大
- 选中：再叠 2px 紫色外环

**眼睛按钮**：
- 24×24，深色半透明背景 `rgba(20, 25, 40, 0.85)`，cyan 描边 + 微 glow
- hover 时切到紫色

**引导气泡**：
- 节点上方 8px 处浮动，紫色渐变背景，cyan 文字
- fade-in 0.3s，5s 后 fade-out 0.3s
- 跟着节点位置走（但要避免气泡卡住眼睛按钮的点击）

**Resize 把手**：
- 8×8 见方，cyan 实色 + 紫色 glow
- 仅 `data-viewer-only="true"` 时可见

**文件名标签**：
- 节点底部，深色半透明背景，等宽字体（'Courier New'，跟项目其他地方一致）
- `text-overflow: ellipsis`，超出截断

**MiniLightbox**：
- 背景 `rgba(2, 3, 8, 0.95)` + `backdrop-filter: blur(8px)`
- 关闭按钮右上角，cyan glow
- 图/视频 max 90vw/90vh，居中

---

## 7. 边界情况处理

| 场景 | 处理 |
|---|---|
| 节点 DOM 上找不到 `data-node-type` 属性 | 兜底用 "节点内有 img/video + 有 .react-flow__handle" 识别 |
| 拖动 resize 时撞到节点拖动 | 把手 mousedown stopPropagation |
| 视频自动播放被浏览器阻止 | controls + muted + autoplay 三件套 |
| 图片加载失败 | 沿用 missing-image.js 的占位；查看器形态下 lightbox 也显示占位 |
| 节点被删后 localStorage 累积 | 退出时扫描，清理 ReactFlow 当前不存在的 nodeId 对应条目（最多每天一次） |
| 切项目导致 nodeId 不一致 | 不存在 — nodeId 由 SQLite 持久化，跨重启稳定 |
| 多个节点同时新建 | MutationObserver 一次回调可能批量触发 augment，幂等保证（`augment` 内部检查"已注入"标记） |
| MutationObserver 性能 | 只观察 `.react-flow` 容器的 childList + subtree，过滤非节点节点 |
| 项目导出 JSON | 不携带 viewerOnly（用户已接受）|

---

## 8. 文件清单

**新增（2 个）**：
- `out/renderer/assets/asset-viewer.js` — 核心逻辑，~250 行
- `out/renderer/assets/asset-viewer.css` — 视觉样式，~120 行

**修改（1 处）**：
- `out/renderer/index.html` — 加 2 行（CSS link + JS script）

**不动**：
- `src/main/**` — main 进程不动
- `out/main/index.js` — 不重新 build main
- `out/renderer/assets/index-*.js` — 不动 minified bundle
- `src/preload/**` — 不需要新 IPC

---

## 9. 验证清单（实施完后用户走查）

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

---

## 10. 与既有功能的关系

- **missing-image.js**：兼容。查看器节点失效时，`<img>` onerror 仍触发占位逻辑；mini-lightbox 里失效则显示同款占位。
- **starfield-bg.js**：无冲突，渲染层不重叠。
- **ui-upgrades.css**：复用其 `data-node-type` 选择器，但 `[data-viewer-only="true"]` 优先级更高，能覆盖 input-image 节点本来的色条。
- **拖放原有功能（onDrop 在 minified bundle 里）**：完全不动，仍生成 input-image 节点；只是节点出现后我们再增强它。
- **SQLite 节点持久化**：完全不动，SQLite 里仍是普通 input-image。

---

## 11. 不做的事（YAGNI）

- ❌ 不让查看器节点也带连接桩当输入用 —— 这就回到 D 选项了，违反 C 选项的"清晰分离"
- ❌ 不做拖文件夹批量入画布 —— 当前需求未提
- ❌ 不做 viewerOnly 写入 SQLite —— 外部注入层做不到，不值得反向工程 IPC
- ❌ 不做查看器节点之间的相册联播（左右切换其他节点的图）—— 当前未提，可后续迭代
- ❌ 不做拖音频生成节点 —— 资产库已有 audio 类型，但用户没要求
