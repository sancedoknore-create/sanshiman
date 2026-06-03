import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SRC = readFileSync(resolve(__dirname, '../index.js'), 'utf8')

function handlerBody(channel) {
  const re = new RegExp(`ipcMain\\.handle\\(["']${channel.replace(/[.:]/g, '\\$&')}["'][\\s\\S]*?\\n  \\}\\);`, 'm')
  const m = SRC.match(re)
  return m ? m[0] : ''
}

describe('IPC handler hardening — must use security.js helpers', () => {
  it('index.js imports security helpers', () => {
    expect(SRC).toMatch(/from\s+["']\.\/security\.js["']/)
    for (const fn of [
      'assertSafeRelativePath',
      'assertSafeAbsolutePath',
      'assertSafeDownloadUrl',
      'assertSafeFileExt',
      'encodePowershellCommand',
    ]) {
      expect(SRC, `security.js export ${fn} not imported`).toContain(fn)
    }
  })

  it('cache:delete-batch validates relative path against LocalCache root', () => {
    const body = handlerBody('cache:delete-batch')
    expect(body, 'handler not found').not.toBe('')
    expect(body).toMatch(/assertSafeRelativePath/)
  })

  it('cache:download-url validates URL via assertSafeDownloadUrl before fetch', () => {
    const body = handlerBody('cache:download-url')
    expect(body, 'handler not found').not.toBe('')
    expect(body).toMatch(/assertSafeDownloadUrl/)
    // Validation must happen before fetch
    const validateIdx = body.indexOf('assertSafeDownloadUrl')
    const fetchIdx = body.indexOf('fetch(')
    expect(validateIdx, 'assertSafeDownloadUrl missing').toBeGreaterThanOrEqual(0)
    expect(fetchIdx).toBeGreaterThanOrEqual(0)
    expect(validateIdx).toBeLessThan(fetchIdx)
  })

  it('cache:save-cache validates extension whitelist', () => {
    const body = handlerBody('cache:save-cache')
    expect(body, 'handler not found').not.toBe('')
    expect(body).toMatch(/assertSafeFileExt/)
  })

  it('clipboard:copy-image uses encodePowershellCommand (no string interpolation into PS)', () => {
    const body = handlerBody('clipboard:copy-image')
    expect(body, 'handler not found').not.toBe('')
    expect(body).toMatch(/encodePowershellCommand/)
    // -Command flag must NOT be used (re-parses the string)
    expect(body).not.toMatch(/["']-Command["']/)
  })

  it('seedance:assets:create validates absolute filePath against allowed roots', () => {
    const body = handlerBody('seedance:assets:create')
    expect(body, 'handler not found').not.toBe('')
    expect(body).toMatch(/assertSafeAbsolutePath/)
  })
})
