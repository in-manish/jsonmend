import { useState } from 'react'
import { useAppStore } from '../../../store/useAppStore'
import { DropZone } from '../DropZone'
import { useIsPhone } from '../lib/useIsPhone'
import { useImageStore } from '../useImageStore'
import { BatchActions } from './BatchActions'
import { BatchList } from './BatchList'
import { GoalPicker } from './GoalPicker'
import { goalFor } from './goals'
import { PhotoViewer } from './PhotoViewer'
import { useBatch } from './useBatch'
import { downloadZip } from './zipResults'

const STEPS = ['Choose your photos', 'Tell us what you need', 'Download the result']

/** Many photos, one set of settings: convert them in turn and download a ZIP. */
export function BatchTool() {
  const prefs = useImageStore((s) => s.prefs.batch)
  const notify = useAppStore((s) => s.notify)
  const phone = useIsPhone()
  const batch = useBatch(prefs)
  const { items } = batch
  const [viewing, setViewing] = useState<number>()

  if (items.length === 0) {
    return (
      <div className="image-tool flex h-full items-center justify-center overflow-y-auto p-4">
        <div className="flex w-full max-w-xl flex-col gap-5">
          <div className="text-center">
            <h2 className="m-0 text-xl font-semibold">Make many photos smaller in one go</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              For WhatsApp, email or upload forms. Your photos stay on this{' '}
              {phone ? 'phone' : 'computer'}; nothing is sent anywhere.
            </p>
          </div>
          <DropZone
            paste
            multiple
            primary
            accept="image/*"
            label="Choose photos"
            hint={
              phone ? 'Pick as many as you like' : 'Pick as many as you like, or drop them here'
            }
            onFiles={batch.add}
          />
          <ol className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {STEPS.map((t, i) => (
              <li key={t} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-[var(--accent-fg)]"
                >
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="image-tool flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <aside
          aria-label="Batch settings"
          className="flex w-full flex-none flex-col gap-3 border-b border-[var(--border)] bg-[var(--panel)] p-3 md:h-full md:w-80 md:overflow-y-auto md:border-r md:border-b-0"
        >
          <GoalPicker prefs={prefs} />
        </aside>
        <div className="min-w-0 flex-none md:min-h-0 md:flex-1 md:overflow-y-auto">
          <div className="flex items-center gap-2 px-3 pt-3">
            <span className="min-w-0 flex-1 text-sm font-medium">
              {items.length} photo{items.length === 1 ? '' : 's'}
            </span>
            <label
              className="btn inline-flex cursor-pointer items-center justify-center"
              aria-disabled={batch.running}
            >
              Add more
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                data-testid="batch-add-input"
                disabled={batch.running}
                onChange={(e) => {
                  batch.add([...(e.target.files ?? [])])
                  e.target.value = ''
                }}
              />
            </label>
            <button type="button" className="btn" disabled={batch.running} onClick={batch.clear}>
              Clear
            </button>
          </div>
          <BatchList
            items={items}
            format={prefs.format}
            target={prefs.target}
            busy={batch.running}
            onRemove={batch.remove}
            onOpen={setViewing}
          />
        </div>
      </div>
      {viewing !== undefined && (
        <PhotoViewer
          items={items}
          id={viewing}
          prefs={prefs}
          onSelect={setViewing}
          onClose={() => setViewing(undefined)}
        />
      )}
      <BatchActions
        items={items}
        running={batch.running}
        stale={batch.stale}
        action={goalFor(prefs.goal).action(items.length)}
        onConvert={batch.start}
        onStop={batch.stop}
        onZip={() =>
          downloadZip(items, prefs.format).catch(() => notify('Could not build the ZIP'))
        }
      />
    </div>
  )
}
