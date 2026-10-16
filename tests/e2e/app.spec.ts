import { expect, test } from '@playwright/test'
import { output, outputText, setInput } from './helpers'

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

test('switches between minified and pretty output, keeping the chosen indent', async ({ page }) => {
  await setInput(page, '{"a": [1, 2]}')
  await page.getByRole('button', { name: 'Options' }).click()
  await page.getByLabel('Indent').selectOption({ label: '4 spaces' })
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Minified' }).click()
  await expect.poll(() => outputText(page)).toBe('{"a":[1,2]}')
  await page.getByRole('button', { name: 'Pretty' }).click()
  await expect.poll(() => outputText(page)).toBe('{\n    "a": [\n        1,\n        2\n    ]\n}')
})

test('hovering an object line in the output offers a copy button', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await setInput(page, '{"a": {"b": [1, 2]}, "c": 3}')
  await expect.poll(() => outputText(page)).toContain('"b"')
  await output(page).locator('.cm-line', { hasText: '"a": {' }).hover()
  const button = page.getByRole('button', { name: 'Copy this value' })
  await expect(button).toBeVisible()
  await button.click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(JSON.parse(copied)).toEqual({ b: [1, 2] })
})

test('stacks input above output by default and can switch to side by side', async ({ page }) => {
  const box = async (name: string) => {
    const b = await page.locator(`section[aria-label="${name}"]`).boundingBox()
    if (!b) throw new Error(`${name} pane is not visible`)
    return b
  }
  let [a, b] = [await box('Input'), await box('Output')]
  expect(b.y).toBeGreaterThan(a.y + a.height - 1)
  expect(Math.abs(a.x - b.x)).toBeLessThan(2)

  await page.getByRole('button', { name: 'Input on left, output on right' }).click()
  ;[a, b] = [await box('Input'), await box('Output')]
  expect(b.x).toBeGreaterThan(a.x + a.width - 1)
  expect(Math.abs(a.y - b.y)).toBeLessThan(2)

  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Input on left, output on right' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('the output is editable and the copy-all icons copy the whole pane', async ({ page }) => {
  await setInput(page, '[1,2]')
  await expect.poll(() => outputText(page)).toBe('[\n  1,\n  2\n]')
  await output(page).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText('{"edited": true}')
  expect(await outputText(page)).toBe('{"edited": true}')

  await page.getByRole('button', { name: 'Copy all output' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('{"edited": true}')
  await page.getByRole('button', { name: 'Copy all input' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('[1,2]')
})

test('panes collapse to a rail and expand again', async ({ page }) => {
  await page.getByRole('button', { name: 'Input on left, output on right' }).click()
  await page.getByRole('button', { name: 'Collapse input (left)' }).click()
  await expect(page.locator('section[aria-label="Input"]')).toBeHidden()
  await expect(page.locator('section[aria-label="Output"]')).toBeVisible()

  // Collapsing the output instead expands the input.
  await page.getByRole('button', { name: 'Collapse output (right)' }).click()
  await expect(page.locator('section[aria-label="Input"]')).toBeVisible()
  await expect(page.locator('section[aria-label="Output"]')).toBeHidden()

  await page.getByRole('button', { name: 'Expand output' }).click()
  await expect(page.locator('section[aria-label="Output"]')).toBeVisible()
})

test('the URL tab decodes, encodes and splits a URL, leaving the JSON tool intact', async ({
  page,
}) => {
  await page.getByRole('link', { name: 'URL encode / decode' }).click()
  const encoded = page.getByLabel('Encoded URL')
  await encoded.fill('https%3A%2F%2Fa.com%2Fp%3Fq%3Dhello%2520world')
  await expect(page.getByLabel('Result')).toHaveValue('https://a.com/p?q=hello%20world')
  await expect(page.getByRole('region', { name: 'URL parts' })).toContainText('a.com')

  await page.getByLabel('Decode repeatedly').check()
  await expect(page.getByLabel('Result')).toHaveValue('https://a.com/p?q=hello world')

  await page.getByRole('button', { name: 'Encode', exact: true }).click()
  await page.getByLabel('Text or URL to encode').fill('a b&c')
  await expect(page.getByLabel('Result')).toHaveValue('a%20b%26c')
  await page.getByLabel('Encoding type').selectOption('base64')
  await expect(page.getByLabel('Result')).toHaveValue('YSBiJmM=')

  await page.getByRole('link', { name: 'JSON formatter' }).click()
  await setInput(page, '{a: 1}')
  await expect.poll(() => outputText(page)).toContain('"a": 1')
})

test('the Python tab highlights tabs, fixes the indentation and builds a terminal command', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('link', { name: 'Python indentation' }).click()
  const pyInput = page.locator('section[aria-label="Python input"] .cm-content')
  await pyInput.click()
  await page.keyboard.insertText('def f(x):\n\tif x:\n\t\treturn 1\n\treturn 2\n')

  const fixed = page.locator('section[aria-label="Python output"] .cm-content')
  await expect.poll(() => fixed.innerText()).toContain('    if x:')
  await expect(page.getByRole('region', { name: 'Indentation issues' })).toContainText(
    'Tab used for indentation',
  )
  // The tabs in the input are highlighted.
  await expect(pyInput.locator('.cm-repair').first()).toBeVisible()

  await page.getByRole('button', { name: 'Copy terminal command' }).click()
  const cmd = await page.evaluate(() => navigator.clipboard.readText())
  expect(cmd).toContain(
    `python3 -c "$(cat <<'PY'\ndef f(x):\n    if x:\n        return 1\n    return 2\nPY\n)"`,
  )

  await page.getByRole('button', { name: 'Use fixed code as input' }).click()
  await expect(page.getByRole('region', { name: 'Indentation issues' })).toContainText(
    'nothing to fix',
  )
})

test('the Python and URL outputs are editable and copy what you edited', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('link', { name: 'Python indentation' }).click()
  await page.locator('section[aria-label="Python input"] .cm-content').click()
  await page.keyboard.insertText('if a:\n\tx = 1\n')
  const fixed = page.locator('section[aria-label="Python output"] .cm-content')
  await expect.poll(() => fixed.innerText()).toContain('    x = 1')
  await fixed.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText('print("edited")\n')
  await page.getByRole('button', { name: 'Copy', exact: true }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('print("edited")\n')

  await page.getByRole('link', { name: 'URL encode / decode' }).click()
  await page.getByLabel('Encoded URL').fill('a%20b')
  const result = page.getByLabel('Result (editable)')
  await expect(result).toHaveValue('a b')
  await result.fill('a b edited')
  await page.getByRole('button', { name: 'Copy all output' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('a b edited')
  await page.getByLabel('Encoded URL').fill('c%20d')
  await expect(result).toHaveValue('c d')
})

test('every tool restores its input after a reload until the user clears it', async ({ page }) => {
  const saved = (key: string) => page.evaluate((k) => localStorage.getItem(k), key)

  await setInput(page, "{'kept': True}")
  await expect.poll(() => saved('jsonmend:json-input')).toContain('kept')

  await page.getByRole('link', { name: 'URL encode / decode' }).click()
  await page.getByLabel('Encoded URL').fill('a%20b')
  await page.getByLabel('Decode repeatedly').check()
  await expect.poll(() => saved('jsonmend:url')).toContain('a%20b')

  await page.getByRole('link', { name: 'Python indentation' }).click()
  await page.locator('section[aria-label="Python input"] .cm-content').click()
  await page.keyboard.insertText('if a:\n\tx = 1\n')
  await expect.poll(() => saved('jsonmend:python')).toContain('x = 1')

  await page.reload()
  await expect(page.locator('section[aria-label="Python output"] .cm-content')).toContainText(
    '    x = 1',
  )
  await page.getByRole('link', { name: 'URL encode / decode' }).click()
  await expect(page.getByLabel('Encoded URL')).toHaveValue('a%20b')
  await expect(page.getByLabel('Decode repeatedly')).toBeChecked()
  await page.getByRole('link', { name: 'JSON formatter' }).click()
  await expect.poll(() => outputText(page)).toContain('"kept": true')

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect.poll(() => saved('jsonmend:json-input')).toBe('{"input":""}')
  await page.reload()
  await expect(output(page)).toHaveCount(0)
  await expect(page.getByText('Try a sample')).toBeVisible()
})

test.describe('tool URLs', () => {
  const path = (page: import('@playwright/test').Page) => new URL(page.url()).pathname

  test('the root opens the JSON formatter and keeps the bare URL', async ({ page }) => {
    await expect(page.locator('section[aria-label="Input"]')).toBeVisible()
    await page.waitForTimeout(300)
    expect(path(page)).toBe('/')
    await expect(page).toHaveTitle(/JSON formatter/)
  })

  test('the root opens the JSON formatter even if another tool was used last', async ({ page }) => {
    await page.getByRole('link', { name: 'Python indentation' }).click()
    await page.goto('/')
    await expect(page.locator('section[aria-label="Input"]')).toBeVisible()
    expect(path(page)).toBe('/')
  })

  test('/json-formatter and /json-parser open the JSON tool and stay as typed', async ({
    page,
  }) => {
    for (const p of ['/json-formatter', '/json-parser']) {
      await page.goto(p)
      await expect(page.locator('section[aria-label="Input"]')).toBeVisible()
      await page.waitForTimeout(200)
      expect(path(page)).toBe(p)
    }
  })

  test('each tool URL opens its tool directly and survives a reload', async ({ page }) => {
    await page.goto('/python-indentation')
    await expect(page.locator('section[aria-label="Python input"]')).toBeVisible()
    await expect(page).toHaveTitle(/Python indentation/)
    await page.reload()
    await expect(page.locator('section[aria-label="Python input"]')).toBeVisible()
    expect(path(page)).toBe('/python-indentation')

    await page.goto('/url-encode-decode')
    await expect(page.getByLabel('Encoded URL')).toBeVisible()
  })

  test('aliases of other tools are spelled out in the address bar', async ({ page }) => {
    await page.goto('/python')
    await expect(page.locator('section[aria-label="Python input"]')).toBeVisible()
    await expect.poll(() => path(page)).toBe('/python-indentation')
  })

  test('switching tabs changes the URL; the JSON tab goes back to the bare root', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Python indentation' }).click()
    expect(path(page)).toBe('/python-indentation')
    await page.getByRole('link', { name: 'URL encode / decode' }).click()
    expect(path(page)).toBe('/url-encode-decode')
    await expect(page.getByLabel('Encoded URL')).toBeVisible()

    await page.goBack()
    expect(path(page)).toBe('/python-indentation')
    await expect(page.locator('section[aria-label="Python input"]')).toBeVisible()
    await page.goForward()
    await expect(page.getByLabel('Encoded URL')).toBeVisible()

    await page.getByRole('link', { name: 'JSON formatter' }).click()
    expect(path(page)).toBe('/')
    await expect(page.locator('section[aria-label="Input"]')).toBeVisible()
  })

  test('clicking the JSON tab on /json-formatter does not rewrite the URL', async ({ page }) => {
    await page.goto('/json-formatter')
    await page.getByRole('link', { name: 'JSON formatter' }).click()
    expect(path(page)).toBe('/json-formatter')
  })

  test('old share links at the site root open the JSON tool with the data', async ({ page }) => {
    const b64 = Buffer.from('{"old": 1}').toString('base64url')
    await page.goto(`/#input=${b64}`)
    await expect.poll(() => outputText(page)).toContain('"old": 1')
    expect(path(page)).toBe('/')
  })

  test('an unknown path falls back to the JSON formatter at the root', async ({ page }) => {
    await page.goto('/no-such-page')
    await expect(page.locator('section[aria-label="Input"]')).toBeVisible()
    await expect.poll(() => path(page)).toBe('/')
  })
})
