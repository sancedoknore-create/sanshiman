/**
 * API服务 - 管理图片模型
 */

export interface ImageModelCapabilities {
  // 支持的比例
  ratios?: string[] // 如 ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9']
  // 支持的分辨率
  resolutions?: string[] // 如 ['1K', '2K', '4K']
  // 支持的风格
  styles?: string[] // 如 ['realistic', 'anime', 'watercolor']
}

export interface ImageModel {
  id: string
  name: string
  provider: string
  description?: string
  badge?: string // 'VIP' | 'PRO' | 'NEW'
  capabilities: ImageModelCapabilities
}

// 内存中的模型列表
let modelList: ImageModel[] = [
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    description: '高质量AI绘图',
    badge: 'VIP',
    capabilities: {
      ratios: ['1:1', '16:9', '9:16'],
      resolutions: ['1K', '2K', '4K'],
      styles: ['realistic', 'anime', 'watercolor', 'oil-painting']
    }
  },
  {
    id: 'midjourney-6',
    name: 'Midjourney v6',
    provider: 'Midjourney',
    description: '艺术风格',
    badge: 'PRO',
    capabilities: {
      ratios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '3:2', '2:3'],
      resolutions: ['1K', '2K', '4K'],
      styles: ['realistic', 'anime', 'watercolor', 'oil-painting', 'sketch', 'cyberpunk', 'pixel-art', '3d-render']
    }
  },
  {
    id: 'stable-diffusion-xl',
    name: 'Stable Diffusion XL',
    provider: 'Stability AI',
    description: '开源高质量',
    capabilities: {
      ratios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
      resolutions: ['1K', '2K', '4K'],
      styles: ['realistic', 'anime', 'watercolor', 'oil-painting', 'sketch']
    }
  },
]

/**
 * 获取所有图片模型
 */
export async function getImageModels(): Promise<ImageModel[]> {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 300))
  return modelList
}

/**
 * 设置图片模型列表（供外部API调用）
 */
export function setImageModels(models: ImageModel[]) {
  modelList = models
}

/**
 * 根据ID获取图片模型
 */
export function getImageModelById(id: string): ImageModel | undefined {
  return modelList.find(model => model.id === id)
}

/**
 * 模拟从远程API加载图片模型
 */
export async function fetchImageModelsFromAPI(): Promise<ImageModel[]> {
  try {
    // 这里模拟API调用
    // 实际项目中替换为真实的API请求
    // const response = await fetch('/api/image-models')
    // const data = await response.json()

    // 模拟返回数据
    await new Promise(resolve => setTimeout(resolve, 500))

    const models: ImageModel[] = [
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        provider: 'OpenAI',
        description: '高质量AI绘图',
        badge: 'VIP',
        capabilities: {
          ratios: ['1:1', '16:9', '9:16'],
          resolutions: ['1K', '2K', '4K'],
          styles: ['realistic', 'anime', 'watercolor', 'oil-painting']
        }
      },
      {
        id: 'midjourney-6',
        name: 'Midjourney v6',
        provider: 'Midjourney',
        description: '艺术风格',
        badge: 'PRO',
        capabilities: {
          ratios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '3:2', '2:3'],
          resolutions: ['1K', '2K', '4K'],
          styles: ['realistic', 'anime', 'watercolor', 'oil-painting', 'sketch', 'cyberpunk', 'pixel-art', '3d-render']
        }
      },
      {
        id: 'stable-diffusion-xl',
        name: 'Stable Diffusion XL',
        provider: 'Stability AI',
        description: '开源高质量',
        capabilities: {
          ratios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
          resolutions: ['1K', '2K', '4K'],
          styles: ['realistic', 'anime', 'watercolor', 'oil-painting', 'sketch']
        }
      },
      {
        id: 'flux-pro',
        name: 'Flux Pro',
        provider: 'Black Forest Labs',
        description: '超高质量渲染',
        badge: 'NEW',
        capabilities: {
          ratios: ['1:1', '16:9', '9:16', '4:3'],
          resolutions: ['2K', '4K'],
          styles: ['realistic', '3d-render', 'cyberpunk']
        }
      },
    ]

    setImageModels(models)
    return models
  } catch (error) {
    console.error('获取图片模型失败:', error)
    return modelList // 返回默认列表
  }
}
