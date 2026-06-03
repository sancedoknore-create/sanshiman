# 叁视漫「星穹玄金」UI 高级视觉升级设计

**目标:** 在不改业务逻辑、不改 React 压缩 bundle 的前提下，把当前界面升级为“高级克制 + 国风玄幻科技感”的暗黑宇宙 AI 创作工作台。

## 背景与约束

当前完整 renderer 源码不在 `src/renderer` 中，主要可落地界面资源位于 `out/renderer`。因此本次设计采用低风险视觉补丁方式，优先修改独立 CSS 和少量独立 JS：

- `D:/sanshiman/resources/app/out/renderer/assets/ui-upgrades.css`
- `D:/sanshiman/resources/app/out/renderer/assets/progress-hud.css`
- `D:/sanshiman/resources/app/out/renderer/assets/asset-viewer.css`
- `D:/sanshiman/resources/app/out/renderer/assets/starfield-bg.js`
- `D:/sanshiman/resources/app/out/renderer/index.html`

不直接修改这些业务 bundle：

- `index-BujjGe6O.js`
- `GenNode-DmArRnR4.js`
- `SettingsModal-CW-pi6Yl.js`
- 其它压缩后的 React 业务 chunk

原因：压缩 bundle 风险高、可维护性差，且后续构建可能覆盖。

## 视觉方向

主题名：**星穹玄金**。

关键词：

- 暗黑宇宙
- AI 创作工作流
- 专业软件质感
- 玄金点缀
- 青紫科技光
- 克制动效
- 东方标题气质

整体不做大面积国风纹样，不做过度霓虹。以深色专业软件为底，局部使用金线、细光、星图、书法感标题点题。

## 色彩系统

建议在 `ui-upgrades.css` 顶部定义统一变量：

```css
:root {
  --ssm-bg-deep: #020308;
  --ssm-bg-panel: #10131d;
  --ssm-bg-panel-2: #151a28;
  --ssm-bg-node: #171d2e;
  --ssm-bg-node-soft: #1d2540;

  --ssm-text-main: #f4f1e8;
  --ssm-text-secondary: #b8bfd4;
  --ssm-text-muted: #6f7890;

  --ssm-gold: #d6a85a;
  --ssm-gold-soft: #8a6732;
  --ssm-cyan: #5fd6ff;
  --ssm-blue: #4f8cff;
  --ssm-violet: #a678ff;
  --ssm-green: #3ddc97;
  --ssm-red: #ff6b6b;
  --ssm-orange: #ff9f43;

  --ssm-border-soft: rgba(180, 205, 255, 0.13);
  --ssm-border-bright: rgba(120, 210, 255, 0.42);
  --ssm-shadow-panel: 0 18px 48px rgba(0, 0, 0, 0.45);
  --ssm-shadow-glow: 0 0 28px rgba(95, 214, 255, 0.14);
}
```

现有 `--bg-base`、`--bg-panel`、`--text-primary` 等变量继续保留兼容，但应映射到新色彩系统，减少散落色值。

## 画布与背景

### 目标

让画布像“深空创作台”，有氛围但不抢节点内容。

### 改动

- 降低星点整体亮度。
- 降低星座连线透明度。
- 降低鼠标视差幅度，从最大 `±18px` 调到约 `±10px`。
- 降低流星雨频率，避免长期使用时分散注意力。
- 保留中心星云，但更柔、更暗。
- 增加边缘暗角，让视觉集中到画布中心。
- 加 `prefers-reduced-motion` 处理，减少动态时停止或弱化星空动画。

### 不改

- 不改变 React Flow 画布功能。
- 不改变节点拖拽、缩放、连线逻辑。

## React Flow 节点

### 目标

把节点从普通深色卡片升级为“AI 创作舱 / 星图卡片”。

### 默认态

- 深蓝黑渐变背景。
- 细边框。
- 柔和阴影。
- 左侧类型色条改成“能量脊线”：带轻微渐变和内光。

### Hover 态

- 边框亮度略升。
- 阴影轻微抬升。
- 不做夸张位移，避免拖拽时干扰。

### Selected 态

- 青紫外环。
- 玄金内线。
- 节点看起来被“星图选中”。

### Running 态

- 使用慢速流光边框。
- 状态点呼吸。
- 不让整张卡片大面积闪烁。

### Completed 态

- 短暂青金闪光。
- 动画结束后回到稳定卡片样式。

### Error 态

- 红橙边框。
- 短促轻震。
- 错误提示区更清楚，但不使用刺眼纯红。

## 输入框、表单、按钮

### 输入框

当前全局输入框强制 `Courier New`，会降低中文 prompt 可读性。新设计：

- 中文输入区域使用系统字体栈。
- API Key、路径、数字、小型参数输入可继续使用等宽字体。
- 背景保持实色深色。
- 边角从机械直角调整为轻微圆角。
- placeholder 颜色略提高，保证可见。
- focus 态使用青蓝细线和柔光。

### 按钮

按钮分三级：

1. 主按钮：生成、保存、开始任务。使用玄金或青金渐变。
2. 次按钮：取消、选择文件、打开目录。使用深色透明底 + 细边框。
3. 危险按钮：删除、清空。使用低饱和红边框，hover 时增强。

按钮动效：

- hover：轻微亮边和上浮。
- active：轻微压下，不使用明显缩放导致布局突兀。
- disabled：降低透明度并去除 hover 光效。

## 弹窗与设置页

### 目标

弹窗像正式的“星舰控制面板”，不是普通 web modal。

### 改动

- 遮罩更深，带轻微 blur。
- 弹窗主体使用深蓝黑面板。
- 标题区加一条很细的玄金分割线。
- 分组卡片用低透明边框。
- API 配置、路径配置、模型配置视觉层级更清楚。
- 底部按钮栏更稳定，主要按钮突出。
- 错误/警告文本使用暗色提示块 + 红橙图标感。

不改变弹窗数据结构和保存逻辑。

## 进度 HUD

### 目标

把任务浮窗升级成“创作任务雷达”。

### 改动

- 卡片背景更深。
- 边框更细。
- 运行中进度条使用青金流光。
- 完成态使用克制青绿色。
- 失败态使用红橙。
- 缩略图结果区域加柔和边框。
- Hover 提示更清楚。
- Pin 按钮更像控制台开关。

## 素材查看器

### 目标

把素材查看器从霓虹插件感调整为“星窗 / 画境预览器”。

### 改动

- Lightbox 背景更沉稳。
- 图片边缘使用细边框和柔和阴影。
- 文件名标签使用底部渐变遮罩，提高可读性。
- 关闭按钮降低侵入感。
- resize 把手缩小发光范围。
- 引导气泡从强紫色改为深色 + 玄金描边。
- 选中态与普通节点选中态统一。

## 错误页与空状态

### 错误页

当前 `window.onerror` 直接写入白字错误。新设计改成暗色错误面板：

- 标题：`界面加载失败`
- 副标题：`叁视漫遇到一个渲染错误`
- 错误摘要：message、source、line
- 视觉：深色面板、玄金标题线、红橙错误标识

如果不改业务 JS，只在 `index.html` 内联错误处理中生成更完整 HTML 和样式。

### 空状态

本轮不强行新增业务空状态，因为需要 React 组件结构支持。可以通过 CSS 改善已有空状态视觉；若没有对应 DOM，不新增复杂逻辑。

## 动效原则

- 默认界面不持续闪烁。
- 运行中、选中、hover、错误时才出现明显动效。
- 弹窗入场 200-250ms。
- 按钮 hover 100-150ms。
- 节点流光速度慢。
- 遵守 `prefers-reduced-motion`，减少动态时关闭 shimmer、流光、流星等动画。

## 验证方式

完成后运行：

```bash
npm --prefix D:/sanshiman/resources/app test
npm --prefix D:/sanshiman/resources/app run build
npm --prefix D:/sanshiman/resources/app audit --audit-level=moderate
```

预期：

- 测试仍为 `20 passed / 162 passed`。
- build 成功。
- audit 为 `found 0 vulnerabilities`。
- `renderer config is missing` 仍可接受，因为当前配置只构建 main/preload。

还需要人工视觉检查：

- 主画布是否不刺眼。
- 中文 prompt 输入是否更舒服。
- 节点 selected/running/error 状态是否明显。
- HUD 是否不挡主流程。
- Lightbox 是否有高级感且不压图。
- 错误页是否可读。

## 范围外

本设计不做：

- React 组件重构。
- 业务流程变更。
- API、数据库、生成逻辑变更。
- 自动发布。
- 新增复杂交互。
- 修改压缩业务 bundle。

## 风险与规避

### 风险：构建产物被覆盖

当前修改目标在 `out/renderer`，未来完整 renderer 重建可能覆盖这些补丁。

规避：先作为安装包视觉补丁落地；后续若找到完整 renderer 源码，再迁移为源码级样式。

### 风险：CSS 选择器过宽影响未知组件

规避：尽量通过 `.react-flow__node`、`.ph-card`、`.sv-*`、modal 常见结构选择器控制范围。全局按钮/输入框规则保持克制。

### 风险：动画影响性能

规避：降低星空亮度和动态频率，加入 `prefers-reduced-motion`，不新增高频 DOM 动画。

## 自检

- 无 TBD/TODO 占位。
- 方案聚焦 UI 视觉补丁，不触碰业务逻辑。
- 文件范围明确。
- 验证方式明确。
- 风格与用户确认的“高级克制 + 国风玄幻科技感”一致。
