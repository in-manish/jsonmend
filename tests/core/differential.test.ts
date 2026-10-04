import { jsonrepair } from 'jsonrepair'
import { describe, expect, it } from 'vitest'
import { format } from '../../src/core'

/** Broken-JSON inputs where jsonmend and jsonrepair should agree on the repaired value. */
const CASES = [
  '{"a": 1, "b": 2',
  '[1, 2, 3',
  '{"a": [1, 2, {"b": "c"',
  '{"a": 1,}',
  '[1, 2, 3,]',
  "{'a': 'b'}",
  '{a: 1}',
  '{"a": 1 "b": 2}',
  '[1 2 3]',
  '{"a": "hel',
  '// comment\n{"a": 1}',
  '{"a": /* x */ 1}',
  '{"a": True, "b": None, "c": False}',
  '```json\n{"a": 1}\n```',
  '{"a":1}\n{"b":2}',
  '{"a": "line\nbreak"}',
  '[1, 2, 3]]',
  '{"a": 1}}',
  '{“a”: “b”}',
]

describe('differential vs jsonrepair', () => {
  it.each(CASES)('%j', (input) => {
    const ours = format(input)
    expect(ours.ok).toBe(true)
    expect(JSON.parse(ours.output)).toEqual(JSON.parse(jsonrepair(input)))
  })
})
