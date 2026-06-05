<template>
  <div id="app" class="app-container">
    <div class="top-bar">
      <div class="top-bar-left">
        <span class="logo">🎬 AI Video Canvas</span>
        <input
          v-if="isEditingName"
          ref="nameInputRef"
          v-model="projectName"
          type="text"
          class="project-name-input"
          @blur="finishEditing"
          @keyup.enter="finishEditing"
          @keyup.escape="cancelEditing"
          maxlength="50"
        />
        <span
          v-else
          class="project-name"
          @click="startEditing"
          title="点击修改项目名称"
        >
          {{ projectName }}
          <svg class="edit-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </span>
      </div>
      <div class="top-bar-right">
        <div class="ai-status" title="点击查看AI服务配置" @click="navigateTo('/settings')">
          <span
            v-for="indicator in aiStatusIndicators"
            :key="indicator.key"
            :class="['status-indicator', getStatusClass(indicator.status)]"
            :title="indicator.name + ': ' + indicator.status"
          ></span>
        </div>
        <span class="user-section">用户</span>
      </div>
    </div>

    <div class="main-content">
      <router-view />
    </div>

    <div class="bottom-nav">
      <button
        v-for="nav in navItems"
        :key="nav.path"
        :class="['nav-item', { active: currentRoute === nav.path }]"
        @click="navigateTo(nav.path)"
      >
        <span class="nav-icon">{{ nav.icon }}</span>
        <span class="nav-label">{{ nav.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAIStore } from '@/stores/ai'

const router = useRouter()
const route = useRoute()
const aiStore = useAIStore()

const projectName = ref('未命名项目')
const isEditingName = ref(false)
const nameInputRef = ref<HTMLInputElement>()
const previousName = ref('')

// 监听项目名称变化事件
const handleProjectNameChange = (event: Event) => {
  const customEvent = event as CustomEvent
  projectName.value = customEvent.detail
}

onMounted(() => {
  window.addEventListener('project-name-change', handleProjectNameChange)
  // 检查全局变量
  if ((window as any).__projectName) {
    projectName.value = (window as any).__projectName
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('project-name-change', handleProjectNameChange)
})

const startEditing = async () => {
  previousName.value = projectName.value
  isEditingName.value = true
  await nextTick()
  nameInputRef.value?.focus()
  nameInputRef.value?.select()
}

const finishEditing = () => {
  if (!projectName.value.trim()) {
    projectName.value = previousName.value || '未命名项目'
  }
  isEditingName.value = false
}

const cancelEditing = () => {
  projectName.value = previousName.value
  isEditingName.value = false
}

const currentRoute = computed(() => route.path)

const aiStatusIndicators = computed(() => {
  return Object.entries(aiStore.providers).map(([key, config]) => ({
    key,
    name: config.name,
    status: config.status,
  }))
})

const navItems = [
  { path: '/home', icon: '🏠', label: '主页' },
  { path: '/nodes', icon: '🔷', label: '节点' },
  { path: '/director3d', icon: '🎭', label: '3D台' },
  { path: '/assets', icon: '📦', label: '资产' },
  { path: '/settings', icon: '⚙️', label: '设置' },
]

const navigateTo = (path: string) => {
  router.push(path)
}

const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    connected: 'green',
    disconnected: 'yellow',
    error: 'red',
    unconfigured: 'gray',
  }
  return classes[status] || 'gray'
}
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #020308;
  color: #ffffff;
  overflow: hidden;
}

.top-bar {
  height: 50px;
  background: rgba(2, 3, 8, 0.95);
  border-bottom: 1px solid #00D9FF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 10px rgba(0, 217, 255, 0.2);
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo {
  font-size: 18px;
  font-weight: 600;
  color: #00D9FF;
}

.project-name {
  font-size: 14px;
  color: #888;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.project-name:hover {
  color: #00D9FF;
  background: rgba(0, 217, 255, 0.1);
}

.project-name:hover .edit-icon {
  opacity: 1;
}

.edit-icon {
  opacity: 0;
  transition: opacity 0.2s;
}

.project-name-input {
  font-size: 14px;
  color: #ffffff;
  background: rgba(0, 217, 255, 0.1);
  border: 1px solid #00D9FF;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  min-width: 200px;
  font-family: inherit;
}

.project-name-input:focus {
  background: rgba(0, 217, 255, 0.15);
  box-shadow: 0 0 8px rgba(0, 217, 255, 0.4);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.ai-status {
  display: flex;
  gap: 8px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 6px;
  transition: background 0.3s;
}

.ai-status:hover {
  background: rgba(0, 217, 255, 0.1);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
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

.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.bottom-nav {
  height: 60px;
  background: rgba(2, 3, 8, 0.95);
  border-top: 1px solid #00D9FF;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 20px;
  box-shadow: 0 -2px 10px rgba(0, 217, 255, 0.2);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  color: #888;
  min-width: 80px;
}

.nav-item:hover {
  border-color: #00D9FF;
  color: #00D9FF;
  box-shadow: 0 0 15px rgba(0, 217, 255, 0.3);
}

.nav-item.active {
  background: rgba(0, 217, 255, 0.1);
  border-color: #00D9FF;
  color: #00D9FF;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
}

.nav-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.nav-label {
  font-size: 12px;
}
</style>
