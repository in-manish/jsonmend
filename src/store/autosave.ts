/**
 * Keeps a slice of a store in localStorage so work survives a crash or accidental close. Content
 * is only removed when the user clears it (an empty value is saved like any other).
 */

const WRITE_DELAY_MS = 400

export const SAVE_FAILED = 'Too large to keep in this browser: it will not survive a reload'

export function loadSaved<T extends object>(key: string): Partial<T> {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as unknown) : undefined
    return parsed && typeof parsed === 'object' ? (parsed as Partial<T>) : {}
  } catch {
    return {}
  }
}

const shallowEqual = (a: object, b: object) => {
  const keys = Object.keys(a) as (keyof typeof a)[]
  return keys.every((k) => Object.is(a[k], b[k]))
}

/**
 * Writes `pick(state)` after edits settle (and immediately when the page is hidden or closing).
 * `onError` runs at most once per failure streak, e.g. when the data exceeds the browser quota.
 */
export function autosave<S, T extends object>(
  store: { getState(): S; subscribe(listener: (state: S) => void): () => void },
  key: string,
  pick: (state: S) => T,
  onError?: () => void,
) {
  let saved = pick(store.getState())
  let pending: T | undefined
  let timer = 0
  let failed = false

  const flush = () => {
    window.clearTimeout(timer)
    if (!pending) return
    const value = pending
    pending = undefined
    try {
      localStorage.setItem(key, JSON.stringify(value))
      failed = false
    } catch {
      if (!failed) onError?.()
      failed = true
    }
  }

  store.subscribe((state) => {
    const next = pick(state)
    if (shallowEqual(next, saved)) return
    saved = next
    pending = next
    window.clearTimeout(timer)
    timer = window.setTimeout(flush, WRITE_DELAY_MS)
  })
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}
