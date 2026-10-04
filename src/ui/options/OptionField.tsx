import { useAppStore } from '../../store/useAppStore'
import type { Field } from './schema'

export function OptionField({ field }: { field: Field }) {
  const value = useAppStore((s) => s.options[field.key])
  const setOptions = useAppStore((s) => s.setOptions)
  const id = `opt-${field.key}`

  if (field.kind === 'boolean') {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => setOptions({ [field.key]: e.target.checked })}
        />
        {field.label}
      </label>
    )
  }
  const index = field.choices.findIndex(([v]) => v === value)
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 text-sm">
      {field.label}
      <select
        id={id}
        className="input-sm max-w-[55%]"
        value={index}
        onChange={(e) => setOptions({ [field.key]: field.choices[Number(e.target.value)][0] })}
      >
        {field.choices.map(([, label], i) => (
          <option key={label} value={i}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}
