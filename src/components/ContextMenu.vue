<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu-overlay"
      @click="$emit('close')"
      @contextmenu.prevent
    >
      <div
        class="context-menu"
        :style="{ left: x + 'px', top: y + 'px' }"
        @click.stop
      >
        <div
          v-for="item in items"
          :key="item.action"
          class="menu-item"
          @click="$emit('select', item.action)"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span class="menu-label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface MenuItem {
  label: string
  icon: string
  action: string
}

interface Props {
  x: number
  y: number
  items: MenuItem[]
  visible?: boolean
}

withDefaults(defineProps<Props>(), {
  visible: true,
})

defineEmits<{
  select: [action: string]
  close: []
}>()
</script>

<style scoped>
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: transparent;
}

.context-menu {
  position: fixed;
  background: rgba(2, 3, 8, 0.95);
  border: 1px solid #00D9FF;
  border-radius: 8px;
  padding: 4px 0;
  min-width: 200px;
  box-shadow: 0 4px 20px rgba(0, 217, 255, 0.3);
  backdrop-filter: blur(10px);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  color: #ffffff;
  transition: all 0.2s;
  gap: 12px;
}

.menu-item:hover {
  background: rgba(0, 217, 255, 0.2);
  color: #00D9FF;
}

.menu-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.menu-label {
  font-size: 14px;
  flex: 1;
}
</style>
