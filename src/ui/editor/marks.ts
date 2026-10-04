import { type Range, StateEffect, StateField } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'
import type { Diagnostic, Severity } from '../../core'

export interface Mark {
  from: number
  to: number
  severity: Severity
  message: string
}

/** Replaces the highlighted ranges (repaired / converted spans in the output). */
export const setMarks = StateEffect.define<Mark[]>()

export const marksField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, tr) {
    let next = decorations.map(tr.changes)
    for (const effect of tr.effects) {
      if (effect.is(setMarks)) next = build(effect.value, tr.state.doc.length)
    }
    return next
  },
  provide: (field) => EditorView.decorations.from(field),
})

function build(marks: Mark[], length: number): DecorationSet {
  const ranges: Range<Decoration>[] = []
  for (const m of marks) {
    if (m.from >= m.to || m.to > length) continue
    ranges.push(
      Decoration.mark({
        class: `cm-repair cm-repair-${m.severity}`,
        attributes: { title: m.message },
      }).range(m.from, m.to),
    )
  }
  return Decoration.set(ranges, true)
}

/** Output-side marks for every diagnostic the serializer could place. */
export function outputMarks(diagnostics: Diagnostic[]): Mark[] {
  return diagnostics.flatMap((d) =>
    d.outputSpan
      ? [
          {
            from: d.outputSpan.start,
            to: d.outputSpan.end,
            severity: d.severity,
            message: d.message,
          },
        ]
      : [],
  )
}
