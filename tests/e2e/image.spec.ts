import { expect, test } from '@playwright/test'
import { makeImage, makeQuadrants, pixelAt, readDownload } from './imageHelpers'

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
  await expect(page.getByLabel('Size unit', { exact: true })).toHaveValue('kb')
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

test('inches and centimetres convert at the chosen dpi and tag the saved JPEG', async ({
  page,
}) => {
  await page
    .getByRole('tabpanel')
    .getByTestId('file-input')
    .setInputFiles(await makeImage(page, 'p.png', 1200, 900, 'image/png'))
  await expect(page.getByText('PNG · 1200×900')).toBeVisible()
  await page.getByLabel('Print resolution').selectOption('300')

  await page.getByRole('tab', { name: 'Inches' }).click()
  await expect(page.getByLabel('Width', { exact: true })).toHaveValue('4')
  await page.getByLabel('Width', { exact: true }).fill('2')
  await expect(page.getByLabel('Height', { exact: true })).toHaveValue('1.5')
  await expect(page.getByTestId('print-size')).toContainText(
    '600×450 px = 2×1.5 in = 5.08×3.81 cm at 300 dpi',
  )

  await page.getByRole('tab', { name: 'cm' }).click()
  await expect(page.getByLabel('Width', { exact: true })).toHaveValue('5.08')
  await page.getByLabel('Width', { exact: true }).fill('10')
  await expect(page.getByTestId('print-size')).toContainText('1181×886 px')

  // Changing dpi keeps the physical size, so the pixels follow.
  await page.getByLabel('Print resolution').selectOption('150')
  await expect(page.getByTestId('print-size')).toContainText('591×443 px')

  const file = await readDownload(page, () =>
    page.getByRole('button', { name: /Download JPEG/ }).click(),
  )
  // JFIF header: units = 1 (dpi), density = 150.
  expect(file.data[13]).toBe(1)
  expect(file.data.readUInt16BE(14)).toBe(150)
})

test('dragging on the image crops it; the crop feeds the resize and the output', async ({
  page,
}) => {
  await page
    .getByRole('tabpanel')
    .getByTestId('file-input')
    .setInputFiles(await makeImage(page, 'c.png', 1000, 800, 'image/png'))
  await expect(page.getByText('PNG · 1000×800')).toBeVisible()

  // Tapping the preview image enters crop mode.
  await page.getByRole('button', { name: /Resized image preview: tap to crop/ }).click()
  const frame = page.getByTestId('crop-frame')
  await expect(frame).toBeVisible()

  const box = (await frame.boundingBox()) as { x: number; y: number; width: number; height: number }
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByTestId('crop-rect')).toBeVisible()
  await expect(
    page.getByRole('status').filter({ hasText: /^Keeping \d+×\d+ px of 1000×800/ }),
  ).toBeVisible()

  // Exact numbers and a ratio.
  await page.getByRole('tab', { name: '1:1' }).click()
  const visible = (label: string) =>
    page.getByRole('region', { name: 'Crop controls' }).getByLabel(label, { exact: true })
  await expect
    .poll(
      async () => (await visible('Width').inputValue()) === (await visible('Height').inputValue()),
    )
    .toBe(true)
  const w = Number(await visible('Width').inputValue())

  await page.getByRole('button', { name: 'Apply crop' }).click()
  await expect(
    page.getByRole('region', { name: 'Image settings' }).or(page.getByLabel('Image settings')),
  ).toBeVisible()
  await expect(page.getByTestId('action-size')).toContainText(`${w}×${w}`, { timeout: 15000 })

  // Resizing is relative to the kept region.
  await page.getByRole('button', { name: '50%' }).click()
  await expect(page.getByTestId('action-size')).toContainText(`${Math.round(w / 2)}×`, {
    timeout: 15000,
  })

  // Removing the crop restores the whole image.
  await page.getByRole('button', { name: 'Remove crop' }).click()
  await expect(page.getByTestId('action-size')).toContainText('1000×800', { timeout: 15000 })
})

test('rotate and flip change the output pixels and swap the size; crop follows what you see', async ({
  page,
}) => {
  await page
    .getByRole('tabpanel')
    .getByTestId('file-input')
    .setInputFiles(await makeQuadrants(page, 'q.png', 400, 200))
  await expect(page.getByText('PNG · 400×200')).toBeVisible()
  await page.getByLabel('Format').selectOption('png')

  await page.getByRole('button', { name: 'Rotate right' }).click()
  await expect(page.getByTestId('orientation-state')).toHaveText('rotated 90° clockwise')
  await expect(page.getByTestId('action-size')).toContainText('200×400', { timeout: 15000 })

  // After a clockwise quarter turn the red top-left quadrant is at the top-right.
  const turned = await readDownload(page, () =>
    page.getByRole('button', { name: /Download PNG/ }).click(),
  )
  expect(await pixelAt(page, turned.data, 190, 10)).toEqual([255, 0, 0])
  expect(await pixelAt(page, turned.data, 10, 10)).toEqual([0, 0, 255])

  // Flipping left-right on top of that moves red to the top-left.
  await page.getByRole('button', { name: 'Flip horizontal' }).click()
  await expect(page.getByTestId('orientation-state')).toHaveText(
    'rotated 90° clockwise, flipped left-right',
  )
  const flipped = await readDownload(page, () =>
    page.getByRole('button', { name: /Download PNG/ }).click(),
  )
  expect(await pixelAt(page, flipped.data, 10, 10)).toEqual([255, 0, 0])

  // Cropping uses the turned picture: its size is 200×400.
  await page.getByRole('button', { name: 'Crop image' }).click()
  await expect(page.getByTestId('crop-frame')).toBeVisible()
  await page.getByRole('button', { name: 'Select all' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Keeping 200×400 px of 200×400' }),
  ).toBeVisible()
  await page.getByRole('tab', { name: '1:1' }).click()
  await page.getByRole('button', { name: 'Apply crop' }).click()
  await expect(page.getByTestId('action-size')).toContainText('200×200', { timeout: 15000 })

  await page.getByRole('button', { name: 'Reset orientation' }).click()
  await expect(page.getByTestId('orientation-state')).toHaveText('original orientation')
  await expect(page.getByTestId('action-size')).toContainText('200×200', { timeout: 15000 })
})
