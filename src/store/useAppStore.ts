import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { FormatOptions, FormatResult } from '../core'
import { DEFAULT_OPTIONS } from '../core/options'
import { safeStorage } from './storage'

export type Theme = 'system' | 'light' | 'dark'
export type View = 'code' | 'tree'

/** Inputs above this size don't auto-format on every keystroke. */
export const AUTO_RUN_LIMIT = 2 * 1024 * 1024

interface AppState {
  input: string
  options: FormatOptions
  /** Indent to return to when switching from minified back to pretty. */
  prettyIndent: Exclude<FormatOptions['indent'], 'none'>
  result?: FormatResult
  /** The input text `result` was computed from (spans are only valid against it). */
  resultInput?: string
  running: boolean
  view: View
  theme: Theme
  reportOpen: boolean
  optionsOpen: boolean
  /** Cursor position in the input editor, 1-based. */
  cursor: { line: number; column: number }
  /** Diagnostic the user clicked; editors reveal its spans. */
  selected?: { index: number; nonce: number }
  /** Bumped to request a format run outside the debounce (button / shortcut). */
  runRequest: number
  /** Short status message for the live region ("Copied"), with a nonce to re-announce. */
  notice?: { text: string; nonce: number }

  setInput(input: string): void
  setOptions(patch: Partial<FormatOptions>): void
  resetOptions(): void
  setResult(result: FormatResult | undefined, input: string): void
  setRunning(running: boolean): void
  setView(view: View): void
  setTheme(theme: Theme): void
  setReportOpen(open: boolean): void
  setOptionsOpen(open: boolean): void
  setCursor(line: number, column: number): void
  select(index: number): void
  requestRun(): void
  notify(text: string): void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      input: '',
      options: { ...DEFAULT_OPTIONS },
      prettyIndent: 2,
      running: false,
      view: 'code',
      theme: 'system',
      reportOpen: true,
      optionsOpen: false,
      cursor: { line: 1, column: 1 },
      runRequest: 0,

      setInput: (input) => set({ input }),
      setOptions: (patch) =>
        set((s) => ({
          options: { ...s.options, ...patch },
          prettyIndent: patch.indent && patch.indent !== 'none' ? patch.indent : s.prettyIndent,
        })),
      resetOptions: () => set({ options: { ...DEFAULT_OPTIONS } }),
      setResult: (result, input) => set({ result, resultInput: input, selected: undefined }),
      setRunning: (running) => set({ running }),
      setView: (view) => set({ view }),
      setTheme: (theme) => set({ theme }),
      setReportOpen: (reportOpen) => set({ reportOpen }),
      setOptionsOpen: (optionsOpen) => set({ optionsOpen }),
      setCursor: (line, column) => set({ cursor: { line, column } }),
      select: (index) => set((s) => ({ selected: { index, nonce: (s.selected?.nonce ?? 0) + 1 } })),
      requestRun: () => set((s) => ({ runRequest: s.runRequest + 1 })),
      notify: (text) => set((s) => ({ notice: { text, nonce: (s.notice?.nonce ?? 0) + 1 } })),
    }),
    {
      name: 'jsonmend:prefs',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // The input is never persisted: pasted data stays in memory only.
      partialize: (s) => ({
        options: s.options,
        theme: s.theme,
        view: s.view,
        reportOpen: s.reportOpen,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return { ...current, ...p, options: { ...DEFAULT_OPTIONS, ...p.options } }
      },
    },
  ),
)
