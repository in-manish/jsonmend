import { expect, test } from '@playwright/test'
import { makeImage } from './imageHelpers'

test('image tools on a phone: one menu, full picture, tool bar, tap to crop', async ({ page }) => {
  await page.goto('/image-tools')
  // The site nav is a single menu, not a row of tabs.
  await page.getByRole('button', { name: /Change tool/ }).tap()
  await expect(page.getByRole('link', { name: 'JSON formatter' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page
    .getByTestId('file-input')
    .first()
    .setInputFiles(await makeImage(page, 'm.png', 1200, 900, 'image/png'))
  const tools = page.getByRole('navigation', { name: 'Image tools' })
  await expect(tools).toBeVisible()

  // Picture above the tool bar, fully visible; nothing scrolls sideways.
  const img = page.getByAltText('Resized image preview')
  await expect(img).toBeVisible()
  const pic = (await img.boundingBox()) as { y: number; height: number }
  const bar = (await tools.boundingBox()) as { y: number }
  expect(pic.y + pic.height).toBeLessThanOrEqual(bar.y)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)

  // Big enough to tap.
  for (const b of [
    tools.getByRole('button', { name: 'Crop' }),
    page.getByRole('button', { name: 'Download', exact: true }),
  ]) {
    expect(((await b.boundingBox()) as { height: number }).height).toBeGreaterThanOrEqual(43)
  }

  // Zoom to actual pixels and back.
  await page.getByRole('button', { name: 'Zoom to actual size' }).tap()
  await page.getByRole('button', { name: 'Fit to screen' }).tap()

  // Resize shows DPI directly; Save as shows the compression slider.
  await tools.getByRole('button', { name: 'Resize' }).tap()
  await expect(page.getByLabel('Print resolution')).toBeVisible()
  await tools.getByRole('button', { name: 'Save as' }).tap()
  await expect(page.getByLabel('Quality')).toBeVisible()

  // A tool opens its own small panel; one tap on a common limit.
  await tools.getByRole('button', { name: 'File size' }).tap()
  await expect(page.getByRole('button', { name: '50% smaller' })).toBeVisible()
  await page.getByRole('button', { name: 'Under 200 KB' }).tap()
  await expect(page.getByTestId('action-size')).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).tap()

  // Tap the photo: the crop box starts on the whole picture; pick a square and apply.
  await page.getByRole('button', { name: /Resized image preview: tap to crop/ }).tap()
  await expect(page.getByTestId('crop-rect')).toBeVisible()
  await page.getByRole('tab', { name: /1:1/ }).tap()
  await page.getByRole('button', { name: 'Apply crop' }).tap()
  await expect(page.getByTestId('action-size')).toContainText('900×900', { timeout: 15000 })
})
