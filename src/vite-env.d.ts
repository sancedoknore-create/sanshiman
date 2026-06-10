declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  electronAPI?: {
    platform: string
    store: {
      get: (key: string) => Promise<string | null>
      set: (key: string, value: string) => Promise<void>
      delete: (key: string) => Promise<void>
    }
    upload: {
      save: (base64Data: string, fileName: string) => Promise<string | null>
      delete: (filePath: string) => Promise<boolean>
      read: (filePath: string) => Promise<{ data: string; size: number } | null>
    }
  }
}
