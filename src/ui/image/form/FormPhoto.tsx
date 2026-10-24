import { useState } from 'react'
import { FORM_PRESETS, formOption, parseFormOption } from '../../../core/image/formPresets'
import { useAppStore } from '../../../store/useAppStore'
import { openOption } from '../../navigation'
import { type Loaded, loadImage } from '../lib/canvas'
import { useIsPhone } from '../lib/useIsPhone'
import { useObjectUrl } from '../lib/useObjectUrl'
import { FormFrame } from './FormFrame'
import { FormPicker } from './FormPicker'

interface Props {
  /** A photo already open in the editor. */
  initialFile?: File
  onBack(): void
}

/**
 * Photo for a form: pick the form, choose a photo, frame it, download it at the exact size. The
 * chosen form and file live in the address bar (/photo-for/ibps/signature), so each has a link.
 */
export function FormPhoto({ initialFile, onBack }: Props) {
  const notify = useAppStore((s) => s.notify)
  const option = useAppStore((s) => s.option)
  const phone = useIsPhone()
  const [opened, setOpened] = useState<{ file: File; img: Loaded }>()
  const src = useObjectUrl(opened?.file)

  const chosen = parseFormOption(option)
  const form = FORM_PRESETS.find((f) => f.id === chosen?.formId) ?? FORM_PRESETS[0]
  const doc = form.docs.find((d) => d.id === chosen?.docId) ?? form.docs[0]

  const open = async (files: File[]) => {
    try {
      const file = files[0]
      setOpened({ file, img: await loadImage(file) })
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not open the photo')
    }
  }

  if (opened && src) {
    return (
      <FormFrame
        key={opened.file.name + opened.file.size}
        img={opened.img}
        src={src}
        form={form}
        doc={doc}
        onBack={() => setOpened(undefined)}
      />
    )
  }
  return (
    <FormPicker
      form={form}
      doc={doc}
      phone={phone}
      current={initialFile}
      onUseCurrent={() => initialFile && open([initialFile])}
      onForm={(id) => openOption('image', formOption(id))}
      onDoc={(id) => openOption('image', formOption(form.id, id))}
      onFiles={open}
      onBack={onBack}
    />
  )
}
