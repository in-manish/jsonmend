import { expect, test } from '@playwright/test'
import { makeImage } from './imageHelpers'

const path = (page: import('@playwright/test').Page) => new URL(page.url()).pathname

test('a link to a file a form asks for opens it, with its own title', async ({ page }) => {
  await page.goto('/photo-for/ibps/signature')
  await expect(page.getByRole('heading', { name: 'Photo for a form' })).toBeVisible()
  await expect(page.getByLabel('Which form')).toHaveValue('ibps')
  await expect(page.getByRole('button', { name: 'Signature' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByText('140 × 60 px, JPG, 10–20 KB')).toBeVisible()
  await expect(page).toHaveTitle('IBPS (bank exams) signature: 140 × 60 px, 10–20 KB · jsonmend')

  await page.goto('/photo-for/neet')
  await expect(page.getByLabel('Which form')).toHaveValue('neet')
  await page.goto('/photo-for')
  await expect(page.getByLabel('Which form')).toHaveValue('ibps')
})

test('choosing a form or a file changes the address, and Back goes back', async ({ page }) => {
  await page.goto('/photo-for')
  await page.getByLabel('Which form').selectOption('upsc')
  expect(path(page)).toBe('/photo-for/upsc')
  await page.getByRole('button', { name: 'Signature' }).click()
  expect(path(page)).toBe('/photo-for/upsc/signature')
  await expect(page.getByText('20–100 KB')).toBeVisible()
  await page.goBack()
  expect(path(page)).toBe('/photo-for/upsc')
  await expect(page.getByRole('button', { name: 'Photo', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('each image mode has its own link, and switching modes updates it', async ({ page }) => {
  await page.goto('/image-tools/many-photos')
  await expect(page.getByRole('tab', { name: 'Many photos at once' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('tab', { name: 'PDF to images' }).click()
  expect(path(page)).toBe('/image-tools/pdf-to-images')
  await page.getByRole('tab', { name: 'Resize, convert, compress' }).click()
  expect(path(page)).toBe('/image-tools')
  await page.goBack()
  await expect(page.getByRole('tab', { name: 'PDF to images' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('older and shorter addresses are spelled out', async ({ page }) => {
  await page.goto('/pdf-to-image')
  await expect.poll(() => path(page)).toBe('/image-tools/pdf-to-images')
  await expect(page.getByRole('tab', { name: 'PDF to images' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('every link has a real page for search engines, not just the app shell', async ({ page }) => {
  for (const [url, title] of [
    ['/photo-for/ibps/signature/', 'IBPS (bank exams) signature'],
    ['/photo-for/passport/', 'Indian passport (Seva): photo and signature size'],
    ['/image-tools/many-photos/', 'Resize and compress many photos at once'],
  ]) {
    const res = await page.request.get(url)
    expect(res.status(), url).toBe(200)
    expect(await res.text()).toContain(`<title>${title}`)
  }
})

test('a photo that is already open can be fitted to a form from the editor', async ({ page }) => {
  await page.goto('/image-tools')
  await page
    .getByRole('tabpanel')
    .getByTestId('file-input')
    .setInputFiles(await makeImage(page, 'mine.png', 800, 1000, 'image/png'))
  await expect(page.getByText('PNG · 800×1000')).toBeVisible()

  await page.getByRole('button', { name: /Fit to a form/ }).click()
  expect(path(page)).toBe('/photo-for')
  await page.getByLabel('Which form').selectOption('passport')
  // The open photo is offered; no need to choose it again.
  await page.getByRole('button', { name: 'Use mine.png' }).click()
  await expect(page.getByTestId('form-status')).toContainText('✓ 630 × 810 px', { timeout: 20000 })

  // Back (twice) returns to the editor with the same photo still open.
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: /Back/ }).click()
  expect(path(page)).toBe('/image-tools')
  await expect(page.getByText('PNG · 800×1000')).toBeVisible()
})
