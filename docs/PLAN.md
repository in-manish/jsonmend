# Universal Dict / Object / JSON Formatter — Implementation Plan

> Hand this file to Claude Code CLI: `claude "Read json-formatter-plan.md and implement it phase by phase. Stop after each phase and run the tests."`

## 1. Goal

A browser-only tool. The user pastes **anything that looks like data** and gets **valid, pretty-printed JSON** out.

Accepted input:
- Valid JSON
- Python `dict` / `list` `repr()` or `print()` output
- JS object literals (unquoted keys, single quotes, trailing commas, comments)
- Broken or truncated text (missing `}` / `]`, missing quotes, missing commas)
- Python-only types: `datetime`, `date`, `time`, `timedelta`, `Decimal`, `UUID`, `set`, `tuple`, `bytes`, `Enum`, `None/True/False`, `NaN/Infinity`
- Text with surrounding noise (logs, markdown fences, `Response: {...}`)

Output: always strictly valid JSON (RFC 8259), plus a **report** of everything that was changed.

Non-goals (v1): executing Python, a server backend, user accounts.

---

## 2. Research summary and stack decision

| Concern | Choice | Why |
|---|---|---|
| Framework | **React 19 + TypeScript + Vite** | Widest ecosystem, best Claude Code support, simple static build. (Svelte 5 or Solid would also work, but React has the most editor bindings.) |
| Editor | **CodeMirror 6** (`@uiw/react-codemirror` or raw `@codemirror/*`) | About 50 KB minimum, modular, good on mobile, has `@codemirror/lang-json`, `@codemirror/lint`, `@codemirror/merge`. Monaco is roughly 1–5 MB and hard to customize; Replit and Sourcegraph both migrated from Monaco to CodeMirror 6 for size and customization. |
| JSON repair (fallback) | **`jsonrepair`** (josdejong) | Mature, ~1M weekly npm downloads, handles missing brackets/quotes/commas, comments, truncated JSON, and has a streaming API. |
| Python-literal parsing | **Custom tolerant tokenizer + parser in TS** (core of this project) | `jsonrepair` does not understand `datetime.datetime(2024, 1, 5)`, `Decimal('1.5')`, `UUID('...')`, `{1, 2}` sets, or `<Foo at 0x..>` reprs. Pyodide could do it but costs about 10 MB and still cannot `eval` untrusted text safely. A custom parser is small, fast, and safe. |
| Heavy work | **Web Worker** (via Comlink) | Keeps UI responsive on multi-MB inputs. |
| Large output viewing | CodeMirror virtualized rendering + optional tree view (`react-arborist` or custom) | CM6 handles large docs; the tree view helps navigation. |
| State | **Zustand** | Tiny, no boilerplate. |
| Styling | **Tailwind CSS 4** + CSS variables for light/dark theme | Fast to build, easy theming. |
| Tests | **Vitest** (unit/fuzz) + **Playwright** (E2E) | Native Vite integration. |
| Lint/format | Biome or ESLint + Prettier | Pick one, keep it consistent. |
| Deploy | Static hosting (Cloudflare Pages / Netlify / GitHub Pages) | Nothing leaves the browser, which is a privacy selling point. |

Optional later: a **Pyodide "exact mode"** loaded lazily on demand, only for input that uses Python syntax the custom parser cannot handle. Not in v1.

---

## 3. Architecture

```
src/
  core/                      # pure TS, no React, fully unit-tested
    pipeline.ts              # orchestrates stages, returns Result
    extract.ts               # find payload inside noisy text
    tokenizer.ts             # lenient tokenizer
    parser.ts                # lenient recursive-descent parser -> AST
    ast.ts                   # node types
    pyTypes/                 # one file per type handler (registry)
      datetime.ts
      decimal.ts
      uuid.ts
      bytes.ts
      set.ts
      tuple.ts
      enum.ts
      fallbackRepr.ts
    repair.ts                # bracket balancing, quote fixing, etc.
    serialize.ts             # AST -> JSON string (options-driven)
    report.ts                # change log / diagnostics model
    options.ts               # all user options + defaults
  worker/
    core.worker.ts           # runs pipeline off main thread
  ui/
    App.tsx
    InputPane.tsx
    OutputPane.tsx
    OptionsPanel.tsx
    ReportPanel.tsx
    TreeView.tsx
    Toolbar.tsx
  store/
    useAppStore.ts
tests/
  fixtures/                  # input -> expected output pairs
  core/*.test.ts
  e2e/*.spec.ts
```

### Pipeline (each stage is pure and returns `{value, diagnostics[]}`)

```
raw text
  1. normalize     (BOM, smart quotes, NBSP, CRLF, zero-width chars)
  2. extract       (strip markdown fences, log prefixes; locate first balanced-ish payload)
  3. fast path     (try JSON.parse; if OK -> skip to serialize, report "valid JSON")
  4. lenient parse (custom parser -> AST with Python-type nodes + diagnostics)
  5. fallback      (if parser throws/low confidence -> jsonrepair, re-parse)
  6. transform     (convert Python-type nodes to JSON values per options)
  7. serialize     (pretty/minified, sort keys, indent, ensure_ascii)
  8. validate      (JSON.parse(output) must succeed; otherwise report failure honestly)
```

Always finish with step 8. The tool never shows output it has not verified as valid JSON.

---

## 4. Detailed behavior spec

### 4.1 Lenient parser (the core)

Grammar is a **superset** of JSON, Python literals, and JS object literals.

**Values**
- Strings: `"..."`, `'...'`, `"""..."""`, backtick strings, with prefixes `r'' b'' u'' f''`. Handle escapes `\n \t \uXXXX \xNN \'`.
- Numbers: ints, floats, `1e5`, `1_000_000`, hex `0xFF`, octal `0o17`, binary `0b1`, leading `+`, `.5`, `5.`.
  - **Big ints beyond 2^53**: keep original digits (use `BigInt` or the raw token) so precision is never lost.
- Constants: `true/false/null`, `True/False/None`, `NaN`, `Infinity`, `-Infinity`, `undefined`.
- Containers: `{}`, `[]`, `()` (tuple), `{1,2}` (set), `set()`, `frozenset({..})`, `dict(a=1)`, `list(...)`.
- Keys: quoted, unquoted identifiers, numeric, tuple keys `(1,2): "x"`, and any value type in Python dicts (non-string keys are coerced per option).
- Comments: `//`, `/* */`, `#`.
- Trailing commas, missing commas between values, duplicate keys (policy option).
- Ellipsis `...` and Python's `{...}` / `[...]` cyclic markers.

**Constructor calls** — `Name(args)` or `module.Name(args)`. Dispatch through the type registry (4.2). Unknown constructors go to the fallback handler.

**Object reprs** — `<__main__.User object at 0x7f...>`, `<class 'str'>`, `<function f at 0x..>` become strings (option: keep, `null`, or placeholder).

**Dataclass / pydantic / namedtuple reprs** — `User(id=1, name='x')` becomes an object `{"id":1,"name":"x"}` (option: include `__type__`).

### 4.2 Python / non-JSON type registry

Each handler: `{ match(name): bool, parse(args, ctx): Node, toJson(node, opts): JsonValue }`.

| Input | Default JSON output | Option alternatives |
|---|---|---|
| `datetime.datetime(2024,1,5,13,30,tzinfo=datetime.timezone.utc)` | `"2024-01-05T13:30:00+00:00"` | `Z` suffix; epoch seconds/ms; `{"$datetime": ...}` tagged |
| `datetime.date(2024,1,5)` | `"2024-01-05"` | epoch |
| `datetime.time(13,30)` | `"13:30:00"` | |
| `datetime.timedelta(days=1, seconds=5)` | `"P1DT5S"` (ISO 8601 duration) | total seconds number |
| `Timestamp('2024-01-05 13:30:00')` (pandas) / `datetime(...)` bare name | ISO string | |
| `Decimal('1.50')` | `"1.50"` string (lossless) | number; tagged |
| `UUID('...')` | string | |
| `b'abc'` / `bytearray(...)` | base64 string | utf-8 decode; hex; array of ints |
| `set` / `frozenset` | array (sorted if sortable, else insertion order) | |
| `tuple` | array | |
| `range(1,5)` | `[1,2,3,4]` if small, else `{"start","stop","step"}` | |
| `Enum`: `<Color.RED: 1>` | `"RED"` | value; `"Color.RED"` |
| `Path('/a/b')`, `PosixPath(...)` | string | |
| `complex(1,2)` | `"1+2j"` | `{"re":1,"im":2}` |
| `NaN`, `Infinity` | `null` | string `"NaN"`; keep (invalid JSON, warn) |
| `None` | `null` | |
| `numpy.int64(5)`, `array([1,2])`, `np.float32(1.5)` | native number / array | |
| `Object at 0x..` | string | `null` |

Datetime details:
- Support positional and keyword args, `tzinfo=` variants: `datetime.timezone.utc`, `timezone(timedelta(hours=5, minutes=30))`, `tzutc()`, `pytz.UTC`, `zoneinfo.ZoneInfo('Asia/Kolkata')`.
- Microseconds are kept (`isoformat` style).
- Also detect already-stringified forms (`2024-01-05 13:30:00.123`), normalize to ISO if the option is on. Never alter plain strings by default.
- Validate ranges (month 1–12, etc.). On invalid values emit a diagnostic and fall back to a raw string.

### 4.3 Structural repair (missing / mismatched brackets)

Implemented inside the parser using a **bracket stack**, not regex.

- **Missing closers at EOF**: auto-append in the correct reverse order. Report `Added 3 closing brackets: ] } }`.
- **Missing opener**: parser sees a stray `}` or `]` with an empty stack. Wrap the preceding content in the implied container (e.g. `"a":1,"b":2}` becomes `{"a":1,"b":2}`; a bare comma-separated list becomes an array). Report it.
- **Mismatched closer** (`{ "a": [1,2 }`): the stack top is `[`, but `}` arrives. Close the inner container first, then match. Report it.
- **Truncated mid-token** (cut off inside a string/number/key):
  - Truncated string: close it. Option to drop the partial value instead.
  - Dangling key without value (`{"a": 1, "b":`): set `null` or drop the key (option).
  - Dangling comma: remove.
- **Missing commas** between values/pairs (including newline-separated): insert.
- **Missing colon**: `"a" 1` becomes `"a": 1`.
- **Unquoted keys / values**: quote keys; unquoted bare words as values become strings (with a warning); `Foo` could also be a constructor, so only treat it as a constructor if followed by `(`.
- **Unescaped quotes inside strings** (`"he said "hi""`): heuristic. A quote is a terminator only if the next non-space char is `, } ] :` or EOF. Report as low confidence.
- **Unescaped newlines/tabs in strings**: escape.
- **Multiple top-level values** (NDJSON, `{..}{..}`, `{..}\n{..}`): option to wrap in array or emit JSON Lines.
- **Confidence score**: each repair carries a severity (`info`, `warn`, `guess`). If any `guess` repairs were made, the UI shows a banner: "Output was reconstructed, verify the guessed parts" and highlights them.

### 4.4 Extraction from noisy text

- Strip ```` ```json ``` ```` / ```` ```python ```` fences.
- Strip log prefixes (`2024-01-05 INFO main - {...}`), `Response:`, `data = `, `print(...)`, `return {...}`, `var x = {...};`.
- Find the payload start (first `{` or `[` that begins a parsable region); end at the balanced end or EOF.
- If multiple candidate payloads exist, pick the largest and offer a "Payload N of M" switcher.

### 4.5 Serialization options

- Indent: 2 / 4 / tab / minified
- Sort keys (none / asc / desc / deep)
- Non-string key coercion: `str()`, JSON-encode tuple keys
- Duplicate key policy: last wins / first wins / suffix `_2` / array merge
- ASCII-only escape (`ensure_ascii`)
- Escape `/`, `<`, `>`, `&` for HTML-safe output
- Big numbers: keep as number token / convert to string
- NaN/Infinity: null / string
- Datetime format mode, bytes mode, decimal mode, set order (see 4.2)
- Max depth truncation, string truncation (for preview only)
- Emit with **custom serializer** (not `JSON.stringify`) so large integers and key order are preserved exactly.

---

## 5. UI / UX spec

Layout: two resizable panes (input left, output right; stacked on mobile), toolbar on top, collapsible bottom panel for **Report**.

**Toolbar**: Format, Minify, Copy, Download `.json`, Upload file, Clear, Sample dropdown, Options, Theme toggle, Share (URL hash, optional, size-limited and off by default for privacy).

**Input pane** (CodeMirror 6)
- Syntax highlighting for a Python/JSON hybrid (custom Lezer grammar or reuse `lang-python`).
- Live lint markers on problem positions from the parser diagnostics.
- Paste, drag-drop file, and "paste from clipboard" button.
- Auto-run on change, debounced (~250 ms; disable auto-run above 2 MB).

**Output pane** (CodeMirror 6, read-only)
- JSON highlighting, folding, search.
- **Highlight repaired spans** (colored gutter/underline; hover shows "Added missing `}`").
- Toggle: Code view / Tree view.
- Copy path on click in tree view (`$.users[0].created_at`).

**Report panel**
- Counts: `3 type conversions, 2 structural repairs, 1 guess`.
- Click an item to jump to the input and output locations.
- Table of type conversions: original snippet -> JSON value.

**Options panel**: grouped as in 4.5, persisted in `localStorage`.

**Other**
- Status bar: size in/out, parse time, line/col, depth.
- Keyboard: `Ctrl/Cmd+Enter` format, `Ctrl/Cmd+Shift+C` copy output.
- Accessibility: labelled controls, focus management, high contrast, screen-reader announcements for result status.
- Error state: when output cannot be made valid, show the partial result, the first failure position, and plain-language cause.
- Empty state: sample inputs (Python dict with datetime, truncated JSON, JS object).

---

## 6. Performance and safety

- Run the pipeline in a **Web Worker**; cancel in-flight jobs when input changes.
- Single-pass tokenizer (no regex backtracking); linear time. Cap recursion depth (default 10,000) with an iterative fallback or a clear error.
- Streaming/chunked path for inputs above ~20 MB (use `jsonrepair/stream` ideas; otherwise warn).
- **Never `eval`, `new Function`, or execute input.** Python constructors are only *parsed*, never run.
- Sanitize anything rendered as HTML (CodeMirror text only; no `dangerouslySetInnerHTML`).
- No network calls with user data. Add a strict CSP in the deployment.
- Prototype pollution: build objects with `Object.create(null)` or a `Map` in the AST; the serializer must safely handle keys like `__proto__`.

---

## 7. Testing strategy

1. **Fixture tests** (`tests/fixtures/*.in` -> `*.out.json` + `*.report.json`), at least 150 cases covering every row in 4.2 and 4.3.
2. **Property-based tests** (`fast-check`):
   - For any JSON value `v`: `format(JSON.stringify(v))` deep-equals `v`.
   - Output always passes `JSON.parse`.
   - Idempotence: `format(format(x)) == format(x)`.
3. **Mutation/fuzz tests**: take valid JSON, randomly delete/insert brackets, quotes, commas; assert no crash/hang and valid output or a clean failure.
4. **Differential test** vs `jsonrepair` on broken-JSON cases, to catch regressions.
5. **Python round-trip corpus**: generate with a Python script (`repr()` of dicts holding every supported type), commit as fixtures, and compare against `json.dumps(obj, default=...)` expectations.
6. **E2E (Playwright)**: paste, format, copy, download, options persistence, large-file smoke test, mobile viewport.
7. Performance budget: 5 MB input formats in < 1.5 s in the worker.

---

## 8. Phased delivery (tell Claude CLI to stop after each phase)

**Phase 0 — Scaffold**
Vite + React + TS + Tailwind + Vitest + Biome/ESLint. CI workflow (lint, typecheck, test, build). README.

**Phase 1 — Core happy path**
Normalize, fast path `JSON.parse`, serializer, options model, report model. Tests.

**Phase 2 — Lenient parser**
Tokenizer + parser: Python literals, single quotes, comments, trailing commas, tuples/sets, number formats. Tests.

**Phase 3 — Python type registry**
`datetime`/`date`/`time`/`timedelta`/tz variants, `Decimal`, `UUID`, `bytes`, `Enum`, object reprs, dataclass reprs, numpy basics. Option modes. Tests per type.

**Phase 4 — Structural repair**
Bracket stack logic, truncation handling, missing commas/colons, noisy-text extraction, multi-payload. `jsonrepair` fallback. Confidence scoring. Fuzz tests.

**Phase 5 — UI**
Panes, toolbar, CodeMirror integration, lint markers, repaired-span highlighting, report panel, options panel, theming, worker wiring.

**Phase 6 — Polish**
Tree view, file upload/download, samples, keyboard shortcuts, a11y pass, mobile layout, perf work, E2E tests.

**Phase 7 — Release**
Static deploy, CSP headers, docs with a supported-types table, changelog.

---

## 9. Acceptance criteria

- Pasting `{'created': datetime.datetime(2024, 1, 5, 13, 30), 'id': UUID('...'), 'tags': {'a','b'}, 'price': Decimal('9.99'), 'ok': True, 'x': None}` yields valid JSON with the expected conversions and a report entry for each.
- Pasting `{"users": [{"id": 1, "name": "A"}, {"id": 2, "name": "B"` yields valid JSON with closers appended in the right order and a repair note.
- Pasting `"a":1,"b":[1,2]}` yields `{"a":1,"b":[1,2]}`.
- Output is **always** verified by `JSON.parse` before being shown as success.
- No input is ever executed or sent over the network.
- Large integers (e.g. `12345678901234567890`) are never silently rounded.
- UI remains responsive on a 5 MB input.

---

## 10. Instructions for Claude Code

- Work phase by phase; after each, run `npm run lint && npm run typecheck && npm test` and fix failures before continuing.
- Keep `src/core` free of DOM/React imports so it can later be published as an npm package or used in a CLI.
- Add a test with every new feature or bug fix; fixtures first where practical.
- Prefer small, well-named modules. Document each Python type handler with an example in its file header.
- Ask before adding any dependency not listed in section 2.
- Verify current package versions with `npm view <pkg> version` at install time rather than trusting this document.
