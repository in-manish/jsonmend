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

- `src/core`: pure TS formatting pipeline (no DOM/React imports)
- `src/worker`: Web Worker wrapper around the core
- `src/ui`, `src/store`: React UI and Zustand store
- `tests/core`, `tests/fixtures`, `tests/e2e`: unit, fixture and E2E tests

## Status

- [x] Phase 0: scaffold
- [ ] Phase 1: core happy path
- [ ] Phase 2: lenient parser
- [ ] Phase 3: Python type registry
- [ ] Phase 4: structural repair
- [ ] Phase 5: UI
- [ ] Phase 6: polish
- [ ] Phase 7: release
