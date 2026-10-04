# jsonmend

Browser-only tool that turns anything that looks like data (Python `dict` reprs, JS object
literals, broken or truncated JSON, log lines with payloads) into valid, pretty-printed JSON,
plus a report of every change it made. Nothing leaves the browser.

Full spec and roadmap: [docs/PLAN.md](docs/PLAN.md).

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Vitest, Biome.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run lint` | Biome lint + format check |
| `npm run format` | Apply Biome fixes |
| `npm run typecheck` | `tsc -b` |
| `npm test` | Run Vitest once |
| `npm run build` | Typecheck and build to `dist/` |

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
src/worker, src/ui, src/store   browser app
tests/core                unit, property, fuzz, round-trip and differential tests
tests/fixtures/<group>    input/expected-output pairs
```

## Status

- [x] Phase 0: scaffold
- [x] Phase 1: core happy path
- [x] Phase 2: lenient parser
- [x] Phase 3: Python type registry
- [x] Phase 4: structural repair
- [ ] Phase 5: UI
- [ ] Phase 6: polish
- [ ] Phase 7: release

## Tests

- `tests/core/*.test.ts`: unit, property-based (fast-check) and performance tests
- `tests/fixtures/`: `name.in` is formatted and compared byte for byte with `name.out.json`.
  Optional `name.options.json` sets format options; optional `name.codes.json` lists the exact
  diagnostic codes expected. Biome ignores this folder so expected outputs stay untouched.
