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
      @node-click="onNodeClick"
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

    <!-- 属性面板 -->
    <transition name="slide">
      <NodeProperties
        v-if="showProperties && nodeStore.selectedNode"
        :node="nodeStore.selectedNode"
        @close="showProperties = false"
      />
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, markRaw, onMounted, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge } from '@vue-flow/core'
import ContextMenu from '@/components/ContextMenu.vue'
import CustomNode from '@/components/CustomNode.vue'
import AnimatedEdge from '@/components/AnimatedEdge.vue'
import NodeProperties from '@/components/NodeProperties.vue'
import { useNodeStore } from '@/stores/node'

const nodeStore = useNodeStore()
const showProperties = ref(false)

// 使用本地ref来绑定Vue Flow
const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])

const { project, onConnect } = useVueFlow({
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

// 同步nodeStore到本地nodes
watch(() => nodeStore.nodes, (newNodes) => {
  nodes.value = newNodes
}, { deep: true, immediate: true })

watch(() => nodeStore.edges, (newEdges) => {
  edges.value = newEdges
}, { deep: true, immediate: true })

// 同步本地nodes的位置变化回nodeStore
watch(nodes, (newNodes) => {
  newNodes.forEach(node => {
    const storeNode = nodeStore.nodes.find(n => n.id === node.id)
    if (storeNode && (storeNode.position.x !== node.position.x || storeNode.position.y !== node.position.y)) {
      storeNode.position = { ...node.position }
    }
  })
}, { deep: true })

// 监听连线创建
onConnect((connection) => {
  const edge: Edge = {
    id: `e${connection.source}-${connection.target}`,
    source: connection.source,
    target: connection.target,
    type: 'animated',
  }
  nodeStore.addEdge(edge)
})

// 初始化示例节点
onMounted(() => {
  if (nodeStore.nodes.length === 0) {
    const node1: Node = {
      id: '1',
      type: 'ai-image',
      position: { x: 100, y: 100 },
      data: {
        label: 'AI绘图示例',
        status: 'idle',
        prompt: '宇宙飞船在星空中飞行',
        size: '1024x1024',
        style: 'realistic',
      },
    }

    const node2: Node = {
      id: '2',
      type: 'ai-video',
      position: { x: 400, y: 100 },
      data: {
        label: 'AI视频示例',
        status: 'idle',
        mode: 'image-to-video',
        prompt: '飞船起飞动画',
        duration: 5,
        fps: 24,
      },
    }

    nodeStore.addNode(node1)
    nodeStore.addNode(node2)

    const edge: Edge = {
      id: 'e1-2',
      source: '1',
      target: '2',
      type: 'animated',
    }
    nodeStore.addEdge(edge)
  }
})

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
      status: 'idle',
      prompt: '',
      size: '1024x1024',
      style: 'realistic',
      mode: 'text-to-video',
      duration: 5,
      fps: 24,
      sceneTemplate: 'outdoor-street',
      lighting: 'three-point',
    },
  }

  // 只添加到nodeStore，Vue Flow通过v-model自动同步
  nodeStore.addNode(newNode)
}

// 节点点击
const onNodeClick = (event: { event: MouseEvent; node: Node }) => {
  nodeStore.selectNode(event.node.id)
  showProperties.value = true
}

// 节点操作
const handleNodeAction = (action: string) => {
  const node = contextMenu.data as Node

  switch (action) {
    case 'execute':
      nodeStore.executeNode(node.id)
      break
    case 'edit':
      nodeStore.selectNode(node.id)
      showProperties.value = true
      break
    case 'copy':
      // TODO: 实现复制功能
      console.log('复制节点:', node)
      break
    case 'delete':
      nodeStore.removeNode(node.id)
      if (nodeStore.selectedNodeId === node.id) {
        showProperties.value = false
      }
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
  display: flex;
}

.vue-flow-container {
  flex: 1;
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

/* 属性面板滑入动画 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(100%);
}
</style>
