<template>
  <div class="director3d">
    <!-- 顶部工具栏 -->
    <div class="director-toolbar">
      <div class="toolbar-left">
        <h2 class="director-title">
          <span class="title-icon">🎭</span>
          3D导演台
        </h2>
        <div class="scene-tabs">
          <button
            v-for="tab in sceneTabs"
            :key="tab.value"
            class="scene-tab"
            :class="{ active: currentScene === tab.value }"
            @click="currentScene = tab.value"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
          </button>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="tool-btn" @click="resetView" title="重置视角">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M3 21v-5h5"></path>
          </svg>
        </button>
        <button class="tool-btn" @click="toggleGrid" title="网格">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </button>
        <button class="tool-btn primary" @click="exportScene">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          导出
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="director-body">
      <!-- 左侧：场景对象列表 -->
      <div class="left-panel">
        <div class="panel-header">
          <span>场景对象</span>
          <button class="add-btn" @click="addObject" title="添加对象">+</button>
        </div>
        <div class="object-list">
          <div
            v-for="obj in sceneObjects"
            :key="obj.id"
            class="object-item"
            :class="{ active: selectedObjectId === obj.id }"
            @click="selectObject(obj.id)"
          >
            <span class="object-icon">{{ obj.icon }}</span>
            <span class="object-name">{{ obj.name }}</span>
            <button class="object-toggle" @click.stop="toggleVisibility(obj.id)">
              <svg v-if="obj.visible" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 中央：3D视口 -->
      <div class="viewport-container">
        <div ref="viewportRef" class="viewport-canvas"></div>
        <!-- 视角信息 -->
        <div class="viewport-overlay">
          <div class="overlay-info">
            <span class="info-label">视角</span>
            <span class="info-value">{{ cameraInfo }}</span>
          </div>
        </div>

        <!-- 视图轴指示器 -->
        <div class="axes-indicator">
          <div class="axis x-axis">X</div>
          <div class="axis y-axis">Y</div>
          <div class="axis z-axis">Z</div>
        </div>
      </div>

      <!-- 右侧：属性面板 -->
      <div class="right-panel">
        <!-- 标签页 -->
        <div class="panel-tabs">
          <button
            v-for="tab in propertyTabs"
            :key="tab.value"
            class="panel-tab"
            :class="{ active: activePropertyTab === tab.value }"
            @click="activePropertyTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- 镜头属性 -->
        <div v-if="activePropertyTab === 'camera'" class="panel-content">
          <div class="property-group">
            <div class="group-title">位置</div>
            <div class="property-row">
              <label>X</label>
              <input v-model.number="camera.position.x" type="number" step="0.1" class="property-input" />
            </div>
            <div class="property-row">
              <label>Y</label>
              <input v-model.number="camera.position.y" type="number" step="0.1" class="property-input" />
            </div>
            <div class="property-row">
              <label>Z</label>
              <input v-model.number="camera.position.z" type="number" step="0.1" class="property-input" />
            </div>
          </div>

          <div class="property-group">
            <div class="group-title">焦点</div>
            <div class="property-row">
              <label>X</label>
              <input v-model.number="camera.target.x" type="number" step="0.1" class="property-input" />
            </div>
            <div class="property-row">
              <label>Y</label>
              <input v-model.number="camera.target.y" type="number" step="0.1" class="property-input" />
            </div>
            <div class="property-row">
              <label>Z</label>
              <input v-model.number="camera.target.z" type="number" step="0.1" class="property-input" />
            </div>
          </div>

          <div class="property-group">
            <div class="group-title">镜头参数</div>
            <div class="property-row">
              <label>视野 FOV</label>
              <input v-model.number="camera.fov" type="range" min="10" max="120" class="property-slider" />
              <span class="property-value">{{ camera.fov }}°</span>
            </div>
            <div class="property-row">
              <label>近裁切</label>
              <input v-model.number="camera.near" type="number" step="0.1" min="0.1" class="property-input" />
            </div>
            <div class="property-row">
              <label>远裁切</label>
              <input v-model.number="camera.far" type="number" step="10" min="10" class="property-input" />
            </div>
          </div>

          <div class="property-group">
            <div class="group-title">预设视角</div>
            <div class="preset-grid">
              <button
                v-for="preset in cameraPresets"
                :key="preset.name"
                class="preset-btn"
                @click="applyCameraPreset(preset)"
              >
                {{ preset.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- 光照属性 -->
        <div v-if="activePropertyTab === 'lighting'" class="panel-content">
          <div class="property-group">
            <div class="group-title">环境光</div>
            <div class="property-row">
              <label>强度</label>
              <input v-model.number="lighting.ambient.intensity" type="range" min="0" max="2" step="0.05" class="property-slider" />
              <span class="property-value">{{ lighting.ambient.intensity.toFixed(2) }}</span>
            </div>
            <div class="property-row">
              <label>颜色</label>
              <input v-model="lighting.ambient.color" type="color" class="property-color" />
              <span class="property-value">{{ lighting.ambient.color }}</span>
            </div>
          </div>

          <div class="property-group">
            <div class="group-title">主光源（平行光）</div>
            <div class="property-row">
              <label>强度</label>
              <input v-model.number="lighting.directional.intensity" type="range" min="0" max="3" step="0.05" class="property-slider" />
              <span class="property-value">{{ lighting.directional.intensity.toFixed(2) }}</span>
            </div>
            <div class="property-row">
              <label>颜色</label>
              <input v-model="lighting.directional.color" type="color" class="property-color" />
              <span class="property-value">{{ lighting.directional.color }}</span>
            </div>
            <div class="property-row">
              <label>X</label>
              <input v-model.number="lighting.directional.position.x" type="number" step="0.5" class="property-input" />
            </div>
            <div class="property-row">
              <label>Y</label>
              <input v-model.number="lighting.directional.position.y" type="number" step="0.5" class="property-input" />
            </div>
            <div class="property-row">
              <label>Z</label>
              <input v-model.number="lighting.directional.position.z" type="number" step="0.5" class="property-input" />
            </div>
          </div>

          <div class="property-group">
            <div class="group-title">点光源</div>
            <div class="property-row">
              <label>启用</label>
              <input v-model="lighting.point.enabled" type="checkbox" class="property-checkbox" />
            </div>
            <template v-if="lighting.point.enabled">
              <div class="property-row">
                <label>强度</label>
                <input v-model.number="lighting.point.intensity" type="range" min="0" max="5" step="0.1" class="property-slider" />
                <span class="property-value">{{ lighting.point.intensity.toFixed(1) }}</span>
              </div>
              <div class="property-row">
                <label>颜色</label>
                <input v-model="lighting.point.color" type="color" class="property-color" />
                <span class="property-value">{{ lighting.point.color }}</span>
              </div>
              <div class="property-row">
                <label>距离</label>
                <input v-model.number="lighting.point.distance" type="number" step="1" min="0" class="property-input" />
              </div>
            </template>
          </div>

          <div class="property-group">
            <div class="group-title">光照预设</div>
            <div class="preset-grid">
              <button
                v-for="preset in lightingPresets"
                :key="preset.name"
                class="preset-btn"
                @click="applyLightingPreset(preset)"
              >
                {{ preset.icon }} {{ preset.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- 场景属性 -->
        <div v-if="activePropertyTab === 'scene'" class="panel-content">
          <div class="property-group">
            <div class="group-title">背景</div>
            <div class="property-row">
              <label>颜色</label>
              <input v-model="scene.background" type="color" class="property-color" />
              <span class="property-value">{{ scene.background }}</span>
            </div>
            <div class="property-row">
              <label>显示网格</label>
              <input v-model="scene.showGrid" type="checkbox" class="property-checkbox" />
            </div>
            <div class="property-row">
              <label>显示坐标轴</label>
              <input v-model="scene.showAxes" type="checkbox" class="property-checkbox" />
            </div>
          </div>

          <div class="property-group">
            <div class="group-title">雾效</div>
            <div class="property-row">
              <label>启用</label>
              <input v-model="scene.fog.enabled" type="checkbox" class="property-checkbox" />
            </div>
            <template v-if="scene.fog.enabled">
              <div class="property-row">
                <label>颜色</label>
                <input v-model="scene.fog.color" type="color" class="property-color" />
              </div>
              <div class="property-row">
                <label>密度</label>
                <input v-model.number="scene.fog.density" type="range" min="0" max="0.1" step="0.001" class="property-slider" />
                <span class="property-value">{{ scene.fog.density.toFixed(3) }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const viewportRef = ref<HTMLDivElement>()

// 场景标签
const sceneTabs = [
  { label: '空场景', value: 'empty', icon: '⬜' },
  { label: '室内', value: 'indoor', icon: '🏠' },
  { label: '户外', value: 'outdoor', icon: '🌳' },
  { label: '工作室', value: 'studio', icon: '🎬' },
]
const currentScene = ref('empty')

// 属性面板标签
const propertyTabs = [
  { label: '镜头', value: 'camera' },
  { label: '光照', value: 'lighting' },
  { label: '场景', value: 'scene' },
]
const activePropertyTab = ref('camera')

// 场景对象
const sceneObjects = ref([
  { id: 'man', name: '男人', icon: '👨', visible: true, type: 'character' },
  { id: 'woman', name: '女人', icon: '👩', visible: true, type: 'character' },
  { id: 'child', name: '小孩', icon: '🧒', visible: true, type: 'character' },
  { id: 'elder', name: '老人', icon: '🧓', visible: true, type: 'character' },
  { id: 'plane1', name: '地面', icon: '🟫', visible: true, type: 'plane' },
])
const selectedObjectId = ref<string | null>(null)

// 镜头配置
const camera = reactive({
  position: { x: 5, y: 5, z: 5 },
  target: { x: 0, y: 0, z: 0 },
  fov: 50,
  near: 0.1,
  far: 1000,
})

// 镜头预设
const cameraPresets = [
  { name: '正面', position: { x: 0, y: 0, z: 8 }, target: { x: 0, y: 0, z: 0 } },
  { name: '俯视', position: { x: 0, y: 8, z: 0 }, target: { x: 0, y: 0, z: 0 } },
  { name: '侧面', position: { x: 8, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
  { name: '透视', position: { x: 5, y: 5, z: 5 }, target: { x: 0, y: 0, z: 0 } },
]

// 光照配置
const lighting = reactive({
  ambient: {
    intensity: 0.5,
    color: '#ffffff',
  },
  directional: {
    intensity: 1.0,
    color: '#ffffff',
    position: { x: 5, y: 10, z: 5 },
  },
  point: {
    enabled: false,
    intensity: 1.0,
    color: '#ffffff',
    distance: 10,
  },
})

// 光照预设
const lightingPresets = [
  { name: '日光', icon: '☀️', ambient: 0.6, dirIntensity: 1.2, dirColor: '#fff5e6' },
  { name: '黄昏', icon: '🌅', ambient: 0.3, dirIntensity: 1.5, dirColor: '#ff8c42' },
  { name: '夜晚', icon: '🌙', ambient: 0.1, dirIntensity: 0.4, dirColor: '#4d7eb8' },
  { name: '工作室', icon: '💡', ambient: 0.8, dirIntensity: 0.8, dirColor: '#ffffff' },
]

// 场景配置
const scene = reactive({
  background: '#1a1a2e',
  showGrid: true,
  showAxes: true,
  fog: {
    enabled: false,
    color: '#1a1a2e',
    density: 0.02,
  },
})

// Three.js 实例
let threeScene: THREE.Scene
let threeCamera: THREE.PerspectiveCamera
let threeRenderer: THREE.WebGLRenderer
let threeControls: OrbitControls
let threeObjects: Map<string, THREE.Object3D> = new Map()
let ambientLight: THREE.AmbientLight
let directionalLight: THREE.DirectionalLight
let pointLight: THREE.PointLight | null = null
let gridHelper: THREE.GridHelper
let axesHelper: THREE.AxesHelper
let animationFrameId: number

// 镜头信息显示
const cameraInfo = computed(() => {
  return `(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`
})

// 初始化Three.js场景
const initThreeScene = () => {
  if (!viewportRef.value) return

  const width = viewportRef.value.clientWidth
  const height = viewportRef.value.clientHeight

  // 创建场景
  threeScene = new THREE.Scene()
  threeScene.background = new THREE.Color(scene.background)

  // 创建相机
  threeCamera = new THREE.PerspectiveCamera(camera.fov, width / height, camera.near, camera.far)
  threeCamera.position.set(camera.position.x, camera.position.y, camera.position.z)
  threeCamera.lookAt(camera.target.x, camera.target.y, camera.target.z)

  // 创建渲染器
  threeRenderer = new THREE.WebGLRenderer({ antialias: true })
  threeRenderer.setSize(width, height)
  threeRenderer.setPixelRatio(window.devicePixelRatio)
  threeRenderer.shadowMap.enabled = true
  threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap
  viewportRef.value.appendChild(threeRenderer.domElement)

  // 添加轨道控制器
  threeControls = new OrbitControls(threeCamera, threeRenderer.domElement)
  threeControls.enableDamping = true
  threeControls.dampingFactor = 0.05
  threeControls.target.set(camera.target.x, camera.target.y, camera.target.z)

  // 监听控制器变化更新camera数据
  threeControls.addEventListener('change', () => {
    camera.position.x = Number(threeCamera.position.x.toFixed(2))
    camera.position.y = Number(threeCamera.position.y.toFixed(2))
    camera.position.z = Number(threeCamera.position.z.toFixed(2))
    camera.target.x = Number(threeControls.target.x.toFixed(2))
    camera.target.y = Number(threeControls.target.y.toFixed(2))
    camera.target.z = Number(threeControls.target.z.toFixed(2))
  })

  // 添加光照
  ambientLight = new THREE.AmbientLight(lighting.ambient.color, lighting.ambient.intensity)
  threeScene.add(ambientLight)

  directionalLight = new THREE.DirectionalLight(lighting.directional.color, lighting.directional.intensity)
  directionalLight.position.set(
    lighting.directional.position.x,
    lighting.directional.position.y,
    lighting.directional.position.z
  )
  directionalLight.castShadow = true
  threeScene.add(directionalLight)

  // 添加网格和坐标轴
  gridHelper = new THREE.GridHelper(20, 20, 0x00d9ff, 0x444444)
  threeScene.add(gridHelper)

  axesHelper = new THREE.AxesHelper(5)
  threeScene.add(axesHelper)

  // 添加默认对象
  addDefaultObjects()

  // 渲染循环
  animate()

  // 监听窗口大小变化
  window.addEventListener('resize', onWindowResize)
}

// 创建人物模型（用基础几何体组合）
const createCharacter = (config: {
  position: [number, number, number]
  bodyColor: number
  headColor: number
  pantsColor: number
  height: number // 总身高
  bodyWidth: number // 身体宽度
  isChild?: boolean
  isElder?: boolean
}) => {
  const group = new THREE.Group()
  const { bodyColor, headColor, pantsColor, height, bodyWidth, isChild, isElder } = config

  // 计算各部位尺寸（按身高比例）
  const headSize = isChild ? height * 0.18 : height * 0.13
  const torsoHeight = height * 0.35
  const legHeight = height * 0.42
  const armHeight = height * 0.35

  // === 头部 ===
  const headGeo = new THREE.SphereGeometry(headSize, 24, 24)
  const headMat = new THREE.MeshStandardMaterial({
    color: headColor,
    roughness: 0.7,
    metalness: 0.05,
  })
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.y = legHeight + torsoHeight + headSize * 0.9
  head.castShadow = true
  head.receiveShadow = true
  group.add(head)

  // === 头发（老人是白色，其他人深色或棕色） ===
  if (!isElder) {
    const hairGeo = new THREE.SphereGeometry(headSize * 1.05, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55)
    const hairMat = new THREE.MeshStandardMaterial({
      color: isChild ? 0x4a3528 : 0x2a1810,
      roughness: 0.9,
    })
    const hair = new THREE.Mesh(hairGeo, hairMat)
    hair.position.y = head.position.y + headSize * 0.1
    hair.castShadow = true
    group.add(hair)
  } else {
    // 老人头发（白色，稀疏）
    const hairGeo = new THREE.SphereGeometry(headSize * 1.02, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.4)
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.95,
    })
    const hair = new THREE.Mesh(hairGeo, hairMat)
    hair.position.y = head.position.y + headSize * 0.15
    hair.castShadow = true
    group.add(hair)
  }

  // === 身体（驱干） ===
  const torsoGeo = new THREE.CylinderGeometry(bodyWidth * 0.5, bodyWidth * 0.55, torsoHeight, 16)
  const torsoMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.6,
    metalness: 0.1,
  })
  const torso = new THREE.Mesh(torsoGeo, torsoMat)
  torso.position.y = legHeight + torsoHeight / 2
  torso.castShadow = true
  torso.receiveShadow = true
  group.add(torso)

  // === 脖子 ===
  const neckGeo = new THREE.CylinderGeometry(headSize * 0.4, headSize * 0.5, headSize * 0.4, 12)
  const neck = new THREE.Mesh(neckGeo, headMat)
  neck.position.y = legHeight + torsoHeight + headSize * 0.2
  neck.castShadow = true
  group.add(neck)

  // === 双臂 ===
  const armGeo = new THREE.CylinderGeometry(bodyWidth * 0.13, bodyWidth * 0.15, armHeight, 12)
  const armMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.6,
  })

  const leftArm = new THREE.Mesh(armGeo, armMat)
  leftArm.position.set(-bodyWidth * 0.65, legHeight + torsoHeight - armHeight / 2 + headSize * 0.1, 0)
  leftArm.castShadow = true
  group.add(leftArm)

  const rightArm = new THREE.Mesh(armGeo, armMat)
  rightArm.position.set(bodyWidth * 0.65, legHeight + torsoHeight - armHeight / 2 + headSize * 0.1, 0)
  rightArm.castShadow = true
  group.add(rightArm)

  // === 手 ===
  const handGeo = new THREE.SphereGeometry(bodyWidth * 0.16, 12, 12)
  const leftHand = new THREE.Mesh(handGeo, headMat)
  leftHand.position.set(-bodyWidth * 0.65, legHeight + torsoHeight - armHeight + headSize * 0.05, 0)
  leftHand.castShadow = true
  group.add(leftHand)

  const rightHand = new THREE.Mesh(handGeo, headMat)
  rightHand.position.set(bodyWidth * 0.65, legHeight + torsoHeight - armHeight + headSize * 0.05, 0)
  rightHand.castShadow = true
  group.add(rightHand)

  // === 双腿 ===
  const legGeo = new THREE.CylinderGeometry(bodyWidth * 0.18, bodyWidth * 0.16, legHeight, 12)
  const legMat = new THREE.MeshStandardMaterial({
    color: pantsColor,
    roughness: 0.7,
  })

  const leftLeg = new THREE.Mesh(legGeo, legMat)
  leftLeg.position.set(-bodyWidth * 0.22, legHeight / 2, 0)
  leftLeg.castShadow = true
  group.add(leftLeg)

  const rightLeg = new THREE.Mesh(legGeo, legMat)
  rightLeg.position.set(bodyWidth * 0.22, legHeight / 2, 0)
  rightLeg.castShadow = true
  group.add(rightLeg)

  // === 鞋 ===
  const shoeGeo = new THREE.BoxGeometry(bodyWidth * 0.35, bodyWidth * 0.18, bodyWidth * 0.55)
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.5,
  })

  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat)
  leftShoe.position.set(-bodyWidth * 0.22, bodyWidth * 0.09, bodyWidth * 0.1)
  leftShoe.castShadow = true
  group.add(leftShoe)

  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat)
  rightShoe.position.set(bodyWidth * 0.22, bodyWidth * 0.09, bodyWidth * 0.1)
  rightShoe.castShadow = true
  group.add(rightShoe)

  // 设置位置
  group.position.set(...config.position)
  return group
}

// 添加默认对象
const addDefaultObjects = () => {
  // === 男人 ===
  const man = createCharacter({
    position: [-3, 0, 0],
    bodyColor: 0x3a6fb5, // 蓝色衬衫
    headColor: 0xfdbcb4, // 肤色
    pantsColor: 0x2a2a3e, // 深色裤子
    height: 1.85,
    bodyWidth: 0.55,
  })
  threeScene.add(man)
  threeObjects.set('man', man)

  // === 女人 ===
  const woman = createCharacter({
    position: [-1, 0, 0],
    bodyColor: 0xd14b8c, // 粉红色上衣
    headColor: 0xfdcfc0, // 肤色
    pantsColor: 0x4a3a5a, // 深紫色裙子/裤子
    height: 1.7,
    bodyWidth: 0.48,
  })
  threeScene.add(woman)
  threeObjects.set('woman', woman)

  // === 小孩 ===
  const child = createCharacter({
    position: [1, 0, 0],
    bodyColor: 0xffd966, // 黄色T恤
    headColor: 0xfdcfc0, // 肤色
    pantsColor: 0x4287f5, // 蓝色短裤
    height: 1.0,
    bodyWidth: 0.38,
    isChild: true,
  })
  threeScene.add(child)
  threeObjects.set('child', child)

  // === 老人 ===
  const elder = createCharacter({
    position: [3, 0, 0],
    bodyColor: 0x8a6f4f, // 米色毛衣
    headColor: 0xe8b89e, // 肤色
    pantsColor: 0x5a5a4a, // 灰褐色裤子
    height: 1.65,
    bodyWidth: 0.5,
    isElder: true,
  })
  threeScene.add(elder)
  threeObjects.set('elder', elder)

  // === 地面 ===
  const planeGeometry = new THREE.PlaneGeometry(30, 30)
  const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0x222244,
    side: THREE.DoubleSide,
    roughness: 0.9,
  })
  const plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.rotation.x = -Math.PI / 2
  plane.receiveShadow = true
  threeScene.add(plane)
  threeObjects.set('plane1', plane)
}

// 渲染循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  threeControls.update()
  threeRenderer.render(threeScene, threeCamera)
}

// 窗口大小变化
const onWindowResize = () => {
  if (!viewportRef.value || !threeCamera || !threeRenderer) return
  const width = viewportRef.value.clientWidth
  const height = viewportRef.value.clientHeight
  threeCamera.aspect = width / height
  threeCamera.updateProjectionMatrix()
  threeRenderer.setSize(width, height)
}

// 监听镜头FOV变化
watch(() => camera.fov, (newFov) => {
  if (threeCamera) {
    threeCamera.fov = newFov
    threeCamera.updateProjectionMatrix()
  }
})

// 监听镜头位置变化（仅手动输入时）
watch(() => [camera.position.x, camera.position.y, camera.position.z], ([x, y, z]) => {
  if (threeCamera) {
    threeCamera.position.set(x, y, z)
  }
})

// 监听焦点变化
watch(() => [camera.target.x, camera.target.y, camera.target.z], ([x, y, z]) => {
  if (threeControls) {
    threeControls.target.set(x, y, z)
  }
})

// 监听光照变化
watch(() => lighting.ambient.intensity, (val) => {
  if (ambientLight) ambientLight.intensity = val
})
watch(() => lighting.ambient.color, (val) => {
  if (ambientLight) ambientLight.color.set(val)
})
watch(() => lighting.directional.intensity, (val) => {
  if (directionalLight) directionalLight.intensity = val
})
watch(() => lighting.directional.color, (val) => {
  if (directionalLight) directionalLight.color.set(val)
})
watch(() => [lighting.directional.position.x, lighting.directional.position.y, lighting.directional.position.z], ([x, y, z]) => {
  if (directionalLight) directionalLight.position.set(x, y, z)
})

// 监听点光源
watch(() => lighting.point.enabled, (enabled) => {
  if (enabled && !pointLight) {
    pointLight = new THREE.PointLight(lighting.point.color, lighting.point.intensity, lighting.point.distance)
    pointLight.position.set(0, 3, 0)
    threeScene.add(pointLight)
  } else if (!enabled && pointLight) {
    threeScene.remove(pointLight)
    pointLight = null
  }
})
watch(() => lighting.point.intensity, (val) => {
  if (pointLight) pointLight.intensity = val
})
watch(() => lighting.point.color, (val) => {
  if (pointLight) pointLight.color.set(val)
})
watch(() => lighting.point.distance, (val) => {
  if (pointLight) pointLight.distance = val
})

// 监听场景变化
watch(() => scene.background, (val) => {
  if (threeScene) threeScene.background = new THREE.Color(val)
})
watch(() => scene.showGrid, (val) => {
  if (gridHelper) gridHelper.visible = val
})
watch(() => scene.showAxes, (val) => {
  if (axesHelper) axesHelper.visible = val
})
watch(() => scene.fog.enabled, (val) => {
  if (threeScene) {
    threeScene.fog = val ? new THREE.FogExp2(scene.fog.color, scene.fog.density) : null
  }
})
watch(() => [scene.fog.color, scene.fog.density], () => {
  if (threeScene && scene.fog.enabled) {
    threeScene.fog = new THREE.FogExp2(scene.fog.color, scene.fog.density)
  }
})

// 重置视角
const resetView = () => {
  applyCameraPreset(cameraPresets[3]) // 透视
}

// 切换网格
const toggleGrid = () => {
  scene.showGrid = !scene.showGrid
}

// 应用镜头预设
const applyCameraPreset = (preset: any) => {
  camera.position.x = preset.position.x
  camera.position.y = preset.position.y
  camera.position.z = preset.position.z
  camera.target.x = preset.target.x
  camera.target.y = preset.target.y
  camera.target.z = preset.target.z
}

// 应用光照预设
const applyLightingPreset = (preset: any) => {
  lighting.ambient.intensity = preset.ambient
  lighting.directional.intensity = preset.dirIntensity
  lighting.directional.color = preset.dirColor
}

// 选择对象
const selectObject = (id: string) => {
  selectedObjectId.value = id
}

// 切换可见性
const toggleVisibility = (id: string) => {
  const obj = sceneObjects.value.find(o => o.id === id)
  if (obj) {
    obj.visible = !obj.visible
    const threeObj = threeObjects.get(id)
    if (threeObj) {
      threeObj.visible = obj.visible
    }
  }
}

// 添加对象
const addObject = () => {
  const id = `obj_${Date.now()}`
  sceneObjects.value.push({
    id,
    name: `对象 ${sceneObjects.value.length + 1}`,
    icon: '🟦',
    visible: true,
    type: 'cube',
  })
}

// 导出场景
const exportScene = () => {
  const sceneData = {
    camera,
    lighting,
    scene,
    objects: sceneObjects.value,
  }
  const json = JSON.stringify(sceneData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scene-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 生命周期
onMounted(async () => {
  await nextTick()
  initThreeScene()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', onWindowResize)
  if (threeRenderer) {
    threeRenderer.dispose()
  }
})
</script>

<style scoped>
.director3d {
  width: 100%;
  height: 100%;
  background: #020308;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部工具栏 */
.director-toolbar {
  height: 60px;
  background: rgba(2, 3, 8, 0.95);
  border-bottom: 1px solid rgba(0, 217, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.director-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.title-icon {
  font-size: 20px;
}

.scene-tabs {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px;
  border-radius: 8px;
}

.scene-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.scene-tab:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

.scene-tab.active {
  background: rgba(0, 217, 255, 0.15);
  color: #00D9FF;
}

.tab-icon {
  font-size: 14px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.tool-btn:hover {
  background: rgba(0, 217, 255, 0.1);
  border-color: rgba(0, 217, 255, 0.4);
  color: #00D9FF;
}

.tool-btn.primary {
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.2) 0%, rgba(180, 50, 255, 0.2) 100%);
  border-color: rgba(0, 217, 255, 0.5);
  color: #00D9FF;
}

.tool-btn.primary:hover {
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.3) 0%, rgba(180, 50, 255, 0.3) 100%);
  box-shadow: 0 0 16px rgba(0, 217, 255, 0.3);
}

/* 主体 */
.director-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧面板 */
.left-panel {
  width: 240px;
  background: rgba(2, 3, 8, 0.95);
  border-right: 1px solid rgba(0, 217, 255, 0.15);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.add-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 217, 255, 0.15);
  border: 1px solid rgba(0, 217, 255, 0.4);
  color: #00D9FF;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.add-btn:hover {
  background: rgba(0, 217, 255, 0.3);
  transform: scale(1.1);
}

.object-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.object-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 2px;
}

.object-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.object-item.active {
  background: rgba(0, 217, 255, 0.15);
  border-left: 3px solid #00D9FF;
  padding-left: 9px;
}

.object-icon {
  font-size: 16px;
}

.object-name {
  flex: 1;
  color: #ffffff;
  font-size: 13px;
}

.object-toggle {
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.object-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

/* 视口 */
.viewport-container {
  flex: 1;
  position: relative;
  background: #0a0a14;
  overflow: hidden;
}

.viewport-canvas {
  width: 100%;
  height: 100%;
}

.viewport-overlay {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
  pointer-events: none;
}

.overlay-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(2, 3, 8, 0.7);
  border: 1px solid rgba(0, 217, 255, 0.2);
  border-radius: 6px;
  backdrop-filter: blur(8px);
  font-size: 12px;
}

.info-label {
  color: rgba(255, 255, 255, 0.5);
}

.info-value {
  color: #00D9FF;
  font-family: 'Consolas', monospace;
}

.axes-indicator {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 60px;
  height: 60px;
  border: 1px solid rgba(0, 217, 255, 0.2);
  border-radius: 50%;
  background: rgba(2, 3, 8, 0.7);
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.axis {
  position: absolute;
  font-size: 11px;
  font-weight: 700;
}

.x-axis {
  color: #ff6464;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
}

.y-axis {
  color: #64ff64;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
}

.z-axis {
  color: #6464ff;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
}

/* 右侧面板 */
.right-panel {
  width: 300px;
  background: rgba(2, 3, 8, 0.95);
  border-left: 1px solid rgba(0, 217, 255, 0.15);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0 8px;
}

.panel-tab {
  flex: 1;
  padding: 14px 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.panel-tab:hover {
  color: #ffffff;
}

.panel-tab.active {
  color: #00D9FF;
  border-bottom-color: #00D9FF;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.property-group {
  margin-bottom: 24px;
}

.group-title {
  font-size: 11px;
  color: rgba(0, 217, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(0, 217, 255, 0.1);
}

.property-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 12px;
}

.property-row label {
  color: rgba(255, 255, 255, 0.6);
  min-width: 60px;
  font-size: 12px;
}

.property-input {
  flex: 1;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #ffffff;
  font-size: 12px;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
  width: 0;
}

.property-input:focus {
  border-color: #00D9FF;
  background: rgba(0, 217, 255, 0.05);
}

.property-slider {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.property-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #00D9FF;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(0, 217, 255, 0.5);
}

.property-color {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}

.property-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #00D9FF;
  cursor: pointer;
}

.property-value {
  color: #00D9FF;
  font-family: 'Consolas', monospace;
  font-size: 11px;
  min-width: 50px;
  text-align: right;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.preset-btn {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: rgba(0, 217, 255, 0.1);
  border-color: rgba(0, 217, 255, 0.4);
  color: #00D9FF;
}

/* 滚动条 */
.object-list::-webkit-scrollbar,
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.object-list::-webkit-scrollbar-track,
.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.object-list::-webkit-scrollbar-thumb,
.panel-content::-webkit-scrollbar-thumb {
  background: rgba(0, 217, 255, 0.3);
  border-radius: 3px;
}

.object-list::-webkit-scrollbar-thumb:hover,
.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 217, 255, 0.5);
}
</style>
