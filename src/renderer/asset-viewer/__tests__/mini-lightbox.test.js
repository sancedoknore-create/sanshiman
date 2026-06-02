import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

function loadModule() {
  delete window.sanshimanAssetViewer
  const code = fs.readFileSync(
    path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
    'utf-8'
  )
  new Function(code).call(window)
  return window.sanshimanAssetViewer
}

describe('MiniLightbox', () => {
  let lb

  beforeEach(() => {
    document.body.innerHTML = ''
    lb = loadModule().MiniLightbox
  })

  afterEach(() => {
    lb.close()
  })

  it('open with image creates overlay with <img>', () => {
    lb.open({ url: 'sanshiman://local/?path=foo.png', isVideo: false })
    const overlay = document.querySelector('.sv-lightbox-overlay')
    expect(overlay).toBeTruthy()
    const img = overlay.querySelector('img.sv-lightbox-content')
    expect(img).toBeTruthy()
    expect(img.src).toContain('sanshiman://local/?path=foo.png')
  })

  it('open with video creates overlay with <video controls autoplay muted>', () => {
    lb.open({ url: 'sanshiman://local/?path=clip.mp4', isVideo: true })
    const video = document.querySelector('.sv-lightbox-overlay video.sv-lightbox-content')
    expect(video).toBeTruthy()
    expect(video.controls).toBe(true)
    expect(video.autoplay).toBe(true)
    expect(video.muted).toBe(true)
  })

  it('close removes overlay', () => {
    lb.open({ url: 'foo.png', isVideo: false })
    lb.close()
    expect(document.querySelector('.sv-lightbox-overlay')).toBeNull()
  })

  it('Escape key closes', () => {
    lb.open({ url: 'foo.png', isVideo: false })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(document.querySelector('.sv-lightbox-overlay')).toBeNull()
  })

  it('clicking overlay backdrop closes', () => {
    lb.open({ url: 'foo.png', isVideo: false })
    const overlay = document.querySelector('.sv-lightbox-overlay')
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.querySelector('.sv-lightbox-overlay')).toBeNull()
  })

  it('clicking the image (inner content) does NOT close', () => {
    lb.open({ url: 'foo.png', isVideo: false })
    const img = document.querySelector('.sv-lightbox-content')
    img.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.querySelector('.sv-lightbox-overlay')).toBeTruthy()
  })

  it('opening when one is already open replaces it (no double overlay)', () => {
    lb.open({ url: 'a.png', isVideo: false })
    lb.open({ url: 'b.png', isVideo: false })
    const overlays = document.querySelectorAll('.sv-lightbox-overlay')
    expect(overlays.length).toBe(1)
    expect(overlays[0].querySelector('img').src).toContain('b.png')
  })

  it('removes keydown listener after close (no leaked Escape handlers)', () => {
    lb.open({ url: 'foo.png', isVideo: false })
    lb.close()
    // 此时不应该再有 overlay；再触发 ESC 不应抛错也不应有副作用
    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    }).not.toThrow()
    expect(document.querySelector('.sv-lightbox-overlay')).toBeNull()
  })

  it('close() releases video src to free decoder', () => {
    lb.open({ url: 'sanshiman://local/?path=clip.mp4', isVideo: true })
    const video = document.querySelector('video.sv-lightbox-content')
    expect(video.src).toContain('clip.mp4')
    lb.close()
    // close 之后 overlay 已经从 DOM 移除；上面捕到的 video 引用上的 src 应已被清空
    expect(video.getAttribute('src')).toBeNull()
  })
})
