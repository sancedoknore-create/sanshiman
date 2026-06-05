<template>
  <div class="home-page">
    <div class="background-layer">
      <!-- 背景视频/图片会放在这里 -->
    </div>
    <div class="dashboard-container">
      <h1 class="welcome-title">欢迎使用 AI Video Canvas</h1>
      <div class="quick-actions">
        <button class="action-btn primary">新建项目</button>
        <button class="action-btn">打开项目</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 主页逻辑将在后续实现
</script>

<style scoped>
.home-page {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #0a1628 0%, #020308 100%);
}

.dashboard-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 30px;
}

.welcome-title {
  font-size: 48px;
  font-weight: 300;
  color: #00D9FF;
  text-shadow: 0 0 20px rgba(0, 217, 255, 0.5);
}

.quick-actions {
  display: flex;
  gap: 20px;
}

.action-btn {
  padding: 15px 40px;
  font-size: 16px;
  border: 1px solid #00D9FF;
  background: transparent;
  color: #00D9FF;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: rgba(0, 217, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
}

.action-btn.primary {
  background: rgba(0, 217, 255, 0.2);
}
</style>
