import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { format } from '../../src/core'

/**
 * Each `name.in` is formatted and compared with `name.out.json` byte for byte. Optional:
 * `name.options.json` (format options) and `name.codes.json` (exact list of diagnostic codes).
 */
const dir = fileURLToPath(new URL('../fixtures/', import.meta.url))
const read = (file: string) => readFileSync(dir + file, 'utf8')
const readJson = (file: string) => (existsSync(dir + file) ? JSON.parse(read(file)) : undefined)

const names = readdirSync(dir)
  .filter((f) => f.endsWith('.in'))
  .map((f) => f.slice(0, -'.in'.length))
  .sort()

describe('fixtures', () => {
  it.each(names)('%s', (name) => {
    const result = format(read(`${name}.in`), readJson(`${name}.options.json`))
    expect(result.error).toBeUndefined()
    expect(result.ok).toBe(true)
    expect(result.output).toBe(read(`${name}.out.json`))
    const codes = readJson(`${name}.codes.json`)
    if (codes) expect(result.diagnostics.map((d) => d.code)).toEqual(codes)
  })
})
