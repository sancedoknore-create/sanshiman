<template>
  <div class="custom-node" :class="[nodeClass, { expanded: isSelected }]">
    <div class="node-header" @click.stop="toggleExpand">
      <span class="node-icon">{{ icon }}</span>
      <span class="node-title">{{ data.label }}</span>
      <span v-if="!isSelected && (type === 'ai-image' || type === 'ai-video')" class="expand-hint">▼</span>
    </div>

    <!-- 展开内容 - 仅在选中时显示 -->
    <div v-if="isSelected" class="node-body">
      <!-- AI绘图和AI视频节点显示提示词输入框 -->
      <template v-if="type === 'ai-image' || type === 'ai-video'">
        <textarea
          v-model="localPrompt"
          @change="updatePrompt"
          @click.stop
          placeholder="输入提示词..."
          class="node-prompt-input"
          rows="3"
        ></textarea>
        <button
          class="node-execute-btn"
          @click.stop="executeNode"
          :disabled="data.status === 'running'"
        >
          {{ data.status === 'running' ? '执行中...' : '▶️ 执行' }}
        </button>
      </template>

      <!-- 其他节点显示状态 -->
      <template v-else>
        <div class="node-status" :class="'status-' + data.status">{{ status }}</div>
      </template>

      <div v-if="data.progress !== undefined && data.status === 'running'" class="node-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: data.progress + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- 紧凑状态显示状态 -->
    <div v-else class="node-compact-status">
      <span class="status-dot" :class="'status-' + data.status"></span>
    </div>

    <Handle type="target" :position="Position.Left" class="custom-handle" />
    <Handle type="source" :position="Position.Right" class="custom-handle" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useNodeStore } from '@/stores/node'

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

// 判断是否选中
const isSelected = computed(() => nodeStore.selectedNodeId === props.id)

// 监听data.prompt变化
watch(() => props.data.prompt, (newPrompt) => {
  localPrompt.value = newPrompt || ''
})

const toggleExpand = () => {
  if (isSelected.value) {
    // 已选中，点击标题关闭
    nodeStore.selectNode(null)
  } else {
    // 未选中，展开
    nodeStore.selectNode(props.id)
  }
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

const status = computed(() => {
  const statuses: Record<string, string> = {
    idle: '待执行',
    running: '执行中',
    completed: '已完成',
    error: '失败',
  }
  return statuses[props.data.status || 'idle'] || '待执行'
})

const nodeClass = computed(() => `node-type-${props.type}`)
</script>

<style scoped>
.custom-node {
  min-width: 180px;
  background: rgba(2, 3, 8, 0.9);
  border: 1px solid #00D9FF;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.3);
  padding: 0;
  transition: all 0.3s;
}

.custom-node.expanded {
  min-width: 240px;
  max-width: 320px;
}

.custom-node:hover {
  box-shadow: 0 0 30px rgba(180, 50, 255, 0.5);
  border-color: #B432FF;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(0, 217, 255, 0.1);
  border-bottom: 1px solid #00D9FF;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  transition: background 0.3s;
}

.node-header:hover {
  background: rgba(0, 217, 255, 0.15);
}

.node-icon {
  font-size: 20px;
}

.node-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

.expand-hint {
  font-size: 10px;
  color: #666;
  transition: transform 0.3s;
}

.expanded .expand-hint {
  transform: rotate(180deg);
}

.node-compact-status {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
}

.status-dot.status-idle {
  background: #666;
}

.status-dot.status-running {
  background: #00D9FF;
  box-shadow: 0 0 8px #00D9FF;
  animation: pulse 1.5s infinite;
}

.status-dot.status-completed {
  background: #00ff88;
  box-shadow: 0 0 8px #00ff88;
}

.status-dot.status-error {
  background: #ff4444;
  box-shadow: 0 0 8px #ff4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.node-body {
  padding: 12px;
}

.node-prompt-input {
  width: 100%;
  padding: 8px;
  background: rgba(0, 217, 255, 0.05);
  border: 1px solid #00D9FF;
  border-radius: 4px;
  color: #ffffff;
  font-size: 12px;
  font-family: inherit;
  resize: none;
  margin-bottom: 8px;
}

.node-prompt-input:focus {
  outline: none;
  border-color: #B432FF;
  box-shadow: 0 0 8px rgba(180, 50, 255, 0.3);
}

.node-prompt-input::placeholder {
  color: #666;
}

.node-execute-btn {
  width: 100%;
  padding: 8px;
  background: rgba(0, 217, 255, 0.2);
  border: 1px solid #00D9FF;
  border-radius: 4px;
  color: #00D9FF;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.node-execute-btn:hover:not(:disabled) {
  background: rgba(0, 217, 255, 0.3);
  box-shadow: 0 0 10px rgba(0, 217, 255, 0.4);
}

.node-execute-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.node-status {
  font-size: 12px;
  color: #888;
}

.node-status.status-running {
  color: #00D9FF;
}

.node-status.status-completed {
  color: #00ff88;
}

.node-status.status-error {
  color: #ff4444;
}

.node-progress {
  margin-top: 8px;
}

.progress-bar {
  width: 100%;
  height: 3px;
  background: rgba(0, 217, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00D9FF, #B432FF);
  transition: width 0.3s;
}

:deep(.custom-handle) {
  width: 10px;
  height: 10px;
  background: #00D9FF;
  border: 2px solid #020308;
  box-shadow: 0 0 8px #00D9FF;
}

:deep(.custom-handle:hover) {
  background: #B432FF;
  box-shadow: 0 0 12px #B432FF;
}
</style>
