import { expect, type Page, test } from '@playwright/test'
import { makeImage, readDownload, zipEntries } from './imageHelpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/image-tools')
  await page.getByRole('tab', { name: 'Many photos at once' }).click()
})

const panel = (page: Page) => page.getByRole('tabpanel')
const status = (page: Page) => page.getByTestId('batch-status')
const goal = (page: Page, title: RegExp) => page.getByRole('radio', { name: title })
const zipAll = (page: Page) =>
  readDownload(page, () => page.getByRole('button', { name: 'Download all (ZIP)' }).click())

test('opens with plain steps and one big button, no technical words', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Make many photos smaller/ })).toBeVisible()
  await expect(page.getByText('Choose your photos')).toBeVisible()
  await expect(page.getByText('Tell us what you need')).toBeVisible()
  await expect(panel(page).getByText(/DPI|px|JPG|quality/i)).toHaveCount(0)
})

test('the default choice makes photos smaller for sharing, in one ZIP', async ({ page }) => {
  await panel(page)
    .getByTestId('file-input')
    .setInputFiles([
      await makeImage(page, 'one.png', 2000, 1500, 'image/png'),
      await makeImage(page, 'two.png', 1500, 2000, 'image/png'),
      await makeImage(page, 'three.jpg', 600, 400, 'image/jpeg'),
    ])
  await expect(page.getByText('3 photos', { exact: true })).toBeVisible()
  // Nothing needs choosing: "Send by WhatsApp or email" is already picked.
  await expect(goal(page, /Send by WhatsApp/)).toBeChecked()
  await page.getByRole('button', { name: 'Make 3 photos smaller' }).click()

  await expect(status(page)).toContainText('3 photos ready', { timeout: 30000 })
  const rows = page.getByRole('listitem')
  await expect(rows.filter({ hasText: 'one.png' })).toContainText('1600×1200')
  await expect(rows.filter({ hasText: 'two.png' })).toContainText('1200×1600')
  // A small photo is not blown up.
  await expect(rows.filter({ hasText: 'three.jpg' })).toContainText('600×400')
  await expect(page.getByText(/A ZIP is one file/)).toBeVisible()

  const zip = await zipAll(page)
  expect(zip.name).toBe('photos.zip')
  expect(zipEntries(zip.data).map((e) => e.name)).toEqual(['one.jpg', 'two.jpg', 'three.jpg'])
})

test('upload goal keeps every photo under the size limit', async ({ page }) => {
  await panel(page)
    .getByTestId('file-input')
    .setInputFiles([
      await makeImage(page, 'a.png', 1400, 1000, 'image/png'),
      await makeImage(page, 'b.png', 1000, 1400, 'image/png'),
    ])
  await goal(page, /Upload to a website/).check()
  await expect(page.getByText('Each photo must be smaller than')).toBeVisible()
  // 200 KB is already chosen; there is no "no limit" here, because the limit is the point.
  await expect(page.getByRole('button', { name: 'Under 200 KB' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'No limit' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Under 100 KB' }).click()
  await page.getByRole('button', { name: 'Make 2 photos fit the limit' }).click()
  await expect(status(page)).toContainText('2 photos ready', { timeout: 60000 })
  await expect(page.getByText(/could not get under/)).toHaveCount(0)

  for (const e of zipEntries((await zipAll(page)).data))
    expect(e.size).toBeLessThanOrEqual(100 * 1024)
})

test('change the file type: pick one type and get those files', async ({ page }) => {
  await panel(page)
    .getByTestId('file-input')
    .setInputFiles([
      await makeImage(page, 'x.jpg', 400, 300, 'image/jpeg'),
      await makeImage(page, 'y.jpg', 400, 300, 'image/jpeg'),
    ])
  await goal(page, /Change the file type/).check()
  await expect(page.getByText('Change every photo to')).toBeVisible()
  // No quality slider to puzzle over; just the type.
  await expect(page.getByLabel('Quality')).toHaveCount(0)
  await page.getByRole('radio', { name: /^PNG/ }).check({ force: true })
  await page.getByRole('button', { name: 'Change 2 photos' }).click()
  await expect(status(page)).toContainText('2 photos ready', { timeout: 30000 })
  expect(zipEntries((await zipAll(page)).data).map((e) => e.name)).toEqual(['x.png', 'y.png'])
})

test('same-named photos do not overwrite each other; a file that is not a photo is skipped', async ({
  page,
}) => {
  const a = await makeImage(page, 'a.png', 300, 200, 'image/png')
  const b = await makeImage(page, 'a.png', 320, 220, 'image/png')
  const notAnImage = { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }
  await panel(page).getByTestId('file-input').setInputFiles([a, notAnImage, b])
  await page.getByRole('button', { name: 'Make 3 photos smaller' }).click()
  await expect(status(page)).toContainText('2 photos ready', { timeout: 30000 })
  await expect(status(page)).toContainText('1 skipped')
  await expect(page.getByRole('listitem').filter({ hasText: 'notes.txt' })).toContainText(
    'not a photo',
  )
  expect(zipEntries((await zipAll(page)).data).map((e) => e.name)).toEqual(['a.jpg', 'a (2).jpg'])
})

test('add more, remove one, and say so when a choice changed after converting', async ({
  page,
}) => {
  await panel(page)
    .getByTestId('file-input')
    .setInputFiles([await makeImage(page, 'x.png', 300, 200, 'image/png')])
  await page
    .getByTestId('batch-add-input')
    .setInputFiles([await makeImage(page, 'y.png', 300, 200, 'image/png')])
  await expect(page.getByText('2 photos', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Remove x.png' }).click()
  await expect(page.getByText('1 photo', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Make 1 photo smaller' }).click()
  await expect(status(page)).toContainText('1 photo ready', { timeout: 30000 })
  await goal(page, /Free up space/).check()
  await expect(status(page)).toContainText('you changed a choice')
  await page.getByRole('button', { name: 'Start again' }).click()
  await expect(status(page)).toContainText('1 photo ready', { timeout: 30000 })
  await expect(status(page)).not.toContainText('you changed a choice')
  await expect(page.getByRole('button', { name: 'Download y.jpg' })).toBeVisible()
})

test('"I want to choose myself" shows the exact size, type and file size controls', async ({
  page,
}) => {
  await panel(page)
    .getByTestId('file-input')
    .setInputFiles([await makeImage(page, 'big.png', 1200, 900, 'image/png')])
  await goal(page, /choose myself/).check()
  const size = page.getByRole('button', { name: 'Size', exact: true })
  if ((await size.getAttribute('aria-expanded')) !== 'true') await size.click()
  await page.getByRole('button', { name: '800 px' }).click()
  await page.getByRole('button', { name: 'Start 1 photo' }).click()
  await expect(status(page)).toContainText('1 photo ready', { timeout: 30000 })
  await expect(page.getByRole('listitem').filter({ hasText: 'big.png' })).toContainText('800×600')
})

test('every photo has a thumbnail; tapping one shows how it will look before converting', async ({
  page,
}) => {
  await panel(page)
    .getByTestId('file-input')
    .setInputFiles([
      await makeImage(page, 'first.png', 1600, 1200, 'image/png'),
      await makeImage(page, 'second.png', 1200, 1600, 'image/png'),
    ])
  const row = page.getByRole('listitem').filter({ hasText: 'first.png' })
  await expect(row.locator('img[src^="blob:"]')).toBeVisible()

  // Nothing has been converted yet, but the photo can already be previewed with the choices.
  await page.getByRole('button', { name: 'Preview first.png' }).click()
  const viewer = page.getByRole('dialog', { name: 'Preview of first.png' })
  await expect(viewer.getByText('1 of 2')).toBeVisible()
  await expect(viewer.getByRole('img', { name: 'After' })).toBeVisible({ timeout: 20000 })
  await expect(viewer.getByRole('status')).toContainText('1600×1200')
  await expect(viewer.getByText('This is how it will look')).toBeVisible()

  await viewer.getByRole('button', { name: 'Before', exact: true }).click()
  await expect(viewer.getByRole('img', { name: 'Before' })).toBeVisible()
  await viewer.getByRole('button', { name: 'Slide to compare' }).click()
  await expect(viewer.getByLabel('Slide to compare before and after')).toBeVisible()

  // Next photo, then save just this one, then close with the keyboard.
  await viewer.getByRole('button', { name: /Next/ }).click()
  const second = page.getByRole('dialog', { name: 'Preview of second.png' })
  await expect(second).toBeVisible()
  await second.getByRole('button', { name: 'After', exact: true }).click()
  await expect(second.getByRole('img', { name: 'After' })).toBeVisible({ timeout: 20000 })
  const file = await readDownload(page, () =>
    second.getByRole('button', { name: 'Download this photo' }).click(),
  )
  expect(file.name).toBe('second.jpg')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
