import { expect, type Page, test } from '@playwright/test'
import { jpegSize, makeSnapshot, readDownload } from './imageHelpers'

/** The printed photo inside the snapshot, in picture pixels. */
const PHOTO = { x: 300, y: 130, w: 420, h: 540 }

test.beforeEach(async ({ page }) => {
  await page.goto('/image-tools')
  await page.getByRole('button', { name: /Need a photo for a form/ }).click()
})

const choose = async (page: Page) =>
  page
    .getByRole('tabpanel')
    .getByTestId('file-input')
    .setInputFiles(await makeSnapshot(page, 'phone-shot.jpg', 1000, 800, PHOTO))

test('asks which form, shows what it wants, and keeps the screen plain', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Photo for a form' })).toBeVisible()
  await expect(page.getByLabel('Which form')).toHaveValue('ibps')
  await expect(page.getByText('200 × 230 px, JPG, 20–50 KB')).toBeVisible()
  await page.getByRole('button', { name: 'Signature' }).click()
  await expect(page.getByText('140 × 60 px, JPG, 10–20 KB')).toBeVisible()
  await page.getByLabel('Which form').selectOption('neet')
  await page.getByRole('button', { name: 'Signature' }).click()
  // NEET only limits the file size, and says so.
  await expect(page.getByText('4–30 KB')).toBeVisible()
  await expect(page.getByText(/only limits the file size/)).toBeVisible()
  await page.getByRole('button', { name: /Back/ }).click()
  await expect(
    page.getByRole('button', { name: 'Choose a photo' }).or(page.getByTestId('file-input').first()),
  ).toBeAttached()
})

test('finds the edges of a photographed photo and puts the box on it', async ({ page }) => {
  await page.getByLabel('Which form').selectOption('passport')
  await choose(page)
  await expect(page.getByTestId('form-hint')).toContainText('We found the edges of your photo')

  // The box sits inside the printed photo, around its middle.
  const frame = (await page.getByTestId('crop-frame').boundingBox()) as {
    x: number
    y: number
    width: number
  }
  const box = (await page.getByTestId('crop-rect').boundingBox()) as {
    x: number
    y: number
    width: number
    height: number
  }
  const k = 1000 / frame.width
  const rect = {
    x: (box.x - frame.x) * k,
    y: (box.y - ((await page.getByTestId('crop-frame').boundingBox()) as { y: number }).y) * k,
    w: box.width * k,
    h: box.height * k,
  }
  expect(rect.x).toBeGreaterThanOrEqual(PHOTO.x - 6)
  expect(rect.y).toBeGreaterThanOrEqual(PHOTO.y - 6)
  expect(rect.x + rect.w).toBeLessThanOrEqual(PHOTO.x + PHOTO.w + 6)
  expect(rect.y + rect.h).toBeLessThanOrEqual(PHOTO.y + PHOTO.h + 6)
  expect(rect.w).toBeGreaterThan(PHOTO.w * 0.9)
  expect(rect.h).toBeGreaterThan(PHOTO.h * 0.9)
})

test('downloads the photo at exactly the size and file size the form asks for', async ({
  page,
}) => {
  await page.getByLabel('Which form').selectOption('passport')
  await choose(page)
  await expect(page.getByTestId('form-status')).toContainText('✓ 630 × 810 px', { timeout: 20000 })
  const file = await readDownload(page, () =>
    page.getByRole('button', { name: 'Download JPG' }).click(),
  )
  expect(file.name).toBe('passport-photo.jpg')
  expect(jpegSize(file.data)).toEqual({ width: 630, height: 810 })
  expect(file.data.length).toBeGreaterThanOrEqual(10 * 1024)
  expect(file.data.length).toBeLessThanOrEqual(250 * 1000)
})

test('a tiny signature is padded up to the form minimum, never over the maximum', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Signature' }).click()
  await choose(page)
  await expect(page.getByTestId('form-status')).toContainText('✓ 140 × 60 px', { timeout: 20000 })
  const file = await readDownload(page, () =>
    page.getByRole('button', { name: 'Download JPG' }).click(),
  )
  expect(file.name).toBe('ibps-signature.jpg')
  expect(jpegSize(file.data)).toEqual({ width: 140, height: 60 })
  expect(file.data.length).toBeGreaterThanOrEqual(10 * 1024)
  expect(file.data.length).toBeLessThanOrEqual(20 * 1000)
})
