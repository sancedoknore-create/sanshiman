<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu-overlay"
      @click="$emit('close')"
      @contextmenu.prevent
    >
      <div
        ref="menuRef"
        class="context-menu"
        :style="menuStyle"
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
import { computed, ref, onMounted, nextTick, watch } from 'vue'

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

const props = withDefaults(defineProps<Props>(), {
  visible: true,
})

defineEmits<{
  select: [action: string]
  close: []
}>()

const menuRef = ref<HTMLElement>()

// 计算菜单位置，防止超出视口
const menuStyle = computed(() => {
  let left = props.x
  let top = props.y

  // 如果菜单已渲染，检查是否超出视口
  if (menuRef.value) {
    const menuWidth = menuRef.value.offsetWidth
    const menuHeight = menuRef.value.offsetHeight
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // 右侧超出，向左调整
    if (left + menuWidth > viewportWidth) {
      left = viewportWidth - menuWidth - 10
    }

    // 底部超出，向上调整
    if (top + menuHeight > viewportHeight) {
      top = viewportHeight - menuHeight - 10
    }

    // 确保不会超出左上角
    left = Math.max(10, left)
    top = Math.max(10, top)
  }

  return {
    left: left + 'px',
    top: top + 'px',
  }
})

// 当visible变化时，重新计算位置
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await nextTick()
    // 强制重新计算
    menuRef.value?.offsetHeight
  }
})
</script>

<style scoped>
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10000;
  background: transparent;
}

.context-menu {
  position: fixed;
  background: rgba(2, 3, 8, 0.98);
  border: 2px solid #00D9FF;
  border-radius: 8px;
  padding: 4px 0;
  min-width: 200px;
  box-shadow: 0 8px 32px rgba(0, 217, 255, 0.5);
  backdrop-filter: blur(10px);
  z-index: 10001;
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
