import { expect, test } from '@playwright/test'
import { outputText, setInput } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('formats a Python dict and reports every conversion', async ({ page }) => {
  await setInput(
    page,
    "{'created': datetime.datetime(2024, 1, 5, 13, 30), 'price': Decimal('9.99'), 'tags': {'b', 'a'}, 'ok': True, 'x': None}",
  )
  await expect.poll(() => outputText(page)).toContain('"created": "2024-01-05T13:30:00"')
  const text = await outputText(page)
  expect(JSON.parse(text)).toEqual({
    created: '2024-01-05T13:30:00',
    price: '9.99',
    tags: ['a', 'b'],
    ok: true,
    x: null,
  })
  await expect(page.getByRole('button', { name: /^Report/ })).toContainText('5 type conversions')
})

test('repairs truncated JSON and explains the repair', async ({ page }) => {
  await setInput(page, '{"users": [{"id": 1, "name": "A"}, {"id": 2, "name": "B"')
  await expect
    .poll(async () => JSON.parse(await outputText(page)))
    .toEqual({
      users: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
    })
  await expect(page.getByText('Added 3 closing brackets: } ] }')).toBeVisible()
})

test('flags guessed repairs with a banner', async ({ page }) => {
  await setInput(page, '{"msg": "say "hi" now"}')
  await expect(page.getByRole('note')).toContainText('verify the 1 guessed part')
})

test('shows a clear error when nothing can be recovered', async ({ page }) => {
  await setInput(page, '}')
  await expect(page.getByRole('alert')).toContainText('Could not produce valid JSON')
})

test('Ctrl/Cmd+Enter formats and the copy button copies the output', async ({ page }) => {
  await setInput(page, '[1,2]')
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect.poll(() => outputText(page)).toBe('[\n  1,\n  2\n]')
  await page.getByRole('button', { name: 'Copy', exact: true }).click()
  await expect(page.getByText('Copied output')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('[\n  1,\n  2\n]')
})

test('downloads the output as a .json file', async ({ page }) => {
  await setInput(page, '{a: 1}')
  await expect.poll(() => outputText(page)).toContain('"a": 1')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('output.json')
})

test('options apply immediately and persist across reloads', async ({ page }) => {
  await setInput(page, '{"b": 1, "a": 2}')
  await page.getByRole('button', { name: 'Options' }).click()
  await page.getByLabel('Indent').selectOption({ label: '4 spaces' })
  await page.getByLabel('Sort keys').selectOption({ label: 'A to Z' })
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect.poll(() => outputText(page)).toBe('{\n    "a": 2,\n    "b": 1\n}')

  await page.reload()
  await setInput(page, '{"b": 1, "a": 2}')
  await expect.poll(() => outputText(page)).toBe('{\n    "a": 2,\n    "b": 1\n}')
})

test('tree view expands nodes and copies JSONPath', async ({ page }) => {
  await setInput(page, '{"users": [{"name": "Ada"}]}')
  await expect.poll(() => outputText(page)).toContain('Ada')
  await page.getByRole('button', { name: 'Tree' }).click()
  await page.getByRole('button', { name: 'Expand $.users' }).click()
  await page.getByRole('button', { name: 'Expand $.users[0]' }).click()
  await page.getByRole('button', { name: 'name', exact: true }).click()
  await expect(page.getByText('Copied $.users[0].name')).toBeVisible()
})

test('loads samples from the empty state and the toolbar', async ({ page }) => {
  await page.getByRole('button', { name: 'Truncated JSON' }).click()
  await expect.poll(() => outputText(page)).toContain('"Grace"')
  await page.getByLabel('Load a sample').selectOption({ label: 'NDJSON lines' })
  await expect.poll(() => outputText(page)).toContain('"logout"')
})

test('a share link restores the input', async ({ page }) => {
  await page.goto('/#input=eydhJzogMX0')
  await expect.poll(() => outputText(page)).toBe('{\n  "a": 1\n}')
  expect(new URL(page.url()).hash).toBe('')
})

test('report rows jump to the change in the input', async ({ page }) => {
  await setInput(page, "{'when': datetime.date(2024, 1, 5)}")
  await page.getByRole('button', { name: /datetime\.date\(2024, 1, 5\) -> "2024-01-05"/ }).click()
  const selected = await page.evaluate(() => getSelection()?.toString())
  expect(selected).toBe('datetime.date(2024, 1, 5)')
})

test('stays responsive while formatting a 5 MB upload', async ({ page }) => {
  const row =
    '{"id": 12345678901234567890, "name": "user", "tags": ["a", "b"], "nested": {"x": 1.5}}'
  const big = `[${Array(65_000).fill(row).join(',')}]`
  expect(big.length).toBeGreaterThan(5_000_000)
  await page.locator('input[type=file]').setInputFiles({
    name: 'big.json',
    mimeType: 'application/json',
    buffer: Buffer.from(big),
  })
  // The main thread answers quickly while the worker parses.
  const t0 = Date.now()
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  expect(Date.now() - t0).toBeLessThan(1000)
  await page.getByRole('button', { name: 'Format', exact: true }).click()
  await expect(page.getByText(/Out [\d,]+ chars/)).toBeVisible({ timeout: 20_000 })
})
