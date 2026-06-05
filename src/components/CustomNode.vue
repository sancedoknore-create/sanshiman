<template>
  <div class="custom-node" :class="{ selected: isSelected }">
    <!-- 节点主体 - 动态尺寸 -->
    <div class="node-main" @click.stop="selectNode" :style="{ width: nodeSize.width + 'px', height: nodeSize.height + 'px' }">
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
      <div v-if="isSelected" class="generator-card" :style="{ width: nodeSize.width + 'px' }">
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

          <!-- 素材缩略图区域 -->
          <div v-if="type === 'ai-video' && allAssets.length > 0" class="assets-preview">
            <div class="asset-item" v-for="asset in allAssets" :key="asset.id">
              <!-- 图片缩略图 -->
              <div v-if="asset.type === 'image'" class="asset-thumbnail">
                <img :src="asset.url" :alt="asset.name" />
                <div v-if="asset.fromNode" class="node-badge">节点</div>
                <button v-else class="asset-remove" @click.stop="removeAsset(asset.id)">×</button>
              </div>

              <!-- 视频缩略图 -->
              <div v-else-if="asset.type === 'video'" class="asset-thumbnail video">
                <video :src="asset.url" />
                <div class="video-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16" fill="white">
                    <path d="M4.66699 2.64248C4.66717 1.82358 5.59736 1.35167 6.25781 1.83584L13.5674 7.19619C14.1117 7.59579 14.1118 8.40897 13.5674 8.8085L6.25781 14.1688C5.59734 14.6528 4.6671 14.1811 4.66699 13.3622V2.64248Z"/>
                  </svg>
                </div>
                <div v-if="asset.fromNode" class="node-badge">节点</div>
                <button v-else class="asset-remove" @click.stop="removeAsset(asset.id)">×</button>
              </div>

              <!-- 音频缩略图 -->
              <div v-else class="asset-thumbnail audio">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                <div v-if="asset.fromNode" class="node-badge">节点</div>
                <button v-else class="asset-remove" @click.stop="removeAsset(asset.id)">×</button>
              </div>
            </div>

            <!-- 上传按钮 -->
            <label class="asset-upload">
              <input
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                @change="handleFileUpload"
                style="display: none"
              />
              <div class="upload-icon">+</div>
            </label>
          </div>

          <!-- 首次上传按钮（无素材时） -->
          <div v-if="type === 'ai-video' && allAssets.length === 0 && currentTab !== 'text-to-video'" class="upload-prompt">
            <label class="upload-prompt-btn">
              <input
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                @change="handleFileUpload"
                style="display: none"
              />
              <div class="upload-icon">+</div>
            </label>
          </div>

          <!-- 富文本提示词输入 -->
          <div
            ref="editableRef"
            contenteditable="true"
            @input="handleContentEdit"
            @click.stop="focusEditable"
            @mousedown.stop
            class="generator-input editable"
            data-placeholder="描述你想要生成的画面内容，输入 @ 引用素材..."
          ></div>

          <!-- @ 提及素材列表 -->
          <transition name="mention">
            <div
              v-if="showAssetMention && allAssets.length > 0"
              class="asset-mention-list"
              :style="{ top: mentionPosition.top + 'px', left: mentionPosition.left + 'px' }"
              @click.stop
            >
              <div
                v-for="asset in filteredAssets"
                :key="asset.id"
                class="mention-item"
                @click="insertAssetBadge(asset)"
              >
                <div class="mention-thumbnail">
                  <img v-if="asset.type === 'image'" :src="asset.url" alt="" />
                  <video v-else-if="asset.type === 'video'" :src="asset.url" />
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                <div class="mention-info">
                  <div class="mention-name">{{ asset.name }}</div>
                  <div class="mention-type">{{ asset.type }}</div>
                </div>
              </div>
            </div>
          </transition>

          <div class="generator-footer">
            <div class="generator-options">
              <!-- 视频节点：模型选择器 + 比例选择器 -->
              <template v-if="type === 'ai-video'">
                <ModelSelector v-model="selectedModel" :models="availableModels" />
                <RatioSelector v-model="selectedRatio" :capabilities="currentModelCapabilities" />
              </template>

              <!-- 图片节点：简单按钮 -->
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
              <svg v-if="data.status !== 'running'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.66699 2.64248C4.66717 1.82358 5.59736 1.35167 6.25781 1.83584L13.5674 7.19619C14.1117 7.59579 14.1118 8.40897 13.5674 8.8085L6.25781 14.1688C5.59734 14.6528 4.6671 14.1811 4.66699 13.3622V2.64248Z"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2h4v12H2V2zm8 0h4v12h-4V2z"/>
              </svg>
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

<style>
/* 全局样式 - 用于动态创建的徽章元素 */
.asset-badge {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 2px 8px !important;
  background: rgba(0, 217, 255, 0.15) !important;
  border: 1px solid rgba(0, 217, 255, 0.3) !important;
  border-radius: 12px !important;
  color: #00D9FF !important;
  font-size: 12px !important;
  vertical-align: middle !important;
  margin: 0 2px !important;
  cursor: default !important;
  user-select: none !important;
  max-height: 24px !important;
}

.asset-badge img,
.badge-thumbnail {
  width: 16px !important;
  height: 16px !important;
  max-width: 16px !important;
  max-height: 16px !important;
  min-width: 16px !important;
  min-height: 16px !important;
  object-fit: cover !important;
  border-radius: 2px !important;
  flex-shrink: 0 !important;
  display: block !important;
}

.badge-icon {
  width: 12px !important;
  height: 12px !important;
  flex-shrink: 0 !important;
}

.badge-name {
  max-width: 100px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
</style>

<script setup lang="ts">
import { ref, computed, watch, provide, onMounted, nextTick } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useNodeStore } from '@/stores/node'
import RatioSelector from './RatioSelector.vue'
import ModelSelector from './ModelSelector.vue'
import { getVideoModels, type VideoModel } from '@/services/videoModelService'

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
const selectedModel = ref('seedance-2.0')
const availableModels = ref<VideoModel[]>([])
const uploadedAssets = ref<Array<{ id: string; type: 'image' | 'video' | 'audio'; url: string; name: string }>>([])

// @ 提及功能
const showAssetMention = ref(false)
const mentionPosition = ref({ top: 0, left: 0 })
const mentionFilter = ref('')
const editableRef = ref<HTMLDivElement>()

// 手动聚焦函数
const focusEditable = () => {
  if (editableRef.value) {
    editableRef.value.focus()
    // 将光标移到末尾
    const range = document.createRange()
    const sel = window.getSelection()
    if (editableRef.value.childNodes.length > 0) {
      const lastNode = editableRef.value.childNodes[editableRef.value.childNodes.length - 1]
      range.setStartAfter(lastNode)
    } else {
      range.selectNodeContents(editableRef.value)
    }
    range.collapse(false)
    sel?.removeAllRanges()
    sel?.addRange(range)
  }
}

// 处理contenteditable输入
const handleContentEdit = (event: Event) => {
  const div = event.target as HTMLDivElement

  // 获取纯文本内容（用于保存）
  localPrompt.value = extractTextContent(div)

  // 检测@触发
  checkForMention(div)
}

// 提取纯文本和引用标记
const extractTextContent = (div: HTMLDivElement): string => {
  let text = ''
  div.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.classList.contains('asset-badge')) {
        const assetId = el.getAttribute('data-asset-id')
        const assetName = el.getAttribute('data-asset-name')
        text += `@[${assetName}](${assetId})`
      } else {
        text += el.textContent
      }
    }
  })
  return text
}

// 检测@触发提及
const checkForMention = (div: HTMLDivElement) => {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  const textNode = range.startContainer

  if (textNode.nodeType === Node.TEXT_NODE) {
    const text = textNode.textContent || ''
    const offset = range.startOffset
    const textBefore = text.substring(0, offset)
    const lastAtIndex = textBefore.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfter = textBefore.substring(lastAtIndex + 1)
      if (!textAfter.includes(' ') && textAfter.length <= 20) {
        mentionFilter.value = textAfter
        showAssetMention.value = allAssets.value.length > 0

        // 计算位置
        const rect = div.getBoundingClientRect()
        const card = div.closest('.generator-card') as HTMLElement
        if (card) {
          const cardRect = card.getBoundingClientRect()
          mentionPosition.value = {
            top: rect.top - cardRect.top - 210,
            left: rect.left - cardRect.left + 10
          }
        }
        return
      }
    }
  }

  showAssetMention.value = false
}

// 处理按键
const handleKeyDown = (event: KeyboardEvent) => {
  // 只阻止冒泡，不阻止默认行为
  event.stopPropagation()
}

// 插入素材徽章
const insertAssetBadge = (asset: any) => {
  const div = editableRef.value
  if (!div) return

  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)

  // 删除@和已输入的文字
  const textNode = range.startContainer
  if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
    const offset = range.startOffset
    const text = textNode.textContent
    const lastAtIndex = text.lastIndexOf('@', offset - 1)

    if (lastAtIndex !== -1) {
      range.setStart(textNode, lastAtIndex)
      range.deleteContents()
    }
  }

  // 创建徽章元素
  const badge = document.createElement('span')
  badge.className = 'asset-badge'
  badge.contentEditable = 'false'
  badge.setAttribute('data-asset-id', asset.id)
  badge.setAttribute('data-asset-name', asset.name)

  // 添加缩略图/图标
  if (asset.type === 'image') {
    const img = document.createElement('img')
    img.src = asset.url
    img.className = 'badge-thumbnail'
    badge.appendChild(img)
  } else if (asset.type === 'video') {
    badge.innerHTML += '<svg class="badge-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4.66699 2.64248C4.66717 1.82358 5.59736 1.35167 6.25781 1.83584L13.5674 7.19619C14.1117 7.59579 14.1118 8.40897 13.5674 8.8085L6.25781 14.1688C5.59734 14.6528 4.6671 14.1811 4.66699 13.3622V2.64248Z"/></svg>'
  } else {
    badge.innerHTML += '<svg class="badge-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>'
  }

  const nameSpan = document.createElement('span')
  nameSpan.className = 'badge-name'
  nameSpan.textContent = asset.name
  badge.appendChild(nameSpan)

  // 插入徽章和空格
  range.insertNode(badge)
  range.collapse(false)

  const space = document.createTextNode(' ')
  range.insertNode(space)
  range.setStartAfter(space)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)

  showAssetMention.value = false

  // 更新localPrompt
  localPrompt.value = extractTextContent(div)
  updatePrompt()
}

// 过滤素材列表
const filteredAssets = computed(() => {
  if (!mentionFilter.value) return allAssets.value
  return allAssets.value.filter(asset =>
    asset.name.toLowerCase().includes(mentionFilter.value.toLowerCase())
  )
})

// 初始化
onMounted(() => {
  if (editableRef.value && localPrompt.value) {
    editableRef.value.textContent = localPrompt.value
  }
  availableModels.value = getVideoModels()
})

// 监听选中状态，选中时聚焦输入框
watch(() => isSelected.value, (selected) => {
  if (selected) {
    // 使用nextTick和多次尝试确保聚焦
    nextTick(() => {
      setTimeout(() => {
        focusEditable()
      }, 350)
    })
  }
})

// 插入素材引用
const insertAssetMention = (asset: any) => {
  if (!textareaRef.value) return

  const textarea = textareaRef.value
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = textarea.value.substring(0, cursorPos)
  const textAfterCursor = textarea.value.substring(cursorPos)

  // 找到最后一个 @
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')
  if (lastAtIndex !== -1) {
    const beforeAt = textBeforeCursor.substring(0, lastAtIndex)
    const mentionTag = `@[${asset.name}](${asset.id})`
    localPrompt.value = beforeAt + mentionTag + textAfterCursor

    // 更新光标位置
    const newCursorPos = (beforeAt + mentionTag).length
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  showAssetMention.value = false
  updatePrompt()
}

// 获取提示词中已引用的素材
const referencedAssets = computed(() => {
  if (!localPrompt.value) return []

  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
  const references: any[] = []
  let match

  while ((match = mentionRegex.exec(localPrompt.value)) !== null) {
    const assetId = match[2]
    const asset = allAssets.value.find(a => a.id === assetId)
    if (asset && !references.find(r => r.id === asset.id)) {
      references.push(asset)
    }
  }

  return references
})

// 处理文件上传
const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files) return

  Array.from(files).forEach(file => {
    const url = URL.createObjectURL(file)
    const type = file.type.startsWith('image/') ? 'image'
                : file.type.startsWith('video/') ? 'video'
                : 'audio'

    uploadedAssets.value.push({
      id: `asset_${Date.now()}_${Math.random()}`,
      type,
      url,
      name: file.name
    })
  })
}

// 移除素材
const removeAsset = (assetId: string) => {
  uploadedAssets.value = uploadedAssets.value.filter(a => a.id !== assetId)
}

// 加载模型列表
onMounted(() => {
  availableModels.value = getVideoModels()
})

// 当前选中模型的能力
const currentModelCapabilities = computed(() => {
  const model = availableModels.value.find(m => m.id === selectedModel.value)
  return model?.capabilities
})

// 当前打开的选择器（用于互斥）
const openSelector = ref<string | null>(null)

// 提供给子组件的方法
provide('openSelector', openSelector)
provide('requestOpen', (selectorId: string) => {
  openSelector.value = selectorId
})

// 根据比例计算节点尺寸
const nodeSize = computed(() => {
  if (props.type !== 'ai-video') {
    return { width: 350, height: 350 }
  }

  const baseHeight = 350
  const ratioMap: Record<string, number> = {
    'auto': 1, // Auto显示为正方形
    '16:9': 16 / 9,
    '21:9': 21 / 9,
    '9:16': 9 / 16,
    '1:1': 1 / 1,
    '4:3': 4 / 3,
    '3:4': 3 / 4,
  }

  const ratio = ratioMap[selectedRatio.value] || 16 / 9
  const width = Math.round(baseHeight * ratio)

  return { width, height: baseHeight }
})

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

// 获取连接的源节点的输出图片
const connectedAssets = computed(() => {
  const incomingEdges = nodeStore.edges.filter(edge => edge.target === props.id)
  const assets: Array<{ id: string; type: 'image' | 'video' | 'audio'; url: string; name: string; fromNode: boolean }> = []

  incomingEdges.forEach(edge => {
    const sourceNode = nodeStore.nodes.find(n => n.id === edge.source)
    if (sourceNode?.data?.outputImage) {
      // 如果源节点有输出图片
      assets.push({
        id: `node_${sourceNode.id}`,
        type: 'image',
        url: sourceNode.data.outputImage,
        name: sourceNode.data.label || '节点输出',
        fromNode: true // 标记为来自节点的素材
      })
    } else if (sourceNode?.data?.outputVideo) {
      // 如果源节点有输出视频
      assets.push({
        id: `node_${sourceNode.id}`,
        type: 'video',
        url: sourceNode.data.outputVideo,
        name: sourceNode.data.label || '节点输出',
        fromNode: true
      })
    }
  })

  return assets
})

// 合并上传的素材和连接的素材
const allAssets = computed(() => {
  return [...connectedAssets.value, ...uploadedAssets.value]
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
}

/* 节点主体 */
.node-main {
  width: 350px;
  height: 350px;
  background: #262626;
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: width 0.3s, height 0.3s, border-color 0.3s, box-shadow 0.3s;
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
  width: 400px;
  background: #262626;
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 10;
  padding: 16px;
}

.generator-content {
  position: relative;
}

.generator-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding: 4px;
  overflow-x: auto;
}

.assets-preview {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding: 4px;
}

.asset-item {
  flex-shrink: 0;
}

.asset-thumbnail {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.asset-thumbnail img,
.asset-thumbnail video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-thumbnail.video .video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.asset-thumbnail.audio {
  color: #00D9FF;
}

.asset-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: white;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.asset-remove:hover {
  background: #ff4444;
  transform: scale(1.1);
}

.node-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  padding: 2px 6px;
  background: rgba(0, 217, 255, 0.8);
  border-radius: 4px;
  font-size: 10px;
  color: white;
  font-weight: 500;
}

.asset-upload {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 2px dashed rgba(0, 217, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.asset-upload:hover {
  border-color: #00D9FF;
  background: rgba(0, 217, 255, 0.05);
}

.asset-upload .upload-icon {
  font-size: 24px;
  color: rgba(0, 217, 255, 0.5);
}

.upload-prompt {
  margin-bottom: 12px;
  width: 60px;
  height: 60px;
  border: 2px dashed rgba(0, 217, 255, 0.3);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.upload-prompt:hover {
  border-color: #00D9FF;
  background: rgba(0, 217, 255, 0.05);
}

.upload-prompt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  cursor: pointer;
  color: rgba(0, 217, 255, 0.5);
  transition: color 0.2s;
}

.upload-prompt-btn:hover {
  color: #00D9FF;
}

.upload-prompt-btn .upload-icon {
  font-size: 24px;
}

/* @ 提及列表 */
.asset-mention-list {
  position: absolute;
  width: 300px;
  max-height: 200px;
  overflow-y: auto;
  background: #262626;
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  padding: 4px;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.mention-item:hover {
  background: rgba(0, 217, 255, 0.1);
}

.mention-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mention-thumbnail img,
.mention-thumbnail video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mention-thumbnail svg {
  color: #00D9FF;
}

.mention-info {
  flex: 1;
  min-width: 0;
}

.mention-name {
  font-size: 13px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mention-type {
  font-size: 11px;
  color: #888;
  text-transform: capitalize;
}

/* 提及动画 */
.mention-enter-active,
.mention-leave-active {
  transition: all 0.2s ease;
}

.mention-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.mention-leave-to {
  opacity: 0;
  transform: translateY(10px);
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
  line-height: 1.5;
  outline: none;
  min-height: 80px;
}

.generator-input.editable {
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  cursor: text;
}

.generator-input.editable * {
  cursor: text;
}

.generator-input.editable img {
  max-width: 16px !important;
  max-height: 16px !important;
}

.generator-input.editable:empty:before {
  content: attr(data-placeholder);
  color: #666;
  pointer-events: none;
}

.generator-input:focus {
  border-color: #00D9FF;
}

/* 素材徽章 */
.asset-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(0, 217, 255, 0.15);
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 12px;
  color: #00D9FF;
  font-size: 12px;
  vertical-align: middle;
  margin: 0 2px;
  cursor: default;
  user-select: none;
  max-height: 24px;
}

.asset-badge img {
  width: 16px !important;
  height: 16px !important;
  max-width: 16px !important;
  max-height: 16px !important;
  min-width: 16px !important;
  min-height: 16px !important;
  object-fit: cover !important;
}

.badge-thumbnail {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  object-fit: cover;
  flex-shrink: 0;
  display: block;
}

.badge-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.badge-name {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 36px;
  padding: 0 20px;
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

.generate-btn svg {
  flex-shrink: 0;
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
