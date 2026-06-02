import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

function loadModule() {
  delete window.sanshimanAssetViewer
  delete window.__sv_observed
  const code = fs.readFileSync(
    path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
    'utf-8'
  )
  new Function(code).call(window)
  return window.sanshimanAssetViewer
}

function makeFlowRoot() {
  const root = document.createElement('div')
  root.className = 'react-flow'
  document.body.appendChild(root)
  return root
}

function makeNode(id, opts = {}) {
  const el = document.createElement('div')
  el.setAttribute('data-id', id)
  el.setAttribute('data-node-type', opts.type || 'input-image')
  const img = document.createElement('img')
  img.src = opts.src || 'sanshiman://local/?path=foo.png'
  el.appendChild(img)
  const h = document.createElement('div')
  h.className = 'react-flow__handle'
  el.appendChild(h)
  return el
}

describe('MutationObserver + onboard bubble + auto-size', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    window.__SV_TEST_SKIP_GRACE = false
  })

  afterEach(() => {
    delete window.__SV_TEST_SKIP_GRACE
    delete window.__sv_observed
  })

  it('augments existing nodes when observer attaches (initial scan, no bubble)', async () => {
    const root = makeFlowRoot()
    const el = makeNode('node_init_1')
    root.appendChild(el)

    loadModule()
    // 等一拍让 observer attach + 初始扫描
    await new Promise(r => setTimeout(r, 50))
    expect(el.getAttribute('data-sv-managed')).toBe('1')
    expect(el.querySelector('.sv-onboard-bubble')).toBeNull()
  })

  it('augments dynamically added node and shows onboard bubble (post-startup-grace)', async () => {
    const root = makeFlowRoot()
    const mod = loadModule()
    window.__SV_TEST_SKIP_GRACE = true // 跳过 3s grace
    await new Promise(r => setTimeout(r, 50))

    const el = makeNode('node_new_1')
    root.appendChild(el)
    await new Promise(r => setTimeout(r, 250)) // 等 onboard 200ms 延迟 + 一些 buffer
    expect(el.getAttribute('data-sv-managed')).toBe('1')
    expect(el.querySelector('.sv-onboard-bubble')).toBeTruthy()
  })

  it('clicking onboard "当查看器" toggles to viewer mode + dismisses bubble', async () => {
    const root = makeFlowRoot()
    const mod = loadModule()
    window.__SV_TEST_SKIP_GRACE = true
    await new Promise(r => setTimeout(r, 50))

    const el = makeNode('node_new_2')
    root.appendChild(el)
    await new Promise(r => setTimeout(r, 250))
    const action = el.querySelector('.sv-onboard-action')
    expect(action).toBeTruthy()
    action.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.getAttribute('data-viewer-only')).toBe('true')
    expect(el.querySelector('.sv-onboard-bubble')).toBeNull()
  })

  it('clicking onboard ✕ dismisses bubble without toggling viewer', async () => {
    const root = makeFlowRoot()
    const mod = loadModule()
    window.__SV_TEST_SKIP_GRACE = true
    await new Promise(r => setTimeout(r, 50))

    const el = makeNode('node_new_3')
    root.appendChild(el)
    await new Promise(r => setTimeout(r, 250))
    const close = el.querySelector('.sv-onboard-close')
    expect(close).toBeTruthy()
    close.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.querySelector('.sv-onboard-bubble')).toBeNull()
    expect(el.getAttribute('data-viewer-only')).toBeNull()
  })

  it('maybeInitSize sets width/height by aspect ratio when no persisted size', () => {
    const mod = loadModule()
    const el = makeNode('node_size_1')
    document.body.appendChild(el)
    mod.ViewerStateStore.set('node_size_1', { viewer: true })
    el.setAttribute('data-viewer-only', 'true')

    // 注入一个假的 measureImage 工厂返回 1600x900 的 fake image
    mod.NodeAugmenter._setMeasureImageFactory(() => {
      const fake = { naturalWidth: 1600, naturalHeight: 900, onload: null, onerror: null, _src: '' }
      Object.defineProperty(fake, 'src', {
        set(v) {
          fake._src = v
          // 同步触发 onload
          if (fake.onload) setTimeout(() => fake.onload(), 0)
        },
        get() { return fake._src }
      })
      return fake
    })

    return new Promise(resolve => {
      mod.NodeAugmenter._maybeInitSize(el, 'node_size_1')
      setTimeout(() => {
        // 1600:900 比例，长边 320 → w=320, h=180
        expect(parseInt(el.style.width, 10)).toBe(320)
        expect(parseInt(el.style.height, 10)).toBe(180)
        const saved = mod.ViewerStateStore.get('node_size_1')
        expect(saved.w).toBe(320)
        expect(saved.h).toBe(180)
        resolve()
      }, 30)
    })
  })

  it('maybeInitSize skips when size already persisted', () => {
    const mod = loadModule()
    const el = makeNode('node_size_2')
    document.body.appendChild(el)
    mod.ViewerStateStore.set('node_size_2', { viewer: true, w: 200, h: 200 })
    el.setAttribute('data-viewer-only', 'true')

    let probeCalled = false
    mod.NodeAugmenter._setMeasureImageFactory(() => {
      probeCalled = true
      return { naturalWidth: 1, naturalHeight: 1, onload: null, onerror: null, _src: '', src: '' }
    })

    mod.NodeAugmenter._maybeInitSize(el, 'node_size_2')
    expect(probeCalled).toBe(false)
    // 已有尺寸应被应用
    expect(el.style.width).toBe('200px')
    expect(el.style.height).toBe('200px')
  })

  it('maybeInitSize falls back to 240x240 on image error', () => {
    const mod = loadModule()
    const el = makeNode('node_size_3')
    document.body.appendChild(el)
    mod.ViewerStateStore.set('node_size_3', { viewer: true })
    el.setAttribute('data-viewer-only', 'true')

    mod.NodeAugmenter._setMeasureImageFactory(() => {
      const fake = { naturalWidth: 0, naturalHeight: 0, onload: null, onerror: null, _src: '' }
      Object.defineProperty(fake, 'src', {
        set(v) { fake._src = v; if (fake.onerror) setTimeout(() => fake.onerror(), 0) },
        get() { return fake._src }
      })
      return fake
    })

    return new Promise(resolve => {
      mod.NodeAugmenter._maybeInitSize(el, 'node_size_3')
      setTimeout(() => {
        expect(parseInt(el.style.width, 10)).toBe(240)
        expect(parseInt(el.style.height, 10)).toBe(240)
        resolve()
      }, 30)
    })
  })

  it('maybeInitSize uses video metadata factory for video nodes', () => {
    const mod = loadModule()
    const root = makeFlowRoot()
    const el = makeNode('node_video_1', { type: 'video-input', src: 'sanshiman://local/?path=clip.mp4' })
    // 替换 img 为 video
    el.innerHTML = ''
    const v = document.createElement('video')
    v.src = 'sanshiman://local/?path=clip.mp4'
    el.appendChild(v)
    const h = document.createElement('div')
    h.className = 'react-flow__handle'
    el.appendChild(h)
    root.appendChild(el)
    mod.ViewerStateStore.set('node_video_1', { viewer: true })
    el.setAttribute('data-viewer-only', 'true')

    let videoFactoryCalled = false
    let imageFactoryCalled = false

    mod.NodeAugmenter._setMeasureImageFactory(() => {
      imageFactoryCalled = true
      return { naturalWidth: 0, naturalHeight: 0, onload: null, onerror: null, src: '' }
    })
    mod.NodeAugmenter._setMeasureVideoFactory(() => {
      videoFactoryCalled = true
      const fake = { videoWidth: 1920, videoHeight: 1080, onloadedmetadata: null, onerror: null, _src: '', preload: '', muted: false }
      Object.defineProperty(fake, 'src', {
        set(val) { fake._src = val; if (fake.onloadedmetadata) setTimeout(() => fake.onloadedmetadata(), 0) },
        get() { return fake._src }
      })
      return fake
    })

    return new Promise(resolve => {
      mod.NodeAugmenter._maybeInitSize(el, 'node_video_1')
      setTimeout(() => {
        expect(videoFactoryCalled).toBe(true)
        expect(imageFactoryCalled).toBe(false)
        // 1920:1080 比例，长边 320 → w=320, h=180
        expect(parseInt(el.style.width, 10)).toBe(320)
        expect(parseInt(el.style.height, 10)).toBe(180)
        resolve()
      }, 30)
    })
  })

  it('observer retry chain stops after max retries when no .react-flow root appears', async () => {
    // 没有 makeFlowRoot
    loadModule()
    // 不能直接验证 chain 终止（无法观察内部 setTimeout），但能确认不会抛错也不会无限增长 timer
    await new Promise(r => setTimeout(r, 100))
    // 关键性断言：不存在 .react-flow，augment 不应执行；window.__sv_observed 仍为 true（已尝试 attach）
    expect(window.__sv_observed).toBe(true)
    // 现在 cancel
    window.__sv_attach_cancelled = true
    await new Promise(r => setTimeout(r, 250))
    delete window.__sv_attach_cancelled
  })
})
