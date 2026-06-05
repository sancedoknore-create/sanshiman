<template>
  <svg>
    <defs>
      <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#00D9FF;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#B432FF;stop-opacity:1" />
      </linearGradient>
    </defs>
    <path
      :id="`edge-path-${id}`"
      :d="path"
      :style="edgeStyle"
      class="vue-flow__edge-path animated-edge"
      :marker-end="markerEnd"
    />

    <!-- 流动粒子 -->
    <circle
      v-for="i in 3"
      :key="i"
      r="3"
      :fill="particleColor"
      class="edge-particle"
    >
      <animateMotion
        :path="path"
        :dur="`${2 + i * 0.3}s`"
        repeatCount="indefinite"
        :begin="`${i * 0.3}s`"
      />
    </circle>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Position, getBezierPath } from '@vue-flow/core'

interface Props {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  markerEnd?: string
}

const props = defineProps<Props>()

const path = computed(() => {
  const [pathString] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })
  return pathString
})

const edgeStyle = computed(() => ({
  stroke: 'url(#edge-gradient)',
  strokeWidth: 3,
  fill: 'none',
  filter: 'drop-shadow(0 0 4px #00D9FF)',
}))

const particleColor = computed(() => '#00D9FF')
</script>

<style scoped>
.animated-edge {
  animation: edge-glow 2s ease-in-out infinite;
}

@keyframes edge-glow {
  0%, 100% {
    filter: drop-shadow(0 0 4px #00D9FF);
  }
  50% {
    filter: drop-shadow(0 0 8px #B432FF);
  }
}

.edge-particle {
  filter: drop-shadow(0 0 4px currentColor);
}
</style>
