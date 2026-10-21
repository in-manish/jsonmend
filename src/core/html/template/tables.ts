/** What the checker knows about Django and Jinja tags. Custom block tags are found per document. */

/** Block tags and the tag that ends them. */
export const PAIRS: Record<string, string> = {
  if: 'endif',
  for: 'endfor',
  block: 'endblock',
  with: 'endwith',
  comment: 'endcomment',
  verbatim: 'endverbatim',
  raw: 'endraw',
  autoescape: 'endautoescape',
  filter: 'endfilter',
  spaceless: 'endspaceless',
  ifchanged: 'endifchanged',
  ifequal: 'endifequal',
  ifnotequal: 'endifnotequal',
  language: 'endlanguage',
  localize: 'endlocalize',
  blocktrans: 'endblocktrans',
  blocktranslate: 'endblocktranslate',
  cache: 'endcache',
  macro: 'endmacro',
  call: 'endcall',
}

/** Tags that continue a block, and the blocks they may appear in. */
export const MIDDLE: Record<string, string[]> = {
  else: ['if', 'for', 'ifchanged', 'ifequal', 'ifnotequal'],
  elif: ['if'],
  empty: ['for'],
  plural: ['blocktrans', 'blocktranslate', 'trans'],
}

/** The body of these is not template code, so tags inside are ignored. */
export const RAW = new Set(['comment', 'verbatim', 'raw'])

export const NEEDS_ARGS = new Set([
  'if',
  'elif',
  'for',
  'block',
  'extends',
  'include',
  'load',
  'url',
  'with',
])

/** Misspelt tag names and what they should be. */
export const TYPOS: Record<string, string> = { elseif: 'elif', elsif: 'elif' }
