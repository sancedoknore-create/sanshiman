import { describe, it, expect, beforeEach } from 'vitest'
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

function makeNodeEl({ id, type = 'input-image', withImg = true, withHandle = true }) {
  const el = document.createElement('div')
  el.setAttribute('data-id', id)
  if (type) el.setAttribute('data-node-type', type)
  if (withImg) {
    const img = document.createElement('img')
    img.src = 'sanshiman://local/?path=foo.png'
    el.appendChild(img)
  }
  if (withHandle) {
    const h = document.createElement('div')
    h.className = 'react-flow__handle'
    el.appendChild(h)
  }
  return el
}

describe('NodeAugmenter.augment', () => {
  let aug, store

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    const mod = loadModule()
    aug = mod.NodeAugmenter
    store = mod.ViewerStateStore
  })

  it('marks input-image node as managed', () => {
    const el = makeNodeEl({ id: 'node_1' })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-sv-managed')).toBe('1')
  })

  it('augment is idempotent — managed attr unchanged on second call', () => {
    const el = makeNodeEl({ id: 'node_idem' })
    document.body.appendChild(el)
    aug.augment(el)
    const firstAttr = el.getAttribute('data-sv-managed')
    aug.augment(el)
    expect(el.getAttribute('data-sv-managed')).toBe(firstAttr)
    expect(el.getAttribute('data-sv-managed')).toBe('1')
  })

  it('skips non-input-image node types', () => {
    const el = makeNodeEl({ id: 'node_2', type: 'gen-image' })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-sv-managed')).toBeNull()
  })

  it('fallback recognises node when data-node-type missing but has img + handle', () => {
    const el = makeNodeEl({ id: 'node_3', type: null })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-sv-managed')).toBe('1')
  })

  it('skips nodes without img or handle', () => {
    const el = makeNodeEl({ id: 'node_4', type: null, withImg: false })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-sv-managed')).toBeNull()
  })

  it('applies viewer state to DOM if store has entry', () => {
    store.set('node_5', { viewer: true })
    const el = makeNodeEl({ id: 'node_5' })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-viewer-only')).toBe('true')
  })

  it('adds eye toggle button after augment', () => {
    const el = makeNodeEl({ id: 'node_eye_1' })
    document.body.appendChild(el)
    aug.augment(el)
    const btn = el.querySelector('.sv-toggle-btn')
    expect(btn).toBeTruthy()
    expect(btn.getAttribute('aria-label')).toMatch(/查看器|viewer/i)
  })

  it('eye toggle flips viewer-only attribute on click', () => {
    const el = makeNodeEl({ id: 'node_eye_2' })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-viewer-only')).toBeNull()

    const btn = el.querySelector('.sv-toggle-btn')
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.getAttribute('data-viewer-only')).toBe('true')
    expect(store.get('node_eye_2').viewer).toBe(true)

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.getAttribute('data-viewer-only')).toBeNull()
    expect(store.get('node_eye_2').viewer).toBe(false)
  })

  it('eye toggle click does not bubble to node (stopPropagation)', () => {
    const el = makeNodeEl({ id: 'node_eye_3' })
    document.body.appendChild(el)
    aug.augment(el)

    let nodeReceivedClick = false
    el.addEventListener('click', () => { nodeReceivedClick = true })
    const btn = el.querySelector('.sv-toggle-btn')
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(nodeReceivedClick).toBe(false)
  })

  it('eye toggle mousedown does not propagate (so ReactFlow does not start drag)', () => {
    const el = makeNodeEl({ id: 'node_eye_md' })
    document.body.appendChild(el)
    aug.augment(el)
    let nodeMousedown = false
    el.addEventListener('mousedown', () => { nodeMousedown = true })
    el.querySelector('.sv-toggle-btn').dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true })
    )
    expect(nodeMousedown).toBe(false)
  })

  it('augment idempotent — second call does not duplicate eye button', () => {
    const el = makeNodeEl({ id: 'node_eye_4' })
    document.body.appendChild(el)
    aug.augment(el)
    aug.augment(el)
    expect(el.querySelectorAll('.sv-toggle-btn').length).toBe(1)
  })

  function getMediaUrl(el) {
    const m = el.querySelector('img, video')
    return m ? m.src : null
  }

  it('extracts filename from img src into label', () => {
    const el = makeNodeEl({ id: 'node_fn_1' })
    el.querySelector('img').src = 'sanshiman://local/?path=' + encodeURIComponent('C:/foo/bar/abc.png')
    document.body.appendChild(el)
    store.set('node_fn_1', { viewer: true })
    aug.augment(el)
    const label = el.querySelector('.sv-filename')
    expect(label).toBeTruthy()
    expect(label.textContent).toBe('abc.png')
  })

  it('filename label hidden when not in viewer mode', () => {
    const el = makeNodeEl({ id: 'node_fn_2' })
    document.body.appendChild(el)
    aug.augment(el)
    expect(el.getAttribute('data-viewer-only')).toBeNull()
  })

  it('clicking node center in viewer mode opens lightbox', () => {
    const el = makeNodeEl({ id: 'node_lb_1' })
    el.querySelector('img').src = 'sanshiman://local/?path=foo.png'
    document.body.appendChild(el)
    store.set('node_lb_1', { viewer: true })
    aug.augment(el)

    const target = el.querySelector('.sv-center-clickable') || el.querySelector('img')
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(document.querySelector('.sv-lightbox-overlay')).toBeTruthy()
    window.sanshimanAssetViewer.MiniLightbox.close()
  })

  it('clicking node center in non-viewer mode does NOT open lightbox', () => {
    const el = makeNodeEl({ id: 'node_lb_2' })
    document.body.appendChild(el)
    aug.augment(el)

    const img = el.querySelector('img')
    img.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.querySelector('.sv-lightbox-overlay')).toBeNull()
  })

  it('clicking eye button does not also open lightbox', () => {
    const el = makeNodeEl({ id: 'node_lb_3' })
    document.body.appendChild(el)
    store.set('node_lb_3', { viewer: true })
    aug.augment(el)

    const btn = el.querySelector('.sv-toggle-btn')
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.querySelector('.sv-lightbox-overlay')).toBeNull()
  })
})
