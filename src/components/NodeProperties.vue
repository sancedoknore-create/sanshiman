<template>
  <div v-if="node" class="node-properties">
    <div class="properties-header">
      <h3>{{ node.data.label }}</h3>
      <button class="close-btn" @click="$emit('close')"><svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg></button>
    </div>

    <div class="properties-body">
      <!-- 状态显示 -->
      <div class="property-section">
        <div class="status-badge" :class="node.data.status">
          {{ getStatusText(node.data.status) }}
        </div>
        <div v-if="node.data.progress !== undefined" class="progress-bar">
          <div class="progress-fill" :style="{ width: node.data.progress + '%' }"></div>
        </div>
        <div v-if="node.data.error" class="error-text">{{ node.data.error }}</div>
      </div>

      <!-- AI绘图节点参数 -->
      <template v-if="node.type === 'ai-image'">
        <div class="property-section">
          <label>提示词</label>
          <textarea
            v-model="localData.prompt"
            placeholder="描述你想生成的图像..."
            rows="3"
          ></textarea>
        </div>

        <div class="property-section">
          <label>负面提示词</label>
          <textarea
            v-model="localData.negativePrompt"
            placeholder="不想要的元素..."
            rows="2"
          ></textarea>
        </div>

        <div class="property-row">
          <div class="property-section">
            <label>尺寸</label>
            <select v-model="localData.size">
              <option value="512x512">512×512</option>
              <option value="768x768">768×768</option>
              <option value="1024x1024">1024×1024</option>
            </select>
          </div>

          <div class="property-section">
            <label>风格</label>
            <select v-model="localData.style">
              <option value="realistic">真实</option>
              <option value="anime">动漫</option>
              <option value="artistic">艺术</option>
            </select>
          </div>
        </div>

        <div class="property-section">
          <label>随机种子</label>
          <input v-model.number="localData.seed" type="number" placeholder="留空自动生成" />
        </div>
      </template>

      <!-- AI视频节点参数 -->
      <template v-if="node.type === 'ai-video'">
        <div class="property-section">
          <label>模式</label>
          <select v-model="localData.mode">
            <option value="text-to-video">文生视频</option>
            <option value="image-to-video">图生视频</option>
          </select>
        </div>

        <div class="property-section">
          <label>提示词</label>
          <textarea
            v-model="localData.prompt"
            placeholder="描述视频内容..."
            rows="3"
          ></textarea>
        </div>

        <div class="property-row">
          <div class="property-section">
            <label>时长 (秒)</label>
            <input v-model.number="localData.duration" type="number" min="1" max="10" />
          </div>

          <div class="property-section">
            <label>帧率</label>
            <select v-model.number="localData.fps">
              <option :value="24">24 fps</option>
              <option :value="30">30 fps</option>
              <option :value="60">60 fps</option>
            </select>
          </div>
        </div>
      </template>

      <!-- 输出预览 -->
      <div v-if="node.data.output" class="property-section">
        <label>输出</label>
        <div class="output-preview">
          <img v-if="node.data.output.url" :src="node.data.output.url" alt="输出" />
          <div class="output-info">
            生成时间: {{ new Date(node.data.output.timestamp).toLocaleString() }}
          </div>
        </div>
      </div>
    </div>

    <div class="properties-footer">
      <button class="btn-primary" @click="saveAndExecute" :disabled="isRunning">
        {{ isRunning ? '执行中...' : '保存并执行' }}
      </button>
      <button class="btn-secondary" @click="saveChanges">保存</button>
      <button v-if="node.data.status !== 'idle'" class="btn-secondary" @click="resetNode">
        重置
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNodeStore } from '@/stores/node'
import type { Node } from '@vue-flow/core'

interface Props {
  node: Node | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const nodeStore = useNodeStore()

const localData = ref({
  prompt: '',
  negativePrompt: '',
  size: '1024x1024',
  style: 'realistic',
  seed: undefined as number | undefined,
  mode: 'text-to-video',
  duration: 5,
  fps: 24,
})

const isRunning = computed(() => props.node?.data.status === 'running')

watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localData.value = { ...localData.value, ...newNode.data }
    }
  },
  { immediate: true }
)

function saveChanges() {
  if (!props.node) return
  nodeStore.updateNodeData(props.node.id, localData.value)
}

async function saveAndExecute() {
  if (!props.node) return
  saveChanges()
  await nodeStore.executeNode(props.node.id)
}

function resetNode() {
  if (!props.node) return
  nodeStore.resetNode(props.node.id)
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    idle: '待执行',
    running: '执行中',
    completed: '已完成',
    error: '执行失败',
  }
  return texts[status] || status
}
</script>

<style scoped>
.node-properties {
  width: 350px;
  height: 100%;
  background: rgba(2, 3, 8, 0.95);
  border-left: 1px solid #00D9FF;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.properties-header {
  padding: 20px;
  border-bottom: 1px solid #00D9FF;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.properties-header h3 {
  font-size: 18px;
  color: #00D9FF;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}

.properties-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.property-section {
  margin-bottom: 20px;
}

.property-section label {
  display: block;
  margin-bottom: 8px;
  color: #00D9FF;
  font-size: 13px;
}

.property-section input,
.property-section select,
.property-section textarea {
  width: 100%;
  padding: 10px;
  background: rgba(0, 217, 255, 0.05);
  border: 1px solid #00D9FF;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  font-family: inherit;
}

.property-section textarea {
  resize: vertical;
}

.property-section input:focus,
.property-section select:focus,
.property-section textarea:focus {
  outline: none;
  border-color: #B432FF;
  box-shadow: 0 0 10px rgba(180, 50, 255, 0.3);
}

.property-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 10px;
}

.status-badge.idle {
  background: rgba(136, 136, 136, 0.2);
  color: #888;
}

.status-badge.running {
  background: rgba(0, 217, 255, 0.2);
  color: #00D9FF;
}

.status-badge.completed {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.status-badge.error {
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(0, 217, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00D9FF, #B432FF);
  transition: width 0.3s;
}

.error-text {
  color: #ff4444;
  font-size: 12px;
  padding: 8px;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 4px;
}

.output-preview {
  border: 1px solid #00D9FF;
  border-radius: 6px;
  padding: 10px;
}

.output-preview img {
  width: 100%;
  border-radius: 4px;
  margin-bottom: 8px;
}

.output-info {
  font-size: 12px;
  color: #888;
}

.properties-footer {
  padding: 20px;
  border-top: 1px solid #00D9FF;
  display: flex;
  gap: 10px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.btn-primary {
  background: rgba(0, 217, 255, 0.2);
  border: 1px solid #00D9FF;
  color: #00D9FF;
}

.btn-primary:hover:not(:disabled) {
  background: rgba(0, 217, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 217, 255, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border: 1px solid #666;
  color: #888;
}

.btn-secondary:hover {
  border-color: #00D9FF;
  color: #00D9FF;
}
</style>
