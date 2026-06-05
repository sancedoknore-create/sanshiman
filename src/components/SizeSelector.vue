<template>
  <div class="size-selector" ref="selectorRef" @click.stop="toggleDropdown">
    <div class="size-display">
      <span class="size-icon">📐</span>
      <span class="size-text">{{ selectedSizeLabel }}</span>
      <span class="chevron">▼</span>
    </div>

    <transition name="dropdown">
      <div v-if="showDropdown" class="size-dropdown" @click.stop>
        <div
          v-for="size in sizes"
          :key="size.value"
          class="size-option"
          :class="{ selected: modelValue === size.value }"
          @click.stop="selectSize(size.value)"
        >
          <div class="size-label">{{ size.label }}</div>
          <div class="size-resolution">{{ size.resolution }}</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

interface Size {
  label: string
  value: string
  resolution: string
}

interface Props {
  modelValue: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '1024x1024'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showDropdown = ref(false)
const selectorRef = ref<HTMLElement>()

const sizes: Size[] = [
  { label: '正方形', value: '1024x1024', resolution: '1024×1024' },
  { label: '横版', value: '1920x1080', resolution: '1920×1080' },
  { label: '竖版', value: '1080x1920', resolution: '1080×1920' },
  { label: '超宽屏', value: '2560x1440', resolution: '2560×1440' },
  { label: '小尺寸', value: '512x512', resolution: '512×512' },
]

const selectedSizeLabel = computed(() => {
  const size = sizes.find(s => s.value === props.modelValue)
  return size ? `${size.label} ${size.resolution}` : '1024×1024'
})

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const selectSize = (value: string) => {
  emit('update:modelValue', value)
  showDropdown.value = false
}

// 点击外部关闭
const handleClickOutside = (event: MouseEvent) => {
  if (selectorRef.value && !selectorRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.size-selector {
  position: relative;
  cursor: pointer;
}

.size-display {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s;
  min-width: 160px;
}

.size-display:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(0, 217, 255, 0.5);
}

.size-icon {
  font-size: 16px;
}

.size-text {
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

.size-dropdown {
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
}

.size-option {
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.size-option:hover {
  background: rgba(0, 217, 255, 0.15);
}

.size-option.selected {
  background: rgba(0, 217, 255, 0.2);
}

.size-label {
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
}

.size-resolution {
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
