/**
 * API服务 - 管理视频模型
 */

export interface VideoModelCapabilities {
  // 支持的比例
  ratios?: string[] // 如 ['auto', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9']
  // 支持的分辨率
  resolutions?: string[] // 如 ['1K', '2K', '4K']
  // 时长范围
  durationRange?: {
    min: number // 最小秒数
    max: number // 最大秒数
  }
  // 是否支持音频生成
  audioGeneration?: boolean
}

export interface VideoModel {
  id: string
  name: string
  description: string
  badge?: string
  capabilities?: VideoModelCapabilities // 模型能力
}

// 模型列表存储
let modelList: VideoModel[] = [
  {
    id: 'seedance-2.0',
    name: 'Seedance 2.0',
    description: '高质量视频生成',
    badge: 'VIP',
    capabilities: {
      ratios: ['auto', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
      resolutions: ['1K', '2K', '4K'],
      durationRange: { min: 4, max: 15 },
      audioGeneration: true
    }
  },
  {
    id: 'seedance-1.5',
    name: 'Seedance 1.5',
    description: '快速生成',
    capabilities: {
      ratios: ['16:9', '9:16', '1:1'],
      resolutions: ['1K', '2K'],
      durationRange: { min: 4, max: 10 },
      audioGeneration: false
    }
  },
]

/**
 * 获取所有视频模型
 */
export function getVideoModels(): VideoModel[] {
  return modelList
}

/**
 * 设置视频模型列表（从API加载后调用）
 */
export function setVideoModels(models: VideoModel[]): void {
  modelList = models
}

/**
 * 添加一个视频模型
 */
export function addVideoModel(model: VideoModel): void {
  const exists = modelList.find(m => m.id === model.id)
  if (!exists) {
    modelList.push(model)
  }
}

/**
 * 移除一个视频模型
 */
export function removeVideoModel(modelId: string): void {
  const index = modelList.findIndex(m => m.id === modelId)
  if (index !== -1) {
    modelList.splice(index, 1)
  }
}

/**
 * 从API加载模型列表（示例）
 * 实际使用时替换为真实的API调用
 */
export async function loadModelsFromAPI(): Promise<VideoModel[]> {
  try {
    // TODO: 替换为实际的API调用
    // const response = await fetch('/api/video-models')
    // const models = await response.json()

    // 模拟API响应
    const models: VideoModel[] = [
      {
        id: 'seedance-2.0',
        name: 'Seedance 2.0',
        description: '高质量视频生成',
        badge: 'VIP',
        capabilities: {
          ratios: ['auto', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
          resolutions: ['1K', '2K', '4K'],
          durationRange: { min: 4, max: 15 },
          audioGeneration: true
        }
      },
      {
        id: 'seedance-1.5',
        name: 'Seedance 1.5',
        description: '快速生成',
        capabilities: {
          ratios: ['16:9', '9:16', '1:1'],
          resolutions: ['1K', '2K'],
          durationRange: { min: 4, max: 10 },
          audioGeneration: false
        }
      },
      {
        id: 'runway-gen3',
        name: 'Runway Gen-3',
        description: '电影级画质',
        badge: 'PRO',
        capabilities: {
          ratios: ['16:9', '21:9'],
          resolutions: ['2K', '4K'],
          durationRange: { min: 5, max: 10 },
          audioGeneration: true
        }
      },
      {
        id: 'pika-1.0',
        name: 'Pika 1.0',
        description: '创意风格',
        capabilities: {
          ratios: ['16:9', '9:16', '1:1', '4:3'],
          resolutions: ['1K', '2K'],
          durationRange: { min: 3, max: 8 },
          audioGeneration: false
        }
      },
    ]

    setVideoModels(models)
    return models
  } catch (error) {
    console.error('加载模型列表失败:', error)
    return modelList
  }
}
