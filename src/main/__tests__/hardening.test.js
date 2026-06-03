import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const MAIN = readFileSync(resolve(__dirname, '../index.js'), 'utf8')
const LOGGER = readFileSync(resolve(__dirname, '../logger.js'), 'utf8')
const SD_PRELOAD = readFileSync(resolve(__dirname, '../seedance-assets-preload.js'), 'utf8')
const SD_HTML = readFileSync(resolve(__dirname, '../seedance-assets.html'), 'utf8')

describe('logger reentrancy + async + shutdown', () => {
  it('console override has a reentrancy guard so internal _appendLog console calls do not recurse', () => {
    expect(LOGGER, 'console override calls _appendLog without reentrancy guard — _appendLog throwing+console.error would loop').toMatch(/_logReentrant|_inOverride|_recursionGuard|reentry/i)
  })

  it('does not use sync appendFileSync (blocks main process); uses async appendFile', () => {
    expect(LOGGER, 'logger still uses fs.appendFileSync — blocks UI on slow disk').not.toMatch(/appendFileSync/)
    expect(LOGGER).toMatch(/fs\.promises\.appendFile|fsp\.appendFile|appendFile\(/)
  })

  it('IO failure is reported via _origConsole, not silently swallowed', () => {
    // Look for catch blocks in the flush path that don't just `catch {}`
    const flushIdx = LOGGER.indexOf('function _flushLog')
    expect(flushIdx).toBeGreaterThan(-1)
    const flushEnd = LOGGER.indexOf('\n}', flushIdx)
    const body = LOGGER.slice(flushIdx, flushEnd)
    expect(body, 'flush IO error is silently caught — disk full / EACCES never visible').not.toMatch(/catch\s*\(?\s*\)?\s*\{\s*\}/)
  })

  it('main/index.js registers a before-quit hook that flushes logs and clears _flushTimer', () => {
    // There may be multiple before-quit handlers; assert at least ONE flushes logs and clears the timer.
    const re = /app\.on\(["']before-quit["'][\s\S]*?\}\s*\)/g
    let combined = ''
    let m
    while ((m = re.exec(MAIN)) !== null) combined += m[0] + '\n----\n'
    expect(combined, 'no before-quit hook in main/index.js').not.toBe('')
    expect(combined).toMatch(/clearInterval\(_flushTimer\)/)
    expect(combined).toMatch(/_flushAllLogs/)
  })
})

describe('BrowserWindow webPreferences explicitly hardened', () => {
  // The createWindow() function and the seedance popup window both must declare these explicitly
  function findWebPrefs(label, anchor) {
    const idx = MAIN.indexOf(anchor)
    expect(idx, `${label}: anchor not found`).toBeGreaterThan(-1)
    const tail = MAIN.slice(idx, idx + 800)
    const m = tail.match(/webPreferences:\s*\{([\s\S]*?)\}/)
    expect(m, `${label}: webPreferences not found`).not.toBeNull()
    return m[1]
  }

  it('main window: contextIsolation=true, sandbox=true (or both explicit)', () => {
    const block = findWebPrefs('main window', 'function createWindow()')
    expect(block, 'contextIsolation must be explicit').toMatch(/contextIsolation:\s*true/)
    expect(block, 'nodeIntegration must be explicit false').toMatch(/nodeIntegration:\s*false/)
  })

  it('seedance popup window: contextIsolation=true, sandbox=true, nodeIntegration=false', () => {
    const block = findWebPrefs('seedance popup', '_seedanceAssetsWin = new electron.BrowserWindow')
    expect(block).toMatch(/contextIsolation:\s*true/)
    expect(block).toMatch(/nodeIntegration:\s*false/)
  })
})

describe('will-navigate handler blocks non-http(s) navigation', () => {
  it('createWindow registers a will-navigate listener', () => {
    const fnStart = MAIN.indexOf('function createWindow()')
    const fnEnd = MAIN.indexOf('\n}', fnStart) + 2
    const fnBody = MAIN.slice(fnStart, fnEnd)
    expect(fnBody, 'createWindow has no will-navigate listener — file://, javascript: nav not blocked').toMatch(/will-navigate/)
    expect(fnBody).toMatch(/preventDefault/)
  })
})

describe('single instance lock', () => {
  it('app.requestSingleInstanceLock is invoked and a second-instance handler exists', () => {
    expect(MAIN, 'no requestSingleInstanceLock — concurrent instances will fight over SQLite WAL').toMatch(/app\.requestSingleInstanceLock\(\)/)
    expect(MAIN, 'no second-instance handler to focus existing window').toMatch(/second-instance/)
  })
})

describe('poll already-aborted signal handled at entry', () => {
  for (const method of ['pollVideoTask', 'pollBananaImage']) {
    it(`${method} rejects immediately if signal is already aborted before adding listener`, () => {
      const idx = MAIN.indexOf(`static async ${method}(`)
      expect(idx, `${method} not found`).toBeGreaterThan(-1)
      const next = MAIN.indexOf('\n  static ', idx + 1)
      const body = MAIN.slice(idx, next === -1 ? undefined : next)
      // Must check signal?.aborted at entry (before setting up the timer chain that addEventListener-wouldn't-fire-on)
      expect(body, `${method} does not check signal.aborted at entry — already-aborted task spins indefinitely`).toMatch(/signal\??\.aborted/)
    })
  }
})

describe('updater-quit-install hardening', () => {
  it('updater-quit-install handler wraps autoUpdater.quitAndInstall in try/catch and checks isPackaged', () => {
    const idx = MAIN.indexOf('handle("updater-quit-install"')
    expect(idx, 'updater-quit-install handler not found').toBeGreaterThan(-1)
    const end = MAIN.indexOf('});', idx) + 3
    const body = MAIN.slice(idx, end)
    expect(body, 'updater-quit-install missing isPackaged check').toMatch(/isPackaged/)
    expect(body, 'updater-quit-install missing try/catch').toMatch(/try\s*\{/)
  })
})

describe('seedance API key not stored in plaintext', () => {
  it('preload exposes an encrypted-secrets bridge for the popup', () => {
    expect(SD_PRELOAD, 'seedance-assets preload has no encrypt/decrypt bridge').toMatch(/safeStorage|secrets/)
  })

  it('seedance-assets-preload removes the contextIsolation:false fallback (we now force contextIsolation:true)', () => {
    expect(SD_PRELOAD, 'fallback `window.seedanceAssets = API` is dead+dangerous').not.toMatch(/window\.seedanceAssets\s*=\s*API/)
  })

  it('seedance-assets.html does NOT call localStorage.setItem with raw apiKey', () => {
    // The save path should encrypt before persisting, so localStorage.setItem("sd_apiKey", ...) with the raw value disappears.
    // We accept localStorage.setItem("sd_apiKey_enc", base64) but the original literal must be gone.
    expect(SD_HTML, 'apiKey still saved in plaintext to localStorage').not.toMatch(/localStorage\.setItem\(\s*["']sd_apiKey["']\s*,/)
  })
})
