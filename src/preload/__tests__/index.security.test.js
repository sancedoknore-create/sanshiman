import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SRC = readFileSync(resolve(__dirname, '../index.js'), 'utf8')
const MAIN = readFileSync(resolve(__dirname, '../../main/index.js'), 'utf8')

describe('preload exposed surface (renderer-facing)', () => {
  it('does NOT expose generic api.invoke for arbitrary channels', () => {
    // Renderer DOES use api.invoke('cache:config'|'cache:download-url'|'cache:save-cache')
    // but the implementation must hard-cap to that narrow whitelist, not the full ALLOWED_CHANNELS.
    expect(SRC).toMatch(/INVOKE_PUBLIC_CHANNELS/)
    const m = SRC.match(/INVOKE_PUBLIC_CHANNELS\s*=\s*\[([\s\S]*?)\]/)
    expect(m, 'INVOKE_PUBLIC_CHANNELS list not found').not.toBeNull()
    const list = m[1]
    // Must contain ONLY the renderer-used channels (or a strict subset)
    expect(list).toMatch(/cache:config/)
    expect(list).toMatch(/cache:download-url/)
    expect(list).toMatch(/cache:save-cache/)
    // Must NOT contain high-risk channels
    expect(list).not.toMatch(/cache:delete-batch/)
    expect(list).not.toMatch(/cache:clear-history/)
    expect(list).not.toMatch(/shell:open-external/)
    expect(list).not.toMatch(/shell:open-path/)
    expect(list).not.toMatch(/protocol:set-allowed-roots/)
  })

  it('does NOT expose api.send (renderer never uses it)', () => {
    // Look for the api object literal and confirm send: is gone
    const apiBlock = SRC.match(/const api = \{[\s\S]*?^\};/m)
    expect(apiBlock, 'api object not found').not.toBeNull()
    expect(apiBlock[0]).not.toMatch(/^\s*send:/m)
  })

  it('does NOT expose api.on (renderer never uses it; grouped APIs handle named events)', () => {
    const apiBlock = SRC.match(/const api = \{[\s\S]*?^\};/m)
    expect(apiBlock[0]).not.toMatch(/^\s*on:/m)
  })

  it('does NOT expose preload.electronAPI on window.electron (renderer never uses it; it bypasses our whitelist)', () => {
    expect(SRC, 'electronAPI is still bridged to window.electron').not.toMatch(/exposeInMainWorld\(["']electron["']\s*,\s*preload\.electronAPI\)/)
    expect(SRC).not.toMatch(/window\.electron\s*=\s*preload\.electronAPI/)
  })

  it('removes protocol:set-allowed-roots from invoke whitelist (must be main-side only)', () => {
    const allowedBlock = SRC.match(/ALLOWED_CHANNELS\s*=\s*\[([\s\S]*?)\]/)
    expect(allowedBlock, 'ALLOWED_CHANNELS not found').not.toBeNull()
    expect(allowedBlock[1]).not.toMatch(/protocol:set-allowed-roots/)
  })

  it('removes logger:append from on-channel whitelist (renderer should not subscribe to log echoes)', () => {
    const onBlock = SRC.match(/ALLOWED_ON_CHANNELS\s*=\s*\[([\s\S]*?)\]/)
    expect(onBlock, 'ALLOWED_ON_CHANNELS not found').not.toBeNull()
    expect(onBlock[1]).not.toMatch(/logger:append/)
  })

  it('safeOn forwards the full event args, not just the first one', () => {
    // Bug: (event, args) => callback(args) drops multi-arg events. Should spread args into callback.
    // Accept either: arrow body `=> callback(...args)` OR a try/catch wrapper that contains `callback(...args)`.
    expect(SRC).toMatch(/callback\s*\(\s*\.\.\.\w+\s*\)/)
    expect(SRC, 'event arg destructure (_e, ...args) missing').toMatch(/\(\s*_?e?v?e?n?t?_?\s*,\s*\.\.\.\w+\s*\)\s*=>/)
  })
})

describe('main side: protocol:set-allowed-roots handler removed (registered at startup instead)', () => {
  it('main/index.js does NOT register an ipcMain handler for protocol:set-allowed-roots', () => {
    expect(MAIN, 'renderer can still mutate the allowed-roots list at runtime').not.toMatch(/ipcMain\.handle\(["']protocol:set-allowed-roots["']/)
  })
})
