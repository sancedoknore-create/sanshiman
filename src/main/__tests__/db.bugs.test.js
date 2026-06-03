import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SRC = readFileSync(resolve(__dirname, '../db.js'), 'utf8')

describe('bug: INSERT OR REPLACE on FK-cascading tables wipes child rows', () => {
  // The schema has ON DELETE CASCADE on nodes.project_id and connections.project_id.
  // INSERT OR REPLACE first DELETEs the old row, which cascades. We must use UPSERT instead.
  for (const table of ['projects', 'nodes', 'connections']) {
    it(`saveStatement for ${table} uses UPSERT (ON CONFLICT ... DO UPDATE), not INSERT OR REPLACE`, () => {
      // Find the prepare for this table's save
      const saveRe = new RegExp(`prepare\\("(?:INSERT[^"]*${table}[^"]*)"\\)`, 'i')
      const m = SRC.match(saveRe)
      expect(m, `save prepare for ${table} not found`).not.toBeNull()
      const sql = m[0]
      expect(sql, `${table} still uses INSERT OR REPLACE — will trigger FK CASCADE on existing rows`).not.toMatch(/INSERT\s+OR\s+REPLACE/i)
      expect(sql).toMatch(/ON CONFLICT.*DO UPDATE/i)
    })
  }
})

describe('bug: migration must not bump user_version when a column ALTER fails', () => {
  it('migrateColumn does not silently catch + warn; failure must propagate', () => {
    // Find the migrateColumn arrow function
    const startIdx = SRC.indexOf('const migrateColumn')
    expect(startIdx, 'migrateColumn not found').toBeGreaterThan(-1)
    const endIdx = SRC.indexOf('};', startIdx) + 2
    const fnBody = SRC.slice(startIdx, endIdx)
    // It must NOT have a try/catch that just console.warns
    const hasSilentCatch = /catch\s*\([^)]*\)\s*\{\s*console\.(warn|log)/.test(fnBody)
    expect(hasSilentCatch, 'migrateColumn swallows errors with console.warn — version still bumps after failure → permanent dirty state').toBe(false)
  })

  it('user_version is set inside the same try block as the migration, AFTER the ALTERs', () => {
    // The version bump should appear AFTER the migrateColumn calls in the same scope
    const versionBumpIdx = SRC.indexOf('user_version =')
    const lastMigrateIdx = SRC.lastIndexOf('migrateColumn(')
    expect(versionBumpIdx).toBeGreaterThan(-1)
    expect(lastMigrateIdx).toBeGreaterThan(-1)
    expect(versionBumpIdx, 'user_version bumps before migrations finish').toBeGreaterThan(lastMigrateIdx)
  })
})

describe('bug: WAL checkpoint timer leaks; db never closed on quit', () => {
  it('captures the setInterval handle so it can be cleared on shutdown', () => {
    // Look for a captured handle for the wal_checkpoint setInterval
    const checkpointRe = /(?:const|let|var)\s+\w+\s*=\s*setInterval\([\s\S]*?wal_checkpoint/m
    expect(SRC, 'wal_checkpoint setInterval result is not stored — cannot clear on exit').toMatch(checkpointRe)
  })

  it('registers a before-quit hook to flush WAL and close the db', () => {
    expect(SRC).toMatch(/before-quit/)
    expect(SRC).toMatch(/wal_checkpoint\s*\(\s*TRUNCATE\s*\)/i)
    expect(SRC).toMatch(/db\.close\(\)/)
  })
})

describe('bug: node.width/height = 0 is silently turned to null by ||', () => {
  it('serializeNode uses ?? not || for width/height defaults', () => {
    const startIdx = SRC.indexOf('function serializeNode')
    const endIdx = SRC.indexOf('}', startIdx + 200)
    const body = SRC.slice(startIdx, endIdx)
    expect(body).toMatch(/width:\s*node\.width\s*\?\?/)
    expect(body).toMatch(/height:\s*node\.height\s*\?\?/)
  })
})
