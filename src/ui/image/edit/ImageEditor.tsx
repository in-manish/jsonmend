import { DropZone } from '../DropZone'
import { useIsPhone } from '../lib/useIsPhone'
import { DesktopEditor } from './DesktopEditor'
import { PhoneEditor } from './PhoneEditor'
import { useImageEditor } from './useImageEditor'

/**
 * Crop, rotate, resize, convert and compress one image. Phones get a photo-editor layout (full
 * picture, bottom tool bar, one panel at a time); wide screens get a settings sidebar.
 */
export function ImageEditor() {
  const { open, session } = useImageEditor()
  const phone = useIsPhone()

  if (!session) {
    return (
      <div className="image-tool flex h-full items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <DropZone
            paste
            accept="image/*"
            label={phone ? 'Choose a photo' : 'Choose an image, drop it here, or paste one'}
            hint={
              phone
                ? 'From your gallery or camera. It stays on your phone.'
                : 'JPG, PNG, WebP, GIF, BMP, AVIF or SVG. It never leaves your device.'
            }
            onFiles={open}
            primary={phone}
          />
          <ul className="mt-5 flex flex-col gap-2 text-sm text-[var(--muted)]">
            {[
              'Make a photo smaller for email or an upload form (for example under 200 KB)',
              'Crop, rotate, mirror and resize',
              'Change the file type: JPG, PNG or WebP',
              'Works offline: your photo never leaves your device',
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden="true" className="text-[var(--accent)]">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }
  return phone ? <PhoneEditor s={session} /> : <DesktopEditor s={session} />
}
