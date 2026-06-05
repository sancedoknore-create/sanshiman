import type {
  AIProvider,
  AuthResult,
  TextToImageParams,
  ImageResult,
  ImageToVideoParams,
  VideoResult,
  TextToVideoParams,
  TaskStatus,
} from './ai-provider'

export class RunwayProvider implements AIProvider {
  name = 'Runway'
  private apiKey: string = ''

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey
    }
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  async testAuth(apiKey: string): Promise<AuthResult> {
    try {
      await this.delay(1000)

      if (!apiKey || apiKey.length < 20) {
        return {
          success: false,
          error: 'API Key格式无效',
        }
      }

      return {
        success: true,
        quota: {
          remaining: 500,
          total: 5000,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '连接失败',
      }
    }
  }

  async textToImage(params: TextToImageParams): Promise<ImageResult> {
    await this.delay(2000)
    return {
      imageUrl: 'https://via.placeholder.com/512',
      seed: params.seed || Math.floor(Math.random() * 1000000),
    }
  }

  async imageToVideo(params: ImageToVideoParams): Promise<VideoResult> {
    await this.delay(1000)
    return {
      videoUrl: '',
      taskId: `runway_task_${Date.now()}`,
    }
  }

  async textToVideo(params: TextToVideoParams): Promise<VideoResult> {
    await this.delay(1000)
    return {
      videoUrl: '',
      taskId: `runway_task_${Date.now()}`,
    }
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    await this.delay(500)
    return {
      status: 'processing',
      progress: 50,
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
