# 叁视漫「星穹玄金」UI Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Sanshiman's renderer visuals into the approved “星穹玄金” dark-cosmic premium UI without changing business logic or compressed React bundles.

**Architecture:** Implement the redesign as a low-risk visual patch over existing built renderer assets. CSS owns the design system, nodes, forms, buttons, modals, HUD, and asset viewer; the starfield script is tuned for calmer atmosphere and reduced-motion support; `index.html` gets a styled renderer error fallback only.

**Tech Stack:** Electron renderer output, static HTML, vanilla CSS, vanilla JavaScript, React Flow DOM classes, Vitest/npm verification.

---

## File Structure

- Modify: `D:/sanshiman/resources/app/out/renderer/assets/ui-upgrades.css`
  - Main design-system patch: CSS variables, canvas atmosphere overlays, React Flow nodes, inputs/forms, buttons, modals, scrollbars, reduced-motion rules.
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/progress-hud.css`
  - Restyle task HUD into the “创作任务雷达” look while preserving existing `.ph-*` DOM contract.
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/asset-viewer.css`
  - Restyle mini-lightbox, viewer nodes, filename labels, resize handles, and onboarding bubble into the “星窗 / 画境预览器” look while preserving existing `.sv-*` DOM contract.
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js`
  - Tune starfield brightness, parallax, meteor frequency, and reduced-motion behavior without changing any app data flow.
- Modify: `D:/sanshiman/resources/app/out/renderer/index.html`
  - Replace the rough `window.onerror` fallback with a styled dark error panel. Do not change script/link order except the error handler.

Do not modify:

- `D:/sanshiman/resources/app/out/renderer/assets/index-BujjGe6O.js`
- `D:/sanshiman/resources/app/out/renderer/assets/GenNode-DmArRnR4.js`
- `D:/sanshiman/resources/app/out/renderer/assets/SettingsModal-CW-pi6Yl.js`
- Any other compressed business bundle.

---

### Task 1: Add the 星穹玄金 Design System and Core UI Polish

**Files:**
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/ui-upgrades.css`

- [ ] **Step 1: Replace `ui-upgrades.css` with the unified visual patch**

Replace the entire file `D:/sanshiman/resources/app/out/renderer/assets/ui-upgrades.css` with:

```css
/* ==============================================
   叁视漫 UI 视觉升级：星穹玄金
   Low-risk renderer patch. No business logic.
   ============================================== */

:root {
  --ssm-bg-deep: #020308;
  --ssm-bg-void: #070913;
  --ssm-bg-panel: #10131d;
  --ssm-bg-panel-2: #151a28;
  --ssm-bg-node: #171d2e;
  --ssm-bg-node-soft: #1d2540;

  --ssm-text-main: #f4f1e8;
  --ssm-text-secondary: #b8bfd4;
  --ssm-text-muted: #6f7890;

  --ssm-gold: #d6a85a;
  --ssm-gold-2: #f0cf86;
  --ssm-gold-soft: #8a6732;
  --ssm-cyan: #5fd6ff;
  --ssm-blue: #4f8cff;
  --ssm-violet: #a678ff;
  --ssm-green: #3ddc97;
  --ssm-red: #ff6b6b;
  --ssm-orange: #ff9f43;

  --ssm-border-soft: rgba(180, 205, 255, 0.13);
  --ssm-border-mid: rgba(120, 170, 230, 0.24);
  --ssm-border-bright: rgba(120, 210, 255, 0.42);
  --ssm-shadow-panel: 0 18px 48px rgba(0, 0, 0, 0.45);
  --ssm-shadow-glow: 0 0 28px rgba(95, 214, 255, 0.14);

  --bg-base: var(--ssm-bg-deep) !important;
  --bg-panel: var(--ssm-bg-panel) !important;
  --bg-secondary: var(--ssm-bg-panel-2) !important;
  --text-primary: var(--ssm-text-main) !important;
  --text-secondary: var(--ssm-text-secondary) !important;
  --text-muted: var(--ssm-text-muted) !important;
  --border-color: var(--ssm-border-soft) !important;
  color-scheme: dark;
}

html,
body,
#root {
  background: var(--ssm-bg-deep) !important;
  color: var(--ssm-text-main) !important;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background:
    radial-gradient(ellipse 56% 38% at 50% 38%, rgba(100, 138, 225, 0.12), rgba(145, 95, 220, 0.07) 42%, transparent 70%),
    radial-gradient(ellipse 100% 80% at 50% 52%, transparent 58%, rgba(0, 0, 8, 0.52) 100%),
    linear-gradient(90deg, rgba(214, 168, 90, 0.035), transparent 18%, transparent 82%, rgba(95, 214, 255, 0.035));
}

body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  opacity: 0.18;
  background-image:
    linear-gradient(rgba(214, 168, 90, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(95, 214, 255, 0.07) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(ellipse 60% 50% at 50% 44%, black 0%, transparent 78%);
}

.react-flow,
.react-flow__background,
.react-flow__renderer,
.react-flow__viewport,
.react-flow__pane {
  background: transparent !important;
  background-color: transparent !important;
}

.react-flow {
  --xy-background-color: transparent !important;
  --xy-background-color-default: transparent !important;
}

.react-flow__attribution {
  opacity: 0.28;
  filter: saturate(0.6);
}

.react-flow__background pattern circle {
  opacity: 0.18;
}

.react-flow__edge-path {
  stroke: rgba(135, 170, 220, 0.52);
  transition: stroke 0.18s ease, filter 0.18s ease, stroke-width 0.18s ease;
}

.react-flow__edge:hover .react-flow__edge-path,
.react-flow__edge.selected .react-flow__edge-path {
  stroke: rgba(95, 214, 255, 0.86);
  stroke-width: 2;
  filter: drop-shadow(0 0 5px rgba(95, 214, 255, 0.42));
}

/* ============== React Flow nodes ============== */
.react-flow__node {
  background: transparent !important;
  border-radius: 16px !important;
  filter: drop-shadow(0 18px 28px rgba(0, 0, 0, 0.32));
}

.react-flow__node > div,
.react-flow__node > div > div,
.node-wrapper {
  background:
    linear-gradient(145deg, rgba(29, 37, 64, 0.98), rgba(15, 19, 31, 0.98)) !important;
  color: var(--ssm-text-main) !important;
  border: 1px solid var(--ssm-border-soft) !important;
  border-radius: 14px !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    inset 0 -1px 0 rgba(0, 0, 0, 0.35),
    0 16px 38px rgba(0, 0, 0, 0.34) !important;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

.node-wrapper {
  position: relative;
  overflow: hidden;
  --node-accent: var(--ssm-blue);
}

.node-wrapper::before {
  content: "";
  position: absolute;
  inset: 1px auto 1px 0;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, transparent, var(--node-accent), transparent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--node-accent) 46%, transparent);
  pointer-events: none;
  z-index: 2;
}

.node-wrapper::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(circle at 14% 0%, rgba(255, 255, 255, 0.055), transparent 26%),
    linear-gradient(135deg, rgba(214, 168, 90, 0.055), transparent 28%, transparent 70%, rgba(95, 214, 255, 0.045));
  opacity: 0.82;
  z-index: 1;
}

.node-wrapper > * {
  position: relative;
  z-index: 3;
}

.node-wrapper[data-node-type="gen-image"] { --node-accent: var(--ssm-blue); }
.node-wrapper[data-node-type="gen-video"] { --node-accent: var(--ssm-violet); }
.node-wrapper[data-node-type="input-image"] { --node-accent: var(--ssm-green); }
.node-wrapper[data-node-type="video-input"] { --node-accent: var(--ssm-orange); }
.node-wrapper[data-node-type="text-node"] { --node-accent: #8490a8; }
.node-wrapper[data-node-type="alchemy-node"] { --node-accent: var(--ssm-gold); }
.node-wrapper[data-node-type="extract-characters-scenes"] { --node-accent: #24d4c8; }

.react-flow__node:hover .node-wrapper {
  border-color: rgba(150, 205, 255, 0.28) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.055),
    0 18px 44px rgba(0, 0, 0, 0.42),
    0 0 0 1px rgba(95, 214, 255, 0.08),
    0 0 28px rgba(95, 214, 255, 0.08) !important;
}

.react-flow__node.selected .node-wrapper {
  border-color: rgba(95, 214, 255, 0.58) !important;
  box-shadow:
    0 0 0 1px rgba(214, 168, 90, 0.48),
    0 0 0 3px rgba(95, 214, 255, 0.18),
    0 0 28px rgba(166, 120, 255, 0.18),
    0 18px 44px rgba(0, 0, 0, 0.46) !important;
}

.node-wrapper[data-node-status="running"] {
  animation: ssm-node-running 3.4s linear infinite;
}

.node-wrapper[data-node-status="running"]::after {
  opacity: 1;
  background:
    linear-gradient(115deg, transparent 0%, transparent 28%, color-mix(in srgb, var(--node-accent) 16%, transparent) 48%, transparent 68%, transparent 100%),
    radial-gradient(circle at 14% 0%, rgba(255, 255, 255, 0.055), transparent 26%);
  background-size: 240% 100%, auto;
  animation: ssm-node-sweep 2.8s ease-in-out infinite;
}

@keyframes ssm-node-running {
  0%, 100% { filter: drop-shadow(0 0 5px color-mix(in srgb, var(--node-accent) 16%, transparent)); }
  50% { filter: drop-shadow(0 0 14px color-mix(in srgb, var(--node-accent) 32%, transparent)); }
}

@keyframes ssm-node-sweep {
  from { background-position: 180% 0, 0 0; }
  to { background-position: -80% 0, 0 0; }
}

.node-wrapper[data-node-status="completed"] {
  animation: ssm-node-complete 0.72s ease-out;
}

@keyframes ssm-node-complete {
  0% { box-shadow: 0 0 0 1px rgba(214,168,90,.65), 0 0 26px rgba(61,220,151,.34) !important; }
  100% { box-shadow: inset 0 1px 0 rgba(255,255,255,.045), 0 16px 38px rgba(0,0,0,.34) !important; }
}

.node-wrapper[data-node-status="error"] {
  border-color: rgba(255, 107, 107, 0.62) !important;
  box-shadow: 0 0 0 1px rgba(255, 159, 67, 0.18), 0 0 24px rgba(255, 107, 107, 0.12) !important;
  animation: ssm-node-error-shake 0.36s ease-out;
}

@keyframes ssm-node-error-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  50% { transform: translateX(2px); }
  75% { transform: translateX(-1px); }
}

.react-flow__handle {
  border-color: rgba(95, 214, 255, 0.65) !important;
  background: #08111d !important;
  box-shadow: 0 0 8px rgba(95, 214, 255, 0.25);
}

/* ============== Inputs and forms ============== */
input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]),
textarea,
select,
[contenteditable="true"],
[contentEditable="true"] {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif !important;
  background: rgba(10, 14, 24, 0.92) !important;
  color: var(--ssm-text-main) !important;
  border: 1px solid rgba(152, 178, 220, 0.18) !important;
  border-radius: 8px !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.42) !important;
  padding: 8px 11px !important;
  font-size: 13px !important;
  line-height: 1.55 !important;
  outline: none !important;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, color 0.16s ease !important;
}

input[type="password"],
input[data-monospace="true"],
input[class*="font-mono"],
textarea[class*="font-mono"] {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace !important;
}

input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"])::placeholder,
textarea::placeholder {
  color: rgba(184, 191, 212, 0.42) !important;
  opacity: 1 !important;
}

input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):focus,
textarea:focus,
select:focus,
[contenteditable="true"]:focus,
[contentEditable="true"]:focus {
  background: rgba(12, 17, 29, 0.98) !important;
  border-color: rgba(95, 214, 255, 0.52) !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.48), 0 0 0 3px rgba(95, 214, 255, 0.10) !important;
}

select {
  cursor: pointer !important;
  appearance: none !important;
  padding-right: 30px !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23d6a85a' stroke-width='2.4'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 10px center !important;
}

textarea {
  resize: vertical !important;
  scrollbar-width: thin;
  scrollbar-color: rgba(214, 168, 90, 0.38) rgba(7, 9, 19, 0.8);
}

input:disabled,
textarea:disabled,
select:disabled,
[contenteditable="false"] {
  opacity: 0.45 !important;
  cursor: not-allowed !important;
  filter: saturate(0.65) !important;
}

input[type="range"],
input[type="checkbox"],
input[type="radio"] {
  accent-color: var(--ssm-gold);
}

.react-flow__node textarea,
.react-flow__node [contenteditable="true"],
.react-flow__node [contentEditable="true"],
.react-flow__node input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]),
.node-wrapper textarea,
.node-wrapper [contenteditable="true"],
.node-wrapper [contentEditable="true"],
.node-wrapper input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]),
.nodrag.nowheel {
  background: rgba(7, 10, 18, 0.82) !important;
  color: var(--ssm-text-secondary) !important;
}

/* ============== Buttons ============== */
button {
  transition: transform 0.12s ease, border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, color 0.16s ease, opacity 0.16s ease;
}

button:not([disabled]) {
  border-radius: 9px;
}

button:not([disabled]):hover {
  border-color: rgba(214, 168, 90, 0.42);
  box-shadow: 0 0 0 1px rgba(214, 168, 90, 0.08), 0 8px 22px rgba(0, 0, 0, 0.24);
}

button:not([disabled]):active {
  transform: translateY(1px) scale(0.992);
}

button[disabled] {
  opacity: 0.46 !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
}

button[class*="bg-blue"],
button[class*="bg-indigo"],
button[class*="bg-purple"],
button[class*="bg-green"],
button[class*="bg-primary"] {
  background: linear-gradient(135deg, rgba(214, 168, 90, 0.95), rgba(95, 214, 255, 0.78)) !important;
  color: #08101a !important;
  border: 1px solid rgba(240, 207, 134, 0.55) !important;
  font-weight: 650 !important;
  box-shadow: 0 8px 24px rgba(214, 168, 90, 0.13), 0 0 24px rgba(95, 214, 255, 0.08);
}

button[class*="bg-red"],
button[class*="text-red"] {
  background: rgba(60, 18, 22, 0.65) !important;
  color: #ffb0a8 !important;
  border: 1px solid rgba(255, 107, 107, 0.30) !important;
}

button[class*="bg-red"]:hover,
button[class*="text-red"]:hover {
  border-color: rgba(255, 107, 107, 0.55) !important;
  box-shadow: 0 0 18px rgba(255, 107, 107, 0.12);
}

/* ============== Modals and panels ============== */
div[class*="bg-black/50"][class*="flex items-center justify-center"],
div[class*="fixed"][class*="inset-0"][class*="bg-black"] {
  background: rgba(1, 3, 9, 0.76) !important;
  backdrop-filter: blur(12px) saturate(1.1);
  -webkit-backdrop-filter: blur(12px) saturate(1.1);
  animation: ssm-modal-fade-in 0.20s ease-out;
}

div[class*="bg-black/50"][class*="flex items-center justify-center"] > div,
div[class*="fixed"][class*="inset-0"][class*="bg-black"] > div,
div[class*="bg-zinc"],
div[class*="bg-neutral"] {
  border-color: rgba(180, 205, 255, 0.13) !important;
}

div[class*="bg-black/50"][class*="flex items-center justify-center"] > div,
div[class*="fixed"][class*="inset-0"][class*="bg-black"] > div {
  background: linear-gradient(145deg, rgba(16, 19, 29, 0.98), rgba(8, 11, 20, 0.98)) !important;
  border: 1px solid rgba(180, 205, 255, 0.15) !important;
  box-shadow: var(--ssm-shadow-panel), 0 0 0 1px rgba(214, 168, 90, 0.06), 0 0 38px rgba(95, 214, 255, 0.08) !important;
  animation: ssm-modal-slide-up 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes ssm-modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes ssm-modal-slide-up {
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Small labels near inputs */
label,
div[class*="text-xs"]:has(+ textarea),
div[class*="text-xs"]:has(+ input),
div[class*="text-xs"]:has(+ select) {
  color: rgba(184, 191, 212, 0.78);
  letter-spacing: 0.02em;
}

/* Toasts */
div[class*="fixed"][class*="bg-green"],
div[class*="fixed"][class*="bg-red"],
div[class*="fixed"][class*="bg-blue"] {
  border: 1px solid rgba(180, 205, 255, 0.16) !important;
  box-shadow: 0 12px 32px rgba(0,0,0,.36), 0 0 24px rgba(95,214,255,.08) !important;
  animation: ssm-toast-slide-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes ssm-toast-slide-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scrollbars */
*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

*::-webkit-scrollbar-track {
  background: rgba(5, 7, 14, 0.7);
}

*::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(214, 168, 90, 0.42), rgba(95, 214, 255, 0.28));
  border: 2px solid rgba(5, 7, 14, 0.7);
  border-radius: 999px;
}

*::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(240, 207, 134, 0.58), rgba(95, 214, 255, 0.42));
}

.ssm-title-breath {
  animation: ssm-title-breath 9s ease-in-out infinite;
}

@keyframes ssm-title-breath {
  0%, 100% { letter-spacing: .28em; text-shadow: 0 0 18px rgba(214,168,90,.16); }
  50% { letter-spacing: .40em; text-shadow: 0 0 24px rgba(95,214,255,.16); }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 2: Verify the core CSS patch contains the required design markers**

Run:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('D:/sanshiman/resources/app/out/renderer/assets/ui-upgrades.css','utf8'); for (const token of ['--ssm-gold','ssm-node-sweep','prefers-reduced-motion','React Flow nodes','星穹玄金']) { if(!s.includes(token)) { console.error('missing', token); process.exit(1); } } console.log('ui-upgrades.css markers ok');"
```

Expected:

```text
ui-upgrades.css markers ok
```

---

### Task 2: Restyle Progress HUD as 创作任务雷达

**Files:**
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/progress-hud.css`

- [ ] **Step 1: Replace `progress-hud.css` with the radar-style HUD patch**

Replace the entire file `D:/sanshiman/resources/app/out/renderer/assets/progress-hud.css` with:

```css
/* ═══════════════════════════════════════════════════════════════════════
   Canvas Progress HUD — 叁视漫「星穹玄金」创作任务雷达
   Preserves existing .ph-* DOM contract.
   ═══════════════════════════════════════════════════════════════════════ */

:root {
  --ph-bg: rgba(8, 11, 20, 0.94);
  --ph-bg-2: rgba(16, 20, 34, 0.94);
  --ph-border: rgba(180, 205, 255, 0.13);
  --ph-accent: #d6a85a;
  --ph-accent-2: #f0cf86;
  --ph-teal: #5fd6ff;
  --ph-green: #3ddc97;
  --ph-red: #ff6b6b;
  --ph-orange: #ff9f43;
  --ph-text-primary: #f4f1e8;
  --ph-text-muted: #8b94ac;
  --ph-text-disabled: #586176;
}

#progress-hud {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9970;
  width: 292px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

#progress-hud.has-tasks {
  pointer-events: all;
}

.ph-card {
  position: relative;
  overflow: hidden;
  padding: 13px 14px 14px;
  border-radius: 16px;
  border: 1px solid var(--ph-border);
  background:
    radial-gradient(circle at 12% 0%, rgba(214, 168, 90, 0.10), transparent 34%),
    linear-gradient(145deg, var(--ph-bg-2), var(--ph-bg));
  backdrop-filter: blur(18px) saturate(1.12);
  -webkit-backdrop-filter: blur(18px) saturate(1.12);
  box-shadow:
    0 16px 42px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    0 0 0 1px rgba(214, 168, 90, 0.04);
  animation: ph-slide-in 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.ph-card::before {
  content: "";
  position: absolute;
  left: 10px;
  right: 10px;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(214, 168, 90, 0.65), rgba(95, 214, 255, 0.44), transparent);
  opacity: 0.8;
}

.ph-card::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(rgba(95, 214, 255, 0.045) 1px, transparent 1px);
  background-size: 100% 18px;
  opacity: 0.18;
  mask-image: linear-gradient(180deg, black, transparent 70%);
}

.ph-card.completing {
  border-color: rgba(95, 214, 255, 0.34);
}

.ph-card.failing {
  border-color: rgba(255, 107, 107, 0.34);
}

.ph-card.removing {
  animation: ph-slide-out 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}

@keyframes ph-slide-in {
  from { opacity: 0; transform: translateX(24px) scale(0.96); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}

@keyframes ph-slide-out {
  from { opacity: 1; transform: translateX(0) scale(1); max-height: 240px; }
  to { opacity: 0; transform: translateX(32px) scale(0.94); max-height: 0; margin: 0; padding: 0; }
}

.ph-row-top {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.ph-model {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--ph-text-primary);
  letter-spacing: 0.01em;
}

.ph-model .ph-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--ph-text-disabled);
}

.ph-model .ph-dot.running {
  background: var(--ph-accent);
  box-shadow: 0 0 8px rgba(214, 168, 90, 0.62), 0 0 18px rgba(95, 214, 255, 0.16);
  animation: ph-blink 1.2s ease-in-out infinite;
}

.ph-model .ph-dot.done {
  background: var(--ph-teal);
  box-shadow: 0 0 8px rgba(95, 214, 255, 0.48);
}

.ph-model .ph-dot.failed {
  background: var(--ph-red);
  box-shadow: 0 0 8px rgba(255, 107, 107, 0.45);
}

@keyframes ph-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.38; transform: scale(0.82); }
}

.ph-pct {
  min-width: 42px;
  text-align: right;
  color: var(--ph-accent-2);
  font-size: 19px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  text-shadow: 0 0 16px rgba(214, 168, 90, 0.18);
}

.ph-pct.done { color: var(--ph-teal); text-shadow: 0 0 16px rgba(95, 214, 255, 0.20); }
.ph-pct.failed { color: var(--ph-red); text-shadow: 0 0 16px rgba(255, 107, 107, 0.16); }

.ph-bar-track {
  position: relative;
  z-index: 2;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.055);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.45);
}

.ph-bar-fill {
  position: relative;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ph-accent), var(--ph-teal));
  transition: width 0.45s ease;
  box-shadow: 0 0 14px rgba(95, 214, 255, 0.18);
}

.ph-bar-fill::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.32) 50%, transparent 100%);
  animation: ph-shimmer 1.7s ease-in-out infinite;
}

@keyframes ph-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.ph-bar-fill.done {
  background: linear-gradient(90deg, #3ddc97, var(--ph-teal));
}

.ph-bar-fill.done::after,
.ph-bar-fill.failed::after {
  display: none;
}

.ph-bar-fill.failed {
  background: linear-gradient(90deg, var(--ph-red), var(--ph-orange));
}

.ph-result {
  position: relative;
  z-index: 2;
  margin-top: 11px;
  width: 100%;
  height: 0;
  overflow: hidden;
  border-radius: 11px;
  border: 0 solid rgba(180, 205, 255, 0);
  transition: height 0.3s ease, border-color 0.2s ease;
}

.ph-result.show {
  height: 130px;
  border-width: 1px;
  border-color: rgba(180, 205, 255, 0.14);
}

.ph-result img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}

.ph-result .ph-result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.32));
  transition: background 0.2s;
}

.ph-result .ph-result-overlay:hover {
  background: rgba(2, 3, 8, 0.46);
}

.ph-result .ph-result-hint {
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid rgba(214, 168, 90, 0.32);
  background: rgba(8, 11, 20, 0.76);
  color: var(--ph-text-primary);
  font-size: 12px;
  font-weight: 600;
  opacity: 0;
  transform: translateY(3px);
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
}

.ph-result .ph-result-overlay:hover .ph-result-hint {
  opacity: 1;
  transform: translateY(0);
}

.ph-error {
  position: relative;
  z-index: 2;
  margin-top: 9px;
  padding: 7px 8px;
  border-radius: 9px;
  border: 1px solid rgba(255, 107, 107, 0.18);
  background: rgba(60, 18, 22, 0.32);
  color: #ffb0a8;
  font-size: 11.5px;
  line-height: 1.45;
}

#progress-hud:not(.has-tasks) .ph-card {
  display: none;
}

#ph-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9969;
  width: 30px;
  height: 30px;
  display: none;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(180, 205, 255, 0.13);
  background: rgba(8, 11, 20, 0.88);
  color: var(--ph-text-muted);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.18s ease;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
}

#ph-toggle:hover {
  border-color: rgba(214, 168, 90, 0.48);
  color: var(--ph-accent-2);
  box-shadow: 0 0 18px rgba(214, 168, 90, 0.12);
}

#progress-hud.has-tasks ~ #ph-toggle {
  display: flex;
}

#ph-toggle.pinned {
  color: var(--ph-accent-2);
  border-color: rgba(214, 168, 90, 0.56);
  background: rgba(214, 168, 90, 0.10);
}

@media (prefers-reduced-motion: reduce) {
  .ph-card,
  .ph-card.removing,
  .ph-model .ph-dot.running,
  .ph-bar-fill::after,
  .ph-result,
  #ph-toggle {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 2: Verify the HUD CSS patch contains the required markers**

Run:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('D:/sanshiman/resources/app/out/renderer/assets/progress-hud.css','utf8'); for (const token of ['创作任务雷达','--ph-accent-2','ph-shimmer','prefers-reduced-motion']) { if(!s.includes(token)) { console.error('missing', token); process.exit(1); } } console.log('progress-hud.css markers ok');"
```

Expected:

```text
progress-hud.css markers ok
```

---

### Task 3: Restyle Asset Viewer as 星窗 / 画境预览器

**Files:**
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/asset-viewer.css`

- [ ] **Step 1: Replace `asset-viewer.css` with the unified viewer patch**

Replace the entire file `D:/sanshiman/resources/app/out/renderer/assets/asset-viewer.css` with:

```css
/* ==============================================
   叁视漫 Asset Viewer — 星窗 / 画境预览器
   Preserves existing .sv-* DOM contract.
   ============================================== */

.sv-lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse 70% 55% at 50% 42%, rgba(95, 214, 255, 0.08), transparent 62%),
    rgba(1, 3, 9, 0.93);
  backdrop-filter: blur(10px) saturate(1.04);
  -webkit-backdrop-filter: blur(10px) saturate(1.04);
  animation: sv-lightbox-fade-in 0.20s ease-out;
}

@keyframes sv-lightbox-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sv-lightbox-content {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 10px;
  border: 1px solid rgba(180, 205, 255, 0.18);
  background: rgba(8, 11, 20, 0.72);
  box-shadow:
    0 28px 70px rgba(0, 0, 0, 0.62),
    0 0 0 1px rgba(214, 168, 90, 0.12),
    0 0 42px rgba(95, 214, 255, 0.13);
}

.sv-lightbox-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(180, 205, 255, 0.18);
  background: rgba(8, 11, 20, 0.82);
  color: rgba(244, 241, 232, 0.82);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.34);
  transition: all 0.18s ease;
}

.sv-lightbox-close:hover {
  color: #fff;
  border-color: rgba(214, 168, 90, 0.52);
  background: rgba(18, 22, 35, 0.92);
  box-shadow: 0 0 20px rgba(214, 168, 90, 0.13), 0 10px 26px rgba(0, 0, 0, 0.34);
}

.sv-toggle-btn {
  position: absolute;
  top: 7px;
  right: 7px;
  z-index: 20;
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 9px;
  border: 1px solid rgba(180, 205, 255, 0.20);
  background: rgba(8, 11, 20, 0.82);
  color: rgba(184, 191, 212, 0.9);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(95, 214, 255, 0.10);
  transition: all 0.18s ease;
}

.sv-toggle-btn:hover {
  color: #fff;
  border-color: rgba(214, 168, 90, 0.50);
  background: rgba(18, 22, 35, 0.92);
  box-shadow: 0 0 16px rgba(214, 168, 90, 0.15);
}

[data-viewer-only="true"] {
  border: 1px solid rgba(180, 205, 255, 0.22) !important;
  border-radius: 12px !important;
  cursor: zoom-in;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(214, 168, 90, 0.08),
    0 18px 34px rgba(0, 0, 0, 0.38),
    0 0 30px rgba(95, 214, 255, 0.10) !important;
}

[data-viewer-only="true"]::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255,255,255,.035), transparent 24%),
    linear-gradient(0deg, rgba(2,3,8,.46), transparent 34%);
  border-radius: inherit;
}

[data-viewer-only="true"] .react-flow__handle {
  display: none !important;
}

.react-flow__node.selected [data-viewer-only="true"],
[data-viewer-only="true"].selected {
  border-color: rgba(95, 214, 255, 0.52) !important;
  box-shadow:
    0 0 0 1px rgba(214, 168, 90, 0.42),
    0 0 0 3px rgba(95, 214, 255, 0.16),
    0 0 28px rgba(166, 120, 255, 0.18) !important;
}

.sv-filename {
  position: absolute;
  bottom: 6px;
  left: 7px;
  right: 7px;
  z-index: 10;
  display: none;
  pointer-events: none;
  max-width: calc(100% - 14px);
  padding: 4px 7px;
  border: 1px solid rgba(180, 205, 255, 0.12);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(8, 11, 20, 0.50), rgba(8, 11, 20, 0.82));
  color: rgba(244, 241, 232, 0.78);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 10px;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
}

[data-viewer-only="true"] .sv-filename {
  display: block;
}

[data-viewer-only="true"] .sv-toggle-btn,
[data-viewer-only="true"] .sv-resize-handle {
  cursor: pointer;
}

.sv-resize-handle {
  position: absolute;
  z-index: 25;
  display: none;
  width: 9px;
  height: 9px;
  pointer-events: auto;
  border-radius: 3px;
  border: 1px solid rgba(244, 241, 232, 0.86);
  background: linear-gradient(135deg, rgba(214, 168, 90, 0.92), rgba(95, 214, 255, 0.72));
  box-shadow: 0 0 8px rgba(95, 214, 255, 0.32);
}

[data-viewer-only="true"] .sv-resize-handle {
  display: block;
}

.sv-rh-br {
  right: -4px;
  bottom: -4px;
  cursor: nwse-resize;
}

.sv-resize-handle:hover {
  box-shadow: 0 0 12px rgba(214, 168, 90, 0.42), 0 0 18px rgba(95, 214, 255, 0.22);
}

.sv-onboard-bubble {
  position: absolute;
  top: -38px;
  left: 50%;
  z-index: 30;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(214, 168, 90, 0.42);
  background: linear-gradient(145deg, rgba(18, 22, 35, 0.96), rgba(8, 11, 20, 0.96));
  color: rgba(244, 241, 232, 0.90);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei UI", sans-serif;
  font-size: 11px;
  white-space: nowrap;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.36), 0 0 18px rgba(214, 168, 90, 0.12);
  animation: sv-onboard-fade-in 0.26s ease-out;
}

.sv-onboard-action {
  cursor: pointer;
  color: #f0cf86;
  padding: 2px 4px;
}

.sv-onboard-action:hover {
  color: #fff;
  text-shadow: 0 0 8px rgba(214, 168, 90, 0.45);
}

.sv-onboard-close {
  cursor: pointer;
  opacity: 0.62;
  padding: 0 2px;
  font-size: 10px;
}

.sv-onboard-close:hover {
  opacity: 1;
  color: #ffb0a8;
}

@keyframes sv-onboard-fade-in {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.sv-fallback-media {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(circle at center, rgba(95, 214, 255, 0.06), transparent 58%),
    rgba(8, 11, 20, 0.52);
}

.sv-fallback-media img,
.sv-fallback-media video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .sv-lightbox-overlay,
  .sv-onboard-bubble,
  .sv-toggle-btn,
  .sv-lightbox-close,
  .sv-resize-handle {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 2: Verify the viewer CSS patch contains the required markers and no stray brace tail**

Run:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('D:/sanshiman/resources/app/out/renderer/assets/asset-viewer.css','utf8'); for (const token of ['星窗','sv-lightbox-content','sv-onboard-bubble','prefers-reduced-motion']) { if(!s.includes(token)) { console.error('missing', token); process.exit(1); } } const opens=(s.match(/\{/g)||[]).length; const closes=(s.match(/\}/g)||[]).length; if(opens!==closes){ console.error({opens,closes}); process.exit(1); } console.log('asset-viewer.css markers and braces ok');"
```

Expected:

```text
asset-viewer.css markers and braces ok
```

---

### Task 4: Tune Starfield Atmosphere and Reduced Motion

**Files:**
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js`

- [ ] **Step 1: Replace `starfield-bg.js` with the calmer starfield patch**

Replace the entire file `D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js` with:

```js
(function() {
  var canvas, ctx, W, H;
  var stars = [], dusts = [], comets = [];
  var startTime = Date.now();
  var animId = null;
  var cometTimer = null;
  var mouseDx = 0, mouseDy = 0;
  var targetMx = 0, targetMy = 0;
  var reducedMotion = false;

  try {
    reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) {}

  function initStars() {
    stars = [];
    dusts = [];

    for (var i = 0; i < 18; i++) {
      var hr = Math.random();
      var bigHue = hr < 0.26 ? 285 + Math.random() * 26 : (hr < 0.52 ? 175 + Math.random() * 26 : 216 + Math.random() * 34);
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.45 + 1.05,
        baseAlpha: Math.random() * 0.22 + 0.30,
        speed: Math.random() * 1.15 + 0.45,
        offset: Math.random() * Math.PI * 2,
        hue: bigHue,
        glowR: Math.random() * 6 + 2,
        depth: 0.72
      });
    }

    for (var j = 0; j < 90; j++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 0.75 + 0.35,
        baseAlpha: Math.random() * 0.20 + 0.16,
        speed: Math.random() * 1.0 + 0.35,
        offset: Math.random() * Math.PI * 2,
        hue: 190 + Math.random() * 56,
        glowR: Math.random() * 2.6 + 0.8,
        depth: 0.32
      });
    }

    for (var k = 0; k < 260; k++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 0.45 + 0.16,
        baseAlpha: Math.random() * 0.14 + 0.07,
        speed: Math.random() * 0.9 + 0.25,
        offset: Math.random() * Math.PI * 2,
        hue: 210 + Math.random() * 38,
        glowR: 0,
        depth: 0.08
      });
    }

    for (var d = 0; d < 18; d++) {
      dusts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 0.85 + 0.25,
        alpha: Math.random() * 0.08 + 0.025,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.08,
        hue: Math.random() < 0.28 ? 280 + Math.random() * 26 : 200 + Math.random() * 36
      });
    }
  }

  function spawnComet() {
    if (reducedMotion) return;
    var edge = Math.floor(Math.random() * 4);
    var x, y, angle;
    if (edge === 0) { x = Math.random() * W; y = -10; angle = Math.PI * 0.3 + Math.random() * 0.35; }
    else if (edge === 1) { x = W + 10; y = Math.random() * H; angle = Math.PI * 0.82 + Math.random() * 0.32; }
    else if (edge === 2) { x = Math.random() * W; y = H + 10; angle = -Math.PI * 0.3 - Math.random() * 0.32; }
    else { x = -10; y = Math.random() * H; angle = -Math.random() * 0.35; }
    var speed = Math.random() * 3.4 + 3.2;
    comets.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.76,
      decay: Math.random() * 0.010 + 0.012,
      length: Math.random() * 48 + 34
    });
  }

  function spawnMeteorShower() {
    if (reducedMotion) return;
    var n = 2 + Math.floor(Math.random() * 2);
    var baseEdge = Math.floor(Math.random() * 4);
    var baseAngle;
    if (baseEdge === 0) baseAngle = Math.PI * 0.3 + Math.random() * 0.35;
    else if (baseEdge === 1) baseAngle = Math.PI * 0.82 + Math.random() * 0.32;
    else if (baseEdge === 2) baseAngle = -Math.PI * 0.3 - Math.random() * 0.32;
    else baseAngle = -Math.random() * 0.35;

    for (var k = 0; k < n; k++) {
      (function(idx) {
        setTimeout(function() {
          var x, y;
          if (baseEdge === 0) { x = Math.random() * W; y = -10; }
          else if (baseEdge === 1) { x = W + 10; y = Math.random() * H; }
          else if (baseEdge === 2) { x = Math.random() * W; y = H + 10; }
          else { x = -10; y = Math.random() * H; }
          var angle = baseAngle + (Math.random() - 0.5) * 0.14;
          var speed = Math.random() * 3.6 + 3.8;
          comets.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.72,
            decay: Math.random() * 0.009 + 0.011,
            length: Math.random() * 54 + 40
          });
        }, idx * (180 + Math.random() * 220));
      })(k);
    }
  }

  function resizeStarfield() {
    if (!canvas) return;
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
  }

  function drawStarfield() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    var t = (Date.now() - startTime) * 0.001;

    mouseDx += (targetMx - mouseDx) * 0.035;
    mouseDy += (targetMy - mouseDy) * 0.035;

    for (var i = 0; i < dusts.length; i++) {
      var d = dusts[i];
      if (!reducedMotion) {
        d.x += d.vx;
        d.y += d.vy;
      }
      if (d.x < -10) d.x = W + 10;
      if (d.x > W + 10) d.x = -10;
      if (d.y < -10) d.y = H + 10;
      if (d.y > H + 10) d.y = -10;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + d.hue + ', 42%, 70%, ' + d.alpha + ')';
      ctx.fill();
    }

    for (var sIdx = 0; sIdx < stars.length; sIdx++) {
      var s = stars[sIdx];
      var wave = reducedMotion ? 0 : Math.sin(t * s.speed + s.offset);
      var alpha = s.baseAlpha + wave * 0.12;
      alpha = Math.max(0.025, Math.min(0.78, alpha));
      var sx = s.x + mouseDx * s.depth;
      var sy = s.y + mouseDy * s.depth;
      if (s.glowR > 0 && alpha > 0.12) {
        var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.glowR);
        glow.addColorStop(0, 'hsla(' + s.hue + ', 54%, 80%, ' + (alpha * 0.36) + ')');
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(sx, sy, s.glowR, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + s.hue + ', 45%, 82%, ' + alpha + ')';
      ctx.fill();
    }

    var threshold = 190;
    for (var a = 0; a < 18; a++) {
      var s1 = stars[a];
      var s1x = s1.x + mouseDx * s1.depth;
      var s1y = s1.y + mouseDy * s1.depth;
      for (var b = a + 1; b < 18; b++) {
        var s2 = stars[b];
        var s2x = s2.x + mouseDx * s2.depth;
        var s2y = s2.y + mouseDy * s2.depth;
        var dx = s1x - s2x;
        var dy = s1y - s2y;
        var dist2 = dx * dx + dy * dy;
        if (dist2 < threshold * threshold) {
          var dist = Math.sqrt(dist2);
          var falloff = 1 - dist / threshold;
          var breath = reducedMotion ? 0.55 : 0.55 + 0.45 * Math.sin(t * 0.22 + (a + b) * 0.7);
          var lineAlpha = falloff * 0.09 * breath;
          if (lineAlpha > 0.008) {
            ctx.beginPath();
            ctx.moveTo(s1x, s1y);
            ctx.lineTo(s2x, s2y);
            ctx.strokeStyle = 'hsla(' + ((s1.hue + s2.hue) / 2) + ',54%,75%,' + lineAlpha + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    for (var cIdx = comets.length - 1; cIdx >= 0; cIdx--) {
      var c = comets[cIdx];
      var tailX = c.x - c.vx * c.length;
      var tailY = c.y - c.vy * c.length;
      var grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
      grad.addColorStop(0, 'rgba(230,255,255,' + (c.life * 0.78) + ')');
      grad.addColorStop(0.10, 'rgba(160,220,255,' + (c.life * 0.42) + ')');
      grad.addColorStop(0.48, 'rgba(214,168,90,' + (c.life * 0.20) + ')');
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.45;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c.x, c.y, 1.55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + c.life + ')';
      ctx.fill();
      c.x += c.vx;
      c.y += c.vy;
      c.life -= c.decay;
      if (c.life <= 0) comets.splice(cIdx, 1);
    }
  }

  function starfieldLoop() {
    drawStarfield();
    if (!reducedMotion) animId = requestAnimationFrame(starfieldLoop);
  }

  function scheduleComet() {
    if (reducedMotion) return;
    cometTimer = setTimeout(function() {
      if (comets.length < 4) {
        if (Math.random() < 0.14) spawnMeteorShower();
        else spawnComet();
      }
      scheduleComet();
    }, 9000 + Math.random() * 16000);
  }

  function startStarfield() {
    canvas = document.createElement('canvas');
    canvas.id = 'starfield-bg';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2;pointer-events:none;display:block;';
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');
    resizeStarfield();
    drawStarfield();
    if (!reducedMotion) starfieldLoop();
    scheduleComet();

    window.addEventListener('mousemove', function(e) {
      if (reducedMotion) return;
      var cx = W / 2;
      var cy = H / 2;
      targetMx = -((e.clientX - cx) / cx) * 10;
      targetMy = -((e.clientY - cy) / cy) * 10;
    }, { passive: true });
  }

  function injectCSS() {
    var s1 = document.getElementById('sf-theme');
    if (!s1) {
      s1 = document.createElement('style');
      s1.id = 'sf-theme';
      s1.textContent = ':root,.theme-light,.theme-dark,html,body,#root{background:#020308!important;background-color:#020308!important;--bg-base:#020308!important;--bg-panel:#10131d!important;--bg-secondary:#151a28!important;--text-primary:#f4f1e8!important;--text-secondary:#b8bfd4!important;--text-muted:#6f7890!important;--border-color:rgba(180,205,255,.13)!important}.react-flow,.react-flow__background,.react-flow__renderer,.react-flow__viewport,.react-flow__pane{background:transparent!important;background-color:transparent!important}.react-flow{--xy-background-color:transparent!important;--xy-background-color-default:transparent!important}';
      document.head.appendChild(s1);
    }
    var s2 = document.getElementById('sf-inputs');
    if (!s2) {
      s2 = document.createElement('style');
      s2.id = 'sf-inputs';
      s2.textContent = 'textarea,input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]),select,[contenteditable="true"],[contentEditable="true"]{background-color:rgba(10,14,24,.92)!important;background:rgba(10,14,24,.92)!important;color:#f4f1e8!important}.nodrag.nowheel{background-color:rgba(7,10,18,.82)!important;background:rgba(7,10,18,.82)!important;color:#b8bfd4!important}';
      document.head.appendChild(s2);
    }
    var s3 = document.getElementById('sf-cosmic');
    if (!s3) {
      s3 = document.createElement('style');
      s3.id = 'sf-cosmic';
      s3.textContent = ''
        + 'body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:3;background:radial-gradient(ellipse 55% 40% at 50% 42%,rgba(95,214,255,.10),rgba(214,168,90,.045) 38%,transparent 68%),radial-gradient(ellipse 90% 70% at 50% 50%,transparent 55%,rgba(0,0,8,.44) 95%)}'
        + '@keyframes ssm-title-breath{0%,100%{letter-spacing:.28em}50%{letter-spacing:.40em}}'
        + '.ssm-title-breath{animation:ssm-title-breath 9s ease-in-out infinite}'
        + '@media (prefers-reduced-motion: reduce){.ssm-title-breath{animation:none!important}}';
      document.head.appendChild(s3);
    }
  }

  function start() {
    injectCSS();
    startStarfield();
    window.addEventListener('resize', function() {
      resizeStarfield();
      if (reducedMotion) drawStarfield();
    });
    window.addEventListener('beforeunload', function() {
      if (animId) cancelAnimationFrame(animId);
      if (cometTimer) clearTimeout(cometTimer);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(start, 300); });
  } else {
    setTimeout(start, 300);
  }
})();
```

- [ ] **Step 2: Verify starfield tuning markers**

Run:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js','utf8'); for (const token of ['prefers-reduced-motion','targetMx = -((e.clientX - cx) / cx) * 10','9000 + Math.random() * 16000','beforeunload']) { if(!s.includes(token)) { console.error('missing', token); process.exit(1); } } new Function(s); console.log('starfield-bg.js syntax and markers ok');"
```

Expected:

```text
starfield-bg.js syntax and markers ok
```

---

### Task 5: Upgrade Renderer Error Fallback

**Files:**
- Modify: `D:/sanshiman/resources/app/out/renderer/index.html:121-132`

- [ ] **Step 1: Replace the rough `window.onerror` handler with a styled dark fallback**

In `D:/sanshiman/resources/app/out/renderer/index.html`, replace the existing final inline error handler:

```html
    <script>
      window.onerror = function (message, source, lineno, colno, error) {
        document.getElementById('root').innerHTML =
          '<div style="color:white; z-index:99999; position:absolute; top:20px; left:20px; font-size: 20px;">' +
          message +
          '<br/>' +
          source +
          ':' +
          lineno +
          '</div>'
      }
    </script>
```

with:

```html
    <script>
      window.onerror = function (message, source, lineno, colno, error) {
        var root = document.getElementById('root')
        if (!root) return
        var detail = String(message || '未知错误') + '\n' + String(source || '') + ':' + String(lineno || 0) + ':' + String(colno || 0)
        var safe = function (v) {
          return String(v || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
        }
        root.innerHTML =
          '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px;background:radial-gradient(ellipse 70% 55% at 50% 35%,rgba(95,214,255,.10),transparent 62%),#020308;color:#f4f1e8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Microsoft YaHei UI,sans-serif;">' +
            '<section style="width:min(720px,calc(100vw - 48px));border:1px solid rgba(180,205,255,.16);border-radius:18px;background:linear-gradient(145deg,rgba(16,19,29,.96),rgba(8,11,20,.96));box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 0 1px rgba(214,168,90,.08),0 0 42px rgba(95,214,255,.10);overflow:hidden;">' +
              '<div style="height:2px;background:linear-gradient(90deg,transparent,#d6a85a,#5fd6ff,transparent);"></div>' +
              '<div style="padding:26px 28px 28px;">' +
                '<div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:16px;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,107,107,.24);background:rgba(60,18,22,.34);color:#ffb0a8;font-size:12px;">渲染错误</div>' +
                '<h1 style="margin:0 0 8px;font-size:28px;letter-spacing:.04em;color:#f4f1e8;">界面加载失败</h1>' +
                '<p style="margin:0 0 18px;color:#b8bfd4;line-height:1.7;">叁视漫遇到一个渲染错误。请截图或复制下面的信息，重启应用后如果仍出现，再查看日志目录。</p>' +
                '<pre style="white-space:pre-wrap;word-break:break-word;margin:0;padding:14px 16px;border-radius:12px;border:1px solid rgba(180,205,255,.13);background:rgba(2,3,8,.54);color:#ffd0c8;font-size:12px;line-height:1.6;">' + safe(detail) + '</pre>' +
              '</div>' +
            '</section>' +
          '</div>'
        try { console.error('[renderer-fallback]', detail, error) } catch (_) {}
      }
    </script>
```

- [ ] **Step 2: Verify the HTML fallback contains expected UI text and escaped output helper**

Run:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('D:/sanshiman/resources/app/out/renderer/index.html','utf8'); for (const token of ['界面加载失败','渲染错误','replace(/&/g','[renderer-fallback]']) { if(!s.includes(token)) { console.error('missing', token); process.exit(1); } } console.log('index.html error fallback markers ok');"
```

Expected:

```text
index.html error fallback markers ok
```

---

### Task 6: Verification

**Files:**
- Verify: `D:/sanshiman/resources/app/out/renderer/assets/ui-upgrades.css`
- Verify: `D:/sanshiman/resources/app/out/renderer/assets/progress-hud.css`
- Verify: `D:/sanshiman/resources/app/out/renderer/assets/asset-viewer.css`
- Verify: `D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js`
- Verify: `D:/sanshiman/resources/app/out/renderer/index.html`

- [ ] **Step 1: Confirm no compressed business bundles were modified by this plan**

Run this read-only timestamp/size check to list the business bundles that should remain untouched by manual edits:

```bash
node -e "const fs=require('fs'); const files=['D:/sanshiman/resources/app/out/renderer/assets/index-BujjGe6O.js','D:/sanshiman/resources/app/out/renderer/assets/GenNode-DmArRnR4.js','D:/sanshiman/resources/app/out/renderer/assets/SettingsModal-CW-pi6Yl.js']; for (const f of files) { const st=fs.statSync(f); console.log(f, st.size); }"
```

Expected: command prints file sizes and exits successfully. Do not edit these files.

- [ ] **Step 2: Run JavaScript syntax verification for changed JS/HTML inline handler**

Run:

```bash
node -e "const fs=require('fs'); new Function(fs.readFileSync('D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js','utf8')); const html=fs.readFileSync('D:/sanshiman/resources/app/out/renderer/index.html','utf8'); if(!html.includes('界面加载失败')) process.exit(1); console.log('changed JS/HTML syntax smoke ok');"
```

Expected:

```text
changed JS/HTML syntax smoke ok
```

- [ ] **Step 3: Run unit tests**

Run:

```bash
npm --prefix D:/sanshiman/resources/app test
```

Expected:

```text
Test Files  20 passed (20)
Tests       162 passed (162)
```

Acceptable warnings: Node may print experimental `localStorage` warnings and jsdom may print `HTMLMediaElement` not implemented messages.

- [ ] **Step 4: Run production build**

Run:

```bash
npm --prefix D:/sanshiman/resources/app run build
```

Expected:

```text
✓ built
```

Acceptable warning: `renderer config is missing`, because the current project intentionally builds main/preload and preserves `out/renderer`.

- [ ] **Step 5: Run audit**

Run:

```bash
npm --prefix D:/sanshiman/resources/app audit --audit-level=moderate
```

Expected:

```text
found 0 vulnerabilities
```

- [ ] **Step 6: Summarize patch markers**

Run:

```bash
node -e "const fs=require('fs'); const files=['ui-upgrades.css','progress-hud.css','asset-viewer.css','starfield-bg.js'].map(f=>'D:/sanshiman/resources/app/out/renderer/assets/'+f); for (const f of files) console.log(f.split('/').pop(), fs.statSync(f).size); const html=fs.readFileSync('D:/sanshiman/resources/app/out/renderer/index.html','utf8'); console.log('styled error fallback:', html.includes('界面加载失败'));"
```

Expected:

```text
ui-upgrades.css <non-zero size>
progress-hud.css <non-zero size>
asset-viewer.css <non-zero size>
starfield-bg.js <non-zero size>
styled error fallback: true
```

---

## Self-Review

**Spec coverage:**
- Color system and premium “星穹玄金” variables: Task 1.
- Canvas/background atmosphere: Tasks 1 and 4.
- React Flow node default/hover/selected/running/completed/error states: Task 1.
- Inputs/forms/buttons/modal polish: Task 1.
- HUD as “创作任务雷达”: Task 2.
- Asset viewer as “星窗 / 画境预览器”: Task 3.
- Styled error fallback: Task 5.
- Reduced-motion rules: Tasks 1, 2, 3, and 4.
- Tests/build/audit verification: Task 6.

**Placeholder scan:** No placeholder language is present. Each implementation step includes exact replacement content or exact commands.

**Scope check:** The plan only modifies the five approved renderer patch files and does not modify compressed business bundles or app logic.

**Consistency check:** CSS variables and status colors are consistent across core UI, HUD, and asset viewer. JavaScript reduced-motion behavior matches CSS reduced-motion rules.
