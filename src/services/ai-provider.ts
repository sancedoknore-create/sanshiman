// AI服务提供商统一接口

export interface TextToImageParams {
  prompt: string
  negativePrompt?: string
  size: string
  style?: string
  seed?: number
}

export interface ImageToVideoParams {
  imageUrl: string
  prompt?: string
  duration: number
  fps: number
}

export interface TextToVideoParams {
  prompt: string
  duration: number
  fps: number
}

export interface ImageResult {
  imageUrl: string
  seed: number
}

export interface VideoResult {
  videoUrl: string
  taskId: string
}

export interface TaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  result?: string
  error?: string
}

export interface AuthResult {
  success: boolean
  quota?: {
    remaining: number
    total: number
  }
  error?: string
}

export interface AIProvider {
  name: string

  // 认证测试
  testAuth(apiKey: string): Promise<AuthResult>

  // 文生图
  textToImage(params: TextToImageParams): Promise<ImageResult>

  // 图生视频
  imageToVideo(params: ImageToVideoParams): Promise<VideoResult>

  // 文生视频
  textToVideo(params: TextToVideoParams): Promise<VideoResult>

  // 查询任务状态
  getTaskStatus(taskId: string): Promise<TaskStatus>
}
