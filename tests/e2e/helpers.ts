import { expect, type Page } from '@playwright/test'

export const input = (page: Page) => page.locator('section[aria-label="Input"] .cm-content')
export const output = (page: Page) => page.locator('section[aria-label="Output"] .cm-content')

/** Replaces the input editor's text. */
export async function setInput(page: Page, text: string) {
  await input(page).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(text)
}

/** Output text once formatting settles (CodeMirror renders lines as divs). */
export async function outputText(page: Page) {
  await expect(output(page)).not.toBeEmpty()
  return output(page).evaluate((el) =>
    Array.from(el.querySelectorAll('.cm-line'), (line) => line.textContent ?? '').join('\n'),
  )
}
