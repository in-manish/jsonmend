import { create } from 'zustand'
import { convert, type Direction, type UrlMode } from '../../core/url/codec'
import { autosave, loadSaved, SAVE_FAILED } from '../../store/autosave'
import { useAppStore } from '../../store/useAppStore'

interface UrlState {
  direction: Direction
  mode: UrlMode
  repeat: boolean
  input: string
  setDirection(direction: Direction): void
  setMode(mode: UrlMode): void
  setRepeat(repeat: boolean): void
  setInput(input: string): void
  /** Uses the current output as the new input and flips the direction. */
  swap(): void
}

const KEY = 'jsonmend:url'
type Saved = Pick<UrlState, 'direction' | 'mode' | 'repeat' | 'input'>
const saved = loadSaved<Saved>(KEY)

/** Restored from localStorage on load; cleared only when the user clears it. */
export const useUrlStore = create<UrlState>((set, get) => ({
  direction: saved.direction === 'encode' ? 'encode' : 'decode',
  mode: saved.mode ?? 'component',
  repeat: saved.repeat === true,
  input: typeof saved.input === 'string' ? saved.input : '',
  setDirection: (direction) => set({ direction }),
  setMode: (mode) => set({ mode }),
  setRepeat: (repeat) => set({ repeat }),
  setInput: (input) => set({ input }),
  swap: () => {
    const { direction, mode, repeat, input } = get()
    const r = convert(direction, mode, input, repeat)
    if (!r.ok) return
    set({ input: r.output, direction: direction === 'decode' ? 'encode' : 'decode' })
  },
}))

autosave(
  useUrlStore,
  KEY,
  (s): Saved => ({ direction: s.direction, mode: s.mode, repeat: s.repeat, input: s.input }),
  () => useAppStore.getState().notify(SAVE_FAILED),
)
