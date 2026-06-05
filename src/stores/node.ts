import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Node, Edge } from '@vue-flow/core'

export interface NodeData {
  label: string
  status: 'idle' | 'running' | 'completed' | 'error'
  progress?: number
  output?: any
  error?: string
  // 节点输出
  outputImage?: string // 图片节点输出
  outputVideo?: string // 视频节点输出
  outputAudio?: string // 音频节点输出
  // AI绘图节点参数
  prompt?: string
  negativePrompt?: string
  size?: string
  style?: string
  seed?: number
  // AI视频节点参数
  mode?: 'text-to-video' | 'image-to-video'
  inputImage?: string
  duration?: number
  fps?: number
  // 3D场景节点参数
  sceneTemplate?: string
  camera?: any
  lighting?: string
}

export const useNodeStore = defineStore('node', () => {
  const nodes = ref<Node[]>([])
  const edges = ref<Edge[]>([])
  const selectedNodeId = ref<string | null>(null)

  const selectedNode = computed(() => {
    if (!selectedNodeId.value) return null
    return nodes.value.find(n => n.id === selectedNodeId.value)
  })

  function addNode(node: Node) {
    nodes.value.push(node)
  }

  function removeNode(nodeId: string) {
    nodes.value = nodes.value.filter(n => n.id !== nodeId)
    edges.value = edges.value.filter(e => e.source !== nodeId && e.target !== nodeId)
  }

  function updateNodeData(nodeId: string, data: Partial<NodeData>) {
    const node = nodes.value.find(n => n.id === nodeId)
    if (node) {
      node.data = { ...node.data, ...data }
    }
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId
  }

  function addEdge(edge: Edge) {
    edges.value.push(edge)
  }

  async function executeNode(nodeId: string) {
    const node = nodes.value.find(n => n.id === nodeId)
    if (!node) return

    updateNodeData(nodeId, { status: 'running', progress: 0 })

    try {
      // 模拟执行过程
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        updateNodeData(nodeId, { progress: i })
      }

      // 模拟输出
      const output = {
        url: 'https://via.placeholder.com/512',
        timestamp: Date.now(),
      }

      // 根据节点类型设置不同的输出
      const node = nodes.value.find(n => n.id === nodeId)
      if (node?.type === 'ai-image') {
        // AI绘图节点 - 设置outputImage
        updateNodeData(nodeId, {
          status: 'completed',
          progress: 100,
          output,
          outputImage: 'https://picsum.photos/512/512?random=' + Date.now(), // 随机图片
        })
      } else if (node?.type === 'ai-video') {
        // AI视频节点 - 设置outputVideo
        updateNodeData(nodeId, {
          status: 'completed',
          progress: 100,
          output,
          outputVideo: 'https://via.placeholder.com/512x288', // 视频占位图
        })
      } else {
        updateNodeData(nodeId, {
          status: 'completed',
          progress: 100,
          output,
        })
      }

      // 触发下游节点
      const downstreamEdges = edges.value.filter(e => e.source === nodeId)
      for (const edge of downstreamEdges) {
        const targetNode = nodes.value.find(n => n.id === edge.target)
        if (targetNode && targetNode.data.status === 'idle') {
          // 可以选择自动执行下游节点
          // await executeNode(edge.target)
        }
      }
    } catch (error) {
      updateNodeData(nodeId, {
        status: 'error',
        error: error instanceof Error ? error.message : '执行失败',
      })
    }
  }

  function resetNode(nodeId: string) {
    updateNodeData(nodeId, {
      status: 'idle',
      progress: 0,
      output: undefined,
      error: undefined,
    })
  }

  return {
    nodes,
    edges,
    selectedNodeId,
    selectedNode,
    addNode,
    removeNode,
    updateNodeData,
    selectNode,
    addEdge,
    executeNode,
    resetNode,
  }
})
