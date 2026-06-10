import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// base: 'build' 时用 './' 让 dist/index.html 里所有资源走相对路径，
// 这样 Electron loadFile 时不会把 /assets/xxx 当成 C:\assets\xxx 找不到（白屏元凶）。
// dev 模式保持 '/' 不变。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}))
