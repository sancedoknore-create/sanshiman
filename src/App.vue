<template>
  <div id="app" class="app-container">
    <div class="top-bar">
      <div class="top-bar-left">
        <span class="logo">🎬 AI Video Canvas</span>
        <span class="project-name">{{ projectName }}</span>
      </div>
      <div class="top-bar-right">
        <div class="ai-status">
          <span class="status-indicator green"></span>
          <span class="status-indicator green"></span>
          <span class="status-indicator red"></span>
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
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const projectName = ref('未命名项目')
const currentRoute = computed(() => route.path)

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
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.ai-status {
  display: flex;
  gap: 8px;
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
