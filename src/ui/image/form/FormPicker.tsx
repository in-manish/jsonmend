import {
  describeDoc,
  FORM_PRESETS,
  type FormDoc,
  type FormPreset,
} from '../../../core/image/formPresets'
import { DropZone } from '../DropZone'

interface Props {
  form: FormPreset
  doc: FormDoc
  phone: boolean
  /** A photo already open in the editor: offer to use it instead of choosing again. */
  current?: File
  onUseCurrent(): void
  onForm(id: string): void
  onDoc(id: string): void
  onFiles(files: File[]): void
  onBack(): void
}

/** Step one: which form and which file it asks for, then choose the photo. */
export function FormPicker({
  form,
  doc,
  phone,
  current,
  onUseCurrent,
  onForm,
  onDoc,
  onFiles,
  onBack,
}: Props) {
  return (
    <div className="image-tool flex h-full justify-center overflow-y-auto p-4">
      <div className="flex w-full max-w-xl flex-col gap-4 self-start md:mt-8">
        <button type="button" className="self-start text-sm text-[var(--accent)]" onClick={onBack}>
          ‹ Back
        </button>
        <div>
          <h2 className="m-0 text-xl font-semibold">Photo for a form</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            We make it exactly the size the form asks for.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Which form is it for?
          <select
            className="input-sm"
            aria-label="Which form"
            value={form.id}
            onChange={(e) => onForm(e.target.value)}
          >
            {FORM_PRESETS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1.5 text-sm font-medium">What does it ask for?</legend>
          <div className="flex flex-wrap gap-1.5">
            {form.docs.map((d) => (
              <button
                key={d.id}
                type="button"
                className="btn crop-chip"
                aria-pressed={d.id === doc.id}
                onClick={() => onDoc(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </fieldset>

        <p className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 text-sm">
          The form wants: <strong>{describeDoc(doc)}</strong>
          {!doc.fixed && (
            <span className="block text-xs text-[var(--muted)]">
              It only limits the file size, so we use a normal {doc.width} × {doc.height} px shape.
            </span>
          )}
        </p>

        {current && (
          <button
            type="button"
            className="btn btn-primary w-full py-4 text-lg"
            onClick={onUseCurrent}
          >
            Use {current.name}
          </button>
        )}
        <DropZone
          primary={!current}
          compact={!!current}
          accept="image/*"
          label={current ? 'Or choose a different photo' : 'Choose photo'}
          hint={
            current
              ? ''
              : phone
                ? 'Took a picture of a printed photo? We find its edges.'
                : 'Took a picture of a printed photo? We find its edges. Or drop it here.'
          }
          onFiles={onFiles}
        />
        <p className="text-xs text-[var(--muted)]">
          Sizes come from public guides and forms change them. Check the notice of your form. Your
          photo never leaves your device.
        </p>
      </div>
    </div>
  )
}
