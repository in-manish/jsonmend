import { expect, test } from '@playwright/test'

const page1 =
  '<!doctype html><html><head><title>T</title></head><body><div><p>Hello</p></div></body></html>'
const output = (p: import('@playwright/test').Page) =>
  p.locator('section[aria-label="HTML output"] .cm-content')

test.beforeEach(async ({ page }) => {
  await page.goto('/html-formatter')
})

test('Open file… loads an .html file from the device and the download keeps its name', async ({
  page,
}) => {
  await page.getByTestId('html-file-input').setInputFiles({
    name: 'page.html',
    mimeType: 'text/html',
    buffer: Buffer.from(page1),
  })
  await expect(page.getByRole('heading', { name: 'Input · page.html' })).toBeVisible()
  await expect.poll(() => output(page).innerText()).toContain('    <p>Hello</p>')

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download .html' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('page.formatted.html')

  // Clearing forgets the file name.
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByRole('heading', { name: 'Input', exact: true })).toBeVisible()
})

test('a template file can be dropped onto the input', async ({ page }) => {
  // Dropped on the editor text itself: the file replaces the input once, not inserted twice.
  await page.locator('section[aria-label="HTML input"] .cm-content').evaluate((el, text) => {
    const dt = new DataTransfer()
    dt.items.add(new File([text], 'base.jinja', { type: 'text/plain' }))
    el.dispatchEvent(
      new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }),
    )
    el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  }, '<ul>{% for x in xs %}<li>{{ x }}</li>{% endfor %}</ul>')
  await expect(page.getByRole('heading', { name: 'Input · base.jinja' })).toBeVisible()
  await expect.poll(() => output(page).innerText()).toContain('{% for x in xs %}')
  const input = await page.locator('section[aria-label="HTML input"] .cm-content').innerText()
  expect(input.match(/\{% for/g)?.length).toBe(1)
})
