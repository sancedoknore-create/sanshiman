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

describe('task error reporting — no silent hang', () => {
  // We want any "non-progressing" terminal state from the server to surface as a real error,
  // not silently spin until maxAttempts.

  for (const method of ['pollVideoTask', 'pollBananaImage']) {
    it(`${method} recognizes EXPIRED / TIMEOUT / REJECTED / BLOCKED as failures`, () => {
      const body = methodBody(method)
      expect(body, `${method} not found`).not.toBe('')
      // The handler must reject when seeing any of these terminal states.
      // We allow any matching style: a list, a regex, a switch — just check that all are recognized.
      for (const term of ['EXPIRED', 'TIMEOUT', 'REJECTED', 'BLOCKED']) {
        expect(body, `${method} silently spins on status=${term} until timeout — user sees no error`).toMatch(new RegExp(term))
      }
    })

    it(`${method} surfaces error message even when status is not a known failure (independent error field check)`, () => {
      const body = methodBody(method)
      // Look for an error-detection branch that fires regardless of status, e.g. if data.error.message or data.fail_reason is present.
      // Pattern: a check on data.error / data.fail_reason / data.error_message NOT inside the existing status-based failure branch only.
      expect(body, `${method} ignores top-level error fields when status doesn't match — server-reported errors get lost`)
        .toMatch(/(?:data\??\.(?:fail_reason|error_message)|data\??\.error\??\.(?:code|message))[\s\S]{0,200}reject/i)
    })
  }

  it('pollBananaImage does not omit CANCELLED from its terminal-failure list', () => {
    // pollVideoTask handles CANCELLED but pollBananaImage previously didn't.
    const body = methodBody('pollBananaImage')
    expect(body).toMatch(/CANCELLED|cancelled/i)
  })
})
