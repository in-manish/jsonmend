# jsonmend

Paste anything that looks like data and get valid, pretty-printed JSON back, plus a report of
every change that was made. Runs entirely in the browser: nothing is uploaded (your input is kept in this browser's localStorage so a reload or crash restores it until you clear it), and the deployed
page's Content Security Policy blocks all network requests.

It accepts:

- valid JSON (kept exactly: big integers, number spelling, key order)
- Python `dict` / `list` reprs, including `datetime`, `Decimal`, `UUID`, sets, tuples, bytes,
  `Enum`, numpy, pandas, dataclass and `<object at 0x...>` reprs
- JS object literals: unquoted keys, single quotes, trailing commas, comments
- broken or truncated JSON: missing brackets, quotes, commas or colons
- data surrounded by noise: Markdown fences, log lines, `data = {...};`, `print(...)`

The output is always checked with `JSON.parse` before it is shown. Repairs that are guesses are
highlighted and flagged so you can verify them.

See [docs/SUPPORTED-TYPES.md](docs/SUPPORTED-TYPES.md) for everything it understands, and
[docs/PLAN.md](docs/PLAN.md) for the original spec.

A second tab, **URL encode / decode**, converts URLs and text between plain and percent-encoded
(component or full-URL), form-encoded (`+` for space) and Base64 / Base64 URL-safe forms. It can
decode double-encoded input repeatedly and splits a decoded URL into its parts. It is separate
from the JSON formatter and equally local.

A third tab, **Python indentation**, takes Python code with tabs, mixed tabs and spaces, or the
wrong indent size and rebuilds the indentation from the block structure (4 spaces by default).
Offending whitespace is highlighted in the input, every issue is listed, and the corrected code
can be copied, downloaded as `.py`, or copied as a `python3 -c "$(cat <<'PY' ...)"` command for
bash/zsh. It never touches strings, docstrings or bracket continuations, flags what it can't fix
safely (missing block, unexpected indent), and does not check Python syntax.

A fourth tab, **HTML formatter**, re-indents and re-wraps HTML and previews it in a sandboxed frame
(no scripts, no network). With **Django / Jinja** mode (auto-detected, or set on/off), `{{ }}`,
`{% %}` and `{# #}` are kept intact, even inside attributes, and checked: unclosed delimiters,
unclosed or mismatched blocks (`if`/`for`/`block`/custom tags), stray `endif`, `else if`, typos and
missing arguments are highlighted in the input with a suggested fix. Fixes only insert missing
closers or repair typos, and apply with one click. Only whitespace is ever changed; the output is
verified to contain exactly the input's content.

In Preview, **Fill sample data** renders a Django / Jinja template with data inferred from how it
uses its variables (`user.email`, `{% for order in orders %}` + `order.total`, `{% if is_staff %}`),
chosen from the variable names. The data is editable JSON that merges over the generated values.
It runs its own small renderer (if/elif/else, for/empty, with, set, common filters, `url`,
`static`, `trans`); macros, custom tags and unknown filters are reported, nothing is executed.
Preview can also show phone/tablet sizes and how Gmail would display the email.

A fifth tab, **Image tools**, has three modes, all local (files are never uploaded):
- **Resize, convert, compress**: shows the current size, resizes by pixels or percent (aspect ratio
  lock, presets), converts between JPEG, PNG, WebP (and AVIF where the browser can encode it), and
  compresses to a **target size in KB or MB (KB by default)** by searching quality and, if you allow
  it, dimensions. Preview shows the original, the result or both, with the calculated output size.
- **PDF to images**: renders pages (all, or a range like `1-3, 5`) at 72-300 dpi as PNG/JPEG/WebP,
  with per-page download and a ZIP.
- **Images to PDF**: combines images in the order you set, with page size (fit, A4, Letter),
  margins, quality and an optional PDF size target.

Each tool has its own URL, so a link opens the tool it was copied from:

| Tool | URL |
|---|---|
| JSON formatter | `/` (also `/json-formatter`, `/json-parser`) |
| URL encode / decode | `/url-encode-decode` |
| Python indentation | `/python-indentation` |
| HTML formatter | `/html-formatter` |
| Image tools | `/image-tools` |

The root `/` opens the JSON formatter and its URL is left alone. Switching tabs updates the
address bar (the JSON tab goes back to `/`) and Back/Forward work. JSON share links look like `/#input=...`.

## Getting started

```sh
npm install
npm run dev          # http://localhost:5173
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck and build the static site to `dist/` |
| `npm run preview` | Serve `dist/` with the production security headers |
| `npm run lint` | Biome lint + format check (`npm run format` applies fixes) |
| `npm run typecheck` | `tsc -b` |
| `npm test` | Unit, fixture, property, fuzz, round-trip and differential tests (Vitest) |
| `npm run test:e2e` | End-to-end tests in Chromium, desktop and mobile (Playwright) |

The first `npm run test:e2e` needs `npx playwright install chromium`.

## Using the core without the UI

`src/core` has no DOM or React dependencies:

```ts
import { format } from './src/core'

const result = format("{'when': datetime.date(2024, 1, 5), 'ok': True}", { indent: 2 })
result.ok          // true
result.output      // '{\n  "when": "2024-01-05",\n  "ok": true\n}'
result.diagnostics // every change: severity, message, input span, output span
```

## Layout

```
src/core/                 pure TS pipeline, no DOM/React imports
  pipeline.ts             orchestrates the stages, returns FormatResult
  extract.ts              finds the payload inside noisy text (fences, log prefixes, wrappers)
  parse/strict.ts         lossless RFC 8259 fast path
  parse/tokenizer/        lenient tokenizer (strings, numbers, escapes, reprs)
  parse/lenient/          lenient parser with bracket-stack repair
  transform.ts            Python/JS types -> JSON values, via the registry
  pyTypes/                one handler per type (datetime/, decimal, uuid, bytes, set, enum, ...)
  serialize/              JSON writer (indent, sort, duplicate keys, escaping, output spans)
  ast.ts options.ts report.ts
src/worker/               Web Worker running the core (Comlink), with cancellation
src/store/                Zustand store; options, theme and every tool's input persist (autosave.ts)
src/ui/                   React app: editors, report, options, tree view, toolbar
tests/core                unit, property, fuzz, round-trip and differential tests
tests/fixtures/<group>    input / expected output pairs (json, lenient, types, repair)
tests/e2e                 Playwright tests
```

## Tests

- `tests/fixtures/<group>/`: `name.in` is formatted and compared byte for byte with
  `name.out.json`. Optional `name.options.json` sets format options; optional `name.codes.json`
  lists the exact diagnostic codes expected. Biome ignores this folder so expected outputs stay
  untouched.
- Property tests (fast-check) check that any JSON value survives formatting unchanged, that
  formatting is idempotent, and that Python reprs and JS literals of any JSON value convert back
  to the same value. Fuzz tests damage valid JSON at random and require valid output or a clean
  error, never a crash.

## Deploying

Static hosting only. See [docs/DEPLOY.md](docs/DEPLOY.md).

## Status

- [x] Phase 0: scaffold
- [x] Phase 1: core happy path
- [x] Phase 2: lenient parser
- [x] Phase 3: Python type registry
- [x] Phase 4: structural repair
- [x] Phase 5: UI
- [x] Phase 6: polish
- [x] Phase 7: release prep (deploy config, docs, changelog). Not deployed yet.

Not in v1: a Pyodide "exact mode" for Python syntax the parser can't handle.
