import { expect, test } from '@playwright/test'
import { makeImage } from './imageHelpers'

test('image tools are usable on a phone: pinned preview, big targets, tap to crop', async ({
  page,
}) => {
  await page.goto('/image-tools')
  await page
    .getByTestId('file-input')
    .first()
    .setInputFiles(await makeImage(page, 'm.png', 1200, 900, 'image/png'))
  await expect(page.getByText('PNG · 1200×900')).toBeVisible()

  // Preview on top, controls below it, no sideways scroll.
  const preview = (await page.getByAltText('Resized image preview').boundingBox()) as { y: number }
  const settings = (await page.getByLabel('Image settings').boundingBox()) as { y: number }
  expect(preview.y).toBeLessThan(settings.y)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)

  // Tap targets are at least 44px tall.
  for (const name of ['Change', 'Crop image', 'Download JPEG']) {
    const b = (await page.getByRole('button', { name, exact: true }).first().boundingBox()) as {
      height: number
    }
    expect(b.height).toBeGreaterThanOrEqual(43)
  }

  // Collapsed sections stay collapsed until tapped.
  await expect(page.getByRole('button', { name: /File size limit/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await page.getByRole('button', { name: /File size limit/ }).tap()
  await expect(page.getByLabel('Compress the image to a target size')).toBeVisible()

  // Tap the image, tap again for a starting box, apply.
  await page.getByRole('button', { name: /Resized image preview: tap to crop/ }).tap()
  const frame = page.getByTestId('crop-frame')
  await expect(frame).toBeVisible()
  const box = (await frame.boundingBox()) as { x: number; y: number; width: number; height: number }
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByTestId('crop-rect')).toBeVisible()
  await page.getByRole('button', { name: 'Apply crop' }).tap()
  await expect(page.getByTestId('action-size')).toContainText('960×720', { timeout: 15000 })
})
