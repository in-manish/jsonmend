import { expect, test } from '@playwright/test'

const htmlInput = (page: import('@playwright/test').Page) =>
  page.locator('section[aria-label="HTML input"] .cm-content')
const htmlOutput = (page: import('@playwright/test').Page) =>
  page.locator('section[aria-label="HTML output"] .cm-content')

test.beforeEach(async ({ page }) => {
  await page.goto('/html-formatter')
})

test('formats HTML and previews it in a sandboxed frame under the production CSP', async ({
  page,
}) => {
  await htmlInput(page).click()
  await page.keyboard.insertText('<div><h1>Hi</h1><p style="color:red">Text <b>bold</b></p></div>')
  await expect.poll(() => htmlOutput(page).innerText()).toContain('  <h1>Hi</h1>')

  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.getByRole('button', { name: 'Preview' }).click()
  const frame = page.frameLocator('iframe[title="HTML preview"]')
  await expect(frame.locator('h1')).toHaveText('Hi')
  await expect(page.locator('iframe[title="HTML preview"]')).toHaveAttribute('sandbox', '')
  expect(errors.filter((e) => /Content Security Policy/i.test(e))).toEqual([])
})

test('Django mode keeps tags, flags errors, highlights them and applies the suggested fix', async ({
  page,
}) => {
  await htmlInput(page).click()
  await page.keyboard.insertText(
    '<ul>\n{% for x in xs %}\n<li>{{ x }}</li>\n{% if x %}\n<b>y</b>\n{% endfor %}\n</ul>',
  )
  const issues = page.getByRole('region', { name: 'Issues' })
  await expect(issues).toContainText('{% if %} opened on line 4 is not closed')
  await expect(htmlInput(page).locator('.cm-repair').first()).toBeVisible()
  await expect.poll(() => htmlOutput(page).innerText()).toContain('{% for x in xs %}')

  await issues
    .getByRole('button', { name: /Apply fix/ })
    .first()
    .click()
  await expect(issues).toContainText('No problems found')
  await expect.poll(() => htmlInput(page).innerText()).toContain('{% endif %}')
})

test('either pane folds to a rail and expands again; output maximizes in code and preview', async ({
  page,
}) => {
  await htmlInput(page).click()
  await page.keyboard.insertText('<div><p>Hi</p></div>')
  const inputPane = page.getByRole('region', { name: 'HTML input' })
  const outputPane = page.getByRole('region', { name: 'HTML output' })

  await inputPane.getByRole('button', { name: /^Collapse input/ }).click()
  await expect(inputPane).toBeHidden()
  await expect(outputPane).toBeVisible()
  await page.getByRole('button', { name: 'Expand input' }).click()
  await expect(inputPane).toBeVisible()

  await outputPane.getByRole('button', { name: /^Collapse output/ }).click()
  await expect(outputPane).toBeHidden()
  await page.getByRole('button', { name: 'Expand output' }).click()
  await expect(outputPane).toBeVisible()

  for (const view of ['Formatted', 'Preview']) {
    await page.getByRole('button', { name: view, exact: true }).click()
    await page.getByRole('button', { name: 'Maximize output' }).click()
    await expect(inputPane).toBeHidden()
    await expect(page.getByRole('region', { name: 'Issues' })).toBeHidden()
    await expect(outputPane).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(inputPane).toBeVisible()
  }
})

test('preview can show a phone model, rotate it, and render as Gmail with a change list', async ({
  page,
}) => {
  await htmlInput(page).click()
  await page.keyboard.insertText(
    '<title>Big sale</title><style>.a{color:red;position:absolute}</style><p class="a">Hi</p><script>1</script>',
  )
  await page.getByRole('button', { name: 'Preview', exact: true }).click()

  await page.getByLabel('Device').selectOption('iphone-15')
  const frame = page.getByTestId('device-frame')
  await expect(frame).toBeVisible()
  const portrait = await frame.boundingBox()
  await page.getByRole('button', { name: 'Rotate' }).click()
  const landscape = await frame.boundingBox()
  expect((landscape?.width ?? 0) > (portrait?.width ?? 0)).toBe(true)

  await page.getByLabel('Email client').selectOption('gmail')
  await expect(page.getByText('Big sale').first()).toBeVisible()
  const notes = page.getByRole('region', { name: 'Gmail changes' })
  await expect(notes).toContainText('<script> is removed')
  await expect(notes).toContainText('"position" is removed')
  await expect(page.frameLocator('iframe[title="HTML preview"]').locator('p')).toHaveText('Hi')

  await page.getByLabel('Email client').selectOption('other')
  await expect(notes).toContainText('non-Google')
})

test('Fill sample data renders a Django template with inferred, editable data', async ({
  page,
}) => {
  await htmlInput(page).click()
  await page.keyboard.insertText(
    '<h1>Hi {{ user.name }}</h1><ul>{% for o in orders %}<li>{{ o.title }}: {{ o.total|floatformat:2 }}</li>{% endfor %}</ul>',
  )
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await page.getByLabel('Fill sample data').check()

  const frame = page.frameLocator('iframe[title="HTML preview"]')
  await expect(frame.locator('h1')).toHaveText('Hi Jane Doe')
  await expect(frame.locator('li')).toHaveCount(3)
  await expect(frame.locator('li').first()).toHaveText('Sample title: 49.99')

  const data = page.getByLabel('Sample data (JSON)')
  await expect(data).toContainText('"orders"')
  await data.fill('{"user":{"name":"Ada"}}')
  await expect(frame.locator('h1')).toHaveText('Hi Ada')
  await expect(frame.locator('li')).toHaveCount(3)

  await data.fill('{oops')
  await expect(page.getByText(/Invalid JSON/)).toBeVisible()
  await expect(frame.locator('h1')).toHaveText('Hi Jane Doe')
  await page.getByRole('button', { name: 'Reset to generated' }).click()
  await expect(data).toContainText('"orders"')
})
