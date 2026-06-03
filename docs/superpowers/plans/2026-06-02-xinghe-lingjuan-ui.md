# 叁视漫「星河灵卷」UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current “星穹玄金” renderer visual patch into a more explicit Chinese fantasy / xianxia “星河灵卷” style while preserving app behavior.

**Architecture:** This remains a renderer-output visual patch. We only edit the five approved static renderer files, using CSS variables, pseudo-elements, gradients, and small vanilla-JS starfield tuning; no compressed React business bundle is changed.

**Tech Stack:** Static CSS, static HTML, vanilla JavaScript, Electron renderer output, React Flow DOM classes, npm/Vitest verification.

---

## File Structure

- Modify: `D:/sanshiman/resources/app/out/renderer/assets/ui-upgrades.css`
  - Main “星河灵卷” design system: xianxia colors, cloud-scroll background, talisman node borders, seal-dot selected state, ink-scroll inputs/buttons/modals.
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/progress-hud.css`
  - Convert HUD copy and visual language from “创作任务雷达” to “炼化任务浮符”.
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/asset-viewer.css`
  - Convert viewer copy and visual language from “星窗” to “画境窗口”.
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js`
  - Tune starfield toward “暗黑星河 + 云雾灵光”: warmer gold traces, softer constellation lines, rarer “灵光” meteors.
- Modify: `D:/sanshiman/resources/app/out/renderer/index.html`
  - Change styled error fallback badge from generic render error to “朱砂警示”.

Do not modify compressed business bundles:

- `D:/sanshiman/resources/app/out/renderer/assets/index-BujjGe6O.js`
- `D:/sanshiman/resources/app/out/renderer/assets/GenNode-DmArRnR4.js`
- `D:/sanshiman/resources/app/out/renderer/assets/SettingsModal-CW-pi6Yl.js`
- Other hashed React chunks.

---

### Task 1: Apply 星河灵卷 Textual and Color-System Conversion

**Files:**
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/ui-upgrades.css`
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/progress-hud.css`
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/asset-viewer.css`
- Modify: `D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js`
- Modify: `D:/sanshiman/resources/app/out/renderer/index.html`

- [ ] **Step 1: Run the exact conversion script**

Run:

```bash
node <<'NODE'
const fs = require('fs');

function rw(file, fn) {
  const before = fs.readFileSync(file, 'utf8');
  const after = fn(before);
  fs.writeFileSync(file, after, 'utf8');
  console.log('updated', file, before.length, '->', after.length);
}

const ui = 'D:/sanshiman/resources/app/out/renderer/assets/ui-upgrades.css';
const hud = 'D:/sanshiman/resources/app/out/renderer/assets/progress-hud.css';
const viewer = 'D:/sanshiman/resources/app/out/renderer/assets/asset-viewer.css';
const star = 'D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js';
const html = 'D:/sanshiman/resources/app/out/renderer/index.html';

rw(ui, s => {
  s = s.replace('叁视漫 UI 视觉升级：星穹玄金', '叁视漫 UI 视觉升级：星河灵卷');
  s = s.replace('Low-risk renderer patch. No business logic.', '玄幻仙侠 renderer patch. No business logic.');
  s = s.replace('--ssm-gold: #d6a85a;', '--ssm-gold: #d6a85a;\n  --ssm-vermillion: #c94b45;\n  --ssm-vermillion-bright: #ff7a70;\n  --ssm-ink: #090b10;\n  --ssm-scroll-paper: rgba(214, 168, 90, 0.055);');
  s = s.replace('/* ============== React Flow nodes ============== */', '/* ============== React Flow nodes：符箓灵卷卡片 ============== */');
  s = s.replace('/* ============== Inputs and forms ============== */', '/* ============== Inputs and forms：写入灵卷 ============== */');
  s = s.replace('/* ============== Buttons ============== */', '/* ============== Buttons：启阵玉牌 ============== */');
  s = s.replace('/* ============== Modals and panels ============== */', '/* ============== Modals and panels：卷轴控制面板 ============== */');
  s = s.replace(/background:\n    radial-gradient\(ellipse 56% 38% at 50% 38%, rgba\(100, 138, 225, 0\.12\), rgba\(145, 95, 220, 0\.07\) 42%, transparent 70%\),\n    radial-gradient\(ellipse 100% 80% at 50% 52%, transparent 58%, rgba\(0, 0, 8, 0\.52\) 100%\),\n    linear-gradient\(90deg, rgba\(214, 168, 90, 0\.035\), transparent 18%, transparent 82%, rgba\(95, 214, 255, 0\.035\)\);/, `background:\n    radial-gradient(ellipse 58% 38% at 50% 35%, rgba(95, 214, 255, 0.10), rgba(214, 168, 90, 0.060) 40%, transparent 72%),\n    radial-gradient(ellipse 100% 82% at 50% 56%, transparent 54%, rgba(0, 0, 8, 0.56) 100%),\n    radial-gradient(ellipse 28% 18% at 24% 18%, rgba(201, 75, 69, 0.045), transparent 70%),\n    linear-gradient(90deg, rgba(214, 168, 90, 0.038), transparent 18%, transparent 82%, rgba(95, 214, 255, 0.032));`);
  s = s.replace(/background-image:\n    linear-gradient\(rgba\(214, 168, 90, 0\.09\) 1px, transparent 1px\),\n    linear-gradient\(90deg, rgba\(95, 214, 255, 0\.07\) 1px, transparent 1px\);\n  background-size: 72px 72px;/, `background-image:\n    radial-gradient(ellipse at 50% 50%, rgba(214, 168, 90, 0.10) 0 1px, transparent 2px),\n    linear-gradient(135deg, transparent 0 46%, rgba(214, 168, 90, 0.075) 47%, transparent 49% 100%),\n    linear-gradient(45deg, transparent 0 46%, rgba(95, 214, 255, 0.055) 47%, transparent 49% 100%);\n  background-size: 96px 54px, 144px 144px, 144px 144px;`);
  s = s.replace(/linear-gradient\(145deg, rgba\(29, 37, 64, 0\.98\), rgba\(15, 19, 31, 0\.98\)\) !important;/g, `radial-gradient(circle at 86% 8%, rgba(201, 75, 69, 0.045), transparent 26%),\n    linear-gradient(145deg, rgba(26, 31, 48, 0.985), rgba(10, 12, 20, 0.985)) !important;`);
  s = s.replace(/background: linear-gradient\(180deg, transparent, var\(--node-accent\), transparent\);/, 'background: linear-gradient(180deg, transparent, var(--ssm-gold), var(--node-accent), transparent);');
  s = s.replace(/linear-gradient\(135deg, rgba\(214, 168, 90, 0\.055\), transparent 28%, transparent 70%, rgba\(95, 214, 255, 0\.045\)\)/g, 'linear-gradient(135deg, rgba(214, 168, 90, 0.070), transparent 24%, transparent 72%, rgba(95, 214, 255, 0.040))');
  s = s.replace(/\.react-flow__node\.selected \.node-wrapper \{[\s\S]*?\n\}/, `.react-flow__node.selected .node-wrapper {\n  border-color: rgba(95, 214, 255, 0.58) !important;\n  box-shadow:\n    0 0 0 1px rgba(214, 168, 90, 0.56),\n    0 0 0 3px rgba(95, 214, 255, 0.18),\n    0 0 28px rgba(166, 120, 255, 0.18),\n    0 18px 44px rgba(0, 0, 0, 0.46) !important;\n}\n\n.react-flow__node.selected .node-wrapper::before {\n  box-shadow: 0 0 16px rgba(214, 168, 90, 0.44), 0 0 8px rgba(201, 75, 69, 0.28);\n}\n\n.react-flow__node.selected .node-wrapper > :first-child::after {\n  content: "";\n  position: absolute;\n  top: 7px;\n  right: 8px;\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--ssm-vermillion);\n  box-shadow: 0 0 10px rgba(201, 75, 69, 0.45);\n  pointer-events: none;\n}`);
  s = s.replace(/background: rgba\(10, 14, 24, 0\.92\) !important;/g, 'background: linear-gradient(180deg, rgba(14, 16, 22, 0.96), rgba(8, 10, 16, 0.96)) !important;');
  s = s.replace(/border: 1px solid rgba\(152, 178, 220, 0\.18\) !important;/g, 'border: 1px solid rgba(214, 168, 90, 0.18) !important;');
  s = s.replace(/button\[class\*="bg-red"\],\nbutton\[class\*="text-red"\] \{\n  background: rgba\(60, 18, 22, 0\.65\) !important;\n  color: #ffb0a8 !important;\n  border: 1px solid rgba\(255, 107, 107, 0\.30\) !important;\n\}/, `button[class*="bg-red"],\nbutton[class*="text-red"] {\n  background: rgba(58, 16, 18, 0.70) !important;\n  color: #ffd0c8 !important;\n  border: 1px solid rgba(201, 75, 69, 0.40) !important;\n}`);
  s += `\n\n/* ============== 星河灵卷：中式角饰与云纹补强 ============== */\n.node-wrapper {\n  background-image:\n    radial-gradient(circle at 92% 9%, rgba(201, 75, 69, 0.045), transparent 22%),\n    linear-gradient(145deg, rgba(26, 31, 48, 0.985), rgba(10, 12, 20, 0.985)) !important;\n}\n.node-wrapper > :first-child { position: relative; }\n.node-wrapper > :first-child::before {\n  content: "";\n  position: absolute;\n  inset: 7px;\n  pointer-events: none;\n  border-radius: 10px;\n  background:\n    linear-gradient(90deg, rgba(214,168,90,.38) 0 18px, transparent 18px) top left / 42px 1px no-repeat,\n    linear-gradient(rgba(214,168,90,.38) 0 18px, transparent 18px) top left / 1px 42px no-repeat,\n    linear-gradient(270deg, rgba(214,168,90,.30) 0 18px, transparent 18px) bottom right / 42px 1px no-repeat,\n    linear-gradient(0deg, rgba(214,168,90,.30) 0 18px, transparent 18px) bottom right / 1px 42px no-repeat;\n  opacity: .42;\n}\nbutton[class*="bg-blue"],\nbutton[class*="bg-indigo"],\nbutton[class*="bg-purple"],\nbutton[class*="bg-green"],\nbutton[class*="bg-primary"] {\n  background: linear-gradient(135deg, #f0cf86, #d6a85a 58%, #77d8e8) !important;\n}\n`;
  return s;
});

rw(hud, s => {
  s = s.replace('Canvas Progress HUD — 叁视漫「星穹玄金」创作任务雷达', 'Canvas Progress HUD — 叁视漫「星河灵卷」炼化任务浮符');
  s = s.replace('--ph-red: #ff6b6b;', '--ph-red: #c94b45;\n  --ph-red-bright: #ff7a70;');
  s = s.replace(/radial-gradient\(circle at 12% 0%, rgba\(214, 168, 90, 0\.10\), transparent 34%\),/g, 'radial-gradient(circle at 12% 0%, rgba(214, 168, 90, 0.13), transparent 34%),\n    radial-gradient(circle at 92% 12%, rgba(201, 75, 69, 0.050), transparent 24%),');
  s = s.replace(/background-image: linear-gradient\(rgba\(95, 214, 255, 0\.045\) 1px, transparent 1px\);\n  background-size: 100% 18px;/, 'background-image: linear-gradient(135deg, transparent 0 46%, rgba(214, 168, 90, 0.070) 47%, transparent 49% 100%);\n  background-size: 42px 42px;');
  s = s.replace(/background: linear-gradient\(90deg, var\(--ph-accent\), var\(--ph-teal\)\);/g, 'background: linear-gradient(90deg, var(--ph-accent-2), var(--ph-accent), var(--ph-teal));');
  s = s.replace(/var\(--ph-red\)/g, 'var(--ph-red-bright)');
  s += `\n\n/* 星河灵卷：浮符角饰 */\n.ph-card {\n  outline: 1px solid rgba(214, 168, 90, 0.045);\n}\n.ph-card .ph-row-top::before {\n  content: "炼化";\n  margin-right: 6px;\n  padding: 1px 5px;\n  border-radius: 999px;\n  border: 1px solid rgba(214,168,90,.22);\n  color: rgba(240,207,134,.78);\n  font-size: 10px;\n  letter-spacing: .16em;\n}\n`;
  return s;
});

rw(viewer, s => {
  s = s.replace('叁视漫 Asset Viewer — 星窗 / 画境预览器', '叁视漫 Asset Viewer — 画境窗口 / 星河灵卷');
  s = s.replace(/radial-gradient\(ellipse 70% 55% at 50% 42%, rgba\(95, 214, 255, 0\.08\), transparent 62%\),/g, 'radial-gradient(ellipse 70% 55% at 50% 42%, rgba(214, 168, 90, 0.08), transparent 62%),\n    radial-gradient(ellipse 34% 22% at 24% 25%, rgba(201, 75, 69, 0.050), transparent 72%),');
  s = s.replace(/border: 1px solid rgba\(180, 205, 255, 0\.18\);/g, 'border: 1px solid rgba(214, 168, 90, 0.24);');
  s = s.replace(/0 0 42px rgba\(95, 214, 255, 0\.13\)/g, '0 0 42px rgba(214, 168, 90, 0.12)');
  s = s.replace(/border: 1px solid rgba\(180, 205, 255, 0\.22\) !important;/g, 'border: 1px solid rgba(214, 168, 90, 0.26) !important;');
  s = s.replace(/画境预览器/g, '画境窗口');
  s += `\n\n/* 星河灵卷：画境卷边 */\n[data-viewer-only="true"] {\n  outline: 1px solid rgba(214,168,90,.08);\n}\n.sv-lightbox-content {\n  outline: 1px solid rgba(240,207,134,.10);\n}\n.sv-filename::before {\n  content: "画境";\n  margin-right: 6px;\n  color: rgba(240,207,134,.82);\n}\n`;
  return s;
});

rw(star, s => {
  s = s.replace('var reducedMotion = false;', 'var reducedMotion = false; // 星河灵卷：减少动态时静态灵卷背景');
  s = s.replace(/baseAlpha: Math\.random\(\) \* 0\.22 \+ 0\.30/g, 'baseAlpha: Math.random() * 0.18 + 0.24');
  s = s.replace(/hue: 210 \+ Math\.random\(\) \* 38/g, 'hue: Math.random() < 0.18 ? 38 + Math.random() * 12 : 210 + Math.random() * 38');
  s = s.replace(/9000 \+ Math\.random\(\) \* 16000/g, '12000 + Math.random() * 20000');
  s = s.replace(/rgba\(214,168,90,\.045\)/g, 'rgba(214,168,90,.060)');
  s = s.replace('rgba(95,214,255,.10),rgba(214,168,90,.045)', 'rgba(95,214,255,.075),rgba(214,168,90,.070)');
  return s;
});

rw(html, s => {
  s = s.replace('渲染错误', '朱砂警示');
  s = s.replace('叁视漫遇到一个渲染错误。请截图或复制下面的信息，重启应用后如果仍出现，再查看日志目录。', '叁视漫灵卷界面遇到渲染异常。请截图或复制下面的信息，重启应用后如果仍出现，再查看日志目录。');
  s = s.replace('linear-gradient(90deg,transparent,#d6a85a,#5fd6ff,transparent)', 'linear-gradient(90deg,transparent,#d6a85a,#c94b45,#5fd6ff,transparent)');
  return s;
});
NODE
```

Expected: it prints five `updated ...` lines and exits successfully.

- [ ] **Step 2: Verify conversion markers**

Run:

```bash
node -e "const fs=require('fs'); const checks=[['D:/sanshiman/resources/app/out/renderer/assets/ui-upgrades.css',['星河灵卷','--ssm-vermillion','符箓灵卷卡片','中式角饰']],['D:/sanshiman/resources/app/out/renderer/assets/progress-hud.css',['星河灵卷','炼化任务浮符','炼化']],['D:/sanshiman/resources/app/out/renderer/assets/asset-viewer.css',['画境窗口','星河灵卷','画境卷边']],['D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js',['星河灵卷','12000 + Math.random() * 20000']],['D:/sanshiman/resources/app/out/renderer/index.html',['朱砂警示','灵卷界面']]]; for (const [file,tokens] of checks){ const s=fs.readFileSync(file,'utf8'); for (const token of tokens){ if(!s.includes(token)){ console.error('missing', token, 'in', file); process.exit(1); } } } console.log('星河灵卷 markers ok');"
```

Expected:

```text
星河灵卷 markers ok
```

---

### Task 2: Syntax and Scope Verification

**Files:**
- Verify: all five approved patch files
- Verify no business bundle edits are required

- [ ] **Step 1: Verify CSS brace balance and JS syntax**

Run:

```bash
node -e "const fs=require('fs'); for (const file of ['D:/sanshiman/resources/app/out/renderer/assets/ui-upgrades.css','D:/sanshiman/resources/app/out/renderer/assets/progress-hud.css','D:/sanshiman/resources/app/out/renderer/assets/asset-viewer.css']) { const s=fs.readFileSync(file,'utf8'); const opens=(s.match(/\{/g)||[]).length; const closes=(s.match(/\}/g)||[]).length; if(opens!==closes){ console.error('brace mismatch', file, {opens,closes}); process.exit(1); } } new Function(fs.readFileSync('D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js','utf8')); console.log('CSS braces and starfield JS syntax ok');"
```

Expected:

```text
CSS braces and starfield JS syntax ok
```

- [ ] **Step 2: List protected bundle sizes without editing them**

Run:

```bash
node -e "const fs=require('fs'); for (const f of ['D:/sanshiman/resources/app/out/renderer/assets/index-BujjGe6O.js','D:/sanshiman/resources/app/out/renderer/assets/GenNode-DmArRnR4.js','D:/sanshiman/resources/app/out/renderer/assets/SettingsModal-CW-pi6Yl.js']) { const st=fs.statSync(f); console.log(f, st.size); }"
```

Expected: command prints sizes for the three protected bundles and exits successfully.

---

### Task 3: Full Verification

**Files:**
- Verify: `D:/sanshiman/resources/app/package.json`
- Verify: renderer patch files under `D:/sanshiman/resources/app/out/renderer`

- [ ] **Step 1: Run unit tests**

Run:

```bash
npm --prefix D:/sanshiman/resources/app test
```

Expected:

```text
Test Files  20 passed (20)
Tests       162 passed (162)
```

Warnings about Node `localStorage` and jsdom `HTMLMediaElement` are acceptable if all tests pass.

- [ ] **Step 2: Run production build**

Run:

```bash
npm --prefix D:/sanshiman/resources/app run build
```

Expected: main and preload build successfully. The warning `renderer config is missing` is acceptable because renderer output is intentionally preserved.

- [ ] **Step 3: Run dependency audit**

Run:

```bash
npm --prefix D:/sanshiman/resources/app audit --audit-level=moderate
```

Expected:

```text
found 0 vulnerabilities
```

- [ ] **Step 4: Summarize final patch state**

Run:

```bash
node -e "const fs=require('fs'); const files=['ui-upgrades.css','progress-hud.css','asset-viewer.css','starfield-bg.js'].map(f=>'D:/sanshiman/resources/app/out/renderer/assets/'+f); for (const f of files) console.log(f.split('/').pop(), fs.statSync(f).size); const html=fs.readFileSync('D:/sanshiman/resources/app/out/renderer/index.html','utf8'); console.log('xianxia fallback:', html.includes('朱砂警示'));"
```

Expected:

```text
ui-upgrades.css <non-zero size>
progress-hud.css <non-zero size>
asset-viewer.css <non-zero size>
starfield-bg.js <non-zero size>
xianxia fallback: true
```

---

## Self-Review

**Spec coverage:**
- “星河灵卷” theme naming: Task 1.
- Xianxia color additions including vermillion: Task 1.
- Cloud-scroll/talisman/node-corner styling: Task 1.
- HUD as “炼化任务浮符”: Task 1.
- Viewer as “画境窗口”: Task 1.
- Starfield as calmer spiritual light: Task 1.
- Error fallback as “朱砂警示”: Task 1.
- Verification: Tasks 2 and 3.

**Placeholder scan:** No placeholders are present. All implementation steps include exact scripts/commands.

**Scope check:** The plan only modifies the approved patch files and does not modify app business logic or compressed React bundles.

**Consistency check:** Naming is consistently “星河灵卷”; warning accent is consistently “朱砂”; task HUD is consistently “炼化”; viewer is consistently “画境”.
