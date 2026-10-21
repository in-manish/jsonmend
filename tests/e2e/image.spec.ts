import { expect, type Page, test } from '@playwright/test'

/** A noisy (so it compresses meaningfully) image made in the page, returned as a file payload. */
async function makeImage(page: Page, name: string, w: number, h: number, type: string) {
  const base64 = await page.evaluate(
    async ([w, h, type]) => {
      const c = document.createElement('canvas')
      c.width = w as number
      c.height = h as number
      const ctx = c.getContext('2d') as CanvasRenderingContext2D
      const data = ctx.createImageData(c.width, c.height)
      for (let i = 0; i < data.data.length; i += 4) {
        const v = (i / 4) % 251
        data.data[i] = v
        data.data[i + 1] = (v * 7) % 256
        data.data[i + 2] = Math.floor(Math.random() * 256)
        data.data[i + 3] = 255
      }
      ctx.putImageData(data, 0, 0)
      const blob: Blob = await new Promise((r) =>
        c.toBlob((b) => r(b as Blob), type as string, 0.95),
      )
      const buf = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (const b of buf) s += String.fromCharCode(b)
      return btoa(s)
    },
    [w, h, type] as const,
  )
  return { name, mimeType: type, buffer: Buffer.from(base64, 'base64') }
}

const readDownload = async (page: Page, click: () => Promise<void>) => {
  const [download] = await Promise.all([page.waitForEvent('download'), click()])
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(c as Buffer)
  return { name: download.suggestedFilename(), data: Buffer.concat(chunks) }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/image-tools')
})

test('resizes with a locked ratio, converts, and compresses to a target size in KB', async ({
  page,
}) => {
  const problems: string[] = []
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))

  const photo = await makeImage(page, 'photo.png', 1200, 800, 'image/png')
  const panel = page.getByRole('tabpanel')
  await panel.getByTestId('file-input').setInputFiles(photo)
  await expect(page.getByText('PNG · 1200×800')).toBeVisible()

  await page.getByLabel('Width', { exact: true }).fill('600')
  await expect(page.getByLabel('Height', { exact: true })).toHaveValue('400')

  await page.getByLabel('Format').selectOption('webp')
  await expect(page.getByLabel('Size unit')).toHaveValue('kb')
  await page.getByLabel('Compress the image to a target size').check()
  await page.getByLabel('Target', { exact: true }).fill('40')

  const result = page.getByRole('region', { name: 'Result' })
  await expect(result.getByRole('status')).toContainText('Within the 40.0 KB target', {
    timeout: 20000,
  })
  await expect(result).toContainText('600×400')

  const file = await readDownload(page, () =>
    page.getByRole('button', { name: /Download WebP/ }).click(),
  )
  expect(file.name).toBe('photo-600x400.webp')
  expect(file.data.length).toBeLessThanOrEqual(40 * 1024)
  expect(file.data.subarray(0, 4).toString('latin1')).toBe('RIFF')

  // An impossible target without shrinking is reported, not hidden.
  await page.getByLabel('Reduce dimensions if needed').uncheck()
  await page.getByLabel('Target', { exact: true }).fill('0.5')
  await expect(result.getByRole('status')).toContainText('Could not reach', { timeout: 20000 })

  // Preview modes.
  await page.getByRole('button', { name: 'Side by side' }).click()
  await expect(page.getByAltText('Original image')).toBeVisible()
  await expect(page.getByAltText('Resized image preview')).toBeVisible()

  expect(problems.filter((p) => /Content Security Policy/i.test(p))).toEqual([])
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
