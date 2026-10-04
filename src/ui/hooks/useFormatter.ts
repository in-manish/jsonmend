import { useEffect, useRef } from 'react'
import { AUTO_RUN_LIMIT, useAppStore } from '../../store/useAppStore'
import { FormatClient } from '../../worker/client'

const DEBOUNCE_MS = 250

/** Formats the input in the worker: debounced on edits, immediately on explicit requests. */
export function useFormatter() {
  const input = useAppStore((s) => s.input)
  const options = useAppStore((s) => s.options)
  const runRequest = useAppStore((s) => s.runRequest)
  const client = useRef<FormatClient | null>(null)

  useEffect(() => {
    client.current = new FormatClient()
    return () => client.current?.dispose()
  }, [])

  useEffect(() => {
    if (input.length > AUTO_RUN_LIMIT) return
    const timer = setTimeout(() => void run(client.current, input, options), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [input, options])

  useEffect(() => {
    if (runRequest === 0) return
    const { input: text, options: opts } = useAppStore.getState()
    void run(client.current, text, opts)
  }, [runRequest])
}

async function run(
  client: FormatClient | null,
  input: string,
  options: ReturnType<typeof useAppStore.getState>['options'],
) {
  const store = useAppStore.getState()
  if (!client) return
  if (input.trim() === '') {
    store.setResult(undefined, input)
    return
  }
  store.setRunning(true)
  const result = await client.format(input, options)
  if (!result) return
  useAppStore.getState().setResult(result, input)
  useAppStore.getState().setRunning(false)
}
