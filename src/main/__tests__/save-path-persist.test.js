import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SRC = readFileSync(resolve(__dirname, '../index.js'), 'utf8')

describe('save path persistence (DB-backed, survives restart)', () => {
  it('cache:config writes image_save_path / video_save_path to settings table', () => {
    const idx = SRC.indexOf('handle("cache:config"')
    expect(idx, 'cache:config handler not found').toBeGreaterThan(-1)
    const end = SRC.indexOf('});', idx) + 3
    const body = SRC.slice(idx, end)
    expect(body, 'image path setting not persisted to DB').toMatch(/setSetting\("image_save_path"/)
    expect(body, 'video path setting not persisted to DB').toMatch(/setSetting\("video_save_path"/)
  })

  it('startup loads image/video save paths from DB before falling back to defaults', () => {
    // Find the currentConfig initialization block
    const idx = SRC.indexOf('currentConfig = {')
    expect(idx, 'currentConfig init not found').toBeGreaterThan(-1)
    // The init block must read getSetting for both keys before applying defaults
    const surrounding = SRC.slice(Math.max(0, idx - 800), idx + 400)
    expect(surrounding).toMatch(/getSetting\("image_save_path"\)/)
    expect(surrounding).toMatch(/getSetting\("video_save_path"\)/)
  })

  it('default paths only used when DB has no saved value', () => {
    // The init must use a fallback pattern: savedX || defaultX
    const idx = SRC.indexOf('currentConfig = {')
    const block = SRC.slice(idx, idx + 600)
    // Pattern: image_save_path: _savedX || path.join(...)
    expect(block).toMatch(/image_save_path:\s*_?savedImagePath\s*\|\|/)
    expect(block).toMatch(/video_save_path:\s*_?savedVideoPath\s*\|\|/)
  })

  it('startup whitelists configured image/video save paths for sanshiman local thumbnails', () => {
    const idx = SRC.indexOf('currentConfig = {')
    expect(idx, 'currentConfig init not found').toBeGreaterThan(-1)
    const beforeHandlers = SRC.indexOf('handle("cache:openDirectory"', idx)
    expect(beforeHandlers, 'cache handlers not found after currentConfig init').toBeGreaterThan(idx)
    const block = SRC.slice(idx, beforeHandlers)
    expect(block, 'image save path is not whitelisted at startup').toMatch(/sanshimanAllowedRoots\.add\(path\.resolve\(currentConfig\.image_save_path\)\)/)
    expect(block, 'video save path is not whitelisted at startup').toMatch(/sanshimanAllowedRoots\.add\(path\.resolve\(currentConfig\.video_save_path\)\)/)
  })
})
