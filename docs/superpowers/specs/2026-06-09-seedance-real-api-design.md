# 接入 Seedance 真实 API（出海营网关）— 设计文档

**日期：** 2026-06-09
**目标：** 把视频节点从 setTimeout 模拟换成真正调用 `api.aiid.edu.kg` 网关上的 Seedance 系列模型，打通"输入 prompt（+图）→ 真视频文件"这条核心链路。

---

## 1. 背景与现状

`stores/node.ts` 的 `executeNode` 当前是 setTimeout 假跑进度条，输出写死 `via.placeholder.com`。`AIProvider` 抽象层（含 `volcano.ts` / `runway.ts`）已存在但完全孤立，从未被 store 调用过。`Settings` 页能填 key 但只裸存内存、刷新即丢。

把这条链路真接通，是当前软件从"演示动画"变成"能用工具"的关键一步。

## 2. 范围

### 包含（MVP）
- 文生视频（t2v）：节点 prompt → 视频
- 图生视频（i2v）—— 两条来源：
  - 上游 `ai-image` 已完成节点的 `outputImage` URL
  - 用户在视频节点上传的本地图（base64 data URL，跑不通再切代理）
- API key 通过 Electron `safeStorage` 加密 + `electron-store` 持久化
- 启动时自动加载 key 并测试连接，顶栏状态指示灯实时反映

### 不包含（明确排除）
- 真实绘图 API（`textToImage` 抛 NotImplementedError 占位）
- 任务取消按钮（轮询代码预留 `cancelExecution`，UI 不加按钮）
- 失败重试（一次失败即报错，不自动重试）
- 并发节流（依赖网关后端自身限流）
- 超时可配置（硬编 10 分钟）
- 资产库联动、工程文件保存（独立后续工作）

## 3. 整体架构

```
Settings 页 ─▶ ai store (Pinia) ─▶ electron-store (主进程, safeStorage 加密)
                  │
                  ▼
              SeedanceProvider (HTTP 包装, 无状态)
                  │ POST /api/v3/contents/generations/tasks
                  │ GET  /api/v3/contents/generations/tasks/{id}
                  ▼
              api.aiid.edu.kg
                  ▲
                  │ provider.createTask / getTaskStatus
                  │
              node store.executeNode（编排者：起任务 + 轮询 + 进度回写 + 终态判定）
                  │
                  ▼
              CustomNode UI（进度条、视频预览、错误态）
```

## 4. 模块边界

### 4.1 SeedanceProvider（薄）
**位置：** `src/services/providers/seedance.ts`

**职责：** 纯 HTTP 包装。无状态（仅持有 apiKey）。不做轮询、不做编排、不持有定时器。

**对外方法：**
```ts
class SeedanceProvider implements AIProvider {
  setApiKey(key: string): void
  testAuth(apiKey: string): Promise<AuthResult>
  createTask(params: CreateTaskParams): Promise<{ taskId: string }>
  getTaskStatus(taskId: string): Promise<TaskStatus>
  textToVideo(params): Promise<VideoResult>     // 内部调 createTask({ mode: 't2v' })
  imageToVideo(params): Promise<VideoResult>    // 内部调 createTask({ mode: 'i2v' })
  textToImage(_): Promise<never>                // 抛 NotImplementedError
}
```

**`CreateTaskParams` 形状：**
```ts
{
  model: string             // 例如 'doubao-seedance-2-0-260128'
  prompt: string
  mode?: 't2v' | 'i2v'
  image_url?: string        // 公网 URL 或 base64 data URL
  ratio?: string            // '16:9' / '9:16' / '1:1' ...
  resolution?: string       // '480p' / '720p' / '1080p'
  duration?: number         // 4 / 6 / 8 / 10 等
  fps?: number
  generate_audio?: boolean
}
```

**`testAuth` 探活策略：** 网关没有专门的 ping 接口，且任何创建/查询任务都可能扣额度或返回 400，无法可靠区分"key 错"和"id 错"。因此 `testAuth` **不发实际请求**，仅做本地校验：key 非空、以 `sk-` 开头、长度 ≥ 20。校验通过即视为"已配置"（store 状态 `connected`），key 是否真的可用要等首次实际生成时才知道。生成失败 401 时再把 store 状态打回 `error`。

**响应映射纯函数：** 把 §5.2 的字段映射逻辑抽成 export 的 `mapTaskResponse(raw): TaskStatus` 纯函数（同文件内 export），便于 §8.2 单测直接调用。

### 4.2 ai store（持久化 + 状态）
**位置：** `src/stores/ai.ts`

**改动：** `providers` 字典只保留 `seedance` 一项；新增 `loadApiKey()`、`setApiKey` 异步化，写电存储。

**启动调用链：** `main.ts` 创建完 pinia 后调一次 `useAIStore().loadApiKey()` → 从 electron-store 读 key → 调 `setApiKey` → 调 `testConnection` → 顶栏指示灯亮。

### 4.3 主进程 IPC
**位置：** `electron/main.cjs`、`electron/preload.cjs`

**新增 IPC handlers：**
- `store:get(key)` → safeStorage 解密返回字符串或 null
- `store:set(key, value)` → safeStorage 加密后写 electron-store
- `store:delete(key)`

**preload 暴露：** `window.electronAPI.store.{get, set, delete}`

**降级策略：** `safeStorage.isEncryptionAvailable()` 为 false（Linux 缺 libsecret 等）时，明文写入并 console.warn。Vite 直接浏览器打开（无 preload）时 `window.electronAPI` 为 undefined，ai store 用可选链兜底成内存模式（旧行为）。

### 4.4 node store（编排者）
**位置：** `src/stores/node.ts`

**改动：** `executeNode` 重写。新增 `runningTasks: Map<nodeId, { intervalId, startedAt }>` 持有定时器句柄。新增 `cancelExecution(nodeId)`（UI 不调用，预留）。

**executeNode 流程：**
1. 解析节点 data：`{ model, prompt, ratio, resolution, duration, fps, generateAudio, inputImage }`
2. 决定 mode 与 image_url：
   - 上游有 `ai-image` 且 `status === 'completed'` 且 `outputImage` 非空 → `mode='i2v'`, `image_url = outputImage`
   - 节点自身 `data.inputImage` 非空 → `mode='i2v'`, `image_url = data.inputImage`（base64）
   - 否则 `mode='t2v'`
3. `provider.createTask(params)` → 拿到 `taskId`，写到 `data.taskId`
4. `updateNodeData({ status: 'running', progress: 0, taskId })`
5. `setInterval(pollTask, 3000)`
6. `pollTask`：调 `getTaskStatus`，按映射表更新进度/状态；终态时 `clearInterval` + 写 `outputVideo` 或 `error`
7. 超时：从 `startedAt` 起 10 分钟未到终态 → `clearInterval`，记 `error: '生成超时'`

### 4.5 CustomNode（UI）
**位置：** `src/components/CustomNode.vue`

**改动最小：**
- 输入/选择器/生成按钮的现有 UI **不动**
- 错误态文字渲染（用 `data.error`，已有字段，新增渲染）
- 视频节点新增本地图上传入口（一个图标按钮，点开后选本地图 → 转 base64 → 写入 `data.inputImage`）

## 5. API 契约

### 5.1 创建任务

**请求：**
```
POST https://api.aiid.edu.kg/api/v3/contents/generations/tasks
Authorization: Bearer sk-xxxxxx
Content-Type: application/json

{ "model": "doubao-seedance-2-0-260128", "prompt": "...", "mode": "t2v",
  "ratio": "16:9", "resolution": "1080p", "duration": 5 }
```

**响应：** `{ "id": "task_xxx", ... }`，从 `id` 字段拿 taskId。

### 5.2 查询任务

**请求：**
```
GET https://api.aiid.edu.kg/api/v3/contents/generations/tasks/{task_id}
Authorization: Bearer sk-xxxxxx
```

**响应字段映射表：**

| 网关字段 | 我们的语义 |
|---|---|
| `status: queued` | `pending` (progress 设 5) |
| `status: running` | `processing` (progress 取自字段) |
| `status: succeeded` | `completed` |
| `status: failed` | `failed` |
| `progress`（字符串） | `parseInt(...) \|\| 上一次的值` |
| `videoUrl` 优先级 | `content.video_url` → `items[0].content.video_url` → `items[0].video_url` |
| `error` | `error.message` 或 `items[0].error` |

### 5.3 错误处理

| 状况 | 处理 |
|---|---|
| 401 | "API Key 无效"，ai store 状态置 `error` |
| 429 | "已限流，稍后重试"，节点状态 `error` |
| 5xx | "网关错误，请重试"，节点状态 `error` |
| 网络异常 | "无法连接到 api.aiid.edu.kg"，节点状态 `error` |

## 6. 数据流（端到端）

```
用户在 Settings 页填 sk-xxx
  └─▶ ai.testConnection('seedance', key)
       └─▶ provider.testAuth(key) → 401 检测
       └─▶ 成功：providers.seedance.status='connected', 写 electron-store
  └─▶ 顶栏指示灯绿

用户在视频节点 prompt 输入「飞船起飞」+ 选模型 doubao-seedance-2-0-260128 + 拉时长到 6 秒
  └─▶ 点生成
       └─▶ node.executeNode(nodeId)
            ├─ 找上游 ai-image 节点 outputImage（无）→ 看 data.inputImage（无）→ mode='t2v'
            ├─ provider.createTask({ model, prompt, mode:'t2v', ratio:'16:9', resolution:'1080p', duration:6 })
            │   POST /api/v3/contents/generations/tasks → { id: 'task_abc' }
            ├─ updateNodeData({ status:'running', taskId:'task_abc', progress:0 })
            ├─ setInterval(poll, 3000)
            │   ├─ GET /tasks/task_abc → { status:'running', progress:'30' }
            │   │   └─ updateNodeData({ status:'running', progress:30 })
            │   ├─ GET /tasks/task_abc → { status:'succeeded', content:{video_url:'https://...'} }
            │   │   └─ clearInterval; updateNodeData({ status:'completed', progress:100, outputVideo:'https://...' })
            └─ 节点显示视频预览，可播放
```

## 7. 文件清单（修改/新增/删除）

**新增：**
- `src/services/providers/seedance.ts`

**修改：**
- `src/services/ai-provider.ts`：在接口加 `createTask`；`TaskStatus` 增加更准确的字段
- `src/stores/ai.ts`：providers 只保留 seedance；增 `loadApiKey`；`setApiKey` 异步化
- `src/stores/node.ts`：`executeNode` 重写；新增 `runningTasks` Map 和 `cancelExecution`
- `src/services/videoModelService.ts`：模型 ID 换成真实的 `doubao-seedance-*` 系列
- `src/views/Settings/index.vue`：删两张假卡，只留 Seedance；隐藏 quota 显示；保存成功 toast
- `src/components/CustomNode.vue`：错误态文字渲染；视频节点本地图上传按钮
- `src/main.ts`：startup 调用 `useAIStore().loadApiKey()`
- `electron/main.cjs`：引入 electron-store + safeStorage，注册 IPC handlers
- `electron/preload.cjs`：暴露 `electronAPI.store`
- `package.json`：新增依赖 `electron-store`

**删除：**
- `src/services/providers/volcano.ts`
- `src/services/providers/runway.ts`

## 8. 测试策略

项目现状无测试框架。本轮不引框架，做手工验收 + 一段小型纯函数单测。

### 8.1 手工验收清单
1. ✅ 启动 → Settings 页填入 sk-xxx → 测试连接 → 状态变绿、顶栏指示灯亮
2. ✅ 关闭软件重开 → Settings 页 key 已预填、状态自动变绿（持久化生效）
3. ✅ 节点画布拖视频节点 → 写 prompt → 点生成 → 进度条 0→100 → 视频出现可播
4. ✅ 拖 ai-image 节点（picsum 假产物即可）→ 连到视频节点 → 视频节点生成 → 网络面板看到 i2v 请求
5. ✅ 视频节点本地图上传 → 生成 → i2v 请求 image_url 是 data:image/... base64
6. ✅ 故意填错 key → 测试连接报"API Key 无效"
7. ✅ 断网 → 节点显示"无法连接"错误，不卡死
8. ✅ 故意填一个会失败的 prompt 看 failed 终态显示

### 8.2 纯函数单测（浏览器 devtools 手工跑）
把响应映射逻辑抽成 `mapTaskResponse(raw): TaskStatus` 纯函数，在 devtools 喂 4 种 mock 响应（queued / running 50% / succeeded with content.video_url / failed with error.message）确认输出。

## 9. 风险与未决

| 风险 | 缓解 |
|---|---|
| base64 data URL 网关可能不接受 i2v | 第一轮先试；如果 422/400，提示用户后续接代理图床 |
| 查询接口路径推测对（已据公开文档确认 GET `/api/v3/contents/generations/tasks/{id}`，aiid 文档与 OpenAI/火山官方一致） | 实跑一次确认；若 404 报警立即改 |
| `safeStorage` 在 Linux 无 libsecret 时降级明文 | 接受；warn 即可，主用户在 Windows |
| 网关限流（429）频率不明 | 第一轮无重试；用户看到错误后手动重试即可 |
| `testAuth` 不发请求，无法在 Settings 页捕获 key 错 | key 错只在首次生成时才暴露；接受这个延迟反馈作为不扣额度的代价 |
| `doubao-seedance-1-0-lite-*` 系列模型 ID 拆分 t2v / i2v 两个版本，与我们 mode 字段冲突 | 模型列表先只列"通用 ID"模型（1-5-pro / 2-0 / 2-0-fast），不放 lite 拆分版 |
| `resolution` 字段网关接受 480p / 720p / 1080p 字符串还是 size `1280x720` 形式不确定 | 先按 `resolution: '1080p'` 直传；422 时回退到 `size` 字段并查表填具体宽高 |

## 10. 后续（不在本轮范围）
- 任务取消按钮（UI）
- 失败自动重试（带指数退避）
- 真实绘图 API（DALL-E 兼容路径）
- 工程文件保存/加载（包含 nodes/edges/产物 URL）
- 资产库联动产物
