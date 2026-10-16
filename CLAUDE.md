# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

jsonmend: a browser-only tool. Paste Python reprs, JS literals, broken/truncated JSON, or data wrapped in noise (logs, Markdown fences) and get verified, pretty-printed JSON plus a report of every change. Nothing is uploaded; the deployed CSP (`public/_headers`) blocks all network requests, so don't add network calls or remote resources.

## Commands

```sh
npm run dev            # vite dev server, http://localhost:5173
npm run build          # tsc -b && vite build (output in dist/, deployed to GitHub Pages)
npm run lint           # biome check .   (npm run format applies fixes)
npm run typecheck      # tsc -b
npm test               # vitest run (all tests/**/*.test.ts)
npx vitest run tests/core/pipeline.test.ts     # single test file
npx vitest run -t "name substring"             # single test by name
npm run test:e2e       # Playwright (Chromium, desktop + mobile); first run: npx playwright install chromium
```

CI runs lint, typecheck, test, build, then e2e. Biome style: 2 spaces, single quotes, no semicolons, line width 100. `vite preview` (used by e2e) applies the production headers parsed from `public/_headers`.

## Architecture

- `src/core/` is pure TS with **no DOM/React imports** and is usable standalone (`format(input, options)` from `src/core`). `pipeline.ts` orchestrates: strict RFC 8259 parse (lossless fast path) → `extract` payload from noise → lenient parser (`parse/tokenizer` + `parse/lenient`, with bracket-stack repair) → `jsonrepair` fallback only if lenient yields nothing → `transform` (Python/JS types to JSON values via the `pyTypes/` registry, one handler per type) → `serialize` → **always re-validate with `JSON.parse`**; unverified output is never reported as success.
- Every change is recorded through `Reporter` (`report.ts`) as a `Diagnostic` with severity (including `guess`, which sets `confidence: 'low'`), a code, and input/output spans that the UI uses for highlighting. New repairs/conversions should emit diagnostics with spans.
- The serializer preserves big integers, number spelling and key order, so valid JSON must round-trip byte-exact.
- `src/worker/` runs the core in a Web Worker via Comlink with cancellation; `src/ui/hooks/useFormatter.ts` is the bridge. `src/store/` is a Zustand store: options, theme and the active tool persist via zustand `persist`; the input of every tool is saved separately and debounced by `store/autosave.ts` (flushed on `pagehide`) so a crash or closed tab restores the user's work. Content is removed only when the user clears it.
- `src/ui/Shell.tsx` is the root: a tab bar over three independent tools: the JSON formatter (`App.tsx`), the URL encode/decode tool (`ui/url/`, backed by `core/url/codec.ts`) and the Python indentation fixer (`ui/pyindent/`, backed by `core/pyindent/fix.ts`). They share only the theme and the persisted `tool` choice; keep them decoupled. Each tool has a path defined in `src/routes.ts` (the single source for slugs, titles and aliases); `ui/navigation.ts` syncs it with the store and history, and `vite.config.ts` (`toolPages` plugin) emits a static `<slug>/index.html` plus `404.html` per route because GitHub Pages has no SPA fallback. The JSON formatter is the default tool: its canonical URL is the bare root and `/json-formatter` is only an accepted alias that is never rewritten. Adding a tool means adding a `Route` there.
- `src/ui/` is React 19 + CodeMirror 6 (`ui/editor/`), Tailwind 4, plus report, options (schema-driven via `options/schema.ts`), and tree view.

## Tests

- `tests/fixtures/<group>/` (json, lenient, types, repair): `name.in` is formatted and compared byte for byte with `name.out.json`; optional `name.options.json` (format options) and `name.codes.json` (exact diagnostic codes expected). Biome ignores this folder, so don't reformat expected outputs. Adding a fixture is the preferred way to cover a new input.
- Also property (fast-check), fuzz, round-trip, differential (vs `jsonrepair`/`JSON.parse`) and perf tests in `tests/core/`.

## Docs

`docs/SUPPORTED-TYPES.md` lists everything the parser understands (update it when adding a type), `docs/PLAN.md` is the original spec, `docs/DEPLOY.md` covers hosting, and `CHANGELOG.md` tracks releases.
