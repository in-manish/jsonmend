import { Prec } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { useAppStore } from '../../store/useAppStore'

/** Ctrl/Cmd+Enter formats, overriding CodeMirror's default "insert blank line". */
export const formatKeymap = Prec.highest(
  keymap.of([
    {
      key: 'Mod-Enter',
      run: () => {
        useAppStore.getState().requestRun()
        return true
      },
    },
  ]),
)
