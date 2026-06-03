import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SRC = readFileSync(resolve(__dirname, '../index.js'), 'utf8')
const RENDERER = readFileSync(resolve(__dirname, '../../../out/renderer/assets/index-BujjGe6O.js'), 'utf8')

describe('Cool API integration', () => {
  describe('renderer presets', () => {
    it('exposes r_sd2 video model with Cool API base URL', () => {
      expect(RENDERER).toMatch(/id:"cool-r-sd2"/)
      expect(RENDERER).toMatch(/modelName:"r_sd2"/)
      expect(RENDERER).toMatch(/url:"https:\/\/api\.mjapi\.cc\.cd"/)
    })

    it('exposes seedance_2 video model with Cool API base URL', () => {
      expect(RENDERER).toMatch(/id:"cool-seedance-2"/)
      expect(RENDERER).toMatch(/modelName:"seedance_2"/)
    })

    it('initializeConfigs auto-injects cool-r-sd2 and cool-seedance-2 for existing users', () => {
      // Existing users have apiConfigs saved in DB; new defaults won't appear unless the migration chain inserts them.
      // The bundle has if(!o.some(v=>v.id==="X")) blocks for each migration entry. Verify our 2 new ones are in.
      expect(RENDERER, 'cool-r-sd2 missing from auto-inject migration chain')
        .toMatch(/!o\.some\(v=>v\.id==="cool-r-sd2"\)/)
      expect(RENDERER, 'cool-seedance-2 missing from auto-inject migration chain')
        .toMatch(/!o\.some\(v=>v\.id==="cool-seedance-2"\)/)
    })

    it('r_sd2 only allows duration > 10s (per API doc)', () => {
      const m = RENDERER.match(/id:"cool-r-sd2"[^}]*durations:\[([^\]]+)\]/)
      expect(m, 'cool-r-sd2 durations not found').not.toBeNull()
      const list = m[1]
      // Must NOT contain "5s" / "8s" — only > 10s
      expect(list).not.toMatch(/"5s"/)
      expect(list).not.toMatch(/"8s"/)
      expect(list).toMatch(/"11s"|"12s"|"15s"/)
    })
  })

  describe('main process Cool API branch', () => {
    it('detects api.mjapi.cc.cd as Cool API', () => {
      expect(SRC).toMatch(/_isCoolApi\s*=\s*rootUrl\.includes\("api\.mjapi\.cc\.cd"\)/)
    })

    it('Cool API branch routes to dedicated submit/poll, bypassing seedance/volctokens chain', () => {
      const idx = SRC.indexOf('_isCoolApi = rootUrl.includes')
      expect(idx).toBeGreaterThan(-1)
      // Within 600 chars after detection, we expect the early-return calling _submitCoolApiTask
      const block = SRC.slice(idx, idx + 600)
      expect(block).toMatch(/if\s*\(_isCoolApi\)/)
      expect(block).toMatch(/_submitCoolApiTask/)
      expect(block).toMatch(/return await/)
    })

    it('uses POST /v1/cool/generate for submit', () => {
      expect(SRC).toMatch(/`\$\{rootUrl\}\/v1\/cool\/generate`/)
    })

    it('uses GET /v1/cool/task/{taskId} for polling', () => {
      expect(SRC).toMatch(/`\$\{rootUrl\}\/v1\/cool\/task\/\$\{taskId\}`/)
    })

    it('extracts result.url from Cool API success response', () => {
      const start = SRC.indexOf('static async pollCoolApiTask')
      expect(start).toBeGreaterThan(-1)
      const end = SRC.indexOf('\n  static ', start + 1)
      const body = SRC.slice(start, end)
      expect(body).toMatch(/data\?\.result\?\.url/)
    })

    it('clamps r_sd2 duration to >10s and resolution to 480p/720p', () => {
      // Find the method definition (not the call site)
      const start = SRC.indexOf('async _submitCoolApiTask(')
      expect(start, '_submitCoolApiTask method definition not found').toBeGreaterThan(-1)
      const end = SRC.indexOf('\n  static ', start + 1)
      const body = SRC.slice(start, end > -1 ? end : start + 6000)
      // Duration: r_sd2 with <=10s gets bumped to 11
      expect(body, 'r_sd2 duration not clamped to >10').toMatch(/_coolModel\s*===\s*"r_sd2"[\s\S]*?_coolDuration\s*=\s*11/)
      // Resolution: r_sd2 with non-480/720 gets forced to 720p
      expect(body, 'r_sd2 resolution not clamped to 480/720').toMatch(/_coolModel\s*===\s*"r_sd2"[\s\S]*?_coolResolution\s*=\s*"720p"/)
    })

    it('rejects "auto"/"adaptive" resolution and defaults to 720p (Cool API only accepts 480p/720p/1080p)', () => {
      const start = SRC.indexOf('async _submitCoolApiTask(')
      const end = SRC.indexOf('\n  static ', start + 1)
      const body = SRC.slice(start, end > -1 ? end : start + 6000)
      // After resolution mapping, code must filter to whitelist or fall back to 720p
      expect(body, 'no whitelist guard for resolution — passes "auto" to Cool API which rejects it').toMatch(/\["480p",\s*"720p",\s*"1080p"\]\.includes\(_coolResolution\)/)
    })

    it('expanded fail status whitelist (EXPIRED/TIMEOUT/REJECTED/etc) for Cool poll', () => {
      const start = SRC.indexOf('static async pollCoolApiTask')
      const end = SRC.indexOf('\n  static ', start + 1)
      const body = SRC.slice(start, end)
      for (const term of ['EXPIRED', 'TIMEOUT', 'REJECTED', 'BLOCKED']) {
        expect(body, `Cool poll missing ${term} fail status`).toMatch(new RegExp(term))
      }
    })

    it('uploads local files via /v1/cool/upload before submit', () => {
      expect(SRC).toMatch(/_uploadFileToCoolApi/)
      expect(SRC).toMatch(/`\$\{rootUrl\}\/v1\/cool\/upload`/)
    })

    it('_submitCoolApiTask is declared static (callable from static execute via this.X)', () => {
      // execute() is static, so `this` = class. Helper must be static for this.X to find it.
      expect(SRC, '_submitCoolApiTask must be static — `this._submitCoolApiTask is not a function` otherwise')
        .toMatch(/static async _submitCoolApiTask\(/)
    })
  })
})
