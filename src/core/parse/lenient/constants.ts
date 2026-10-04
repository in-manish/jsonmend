import type { Node } from '../../ast'

export type Constant = { node: () => Node; json: boolean }

const t = (): Node => ({ kind: 'boolean', value: true })
const f = (): Node => ({ kind: 'boolean', value: false })
const z = (): Node => ({ kind: 'null' })
const nan = (): Node => ({ kind: 'nonfinite', value: 'NaN' })
const inf = (): Node => ({ kind: 'nonfinite', value: 'Infinity' })

/** Literal names from JSON, Python, JS, numpy and pandas. `json` marks the JSON spelling. */
export const CONSTANTS: Record<string, Constant> = {
  true: { node: t, json: true },
  false: { node: f, json: true },
  null: { node: z, json: true },
  True: { node: t, json: false },
  False: { node: f, json: false },
  None: { node: z, json: false },
  TRUE: { node: t, json: false },
  FALSE: { node: f, json: false },
  NULL: { node: z, json: false },
  undefined: { node: z, json: false },
  nil: { node: z, json: false },
  NaT: { node: z, json: false },
  'pd.NaT': { node: z, json: false },
  'np.True_': { node: t, json: false },
  'np.False_': { node: f, json: false },
  'numpy.True_': { node: t, json: false },
  'numpy.False_': { node: f, json: false },
  NaN: { node: nan, json: false },
  nan: { node: nan, json: false },
  'np.nan': { node: nan, json: false },
  'math.nan': { node: nan, json: false },
  'float.nan': { node: nan, json: false },
  Infinity: { node: inf, json: false },
  inf: { node: inf, json: false },
  'np.inf': { node: inf, json: false },
  'math.inf': { node: inf, json: false },
}

/** Own-property lookup, so names like `valueOf` or `__proto__` never hit Object.prototype. */
export const constantFor = (name: string): Constant | undefined =>
  Object.hasOwn(CONSTANTS, name) ? CONSTANTS[name] : undefined

/** Literals that may be cut short by truncation: `{"ok": tr` -> `true`. */
export const COMPLETABLE = ['true', 'false', 'null', 'True', 'False', 'None']

export const constantJson = (node: Node) =>
  node.kind === 'boolean' ? String(node.value) : node.kind === 'nonfinite' ? node.value : 'null'
