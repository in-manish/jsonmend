import { useThumb } from './useThumb'

/** Small square picture of a photo; an empty tile while it loads or if it is not a picture. */
export function Thumb({ file }: { file: File }) {
  const url = useThumb(file)
  return (
    <span className="checkerboard flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-md border border-[var(--border)]">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </span>
  )
}
