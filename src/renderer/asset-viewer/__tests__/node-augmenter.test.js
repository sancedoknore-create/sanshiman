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
})
