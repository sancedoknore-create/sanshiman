<template>
  <div class="custom-node" :class="nodeClass">
    <div class="node-header">
      <span class="node-icon">{{ icon }}</span>
      <span class="node-title">{{ data.label }}</span>
    </div>
    <div class="node-body">
      <div class="node-status">{{ status }}</div>
    </div>
    <Handle type="target" position="left" class="custom-handle" />
    <Handle type="source" position="right" class="custom-handle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

interface Props {
  id: string
  type: string
  data: {
    label: string
  }
}

const props = defineProps<Props>()

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

const status = computed(() => '待执行')

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
}

.node-icon {
  font-size: 20px;
}

.node-title {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

.node-body {
  padding: 12px;
}

.node-status {
  font-size: 12px;
  color: #888;
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
