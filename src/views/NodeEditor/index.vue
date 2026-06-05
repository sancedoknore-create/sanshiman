<template>
  <div class="node-editor">
    <div class="canvas-container">
      <p class="placeholder-text">节点编辑器 - 无限画布即将实现</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// 节点编辑器逻辑将在后续实现
</script>

<style scoped>
.node-editor {
  width: 100%;
  height: 100%;
  background: #020308;
  position: relative;
}

.canvas-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  color: #00D9FF;
  font-size: 24px;
  text-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
}
</style>
