/** Pixel dimensions and resize math. */
export interface Dim {
  width: number
  height: number
}

/** Browsers refuse canvases beyond this edge length. */
export const MAX_EDGE = 16384

const clamp = (n: number) => Math.min(MAX_EDGE, Math.max(1, Math.round(n)))

export const fromPercent = (src: Dim, percent: number): Dim => ({
  width: clamp((src.width * percent) / 100),
  height: clamp((src.height * percent) / 100),
})

/** Height that keeps the aspect ratio of `src` for a given width. */
export const linkedHeight = (src: Dim, width: number): number =>
  clamp((width * src.height) / src.width)

export const linkedWidth = (src: Dim, height: number): number =>
  clamp((height * src.width) / src.height)

export const scaleDim = (d: Dim, scale: number): Dim => ({
  width: clamp(d.width * scale),
  height: clamp(d.height * scale),
})

/** Rough output size before encoding: the original size scaled by the change in pixel count. */
export const estimateBytes = (originalBytes: number, from: Dim, to: Dim): number =>
  Math.max(1, Math.round((originalBytes * (to.width * to.height)) / (from.width * from.height)))

/** Inches <-> pixels at a print resolution (dots per inch). */
export const inchesToPx = (inches: number, dpi: number): number => clamp(inches * dpi)
export const pxToInches = (px: number, dpi: number): number => Math.round((px / dpi) * 100) / 100

/** Physical lengths for print size. */
export type PhysicalUnit = 'in' | 'cm'

const CM_PER_INCH = 2.54

/** A length in inches or centimetres to pixels at `dpi`. */
export const physicalToPx = (value: number, unit: PhysicalUnit, dpi: number): number =>
  clamp((unit === 'cm' ? value / CM_PER_INCH : value) * dpi)

/** Pixels to inches or centimetres at `dpi`, to two decimals. */
export const pxToPhysical = (px: number, unit: PhysicalUnit, dpi: number): number =>
  Math.round((px / dpi) * (unit === 'cm' ? CM_PER_INCH : 1) * 100) / 100
