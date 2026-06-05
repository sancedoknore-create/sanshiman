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
      :is-valid-connection="isValidConnection"
      @pane-context-menu="onPaneContextMenu"
      @node-context-menu="onNodeContextMenu"
      @node-click="onNodeClick"
      @node-drag="onNodeDrag"
      @node-drag-stop="onNodeDragStop"
      class="vue-flow-container"
    >
      <Background pattern-color="#00D9FF" :gap="20" :size="1" />
      <Controls />
      <MiniMap :pannable="true" :zoomable="true" />
    </VueFlow>

    <!-- 对齐辅助线 -->
    <div
      v-for="line in alignmentLines"
      :key="line.id"
      class="alignment-line"
      :class="line.type"
      :style="{
        left: line.type === 'vertical' ? line.position + 'px' : 0,
        top: line.type === 'horizontal' ? line.position + 'px' : 0,
      }"
    ></div>

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

// 对齐辅助线
const alignmentLines = ref<Array<{ id: string; type: 'horizontal' | 'vertical'; position: number }>>([])
const ALIGNMENT_THRESHOLD = 5 // 对齐阈值（像素）

// 连接验证：只允许从source连接到target
const isValidConnection = (connection: any) => {
  // 不允许连接到自己
  if (connection.source === connection.target) {
    return false
  }

  // sourceHandle应该是null或undefined（默认source handle）
  // targetHandle应该是null或undefined（默认target handle）
  // 这样可以确保从右侧source连接到左侧target
  return true
}

// 节点拖动时检测对齐
const onNodeDrag = ({ node }: { node: Node }) => {
  const lines: Array<{ id: string; type: 'horizontal' | 'vertical'; position: number; distance: number }> = []

  // 获取当前节点的边界
  const currentNode = node
  const currentLeft = currentNode.position.x
  const currentRight = currentNode.position.x + (currentNode.dimensions?.width || 0)
  const currentTop = currentNode.position.y
  const currentBottom = currentNode.position.y + (currentNode.dimensions?.height || 0)
  const currentCenterX = currentLeft + (currentNode.dimensions?.width || 0) / 2
  const currentCenterY = currentTop + (currentNode.dimensions?.height || 0) / 2

  // 遍历其他节点检测对齐
  nodes.value.forEach(otherNode => {
    if (otherNode.id === currentNode.id) return

    const otherLeft = otherNode.position.x
    const otherRight = otherNode.position.x + (otherNode.dimensions?.width || 0)
    const otherTop = otherNode.position.y
    const otherBottom = otherNode.position.y + (otherNode.dimensions?.height || 0)
    const otherCenterX = otherLeft + (otherNode.dimensions?.width || 0) / 2
    const otherCenterY = otherTop + (otherNode.dimensions?.height || 0) / 2

    // 检测垂直对齐（左边、右边、中心）
    const leftDist = Math.abs(currentLeft - otherLeft)
    if (leftDist < ALIGNMENT_THRESHOLD) {
      lines.push({ id: `v-left-${otherNode.id}`, type: 'vertical', position: otherLeft, distance: leftDist })
    }
    const rightDist = Math.abs(currentRight - otherRight)
    if (rightDist < ALIGNMENT_THRESHOLD) {
      lines.push({ id: `v-right-${otherNode.id}`, type: 'vertical', position: otherRight, distance: rightDist })
    }
    const centerXDist = Math.abs(currentCenterX - otherCenterX)
    if (centerXDist < ALIGNMENT_THRESHOLD) {
      lines.push({ id: `v-center-${otherNode.id}`, type: 'vertical', position: otherCenterX, distance: centerXDist })
    }

    // 检测水平对齐（上边、下边、中心）
    const topDist = Math.abs(currentTop - otherTop)
    if (topDist < ALIGNMENT_THRESHOLD) {
      lines.push({ id: `h-top-${otherNode.id}`, type: 'horizontal', position: otherTop, distance: topDist })
    }
    const bottomDist = Math.abs(currentBottom - otherBottom)
    if (bottomDist < ALIGNMENT_THRESHOLD) {
      lines.push({ id: `h-bottom-${otherNode.id}`, type: 'horizontal', position: otherBottom, distance: bottomDist })
    }
    const centerYDist = Math.abs(currentCenterY - otherCenterY)
    if (centerYDist < ALIGNMENT_THRESHOLD) {
      lines.push({ id: `h-center-${otherNode.id}`, type: 'horizontal', position: otherCenterY, distance: centerYDist })
    }
  })

  // 去重：相同位置的线只保留一条（位置相近认为是同一条线）
  const uniqueLines = new Map<string, typeof lines[0]>()
  lines.forEach(line => {
    const key = `${line.type}-${Math.round(line.position)}`
    const existing = uniqueLines.get(key)
    // 保留距离最近的那条线
    if (!existing || line.distance < existing.distance) {
      uniqueLines.set(key, line)
    }
  })

  // 只显示最近的几条线（横竖各1条）
  const horizontalLines = Array.from(uniqueLines.values()).filter(l => l.type === 'horizontal').sort((a, b) => a.distance - b.distance).slice(0, 1)
  const verticalLines = Array.from(uniqueLines.values()).filter(l => l.type === 'vertical').sort((a, b) => a.distance - b.distance).slice(0, 1)

  alignmentLines.value = [...horizontalLines, ...verticalLines]
}

// 拖动结束清除辅助线
const onNodeDragStop = () => {
  alignmentLines.value = []
}

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
    // 只允许Delete键删除节点，禁用Backspace
    if (event.key === 'Delete') {
      // 检查是否在输入框中
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]') ||
          target.closest('.generator-input')) {
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
    { label: '上传素材', icon: '📤', action: 'upload-asset' },
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
  if (action === 'upload-asset') {
    handleUploadAsset()
  } else if (action.startsWith('add-')) {
    addNodeByType(action.replace('add-', ''))
  } else {
    handleNodeAction(action)
  }
  contextMenu.visible = false
}

// 处理上传素材
const handleUploadAsset = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*,video/*,audio/*'
  input.multiple = true

  input.onchange = async (e: Event) => {
    const files = (e.target as HTMLInputElement).files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      // 创建预览URL
      const url = URL.createObjectURL(file)

      // 判断文件类型
      let type: 'image' | 'video' | 'audio' = 'image'
      if (file.type.startsWith('video/')) {
        type = 'video'
      } else if (file.type.startsWith('audio/')) {
        type = 'audio'
      }

      // 创建素材节点
      const position = project({
        x: contextMenu.data?.clientX || window.innerWidth / 2,
        y: contextMenu.data?.clientY || window.innerHeight / 2,
      })

      const node: Node = {
        id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'asset-ref',
        position,
        data: {
          label: file.name,
          assetType: type,
          assetUrl: url,
          assetName: file.name,
        },
      }

      nodeStore.addNode(node)
    }
  }

  input.click()
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
    // 只允许Delete键删除节点，禁用Backspace
    if (event.key === 'Delete') {
      // 如果焦点在输入元素中，不处理删除
      const target = event.target as HTMLElement

      // 检查目标元素本身或其父元素是否为输入元素
      if (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]') ||
          target.closest('.generator-input')) {
        return
      }

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

/* 对齐辅助线 */
.alignment-line {
  position: absolute;
  pointer-events: none;
  z-index: 1000;
}

.alignment-line.horizontal {
  width: 100%;
  height: 1px;
  left: 0;
  border-top: 1px dashed rgba(0, 217, 255, 0.8);
}

.alignment-line.vertical {
  width: 1px;
  height: 100%;
  top: 0;
  border-left: 1px dashed rgba(0, 217, 255, 0.8);
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
