<template>
  <div class="style-selector" @click="toggleDropdown">
    <div class="style-display">
      <span class="style-icon">🎨</span>
      <span class="style-text">{{ selectedStyleLabel }}</span>
      <span class="chevron">▼</span>
    </div>

    <transition name="dropdown">
      <div v-if="showDropdown" class="style-dropdown" @click.stop>
        <div
          v-for="style in styles"
          :key="style.value"
          class="style-option"
          :class="{ selected: modelValue === style.value }"
          @click="selectStyle(style.value)"
        >
          <div class="style-label">{{ style.label }}</div>
          <div class="style-desc">{{ style.description }}</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Style {
  label: string
  value: string
  description: string
}

interface Props {
  modelValue: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'realistic'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showDropdown = ref(false)

const styles: Style[] = [
  { label: '写实', value: 'realistic', description: '照片级真实感' },
  { label: '动漫', value: 'anime', description: '日系动漫风格' },
  { label: '水彩', value: 'watercolor', description: '水彩画风格' },
  { label: '油画', value: 'oil-painting', description: '古典油画' },
  { label: '素描', value: 'sketch', description: '铅笔素描' },
  { label: '赛博朋克', value: 'cyberpunk', description: '未来科幻' },
  { label: '像素', value: 'pixel-art', description: '8bit像素风' },
  { label: '3D渲染', value: '3d-render', description: '三维渲染' },
]

const selectedStyleLabel = computed(() => {
  const style = styles.find(s => s.value === props.modelValue)
  return style ? style.label : '写实'
})

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const selectStyle = (value: string) => {
  emit('update:modelValue', value)
  showDropdown.value = false
}

// 点击外部关闭
const handleClickOutside = (event: MouseEvent) => {
  if (showDropdown.value) {
    showDropdown.value = false
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', handleClickOutside)
}
</script>

<style scoped>
.style-selector {
  position: relative;
  cursor: pointer;
}

.style-display {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s;
  min-width: 120px;
}

.style-display:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(0, 217, 255, 0.5);
}

.style-icon {
  font-size: 16px;
}

.style-text {
  font-size: 13px;
  color: #ffffff;
  flex: 1;
  white-space: nowrap;
}

.chevron {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  transition: transform 0.3s;
}

.style-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: rgba(2, 3, 8, 0.98);
  border: 1px solid #00D9FF;
  border-radius: 8px;
  padding: 4px 0;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 217, 255, 0.3);
  backdrop-filter: blur(10px);
  max-height: 300px;
  overflow-y: auto;
}

.style-option {
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.style-option:hover {
  background: rgba(0, 217, 255, 0.15);
}

.style-option.selected {
  background: rgba(0, 217, 255, 0.2);
}

.style-label {
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
}

.style-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
