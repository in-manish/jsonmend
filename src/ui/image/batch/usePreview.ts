import { useEffect, useState } from 'react'
import { Cancelled } from '../../../core/image/fitToTarget'
import type { ImagePrefs } from '../useImageStore'
import { type BatchOut, convertOne } from './convertOne'
import type { BatchItem } from './useBatch'

interface Preview {
  /** Result for this photo: the real one if converted, otherwise a trial with the current choices. */
  out?: BatchOut
  /** The result is a trial, not yet part of the list. */
  trial: boolean
  working: boolean
  error?: string
}

/**
 * Lets someone see how a photo will look before converting the whole list: when it has no result
 * yet, this photo alone is converted with the current choices (debounced, redone if they change).
 */
export function usePreview(item: BatchItem | undefined, prefs: ImagePrefs['batch']): Preview {
  const [trial, setTrial] = useState<{
    item: BatchItem
    prefs: ImagePrefs['batch']
    out?: BatchOut
    error?: string
  }>()
  const needed = !!item && !item.out && item.status !== 'error' && item.status !== 'working'

  useEffect(() => {
    if (!item || !needed) return
    const signal = { cancelled: false }
    const timer = setTimeout(async () => {
      try {
        const out = await convertOne(item.file, prefs, signal)
        if (!signal.cancelled) setTrial({ item, prefs, out })
      } catch (err) {
        if (signal.cancelled || err instanceof Cancelled) return
        setTrial({ item, prefs, error: err instanceof Error ? err.message : 'No preview' })
      }
    }, 250)
    return () => {
      signal.cancelled = true
      clearTimeout(timer)
    }
  }, [item, needed, prefs])

  if (item?.out) return { out: item.out, trial: false, working: false }
  if (item?.status === 'error') return { trial: false, working: false, error: item.error }
  const fresh = trial && trial.item === item && trial.prefs === prefs ? trial : undefined
  return {
    out: fresh?.out,
    trial: true,
    working: needed && !fresh,
    error: fresh?.error,
  }
}
