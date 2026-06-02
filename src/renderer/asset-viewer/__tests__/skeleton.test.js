import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('asset-viewer skeleton', () => {
  beforeAll(() => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../../../../out/renderer/assets/asset-viewer.js'),
      'utf-8'
    )
    new Function(code).call(window)
  })

  it('exposes sanshimanAssetViewer namespace on window', () => {
    expect(window.sanshimanAssetViewer).toBeDefined()
    expect(window.sanshimanAssetViewer.version).toBeTypeOf('string')
  })
})
