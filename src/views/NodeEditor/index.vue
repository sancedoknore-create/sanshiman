<template>
  <div class="node-editor">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :default-viewport="{ zoom: 1, x: 0, y: 0 }"
      :min-zoom="0.1"
      :max-zoom="4"
      :snap-to-grid="true"
      :snap-grid="[15, 15]"
      @pane-context-menu="onPaneContextMenu"
      @node-context-menu="onNodeContextMenu"
      class="vue-flow-container"
    >
      <Background pattern-color="#00D9FF" :gap="20" :size="1" />
      <Controls />
      <MiniMap />
    </VueFlow>

    <!-- 右键菜单 -->
    <ContextMenu
      v-if="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenu.items"
      @select="onContextMenuSelect"
      @close="contextMenu.visible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, markRaw } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge } from '@vue-flow/core'
import ContextMenu from '@/components/ContextMenu.vue'
import CustomNode from '@/components/CustomNode.vue'
import AnimatedEdge from '@/components/AnimatedEdge.vue'

const { addNodes, addEdges, project } = useVueFlow({
  nodeTypes: {
    'ai-image': markRaw(CustomNode),
    'ai-video': markRaw(CustomNode),
    '3d-scene': markRaw(CustomNode),
    'asset-ref': markRaw(CustomNode),
    'post-process': markRaw(CustomNode),
  },
  edgeTypes: {
    'animated': markRaw(AnimatedEdge),
  },
})

const nodes = ref<Node[]>([
  {
    id: '1',
    type: 'ai-image',
    position: { x: 100, y: 100 },
    data: { label: 'AI绘图示例' },
  },
  {
    id: '2',
    type: 'ai-video',
    position: { x: 400, y: 100 },
    data: { label: 'AI视频示例' },
  },
])

const edges = ref<Edge[]>([
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'animated',
  },
])

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  items: Array<{ label: string; icon: string; action: string }>
  data?: any
}

const contextMenu = reactive<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  items: [],
  data: null,
})

// 画布右键菜单
const onPaneContextMenu = (event: MouseEvent) => {
  event.preventDefault()

  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.items = [
    { label: '添加AI绘图节点', icon: '🎨', action: 'add-ai-image' },
    { label: '添加AI视频节点', icon: '🎬', action: 'add-ai-video' },
    { label: '添加3D导演台节点', icon: '🎭', action: 'add-3d-scene' },
    { label: '添加资产引用节点', icon: '📦', action: 'add-asset-ref' },
    { label: '添加后处理节点', icon: '⚡', action: 'add-post-process' },
  ]
  contextMenu.data = { clientX: event.clientX, clientY: event.clientY }
}

// 节点右键菜单
const onNodeContextMenu = (event: { event: MouseEvent; node: Node }) => {
  event.event.preventDefault()

  contextMenu.visible = true
  contextMenu.x = event.event.clientX
  contextMenu.y = event.event.clientY
  contextMenu.items = [
    { label: '执行生成', icon: '▶️', action: 'execute' },
    { label: '编辑参数', icon: '📝', action: 'edit' },
    { label: '复制', icon: '📋', action: 'copy' },
    { label: '删除', icon: '🗑️', action: 'delete' },
  ]
  contextMenu.data = event.node
}

// 菜单选择处理
const onContextMenuSelect = (action: string) => {
  if (action.startsWith('add-')) {
    addNodeByType(action.replace('add-', ''))
  } else {
    handleNodeAction(action)
  }
  contextMenu.visible = false
}

// 添加节点
const addNodeByType = (type: string) => {
  const { clientX, clientY } = contextMenu.data
  const position = project({ x: clientX, y: clientY })

  const nodeId = `node_${Date.now()}`
  const newNode: Node = {
    id: nodeId,
    type: type,
    position,
    data: {
      label: getNodeLabel(type),
    },
  }

  addNodes([newNode])
}

// 节点操作
const handleNodeAction = (action: string) => {
  const node = contextMenu.data as Node

  switch (action) {
    case 'execute':
      console.log('执行节点:', node)
      break
    case 'edit':
      console.log('编辑节点:', node)
      break
    case 'copy':
      console.log('复制节点:', node)
      break
    case 'delete':
      nodes.value = nodes.value.filter(n => n.id !== node.id)
      edges.value = edges.value.filter(e => e.source !== node.id && e.target !== node.id)
      break
  }
}

const getNodeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'ai-image': 'AI绘图',
    'ai-video': 'AI视频',
    '3d-scene': '3D场景',
    'asset-ref': '资产引用',
    'post-process': '后处理',
  }
  return labels[type] || type
}
</script>

<style scoped>
.node-editor {
  width: 100%;
  height: 100%;
  background: #020308;
  position: relative;
}

.vue-flow-container {
  width: 100%;
  height: 100%;
}

:deep(.vue-flow__background) {
  background-color: #020308;
}

:deep(.vue-flow__minimap) {
  background-color: rgba(2, 3, 8, 0.9);
  border: 1px solid #00D9FF;
}

:deep(.vue-flow__controls) {
  border: 1px solid #00D9FF;
  background: rgba(2, 3, 8, 0.9);
}

:deep(.vue-flow__controls button) {
  background: rgba(0, 217, 255, 0.1);
  border-bottom: 1px solid #00D9FF;
  color: #00D9FF;
}

:deep(.vue-flow__controls button:hover) {
  background: rgba(0, 217, 255, 0.2);
}
</style>
