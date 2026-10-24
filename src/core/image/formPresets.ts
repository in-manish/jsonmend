/**
 * Photo rules of a few popular Indian forms. These come from public guides and notices read in
 * October 2026, not from an API, and forms change them often: keep this list short, keep it in one
 * place, and tell people to check their own form.
 */
export interface FormDoc {
  id: string
  label: string
  /** Exact size in pixels the form asks for, or the size we pick when it only limits the file. */
  width: number
  height: number
  /** Whether the form itself sets the pixel size (otherwise it only limits the file size). */
  fixed: boolean
  minKb: number
  maxKb: number
}

export interface FormPreset {
  id: string
  name: string
  docs: FormDoc[]
}

const doc = (
  id: string,
  label: string,
  [width, height]: [number, number],
  [minKb, maxKb]: [number, number],
  fixed = true,
): FormDoc => ({ id, label, width, height, fixed, minKb, maxKb })

export const FORM_PRESETS: FormPreset[] = [
  {
    id: 'ibps',
    name: 'IBPS (bank exams)',
    docs: [
      doc('photo', 'Photo', [200, 230], [20, 50]),
      doc('signature', 'Signature', [140, 60], [10, 20]),
      doc('thumb', 'Left thumb', [240, 240], [20, 50]),
      doc('declaration', 'Handwritten declaration', [800, 400], [50, 100]),
    ],
  },
  {
    id: 'neet',
    name: 'NEET (NTA)',
    docs: [
      doc('photo', 'Photo', [350, 450], [10, 200], false),
      doc('signature', 'Signature', [350, 140], [4, 30], false),
    ],
  },
  {
    id: 'upsc',
    name: 'UPSC',
    docs: [
      doc('photo', 'Photo', [350, 450], [20, 200], false),
      doc('signature', 'Signature', [350, 150], [20, 100], false),
    ],
  },
  {
    id: 'passport',
    name: 'Indian passport (Seva)',
    docs: [doc('photo', 'Photo', [630, 810], [10, 250])],
  },
]

export const findDoc = (formId: string, docId: string): FormDoc | undefined =>
  FORM_PRESETS.find((f) => f.id === formId)?.docs.find((d) => d.id === docId)

/**
 * The file size window in bytes. Sites differ on whether a KB is 1000 or 1024 bytes, so the window
 * is the part that is right under both: at least min × 1024, at most max × 1000.
 */
export const limitsBytes = (d: FormDoc) => ({ min: d.minKb * 1024, max: d.maxKb * 1000 })

/** "200 × 230 px, JPG, 20–50 KB". */
export const describeDoc = (d: FormDoc) =>
  `${d.width} × ${d.height} px, JPG, ${d.minKb}–${d.maxKb} KB`

/** The address-bar "option" for a form: "form", "form:ibps" or "form:ibps:signature". */
export const formOption = (formId?: string, docId?: string): string =>
  ['form', formId, docId].filter(Boolean).join(':')

/** Reads such an option back; undefined when it is not a form option at all. */
export function parseFormOption(
  option: string | undefined,
): { formId?: string; docId?: string } | undefined {
  const [head, formId, docId] = (option ?? '').split(':')
  return head === 'form' ? { formId, docId } : undefined
}
