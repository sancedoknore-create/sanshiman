import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage/index.vue'
import NodeEditor from '@/views/NodeEditor/index.vue'
import Director3D from '@/views/Director3D/index.vue'
import AssetLibrary from '@/views/AssetLibrary/index.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/home'
    },
    {
      path: '/home',
      name: 'Home',
      component: HomePage
    },
    {
      path: '/nodes',
      name: 'NodeEditor',
      component: NodeEditor
    },
    {
      path: '/director3d',
      name: 'Director3D',
      component: Director3D
    },
    {
      path: '/assets',
      name: 'AssetLibrary',
      component: AssetLibrary
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings/index.vue')
    }
  ]
})

export default router
