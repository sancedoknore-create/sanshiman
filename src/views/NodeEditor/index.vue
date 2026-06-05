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

    <!-- 属性面板已移除 - 所有编辑都在节点底部的生成卡片中 -->
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, markRaw, onMounted, watch, onUnmounted } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge } from '@vue-flow/core'
import ContextMenu from '@/components/ContextMenu.vue'
import CustomNode from '@/components/CustomNode.vue'
import AnimatedEdge from '@/components/AnimatedEdge.vue'
// import NodeProperties from '@/components/NodeProperties.vue' // 已移除
import { useNodeStore } from '@/stores/node'

const nodeStore = useNodeStore()
// const showProperties = ref(false) // 已移除

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

// 监听连线创建（拖拽手柄）
onConnect((connection) => {
  const edge: Edge = {
    id: `e${connection.source}-${connection.target}`,
    source: connection.source,
    target: connection.target,
    type: 'animated',
  }
  nodeStore.addEdge(edge)
})

// 监听连线开始拖拽（显示节点选择菜单）
const { onConnectStart, onConnectEnd } = useVueFlow()
const connectingFrom = ref<{ nodeId: string; handleType: string } | null>(null)

onConnectStart((params) => {
  if (params.nodeId && params.handleType) {
    connectingFrom.value = {
      nodeId: params.nodeId,
      handleType: params.handleType,
    }
  }
})

onConnectEnd((event) => {
  // 如果没有连接到目标节点，显示创建节点菜单
  if (connectingFrom.value && event instanceof MouseEvent) {
    const targetElement = event.target as HTMLElement
    // 检查是否点击到了空白画布
    if (targetElement.classList.contains('vue-flow__pane') ||
        targetElement.classList.contains('vue-flow__background')) {
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
      contextMenu.data = {
        clientX: event.clientX,
        clientY: event.clientY,
        connectFrom: connectingFrom.value,
      }
    }
  }
  connectingFrom.value = null
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

  // 键盘删除监听
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // 检查是否在输入框中
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      if (nodeStore.selectedNodeId) {
        nodeStore.removeNode(nodeStore.selectedNodeId)
        // showProperties.value = false
        event.preventDefault()
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  // 清理
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
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
  const { clientX, clientY, connectFrom } = contextMenu.data
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

  // 添加节点到store
  nodeStore.addNode(newNode)

  // 如果是从连接点拖拽创建的，自动创建连线
  if (connectFrom) {
    const edge: Edge = {
      id: `e${connectFrom.nodeId}-${nodeId}`,
      source: connectFrom.handleType === 'source' ? connectFrom.nodeId : nodeId,
      target: connectFrom.handleType === 'source' ? nodeId : connectFrom.nodeId,
      type: 'animated',
    }
    nodeStore.addEdge(edge)
  }
}

// 节点点击
const onNodeClick = (event: { event: MouseEvent; node: Node }) => {
  nodeStore.selectNode(event.node.id)
  // 不再显示属性面板
  // showProperties.value = true
}

// 键盘删除
onMounted(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (nodeStore.selectedNodeId) {
        nodeStore.removeNode(nodeStore.selectedNodeId)
        // showProperties.value = false
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  // 清理
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
})

// 节点操作
const handleNodeAction = (action: string) => {
  const node = contextMenu.data as Node

  switch (action) {
    case 'execute':
      nodeStore.executeNode(node.id)
      break
    case 'edit':
      nodeStore.selectNode(node.id)
      // 展开节点底部的生成卡片
      break
    case 'copy':
      // TODO: 实现复制功能
      console.log('复制节点:', node)
      break
    case 'delete':
      nodeStore.removeNode(node.id)
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
