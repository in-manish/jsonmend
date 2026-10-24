import { useEffect, useState } from 'react'
import { draw, encode } from '../lib/canvas'

const WIDTH = 160

let chain: Promise<unknown> = Promise.resolve()
/** One thumbnail at a time, so a long list does not decode dozens of big photos at once. */
function inTurn<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job)
  chain = run.catch(() => undefined)
  return run
}

async function makeThumb(file: File): Promise<Blob> {
  // The decoder shrinks while reading, so a 12-megapixel photo never lands in memory at full size.
  const bitmap = await createImageBitmap(file, { resizeWidth: WIDTH, resizeQuality: 'medium' })
  try {
    return await encode(draw(bitmap, bitmap.width, bitmap.height, true), 'image/jpeg', 0.7)
  } finally {
    bitmap.close()
  }
}

/** A small picture of `file` for lists; undefined until ready, or when it is not an image. */
export function useThumb(file: File): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let alive = true
    let made: string | undefined
    inTurn(() => makeThumb(file))
      .then((blob) => {
        if (!alive) return
        made = URL.createObjectURL(blob)
        setUrl(made)
      })
      .catch(() => undefined)
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [file])
  return url
}
