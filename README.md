# jsonmend

Paste anything that looks like data and get valid, pretty-printed JSON back, plus a report of
every change that was made. Runs entirely in the browser: nothing is uploaded, and the deployed
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
src/store/                Zustand store; options and theme persist, input never does
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
