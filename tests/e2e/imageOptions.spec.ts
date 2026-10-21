import { expect, test } from '@playwright/test'
import { makeImage, readDownload } from './imageHelpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/image-tools')
  await page
    .getByRole('tabpanel')
    .getByTestId('file-input')
    .setInputFiles(await makeImage(page, 'o.png', 1200, 900, 'image/png'))
  await expect(page.getByText('PNG · 1200×900')).toBeVisible()
})

test('DPI is offered in every unit and written into the JPG even when sizing in pixels', async ({
  page,
}) => {
  const dpi = page.getByLabel('Print resolution')
  await expect(dpi).toHaveValue('0')
  await dpi.selectOption('300')
  await expect(page.getByTestId('print-size')).toContainText('1200×900 px = 4×3 in')
  // Pixels are unchanged by a dpi change while sizing in pixels.
  await expect(page.getByTestId('action-size')).toContainText('1200×900', { timeout: 15000 })
  const file = await readDownload(page, () =>
    page.getByRole('button', { name: /Download JPG/ }).click(),
  )
  expect(file.data[13]).toBe(1)
  expect(file.data.readUInt16BE(14)).toBe(300)
})

/** "· 1.10 MB" or "· 559 KB" in a label, in KB. */
const kb = (text: string | null) => {
  const m = /· ([\d.]+) (KB|MB)/.exec(text ?? '')
  return m ? Number(m[1]) * (m[2] === 'MB' ? 1024 : 1) : Number.NaN
}

test('compress by a percentage of the original size', async ({ page }) => {
  const original = kb(await page.getByText(/^PNG · 1200×900 ·/).textContent())
  expect(original).toBeGreaterThan(0)
  await page.getByRole('button', { name: '50% smaller' }).click()
  await expect(page.getByRole('button', { name: '50% smaller' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const status = page.getByRole('region', { name: 'Result' }).getByRole('status')
  await expect(status).toContainText('under your', { timeout: 20000 })
  const out = kb(await page.getByTestId('action-size').textContent())
  expect(out).toBeLessThanOrEqual(original / 2 + 0.1)
})

test('PNG explains why there is no quality slider', async ({ page }) => {
  await page.locator('label', { hasText: 'PNG' }).click()
  await expect(page.getByLabel('Quality')).toHaveCount(0)
  await expect(page.getByText('PNG has no quality setting')).toBeVisible()
  await page.locator('label', { hasText: 'JPG' }).click()
  await expect(page.getByLabel('Quality')).toBeVisible()
})
