import { expect, test } from '@playwright/test'
import { outputText, setInput } from './helpers'

test('stacks the panes and formats on a phone', async ({ page }) => {
  await page.goto('/')
  const inputBox = await page.locator('section[aria-label="Input"]').boundingBox()
  const outputBox = await page.locator('section[aria-label="Output"]').boundingBox()
  expect(inputBox && outputBox && outputBox.y > inputBox.y).toBe(true)
  await setInput(page, "{'a': None}")
  await expect.poll(() => outputText(page)).toBe('{\n  "a": null\n}')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
