import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const HUD = readFileSync(resolve(__dirname, '../../../out/renderer/assets/progress-hud.js'), 'utf8')

describe('progress-hud.js TDZ regression', () => {
  it('handleTaskUpdate declares `card` BEFORE referencing it (TDZ ReferenceError otherwise)', () => {
    const fnStart = HUD.indexOf('function handleTaskUpdate')
    expect(fnStart, 'handleTaskUpdate not found').toBeGreaterThan(-1)
    const fnEnd = HUD.indexOf('\n  }\n', fnStart)
    const body = HUD.slice(fnStart, fnEnd)
    const declIdx = body.indexOf('let card = cards.get')
    expect(declIdx, '`let card = cards.get(id)` declaration not found').toBeGreaterThan(-1)
    // Any reference to bare `card.data` or `card.el` BEFORE the `let card` is a TDZ access.
    const before = body.slice(0, declIdx)
    expect(before, 'card.data / card.el accessed before `let card` declaration — TDZ ReferenceError on every progress update').not.toMatch(/(?<![a-zA-Z_$])card\.(data|el)/)
  })

  it('post-declaration card access uses optional chain or nullish guard', () => {
    // After `let card = cards.get(id)`, `card` may be undefined. Accessing card.data must be guarded.
    const fnStart = HUD.indexOf('function handleTaskUpdate')
    const fnEnd = HUD.indexOf('\n  }\n', fnStart)
    const body = HUD.slice(fnStart, fnEnd)
    // Look for unsafe `card.data` not preceded by `card &&` or `card?.`
    const unsafePattern = /(?<![?&]\s*)(?<!card\s*&&\s*)card\.(data|el)\.[a-zA-Z]/g
    const matches = body.match(unsafePattern) || []
    expect(matches.length, 'unguarded card.data.X access can throw if cards.get(id) returns undefined').toBe(0)
  })
})
