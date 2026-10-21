---
name: split-large-files
description: Split a source file that is over 250 lines into smaller files grouped in a folder. Use whenever a file you are writing or editing would exceed 250 lines, or when `npm run lint` reports "Files over 250 lines".
---

# Split large files

Project rule: no file in `src/`, `tests/` or `scripts/` is longer than 250 lines.

1. Read the file and list its concerns (types and constants, parsing, printing, one UI section, helpers).
2. Create a folder named after the feature next to the file (`foo.ts` -> `foo/`), or reuse the existing one. Put the files together; add subfolders only when there are clearly separate groups (see `src/core/html/template/` and `markup/`).
3. One concern per file, named for what it holds (`tables.ts`, `parser.ts`, `printer.ts`). Keep each under 250 lines, ideally under 200.
4. Move code unchanged; do not rewrite logic while splitting. Classes with shared state stay together; pull pure helpers and data tables out as functions or constants.
5. Add `index.ts` that exports only the public API. Callers import from the folder (`./foo/index`), not from its internals.
6. Delete the old file (or leave it as a one-line re-export only if deleting is not possible) and fix imports.
7. Verify: `npm run lint && npm run typecheck && npm test`. Behavior must be identical; the existing tests are the check.
8. For a UI component, extract subcomponents and hooks into the same folder (`Toolbar.tsx`, `IssueList.tsx`, `useThing.ts`).
9. For a test file, split by topic into `name.<topic>.test.ts` files sharing helpers in a `helpers.ts`.

If a file in `GRANDFATHERED` (scripts/check-file-length.mjs) is split, remove it from that list.
