import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SRC = readFileSync(resolve(__dirname, '../index.js'), 'utf8')

describe('bug #1: seed must be destructured from payload before use', () => {
  it('every bare `seed` reference inside execute() is preceded by a destructure that includes seed', () => {
    const execStart = SRC.indexOf('static async execute(task, apiConfigs, updateCallback)')
    expect(execStart, 'execute() not found').toBeGreaterThan(-1)

    const execBody = SRC.slice(execStart, SRC.indexOf('\n  static ', execStart + 1))

    const destructureMatch = execBody.match(/const\s*{([\s\S]*?)}\s*=\s*payload\s*;/)
    expect(destructureMatch, 'payload destructure not found in execute()').not.toBeNull()

    const destructuredKeys = destructureMatch[1]
      .split(',')
      .map(s => s.trim().split(/[:=]/)[0].trim())
      .filter(Boolean)

    const usesBareSeed = /(^|[^.\w$])seed(?![\w$])/m.test(execBody)
    if (usesBareSeed) {
      expect(destructuredKeys, 'execute() uses bare `seed` but payload destructure is missing it').toContain('seed')
    }
  })
})

describe('bug #2: poll error counters must be per-task closure-local, not on the class (this)', () => {
  for (const method of ['pollVideoTask', 'pollBananaImage']) {
    it(`${method} does not use this._*ErrorCount (would be shared across concurrent tasks)`, () => {
      const sig = `static async ${method}(`
      const start = SRC.indexOf(sig)
      expect(start, `${method} not found`).toBeGreaterThan(-1)

      const nextStaticIdx = SRC.indexOf('\n  static ', start + 1)
      const body = SRC.slice(start, nextStaticIdx === -1 ? undefined : nextStaticIdx)

      const sharedRefs = body.match(/this\._\w*ErrorCount/g) || []
      expect(sharedRefs, `${method} references class-level error counter, will collide between concurrent tasks`).toEqual([])
    })
  }
})
