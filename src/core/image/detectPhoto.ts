import type { Rect } from './crop'

/** RGBA pixels as a canvas gives them (`ImageData`); this module never touches the DOM. */
export interface Pixels {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** The picture must be bigger than this share of the frame, and smaller than the upper one. */
const MIN_AREA = 0.06
const MAX_AREA = 0.9

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

/** The longest stretch of indexes whose count passes `min`, bridging gaps up to `gap`. */
function longestRun(counts: number[], min: number, gap: number): [number, number] | undefined {
  let best: [number, number] | undefined
  let start = -1
  let last = -1
  const close = () => {
    if (start >= 0 && (!best || last - start > best[1] - best[0])) best = [start, last]
  }
  counts.forEach((c, i) => {
    if (c < min) return
    if (start >= 0 && i - last > gap) {
      close()
      start = -1
    }
    if (start < 0) start = i
    last = i
  })
  close()
  return best
}

/**
 * Finds the printed photo in a picture of it taken with a phone: the colour of the surroundings is
 * read from the frame's outer ring, everything clearly different from it counts as "photo", and
 * the box around that is the suggestion. Works when the photo sits on a plainish surface (a table,
 * a sheet of paper, a hand). Axis-aligned: a tilted photo gets a box around it, which the person
 * can then adjust. Returns undefined when no clear edge is found (e.g. the photo fills the frame).
 * Coordinates are in the pixels given; scale them to the full picture.
 */
export function detectPhotoRect({ data, width, height }: Pixels): Rect | undefined {
  if (width < 16 || height < 16) return undefined
  const at = (x: number, y: number) => (y * width + x) * 4

  // What the surroundings look like. Light is rarely even, so the colour is read from each side
  // of the frame and blended across it: a table that is darker on the left is still "table".
  const ring = Math.max(2, Math.round(Math.min(width, height) * 0.03))
  const side = (xs: [number, number], ys: [number, number]) => {
    const found: number[] = []
    for (let y = ys[0]; y < ys[1]; y++) for (let x = xs[0]; x < xs[1]; x++) found.push(at(x, y))
    return [0, 1, 2].map((c) => median(found.map((i) => data[i + c])))
  }
  const [mx, my] = [Math.round(width * 0.1), Math.round(height * 0.1)]
  const left = side([0, ring], [my, height - my])
  const right = side([width - ring, width], [my, height - my])
  const top = side([mx, width - mx], [0, ring])
  const bottom = side([mx, width - mx], [height - ring, height])
  const distance = (x: number, y: number) => {
    const [tx, ty] = [x / (width - 1), y / (height - 1)]
    const i = at(x, y)
    let sum = 0
    for (let c = 0; c < 3; c++) {
      const bg = (left[c] * (1 - tx) + right[c] * tx + top[c] * (1 - ty) + bottom[c] * ty) / 2
      sum += (data[i + c] - bg) ** 2
    }
    return Math.sqrt(sum)
  }

  // Shadows and uneven light vary the surroundings, so the cut-off follows how much they vary.
  const ringDistances: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < ring || y < ring || x >= width - ring || y >= height - ring) {
        ringDistances.push(distance(x, y))
      }
    }
  }
  ringDistances.sort((a, b) => a - b)
  const spread = ringDistances[Math.floor(ringDistances.length * 0.9)] ?? 0
  const limit = Math.max(32, spread * 1.6 + 8)

  const rows = new Array<number>(height).fill(0)
  const cols = new Array<number>(width).fill(0)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (distance(x, y) > limit) {
        rows[y]++
        cols[x]++
      }
    }
  }

  // Rows and columns that are mostly "photo" make its top/bottom and left/right edges.
  const rowRun = longestRun(rows, Math.max(...rows) * 0.4, Math.ceil(height * 0.02))
  const colRun = longestRun(cols, Math.max(...cols) * 0.4, Math.ceil(width * 0.02))
  if (!rowRun || !colRun) return undefined

  // A hair inside the edge, so none of the surroundings is kept.
  const inset = (a: number, b: number) => {
    const pad = Math.round((b - a) * 0.01)
    return [a + pad, b - pad] as const
  }
  const [y0, y1] = inset(...rowRun)
  const [x0, x1] = inset(...colRun)
  const rect = { x: x0, y: y0, w: x1 + 1 - x0, h: y1 + 1 - y0 }

  const area = (rect.w * rect.h) / (width * height)
  const ratio = rect.w / rect.h
  if (area < MIN_AREA || area > MAX_AREA || ratio < 0.2 || ratio > 5) return undefined
  return rect
}

/** Scales a rectangle found on a small copy back up to the full-size picture. */
export function scaleRect(r: Rect, factor: number): Rect {
  return {
    x: Math.round(r.x * factor),
    y: Math.round(r.y * factor),
    w: Math.round(r.w * factor),
    h: Math.round(r.h * factor),
  }
}
