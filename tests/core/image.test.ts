// The image core tests now live in tests/core/image/ (one file per topic). This smoke test only
// checks that every module loads; it can be deleted.
import { expect, it } from 'vitest'

it('loads every image core module', async () => {
  const mods = await Promise.all(
    ['crop', 'dims', 'dpi', 'fitToTarget', 'pageRange', 'pdfWriter', 'size', 'zip'].map(
      (m) => import(`../../src/core/image/${m}.ts`),
    ),
  )
  expect(mods.every((m) => Object.keys(m).length > 0)).toBe(true)
})
