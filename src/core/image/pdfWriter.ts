/**
 * Minimal PDF writer: one JPEG per page, no libraries. Enough for "images to PDF": page sizes,
 * margins and orientation; the image is scaled to fit and centered.
 */
export interface PdfImage {
  /** Baseline JPEG bytes (what canvas.toBlob('image/jpeg') produces). */
  jpeg: Uint8Array
  /** Pixel size of the JPEG. */
  width: number
  height: number
}

export type PageSize = 'fit' | 'a4' | 'letter'

export interface PdfOptions {
  size: PageSize
  /** Margin in points (1/72 inch). */
  margin: number
  /** Landscape pages for wide images ('auto'), or always portrait. */
  orientation: 'auto' | 'portrait'
}

const POINTS: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
}
/** Images are 96 dpi on screen, PDF points are 72 dpi. */
const PX_TO_PT = 0.75

const ascii = new TextEncoder()
const num = (n: number) => String(Math.round(n * 100) / 100)

export function pageGeometry(img: PdfImage, o: PdfOptions) {
  const ratio = img.height / img.width
  let [pw, ph] =
    o.size === 'fit'
      ? [img.width * PX_TO_PT + o.margin * 2, img.height * PX_TO_PT + o.margin * 2]
      : POINTS[o.size]
  if (o.size !== 'fit' && o.orientation === 'auto' && img.width > img.height) [pw, ph] = [ph, pw]
  const availW = pw - o.margin * 2
  const availH = ph - o.margin * 2
  let w = availW
  let h = w * ratio
  if (h > availH) {
    h = availH
    w = h / ratio
  }
  return { pw, ph, w, h, x: (pw - w) / 2, y: (ph - h) / 2 }
}

export function buildPdf(images: PdfImage[], o: PdfOptions): Uint8Array {
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? ascii.encode(data) : data
    parts.push(bytes)
    length += bytes.length
  }
  const object = (id: number, body: string, stream?: Uint8Array) => {
    offsets[id] = length
    push(`${id} 0 obj\n${body}`)
    if (stream) {
      push('\nstream\n')
      push(stream)
      push('\nendstream')
    }
    push('\nendobj\n')
  }

  // Objects: 1 catalog, 2 pages, then per image: page, content stream, image.
  push('%PDF-1.4\n%âãÏÓ\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  const pageIds = images.map((_, i) => 3 + i * 3)
  object(
    2,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>`,
  )
  images.forEach((img, i) => {
    const page = 3 + i * 3
    const g = pageGeometry(img, o)
    const content = ascii.encode(
      `q ${num(g.w)} 0 0 ${num(g.h)} ${num(g.x)} ${num(g.y)} cm /Im0 Do Q`,
    )
    object(
      page,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(g.pw)} ${num(g.ph)}] /Resources << /XObject << /Im0 ${page + 2} 0 R >> >> /Contents ${page + 1} 0 R >>`,
    )
    object(page + 1, `<< /Length ${content.length} >>`, content)
    object(
      page + 2,
      `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>`,
      img.jpeg,
    )
  })

  const xref = length
  const count = 3 + images.length * 3
  push(`xref\n0 ${count}\n0000000000 65535 f \n`)
  for (let id = 1; id < count; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  const out = new Uint8Array(length)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}
