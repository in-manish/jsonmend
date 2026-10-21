import { expect, test } from '@playwright/test'
import { makeImage, readDownload } from './imageHelpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/image-tools')
})

test('images become a PDF, and that PDF converts back to page images and a ZIP', async ({
  page,
}) => {
  const problems: string[] = []
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))

  await page.getByRole('tab', { name: 'Images to PDF' }).click()
  const a = await makeImage(page, 'a.jpg', 800, 600, 'image/jpeg')
  const b = await makeImage(page, 'b.png', 600, 800, 'image/png')
  await page.getByRole('tabpanel').getByTestId('file-input').setInputFiles([a, b])
  await expect(page.getByRole('listitem')).toHaveCount(2)

  await page.getByRole('button', { name: 'Move a.jpg down' }).click()
  await expect(page.getByRole('listitem').first()).toContainText('b.png')

  const result = page.getByRole('region', { name: 'Result' })
  await expect(result).toContainText('Calculated size')
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled({ timeout: 20000 })
  const pdf = await readDownload(page, () =>
    page.getByRole('button', { name: 'Download PDF' }).click(),
  )
  expect(pdf.data.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4')
  expect(pdf.data.toString('latin1')).toContain('/Count 2')

  // Round trip through pdf.js.
  await page.getByRole('tab', { name: 'PDF to images' }).click()
  await page
    .getByRole('tabpanel')
    .getByTestId('file-input')
    .setInputFiles({ name: 'doc.pdf', mimeType: 'application/pdf', buffer: pdf.data })
  await expect(page.getByText(/^2 pages · /)).toBeVisible({ timeout: 20000 })
  await page.getByLabel('Pages').fill('9')
  await expect(page.getByText('outside pages 1-2')).toBeVisible()
  await page.getByLabel('Pages').fill('')
  await page.getByRole('button', { name: 'Convert 2 pages' }).click()
  await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 30000 })
  await expect(page.getByAltText('Page 2')).toBeVisible()

  const zip = await readDownload(page, () =>
    page.getByRole('button', { name: 'Download all (ZIP)' }).click(),
  )
  expect(zip.name).toBe('doc-pages.zip')
  expect(zip.data.readUInt32LE(0)).toBe(0x04034b50)
  expect(zip.data.toString('latin1')).toContain('doc-page-2.png')

  expect(problems.filter((p) => /Content Security Policy|Refused/i.test(p))).toEqual([])
})
