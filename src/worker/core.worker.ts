import * as Comlink from 'comlink'
import { type FormatOptions, format } from '../core'

/** Runs the pipeline off the main thread so large inputs never freeze the UI. */
const api = {
  format(input: string, options: Partial<FormatOptions>) {
    return format(input, options)
  },
}

export type WorkerApi = typeof api

Comlink.expose(api)
