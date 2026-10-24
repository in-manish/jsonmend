import { useId } from 'react'
import { type ImagePrefs, useImageStore } from '../useImageStore'
import { BatchSettings } from './BatchSettings'
import { FormatChoice } from './FormatChoice'
import { GOALS } from './goals'
import { LimitChoice } from './LimitChoice'

/** "What do you need?": big plain choices; only the matching extra options appear below. */
export function GoalPicker({ prefs }: { prefs: ImagePrefs['batch'] }) {
  const set = useImageStore((s) => s.setBatch)
  const setTarget = useImageStore((s) => s.setBatchTarget)
  const group = useId()

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-base font-semibold">What do you need?</legend>
        {GOALS.map((g) => (
          <label
            key={g.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
              prefs.goal === g.id
                ? 'border-[var(--accent)] bg-[var(--bg)]'
                : 'border-[var(--border)]'
            }`}
          >
            <input
              type="radio"
              name={group}
              checked={prefs.goal === g.id}
              onChange={() => {
                set({ goal: g.id, ...g.apply })
                if (g.target) setTarget(g.target)
              }}
              className="mt-1 flex-none"
            />
            <span className="min-w-0 leading-snug">
              <span className="block font-semibold">{g.title}</span>
              <span className="block text-sm text-[var(--muted)]">{g.text}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {prefs.goal === 'upload' && <LimitChoice target={prefs.target} onChange={setTarget} />}
      {prefs.goal === 'convert' && <FormatChoice prefs={prefs} onChange={set} />}
      {prefs.goal === 'custom' && <BatchSettings prefs={prefs} />}
    </div>
  )
}
