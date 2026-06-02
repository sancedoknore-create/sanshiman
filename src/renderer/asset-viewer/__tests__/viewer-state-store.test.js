import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('ViewerStateStore', () => {
  let store

  beforeEach(() => {
    localStorage.clear()
    delete window.sanshimanAssetViewer
    const code = fs.readFileSync(
      path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
      'utf-8'
    )
    new Function(code).call(window)
    store = window.sanshimanAssetViewer.ViewerStateStore
  })

  it('returns null for unknown nodeId', () => {
    expect(store.get('node_unknown')).toBeNull()
  })

  it('set + get round trip', () => {
    store.set('node_a', { viewer: true, w: 320, h: 180 })
    expect(store.get('node_a')).toEqual({ viewer: true, w: 320, h: 180 })
  })

  it('persists across re-init via localStorage', () => {
    store.set('node_b', { viewer: true, w: 200, h: 200 })
    delete window.sanshimanAssetViewer
    const code = fs.readFileSync(
      path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
      'utf-8'
    )
    new Function(code).call(window)
    const fresh = window.sanshimanAssetViewer.ViewerStateStore
    expect(fresh.get('node_b')).toEqual({ viewer: true, w: 200, h: 200 })
  })

  it('toggle flips viewer flag and returns new value', () => {
    expect(store.toggle('node_c')).toBe(true)
    expect(store.get('node_c').viewer).toBe(true)
    expect(store.toggle('node_c')).toBe(false)
    expect(store.get('node_c').viewer).toBe(false)
  })

  it('delete removes the entry', () => {
    store.set('node_d', { viewer: true })
    store.delete('node_d')
    expect(store.get('node_d')).toBeNull()
  })

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('sanshiman_viewer_nodes', '{ not json')
    delete window.sanshimanAssetViewer
    const code = fs.readFileSync(
      path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
      'utf-8'
    )
    new Function(code).call(window)
    const fresh = window.sanshimanAssetViewer.ViewerStateStore
    expect(fresh.get('anything')).toBeNull()
  })
})
