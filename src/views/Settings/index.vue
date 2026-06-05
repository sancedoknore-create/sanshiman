<template>
  <div class="settings">
    <div class="settings-container">
      <div class="settings-header">
        <h2>AI服务配置</h2>
      </div>

      <div class="settings-content">
        <div
          v-for="(config, key) in aiStore.providers"
          :key="key"
          class="provider-card"
        >
          <div class="provider-header">
            <div class="provider-info">
              <span class="provider-name">{{ getProviderIcon(key as string) }} {{ config.name }}</span>
              <span class="status-indicator" :class="getStatusClass(config.status)"></span>
            </div>
            <span class="status-text">{{ getStatusText(config.status) }}</span>
          </div>

          <div class="provider-body">
            <div class="input-group">
              <label>API Key</label>
              <div class="input-row">
                <input
                  v-model="apiKeys[key as string]"
                  :type="showKeys[key as string] ? 'text' : 'password'"
                  :placeholder="config.apiKey ? 'sk-****...' : '未配置'"
                  class="api-key-input"
                />
                <button
                  class="btn-secondary"
                  @click="toggleKeyVisibility(key as string)"
                >
                  {{ showKeys[key as string] ? '隐藏' : '显示' }}
                </button>
              </div>
            </div>

            <div class="button-group">
              <button
                class="btn-primary"
                :disabled="!apiKeys[key as string] || testing[key as string]"
                @click="testConnection(key as string)"
              >
                {{ testing[key as string] ? '测试中...' : '测试连接' }}
              </button>
              <button
                v-if="apiKeys[key as string]"
                class="btn-secondary"
                @click="saveApiKey(key as string)"
              >
                保存
              </button>
            </div>

            <div v-if="config.error" class="error-message">
              ❌ {{ config.error }}
            </div>

            <div v-if="config.quota" class="quota-info">
              配额: {{ config.quota.remaining }} / {{ config.quota.total }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAIStore } from '@/stores/ai'
import type { ProviderStatus } from '@/stores/ai'

const aiStore = useAIStore()

const apiKeys = reactive<Record<string, string>>({
  volcano: '',
  runway: '',
})

const showKeys = reactive<Record<string, boolean>>({
  volcano: false,
  runway: false,
})

const testing = reactive<Record<string, boolean>>({
  volcano: false,
  runway: false,
})

const toggleKeyVisibility = (key: string) => {
  showKeys[key] = !showKeys[key]
}

const testConnection = async (key: string) => {
  if (!apiKeys[key]) return

  testing[key] = true
  try {
    await aiStore.testConnection(key, apiKeys[key])
  } finally {
    testing[key] = false
  }
}

const saveApiKey = (key: string) => {
  aiStore.setApiKey(key, apiKeys[key])
}

const getProviderIcon = (key: string): string => {
  const icons: Record<string, string> = {
    volcano: '🔥',
    runway: '🎬',
  }
  return icons[key] || '🤖'
}

const getStatusClass = (status: ProviderStatus): string => {
  const classes: Record<ProviderStatus, string> = {
    connected: 'green',
    disconnected: 'yellow',
    error: 'red',
    unconfigured: 'gray',
  }
  return classes[status] || 'gray'
}

const getStatusText = (status: ProviderStatus): string => {
  const texts: Record<ProviderStatus, string> = {
    connected: '已连接',
    disconnected: '未连接',
    error: '连接失败',
    unconfigured: '未配置',
  }
  return texts[status] || '未知'
}
</script>

<style scoped>
.settings {
  width: 100%;
  height: 100%;
  background: #020308;
  overflow-y: auto;
}

.settings-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.settings-header {
  margin-bottom: 30px;
}

.settings-header h2 {
  font-size: 28px;
  color: #00D9FF;
  font-weight: 300;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.provider-card {
  background: rgba(2, 3, 8, 0.6);
  border: 1px solid #00D9FF;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 217, 255, 0.2);
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(0, 217, 255, 0.3);
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-name {
  font-size: 18px;
  font-weight: 500;
  color: #ffffff;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
}

.status-indicator.green {
  background: #00ff88;
  color: #00ff88;
}

.status-indicator.yellow {
  background: #ffcc00;
  color: #ffcc00;
}

.status-indicator.red {
  background: #ff4444;
  color: #ff4444;
}

.status-indicator.gray {
  background: #666;
  color: #666;
}

.status-text {
  font-size: 14px;
  color: #888;
}

.provider-body {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  color: #00D9FF;
  font-size: 14px;
}

.input-row {
  display: flex;
  gap: 10px;
}

.api-key-input {
  flex: 1;
  padding: 10px 15px;
  background: rgba(0, 217, 255, 0.05);
  border: 1px solid #00D9FF;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  font-family: monospace;
}

.api-key-input:focus {
  outline: none;
  border-color: #B432FF;
  box-shadow: 0 0 10px rgba(180, 50, 255, 0.3);
}

.button-group {
  display: flex;
  gap: 10px;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.btn-primary {
  background: rgba(0, 217, 255, 0.2);
  border: 1px solid #00D9FF;
  color: #00D9FF;
}

.btn-primary:hover:not(:disabled) {
  background: rgba(0, 217, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 217, 255, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border: 1px solid #666;
  color: #888;
}

.btn-secondary:hover {
  border-color: #00D9FF;
  color: #00D9FF;
}

.error-message {
  padding: 10px;
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid #ff4444;
  border-radius: 6px;
  color: #ff4444;
  font-size: 13px;
}

.quota-info {
  padding: 10px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid #00ff88;
  border-radius: 6px;
  color: #00ff88;
  font-size: 13px;
}
</style>
