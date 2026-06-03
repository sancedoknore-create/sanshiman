import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SRC = readFileSync(resolve(__dirname, '../index.js'), 'utf8')

function methodBody(name) {
  const sig = `static async ${name}(`
  const start = SRC.indexOf(sig)
  if (start < 0) return ''
  const next = SRC.indexOf('\n  static ', start + 1)
  return SRC.slice(start, next === -1 ? undefined : next)
}

describe('progress alignment with relay station', () => {
  it('pollVideoTask does NOT remap server progress (no `30 + serverProgress * 0.65` style compression)', () => {
    const body = methodBody('pollVideoTask')
    expect(body, 'pollVideoTask not found').not.toBe('')
    // The old buggy formula compressed server's 0-100 into local 30-95, breaking parity with the relay station.
    expect(body, 'video progress is still remapped — relay shows 60% but UI shows ~69%').not.toMatch(/30\s*\+\s*serverProgress\s*\*\s*0\.65/)
    // Should still read server progress.
    expect(body).toMatch(/data\??\.(?:data\??\.)?progress/)
  })

  it('pollVideoTask uses server progress verbatim (rounded to int) when present', () => {
    const body = methodBody('pollVideoTask')
    // We expect either `progress = serverProgress` or `progress = Math.round(serverProgress)` or similar 1:1 assignment, NOT a multiplied form.
    expect(body).toMatch(/progress\s*=\s*(?:Math\.round\()?\s*serverProgress|progress\s*=\s*Math\.max\([^)]*serverProgress/)
  })

  it('pollBananaImage reads server progress (was previously ignored)', () => {
    const body = methodBody('pollBananaImage')
    expect(body, 'pollBananaImage not found').not.toBe('')
    expect(body, 'image polling never reads data.progress — relay station number is invisible to user').toMatch(/data\??\.(?:data\??\.)?progress/)
  })

  it('pollBananaImage falls back to slow tick when server omits progress (with explicit hint)', () => {
    const body = methodBody('pollBananaImage')
    // When server doesn't expose progress, we still increment locally — but the hint should warn the user.
    expect(body).toMatch(/progress\s*\+\s*1|progress\s*\+=\s*1/)
  })
})
