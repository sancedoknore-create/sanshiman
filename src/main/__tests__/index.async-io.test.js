import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SRC = readFileSync(resolve(__dirname, '../index.js'), 'utf8')

function handlerBody(channel) {
  const re = new RegExp(`ipcMain\\.handle\\(["']${channel.replace(/[.:]/g, '\\$&')}[\"'][\\s\\S]*?\\n  \\}\\);`, 'm')
  const m = SRC.match(re)
  return m ? m[0] : ''
}

describe('7b: remaining sync writeFile in IPC handlers must be async', () => {
  for (const channel of ['cache:save-thumbnail', 'cache:save-cache', 'cache:download-url']) {
    it(`${channel} does not use writeFileSync`, () => {
      const body = handlerBody(channel)
      expect(body, `${channel} handler not found`).not.toBe('')
      expect(body, `${channel} still uses writeFileSync — blocks main process on slow disk`).not.toMatch(/writeFileSync/)
      expect(body).toMatch(/fs\.promises\.writeFile|fsp\.writeFile|writeFile\(/)
    })
  }
})

describe('7b: shell:open-external host blacklist', () => {
  it('uses assertSafeDownloadUrl with allowHttp:true to block private/loopback hosts', () => {
    const body = handlerBody('shell:open-external')
    expect(body, 'handler not found').not.toBe('')
    expect(body, 'shell:open-external missing assertSafeDownloadUrl — loopback/private hosts can still phish').toMatch(/assertSafeDownloadUrl/)
    expect(body).toMatch(/allowHttp/)
  })
})
