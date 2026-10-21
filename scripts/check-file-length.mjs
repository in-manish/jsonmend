// Fails when a source file is longer than MAX_LINES (rule in CLAUDE.md: split big files into a folder).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MAX_LINES = 250
const ROOTS = ['src', 'tests', 'scripts']
const EXT = /\.(ts|tsx|mjs)$/
/** Files that were over the limit before the rule existed. Split them, then delete the entry. */
const GRANDFATHERED = new Set([
  'tests/e2e/app.spec.ts',
  'src/core/pyindent/fix.ts',
  'src/ui/pyindent/PyIndentTool.tsx',
])

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'fixtures' || name === 'node_modules') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (EXT.test(name)) yield path
  }
}

const tooLong = []
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, 'utf8').split('\n').length - 1
    if (lines > MAX_LINES && !GRANDFATHERED.has(file)) tooLong.push(`${file} (${lines} lines)`)
  }
}
if (tooLong.length) {
  console.error(`Files over ${MAX_LINES} lines; split them into a folder of smaller files:`)
  for (const f of tooLong) console.error(`  ${f}`)
  process.exit(1)
}
