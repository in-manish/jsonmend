import { expect, test } from '@playwright/test'
import { makeImage, makeSnapshot } from './imageHelpers'

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

test('many photos on a phone: all four modes fit, plain choices, the big button is reachable', async ({
  page,
}) => {
  await page.goto('/image-tools')
  const tabs = page.getByRole('tablist', { name: 'Image tool mode' })
  await page.getByRole('tab', { name: 'Many photos' }).tap()
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)
  // Every mode is on screen at once, none cut off.
  for (const name of ['One photo', 'Many photos', 'PDF → image', 'Image → PDF']) {
    const box = (await tabs.getByRole('tab', { name }).boundingBox()) as {
      x: number
      width: number
    }
    expect(box.x + box.width).toBeLessThanOrEqual((page.viewportSize() as { width: number }).width)
  }

  await page
    .getByRole('tabpanel')
    .getByTestId('file-input')
    .setInputFiles([
      await makeImage(page, 'p.png', 800, 600, 'image/png'),
      await makeImage(page, 'q.png', 800, 600, 'image/png'),
    ])
  // The question is first, in plain words, with a sensible choice already picked.
  await expect(page.getByText('What do you need?')).toBeVisible()
  await expect(page.getByRole('radio', { name: /Send by WhatsApp/ })).toBeChecked()
  const convert = page.getByRole('button', { name: 'Make 2 photos smaller' })
  const box = (await convert.boundingBox()) as { y: number; height: number }
  expect(box.y + box.height).toBeLessThanOrEqual((page.viewportSize() as { height: number }).height)
  expect(box.height).toBeGreaterThanOrEqual(43)
  // Choices are big enough to tap.
  const card = page.getByRole('radio', { name: /Free up space/ }).locator('xpath=ancestor::label')
  expect(((await card.boundingBox()) as { height: number }).height).toBeGreaterThanOrEqual(56)
  await convert.tap()
  await expect(page.getByTestId('batch-status')).toContainText('2 photos ready', { timeout: 30000 })
  expect(await overflow()).toBeLessThanOrEqual(0)
})

test('photo for a form on a phone: pick the form, the box lands on the photo, one tap to download', async ({
  page,
}) => {
  await page.goto('/image-tools')
  await page.getByRole('button', { name: /Need a photo for a form/ }).tap()
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)
  await page.getByRole('button', { name: 'Signature' }).tap()
  await expect(page.getByText('140 × 60 px, JPG, 10–20 KB')).toBeVisible()

  await page
    .getByRole('tabpanel')
    .getByTestId('file-input')
    .setInputFiles(
      await makeSnapshot(page, 'shot.jpg', 1000, 800, { x: 300, y: 130, w: 420, h: 540 }),
    )
  await expect(page.getByTestId('form-hint')).toContainText('We found the edges')
  await expect(page.getByTestId('form-status')).toContainText('✓ 140 × 60 px', { timeout: 20000 })
  const download = page.getByRole('button', { name: 'Download JPG' })
  const box = (await download.boundingBox()) as { y: number; height: number }
  expect(box.y + box.height).toBeLessThanOrEqual((page.viewportSize() as { height: number }).height)
  expect(box.height).toBeGreaterThanOrEqual(43)
  expect(await overflow()).toBeLessThanOrEqual(0)
})
