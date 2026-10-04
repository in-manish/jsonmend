import * as Comlink from 'comlink'
import type { FormatOptions, FormatResult } from '../core'
import type { WorkerApi } from './core.worker'

/**
 * Sends format jobs to a Web Worker. A new job while one is running terminates the worker
 * (the only way to cancel synchronous work) and starts a fresh one. Superseded jobs resolve
 * to `undefined`. Falls back to the main thread where workers aren't available.
 */
export class FormatClient {
  private worker?: Worker
  private api?: Comlink.Remote<WorkerApi>
  private busy = false
  private seq = 0

  async format(input: string, options: Partial<FormatOptions>): Promise<FormatResult | undefined> {
    const id = ++this.seq
    if (typeof Worker === 'undefined') {
      // Main-thread fallback, loaded only when needed so the core stays out of the main bundle.
      const { format } = await import('../core/pipeline')
      return format(input, options)
    }
    if (this.busy) this.stop()
    if (!this.api) this.spawn()
    this.busy = true
    try {
      const result = await this.api?.format(input, options)
      return id === this.seq ? result : undefined
    } finally {
      if (id === this.seq) this.busy = false
    }
  }

  dispose() {
    this.stop()
  }

  private spawn() {
    this.worker = new Worker(new URL('./core.worker.ts', import.meta.url), { type: 'module' })
    this.api = Comlink.wrap<WorkerApi>(this.worker)
  }

  private stop() {
    this.worker?.terminate()
    this.worker = undefined
    this.api = undefined
    this.busy = false
  }
}
