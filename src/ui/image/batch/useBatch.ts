import { useCallback, useRef, useState } from 'react'
import { Cancelled } from '../../../core/image/fitToTarget'
import { useAppStore } from '../../../store/useAppStore'
import type { ImagePrefs } from '../useImageStore'
import { type BatchOut, convertOne } from './convertOne'

export interface BatchItem {
  id: number
  file: File
  status: 'queued' | 'working' | 'done' | 'error'
  out?: BatchOut
  error?: string
}

/** The photos in the list and the run that converts them one after another. */
export function useBatch(prefs: ImagePrefs['batch']) {
  const notify = useAppStore((s) => s.notify)
  const [items, setItems] = useState<BatchItem[]>([])
  const [running, setRunning] = useState(false)
  /** Settings of the last finished run, to tell when the results are out of date. */
  const [ranWith, setRanWith] = useState<string>()
  const token = useRef({ cancelled: false })
  const nextId = useRef(0)

  const patch = useCallback((id: number, change: Partial<BatchItem>) => {
    setItems((all) => all.map((i) => (i.id === id ? { ...i, ...change } : i)))
  }, [])

  const add = useCallback((files: File[]) => {
    setItems((all) => [
      ...all,
      ...files.map((file) => ({ id: nextId.current++, file, status: 'queued' as const })),
    ])
  }, [])

  const remove = (id: number) => setItems((all) => all.filter((i) => i.id !== id))

  const clear = () => {
    token.current.cancelled = true
    // A fresh token, so a run that is still unwinding does not touch the emptied list.
    token.current = { cancelled: true }
    setItems([])
    setRanWith(undefined)
    setRunning(false)
  }

  const stop = () => {
    token.current.cancelled = true
  }

  const start = async () => {
    const run = { cancelled: false }
    token.current = run
    const queue = items
    const settings = JSON.stringify(prefs)
    setRunning(true)
    setRanWith(undefined)
    setItems(queue.map(({ id, file }) => ({ id, file, status: 'queued' })))
    for (const item of queue) {
      if (run.cancelled) break
      patch(item.id, { status: 'working' })
      try {
        const out = await convertOne(item.file, prefs, run)
        if (run.cancelled) break
        patch(item.id, { status: 'done', out })
      } catch (err) {
        if (err instanceof Cancelled || run.cancelled) break
        patch(item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Could not convert this file',
        })
      }
    }
    if (token.current !== run) return
    // A stopped run leaves the unfinished photo waiting again.
    setItems((all) => all.map((i) => (i.status === 'working' ? { ...i, status: 'queued' } : i)))
    setRunning(false)
    if (!run.cancelled) setRanWith(settings)
    else notify('Stopped')
  }

  return {
    items,
    running,
    stale: ranWith !== undefined && ranWith !== JSON.stringify(prefs),
    add,
    remove,
    clear,
    start,
    stop,
  }
}
