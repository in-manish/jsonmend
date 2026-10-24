/**
 * Makes a JPEG file at least `minBytes` long by adding comment segments (marker FFFE), which
 * every decoder skips. Forms often reject a file for being too SMALL, and a tiny image such as a
 * 140×60 signature can be smaller than the minimum even at the best quality.
 * Returns the input unchanged when it is already long enough or is not a JPEG.
 */
export function padJpeg(bytes: Uint8Array, minBytes: number): Uint8Array {
  if (bytes.length >= minBytes) return bytes
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes

  // Keep the JFIF header right after the start marker, as the format wants.
  const at = bytes[2] === 0xff && bytes[3] === 0xe0 ? 4 + ((bytes[4] << 8) | bytes[5]) : 2
  const parts: Uint8Array[] = [bytes.subarray(0, at)]
  let need = minBytes - bytes.length
  while (need > 0) {
    const payload = Math.min(Math.max(need - 4, 0), 65533)
    const segment = new Uint8Array(4 + payload).fill(0x20)
    segment[0] = 0xff
    segment[1] = 0xfe
    segment[2] = (payload + 2) >> 8
    segment[3] = (payload + 2) & 0xff
    parts.push(segment)
    need -= segment.length
  }
  parts.push(bytes.subarray(at))

  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}
