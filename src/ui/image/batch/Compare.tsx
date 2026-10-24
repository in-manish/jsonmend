import { useState } from 'react'

/**
 * Before and after on top of each other with one slider: drag to move the dividing line, like
 * flipping between the two. The original sets the size; the result is laid over it.
 */
export function Compare({ before, after }: { before: string; after: string }) {
  const [at, setAt] = useState(50)
  return (
    <div className="flex max-w-full flex-col items-center gap-2">
      <div className="relative inline-block max-w-full overflow-hidden rounded-md">
        <img src={before} alt="Before" className="block max-h-[56dvh] max-w-full" />
        <img
          src={after}
          alt="After"
          className="absolute inset-0 h-full w-full"
          style={{ clipPath: `inset(0 0 0 ${at}%)` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow"
          style={{ left: `${at}%` }}
        />
        <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          Before
        </span>
        <span className="pointer-events-none absolute top-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          After
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={at}
        aria-label="Slide to compare before and after"
        className="w-full max-w-md"
        onChange={(e) => setAt(Number(e.target.value))}
      />
    </div>
  )
}
