import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SRC = readFileSync(resolve(__dirname, '../thumbnail.js'), 'utf8')
const MAIN = readFileSync(resolve(__dirname, '../index.js'), 'utf8')

describe('thumbnail.js hardening', () => {
  it('does not include .svg in the image extension whitelist (XSS / inconsistent nativeImage parse)', () => {
    const m = SRC.match(/(?:imageExts|IMAGE_EXTS)\s*=\s*\[([\s\S]*?)\]/)
    expect(m, 'image extension whitelist not found').not.toBeNull()
    expect(m[1]).not.toMatch(/\.svg/)
  })

  it('cache key incorporates mtime and size so a replaced source file invalidates the thumb', () => {
    const m = SRC.match(/function getThumbPath[\s\S]*?\n\}/)
    expect(m, 'getThumbPath not found').not.toBeNull()
    const body = m[0]
    expect(body, 'cache key still keyed only by path — replaced source returns stale thumb').toMatch(/mtimeMs|mtime/)
    expect(body).toMatch(/size|st\.size/)
  })

  it('uses async fs.promises everywhere; no sync IO blocks the main process', () => {
    expect(SRC, 'thumbnail.js still uses fs.existsSync (sync IO blocks main)').not.toMatch(/fs\.existsSync/)
    expect(SRC).not.toMatch(/fs\.statSync/)
    expect(SRC).not.toMatch(/fs\.mkdirSync/)
    expect(SRC).not.toMatch(/fs\.writeFileSync/)
    expect(SRC).toMatch(/fs\.promises\.|fsp\./)
  })

  it('generateThumbnail is async (signature returns Promise)', () => {
    expect(SRC).toMatch(/async\s+function\s+generateThumbnail/)
  })

  it('callers in main/index.js await generateThumbnail', () => {
    // Both call sites must be awaited; we look at every `generateThumbnail(` reference.
    const callSites = [...MAIN.matchAll(/(?:^|\W)(\w*\s*generateThumbnail\()/g)].map(x => x[1].trim())
    // Skip the import line itself (which is `, generateThumbnail }`)
    const realCalls = callSites.filter(s => !s.includes(',') && s.endsWith('generateThumbnail('))
    expect(realCalls.length, 'no generateThumbnail call sites found in main').toBeGreaterThanOrEqual(1)
    // Now check each call site is preceded by `await ` in a small window
    const callRe = /(\bawait\s+)?generateThumbnail\s*\(/g
    let m
    let unawaited = 0
    while ((m = callRe.exec(MAIN)) !== null) {
      // Skip the import statement: look at the line content
      const lineStart = MAIN.lastIndexOf('\n', m.index) + 1
      const lineEnd = MAIN.indexOf('\n', m.index)
      const line = MAIN.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
      if (line.includes('import') || line.includes('from "./thumbnail')) continue
      if (!m[1]) unawaited++
    }
    expect(unawaited, 'at least one generateThumbnail() call is missing await').toBe(0)
  })
})
