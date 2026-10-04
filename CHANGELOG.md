# Changelog

## 0.1.0 (unreleased)

First release.

### Core (`src/core`, no DOM dependencies)
- Strict, lossless JSON fast path: big integers, number spelling, key order and duplicate keys are
  preserved exactly; output is checked with `JSON.parse` before it is shown.
- Lenient parser for Python literals, JS object literals and broken JSON, with bracket-stack
  repair of missing, mismatched and stray brackets, missing commas and colons, dangling keys and
  truncated values.
- Python and JS type conversion registry: datetime/date/time/timedelta with time zones, pandas,
  Decimal, UUID, bytes, sets, tuples, mappings, Enum, numpy, range, Path, complex, Fraction,
  dataclass and object reprs.
- Noise extraction: code fences, assignments, print/return wrappers, log prefixes, multiple payloads.
- `jsonrepair` fallback for input the parser can't recover.
- Report: every change with severity, input span, output span and (for conversions) the original
  snippet and resulting JSON; low-confidence flag when any repair is a guess.
- Options for indentation, key sorting, duplicate keys, escaping, big numbers, NaN/Infinity and
  every type conversion.

### App
- Two CodeMirror 6 panes (stacked on phones), formatting in a Web Worker with cancellation.
- Lint markers on the input, highlighted repairs in the output, report panel with jump-to-location
  and a type conversion table.
- Tree view with lazy expansion and JSONPath copying.
- Upload, drag and drop, paste, copy, download (`.json` / `.jsonl`), samples, share links (input in
  the URL hash, opt-in, 16 KB limit), light/dark/system theme, persisted options.
- Keyboard: Ctrl/Cmd+Enter formats, Ctrl/Cmd+Shift+C copies the output.

### Tooling
- Vitest unit, fixture (240+ cases), property-based, fuzz, round-trip and differential tests.
- Playwright end-to-end tests on desktop and mobile viewports.
- Strict CSP and security headers in `public/_headers`.
