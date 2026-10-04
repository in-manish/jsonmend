export type Segment = string | number

const IDENT = /^[A-Za-z_$][\w$]*$/

/** JSONPath for a node: `$.users[0].created_at`, `$["odd key"]`. */
export function formatPath(segments: Segment[]): string {
  let out = '$'
  for (const s of segments) {
    if (typeof s === 'number') out += `[${s}]`
    else if (IDENT.test(s)) out += `.${s}`
    else out += `[${JSON.stringify(s)}]`
  }
  return out
}
