import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const MAIN = readFileSync(resolve(__dirname, '../index.js'), 'utf8')
const SD_HTML = readFileSync(resolve(__dirname, '../seedance-assets.html'), 'utf8')

describe('7c: logger:append IPC hardening', () => {
  it('logger:append handler enforces a single-message size cap', () => {
    const idx = MAIN.indexOf('"logger:append"')
    expect(idx, 'logger:append handler not found').toBeGreaterThan(-1)
    const end = MAIN.indexOf('});', idx) + 3
    const body = MAIN.slice(idx, end)
    // Look for any explicit length/size cap (e.g. > 64 KB, slice(0, ...), substring length)
    expect(body, 'logger:append accepts arbitrarily large messages — renderer can fill disk').toMatch(/length\s*>|slice\s*\(\s*0\s*,|substring\s*\(\s*0\s*,|JSON\.stringify[\s\S]*?length/)
  })

  it('logger:append handler validates sender frame (must be main frame, not iframe/external)', () => {
    const idx = MAIN.indexOf('"logger:append"')
    const end = MAIN.indexOf('});', idx) + 3
    const body = MAIN.slice(idx, end)
    expect(body, 'logger:append does not check sender frame — any iframe/webview can spam logs').toMatch(/senderFrame|getURL\(\)|isMainFrame|frameId/)
  })
})

describe('7c: seedance HTML image rendering', () => {
  it('asset image is set via .src= assignment after URL validation, not via innerHTML interpolation', () => {
    // The legacy line was: `<img src="${escapeHtml(a.url)}" ...>`
    // Even with escapeHtml, javascript:/data:text/html still execute in some contexts.
    // Migration target: build the <img> via DOM and assign img.src after a protocol check.
    // We accept either pattern as long as NO inline `<img src="${...a.url`-style template remains.
    expect(SD_HTML, 'inline `<img src="${...a.url..."` template still present — protocol whitelist not enforced')
      .not.toMatch(/<img\s+src\s*=\s*["'`]\$\{[^}]*a\.url/)
  })

  it('asset URL passes a protocol whitelist before being used as image src', () => {
    // Look for a URL protocol check in the rendering path
    expect(SD_HTML).toMatch(/(?:new URL\s*\([^)]*a\.url|isSafeImg|safeImageSrc|allowedProto|imageProto|protocol\s*===|protocol\s*!==)/)
  })
})
