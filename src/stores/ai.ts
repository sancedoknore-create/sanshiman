import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIProvider } from '@/services/ai-provider'
import { VolcanoProvider } from '@/services/providers/volcano'
import { RunwayProvider } from '@/services/providers/runway'

export type ProviderStatus = 'connected' | 'disconnected' | 'error' | 'unconfigured'

interface ProviderConfig {
  name: string
  provider: AIProvider
  apiKey: string
  status: ProviderStatus
  error?: string
  quota?: {
    remaining: number
    total: number
  }
}

export const useAIStore = defineStore('ai', () => {
  const providers = ref<Record<string, ProviderConfig>>({
    volcano: {
      name: '火山引擎',
      provider: new VolcanoProvider(),
      apiKey: '',
      status: 'unconfigured',
    },
    runway: {
      name: 'Runway',
      provider: new RunwayProvider(),
      apiKey: '',
      status: 'unconfigured',
    },
  })

  const configuredProviders = computed(() => {
    return Object.entries(providers.value)
      .filter(([_, config]) => config.status !== 'unconfigured')
      .map(([key, config]) => ({ key, ...config }))
  })

  const connectedProviders = computed(() => {
    return Object.entries(providers.value)
      .filter(([_, config]) => config.status === 'connected')
      .map(([key, config]) => ({ key, ...config }))
  })

  async function testConnection(providerKey: string, apiKey: string) {
    const config = providers.value[providerKey]
    if (!config) return

    try {
      const result = await config.provider.testAuth(apiKey)

      if (result.success) {
        config.status = 'connected'
        config.apiKey = apiKey
        config.quota = result.quota
        config.error = undefined
      } else {
        config.status = 'error'
        config.error = result.error || '连接失败'
      }
    } catch (error) {
      config.status = 'error'
      config.error = error instanceof Error ? error.message : '未知错误'
    }
  }

  function setApiKey(providerKey: string, apiKey: string) {
    const config = providers.value[providerKey]
    if (!config) return

    config.apiKey = apiKey
    if (apiKey) {
      config.status = 'disconnected'
    } else {
      config.status = 'unconfigured'
    }
  }

  function getProvider(providerKey: string): AIProvider | null {
    return providers.value[providerKey]?.provider || null
  }

  return {
    providers,
    configuredProviders,
    connectedProviders,
    testConnection,
    setApiKey,
    getProvider,
  }
})
