/** The tree the formatter works on, and the HTML facts it needs (void, inline, implied end tags). */

export interface El {
  k: 'el'
  name: string
  attrs: string[]
  selfClose: boolean
  children: Node[]
  hasClose: boolean
  from: number
  /** Verbatim body of script / style / pre / textarea. */
  rawBody?: string
}

export interface Text {
  k: 'text'
  s: string
  from: number
}

/** Comment, doctype, stray end tag, `{% comment %}` block: kept as written, on its own lines. */
export interface Block {
  k: 'block'
  raw: string
}

export type Node = El | Text | Block

export const isWs = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f'

const words = (s: string) => new Set(s.trim().split(/\s+/))

export const VOID = words('area base br col embed hr img input link meta param source track wbr')
export const RAW_TEXT = words('script style textarea pre')
export const INLINE = words(
  `a abbr b bdi bdo br button cite code data del dfn em i img input ins kbd label mark q s samp
  select small span strong sub sup time u var wbr`,
)
/** Elements whose end tag may be left out, so a missing one is not reported. */
export const OPTIONAL_END = words(
  'html head body p li dt dd tr td th thead tbody tfoot option optgroup colgroup',
)
/** Opening this element closes these open ones (only the innermost is checked). */
export const IMPLIED: Record<string, string[]> = {
  li: ['li'],
  dt: ['dt', 'dd'],
  dd: ['dt', 'dd'],
  option: ['option'],
  optgroup: ['option', 'optgroup'],
  tr: ['td', 'th', 'tr'],
  td: ['td', 'th'],
  th: ['td', 'th'],
  thead: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'],
  tbody: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'],
  tfoot: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'],
}
/** Opening any of these closes an open `<p>`. */
export const CLOSES_P = words(
  `address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main
  nav ol p pre section table ul`,
)
