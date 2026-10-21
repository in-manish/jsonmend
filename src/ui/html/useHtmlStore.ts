import { create } from 'zustand'
import { DEFAULT_HTML_OPTIONS, type HtmlOptions } from '../../core/html/format'
import { autosave, loadSaved, SAVE_FAILED } from '../../store/autosave'
import { useAppStore } from '../../store/useAppStore'

export type HtmlView = 'code' | 'preview'

export interface PreviewPrefs {
  /** A device id from preview/devices.ts, or 'fit' to fill the pane. */
  device: string
  landscape: boolean
  /** Show the HTML as Gmail would: off, Google account, or other account in the Gmail app. */
  gmail: 'off' | 'gmail' | 'other'
  dark: boolean
  /** Render a Django / Jinja template with sample data. */
  fill: boolean
  /** The user's edited sample-data JSON; undefined = use the generated data. */
  data?: string
}

const DEFAULT_PREVIEW: PreviewPrefs = {
  device: 'fit',
  landscape: false,
  gmail: 'off',
  dark: false,
  fill: false,
}

interface HtmlState {
  input: string
  options: HtmlOptions
  /** What the right pane shows. */
  view: HtmlView
  preview: PreviewPrefs
  /** Pane folded into a rail (at most one); not persisted. */
  collapsed?: 'input' | 'output'
  /** Output fills the whole tool; not persisted. */
  maximized: boolean
  toggleCollapsed(pane: 'input' | 'output'): void
  setMaximized(on: boolean): void
  setInput(input: string): void
  setOptions(patch: Partial<HtmlOptions>): void
  setView(view: HtmlView): void
  setPreview(patch: Partial<PreviewPrefs>): void
}

const KEY = 'jsonmend:html'
type Saved = Pick<HtmlState, 'input' | 'options' | 'view' | 'preview'>
const saved = loadSaved<Saved>(KEY)

/** Restored from localStorage on load; cleared only when the user clears it. */
export const useHtmlStore = create<HtmlState>((set) => ({
  maximized: false,
  toggleCollapsed: (pane) => set((s) => ({ collapsed: s.collapsed === pane ? undefined : pane })),
  setMaximized: (maximized) => set({ maximized }),
  input: typeof saved.input === 'string' ? saved.input : '',
  options: { ...DEFAULT_HTML_OPTIONS, ...saved.options },
  view: saved.view === 'preview' ? 'preview' : 'code',
  setInput: (input) => set({ input }),
  setOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),
  preview: { ...DEFAULT_PREVIEW, ...saved.preview },
  setView: (view) => set({ view }),
  setPreview: (patch) => set((s) => ({ preview: { ...s.preview, ...patch } })),
}))

autosave(
  useHtmlStore,
  KEY,
  (s): Saved => ({
    input: s.input,
    options: s.options,
    view: s.view,
    preview: s.preview,
  }),
  () => useAppStore.getState().notify(SAVE_FAILED),
)
