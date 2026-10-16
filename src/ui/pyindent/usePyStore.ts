import { create } from 'zustand'
import { DEFAULT_PY_OPTIONS, type PyIndentOptions } from '../../core/pyindent/fix'
import { autosave, loadSaved, SAVE_FAILED } from '../../store/autosave'
import { useAppStore } from '../../store/useAppStore'

interface PyState {
  input: string
  options: PyIndentOptions
  setInput(input: string): void
  setOptions(patch: Partial<PyIndentOptions>): void
}

const KEY = 'jsonmend:python'
type Saved = Pick<PyState, 'input' | 'options'>
const saved = loadSaved<Saved>(KEY)

/** Restored from localStorage on load; cleared only when the user clears it. */
export const usePyStore = create<PyState>((set) => ({
  input: typeof saved.input === 'string' ? saved.input : '',
  options: { ...DEFAULT_PY_OPTIONS, ...saved.options },
  setInput: (input) => set({ input }),
  setOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),
}))

autosave(
  usePyStore,
  KEY,
  (s): Saved => ({ input: s.input, options: s.options }),
  () => useAppStore.getState().notify(SAVE_FAILED),
)
