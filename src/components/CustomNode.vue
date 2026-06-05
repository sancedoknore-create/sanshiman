<template>
  <div class="custom-node" :class="{ selected: isSelected }">
    <!-- 节点主体 - 固定350x350 -->
    <div class="node-main" @click.stop="selectNode">
      <div class="node-content">
        <!-- SVG图标 -->
        <div class="node-icon-large">
          <!-- AI绘图节点 - 图片图标 -->
          <svg v-if="type === 'ai-image'" xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 66 66" fill="currentColor">
            <path d="M26.4648 19.2146C26.9874 18.431 28.1396 18.4309 28.6621 19.2146L40.8262 37.4607L44.5361 32.0056C45.06 31.2354 46.1959 31.2353 46.7197 32.0056L55.4453 44.8376C56.041 45.7138 55.4139 46.8998 54.3545 46.9001H10.4746C9.42048 46.9001 8.79159 45.7256 9.37598 44.8484L26.4648 19.2146Z"/>
            <circle cx="42.24" cy="20.46" r="3.96"/>
          </svg>

          <!-- AI视频节点 - 播放图标 -->
          <svg v-else-if="type === 'ai-video'" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.66699 2.64248C4.66717 1.82358 5.59736 1.35167 6.25781 1.83584L13.5674 7.19619C14.1117 7.59579 14.1118 8.40897 13.5674 8.8085L6.25781 14.1688C5.59734 14.6528 4.6671 14.1811 4.66699 13.3622V2.64248Z"/>
          </svg>

          <!-- 其他节点 - 使用emoji -->
          <span v-else>{{ icon }}</span>
        </div>
      </div>

      <!-- 状态指示 -->
      <div v-if="data.status !== 'idle'" class="node-status-badge" :class="'status-' + data.status">
        {{ statusText }}
      </div>
    </div>

    <!-- 生成卡片 - 选中时在底部展开 -->
    <transition name="expand">
      <div v-if="isSelected" class="generator-card">
        <div class="generator-content">
          <!-- 视频节点选项卡 -->
          <div v-if="type === 'ai-video'" class="generator-tabs">
            <button
              v-for="tab in videoTabs"
              :key="tab.value"
              :class="['tab-btn', { active: currentTab === tab.value, disabled: tab.disabled }]"
              @click.stop="!tab.disabled && (currentTab = tab.value)"
              :disabled="tab.disabled"
            >
              {{ tab.label }}
            </button>
          </div>

          <textarea
            v-model="localPrompt"
            @change="updatePrompt"
            @click.stop
            placeholder="描述你想要生成的画面内容..."
            class="generator-input"
            rows="3"
          ></textarea>

          <div class="generator-footer">
            <div class="generator-options">
              <!-- 视频节点使用比例选择器 -->
              <RatioSelector v-if="type === 'ai-video'" v-model="selectedRatio" />

              <!-- 图片节点使用简单按钮 -->
              <button v-else class="option-btn">
                <span>1024x1024</span>
                <span class="chevron">▼</span>
              </button>
            </div>

            <button
              class="generate-btn"
              @click.stop="executeNode"
              :disabled="data.status === 'running'"
            >
              <span v-if="data.status === 'running'">生成中...</span>
              <span v-else>生成</span>
            </button>
          </div>

          <!-- 进度条 -->
          <div v-if="data.progress !== undefined && data.status === 'running'" class="progress-bar">
            <div class="progress-fill" :style="{ width: data.progress + '%' }"></div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 连接点 -->
    <Handle type="target" :position="Position.Left" class="custom-handle" />
    <Handle type="source" :position="Position.Right" class="custom-handle" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useNodeStore } from '@/stores/node'
import RatioSelector from './RatioSelector.vue'

interface Props {
  id: string
  type: string
  data: {
    label: string
    status?: string
    prompt?: string
    progress?: number
  }
}

const props = defineProps<Props>()
const nodeStore = useNodeStore()

const localPrompt = ref(props.data.prompt || '')
const isSelected = computed(() => nodeStore.selectedNodeId === props.id)
const currentTab = ref('text-to-video')
const selectedRatio = ref('16:9')

// 检查是否有图片节点连接
const hasImageInput = computed(() => {
  const incomingEdges = nodeStore.edges.filter(edge => edge.target === props.id)
  return incomingEdges.some(edge => {
    const sourceNode = nodeStore.nodes.find(n => n.id === edge.source)
    return sourceNode?.type === 'ai-image'
  })
})

// 检查是否有任何输入连接
const hasAnyInput = computed(() => {
  return nodeStore.edges.some(edge => edge.target === props.id)
})

// 视频节点选项卡 - 根据输入动态启用
const videoTabs = computed(() => [
  { label: '文生视频', value: 'text-to-video', disabled: hasAnyInput.value }, // 有输入时禁用
  { label: '全能参考', value: 'universal-ref', disabled: !hasAnyInput.value }, // 有输入时启用
  { label: '图生视频', value: 'image-to-video', disabled: !hasImageInput.value }, // 有图片输入时启用
  { label: '首尾帧', value: 'first-last-frame', disabled: !hasImageInput.value }, // 有图片输入时启用
  { label: '图片参考', value: 'image-ref', disabled: !hasImageInput.value }, // 有图片输入时启用
])

// 当输入变化时，自动切换到可用的选项卡
watch([hasAnyInput, hasImageInput], ([anyInput, imageInput]) => {
  const currentTabObj = videoTabs.value.find(t => t.value === currentTab.value)
  if (currentTabObj?.disabled) {
    // 当前选中的选项卡被禁用，切换到第一个可用的
    const firstAvailable = videoTabs.value.find(t => !t.disabled)
    if (firstAvailable) {
      currentTab.value = firstAvailable.value
    }
  }
})

watch(() => props.data.prompt, (newPrompt) => {
  localPrompt.value = newPrompt || ''
})

const selectNode = () => {
  nodeStore.selectNode(props.id)
}

const updatePrompt = () => {
  nodeStore.updateNodeData(props.id, { prompt: localPrompt.value })
}

const executeNode = () => {
  if (props.data.status !== 'running') {
    nodeStore.executeNode(props.id)
  }
}

const icon = computed(() => {
  const icons: Record<string, string> = {
    'ai-image': '🎨',
    'ai-video': '🎬',
    '3d-scene': '🎭',
    'asset-ref': '📦',
    'post-process': '⚡',
  }
  return icons[props.type] || '📄'
})

const statusText = computed(() => {
  const statuses: Record<string, string> = {
    running: '生成中',
    completed: '已完成',
    error: '失败',
  }
  return statuses[props.data.status || ''] || ''
})
</script>

<style scoped>
.custom-node {
  position: relative;
  width: 350px;
}

/* 节点主体 */
.node-main {
  width: 350px;
  height: 350px;
  background: #262626;
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
}

.custom-node.selected .node-main {
  border-color: #00D9FF;
  box-shadow: inset 0 0 0 2px #00D9FF;
}

.node-main:hover {
  border-color: #00D9FF;
}

.node-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  gap: 16px;
}

.node-icon-large {
  color: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-icon-large span {
  font-size: 64px;
}

.node-title-main {
  font-size: 16px;
  color: #ffffff;
  font-weight: 500;
}

.node-hint {
  font-size: 14px;
  color: #888;
  margin-top: 8px;
}

.node-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.node-action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.node-action-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.action-icon {
  font-size: 16px;
}

.node-status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  backdrop-filter: blur(8px);
}

.node-status-badge.status-running {
  background: rgba(0, 217, 255, 0.2);
  color: #00D9FF;
}

.node-status-badge.status-completed {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.node-status-badge.status-error {
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}

/* 生成卡片 - 在节点下方展开 */
.generator-card {
  position: absolute;
  top: calc(100% + 16px);
  left: 50%;
  transform: translateX(-50%);
  width: 640px;
  background: #262626;
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.generator-content {
  padding: 16px;
}

.generator-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 4px;
  overflow-x: auto;
}

.tab-btn {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.1);
  border-color: #4a4a4a;
}

.tab-btn.disabled {
  color: #666;
  cursor: not-allowed;
  opacity: 0.5;
}

.tab-btn:not(.disabled):not(.active):hover {
  background: rgba(255, 255, 255, 0.05);
}

.generator-input {
  width: 100%;
  padding: 12px;
  background: rgba(0, 217, 255, 0.05);
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  margin-bottom: 12px;
}

.generator-input:focus {
  outline: none;
  border-color: #00D9FF;
}

.generator-input::placeholder {
  color: #666;
}

.generator-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.generator-options {
  display: flex;
  gap: 8px;
  flex: 1;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.chevron {
  font-size: 10px;
  color: #888;
}

.generate-btn {
  padding: 8px 24px;
  background: rgba(0, 217, 255, 0.2);
  border: 1px solid #00D9FF;
  border-radius: 8px;
  color: #00D9FF;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.generate-btn:hover:not(:disabled) {
  background: rgba(0, 217, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 217, 255, 0.4);
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-bar {
  width: 100%;
  height: 3px;
  background: rgba(0, 217, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00D9FF, #B432FF);
  transition: width 0.3s;
}

/* 连接点样式 */
:deep(.custom-handle) {
  width: 20px;
  height: 20px;
  background: #00D9FF !important;
  border: 3px solid #262626 !important;
  border-radius: 50%;
  pointer-events: auto;
  opacity: 0 !important;
  transition: opacity 0.2s !important;
  box-shadow: 0 0 12px #00D9FF;
}

:deep(.custom-handle:hover) {
  opacity: 1 !important;
}

:deep(.custom-handle.connecting) {
  opacity: 1 !important;
}

:deep(.custom-handle.connectionindicator) {
  opacity: 1 !important;
}

:deep(.custom-handle.connectablestart) {
  opacity: 1 !important;
}

:deep(.custom-handle.connectableend) {
  opacity: 1 !important;
}

/* 扩大交互区域 */
:deep(.custom-handle::before) {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  pointer-events: auto;
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
}

.expand-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.expand-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
