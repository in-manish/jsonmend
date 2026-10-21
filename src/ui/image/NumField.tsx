import { useEffect, useState } from 'react'

interface Props {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  disabled?: boolean
  onCommit(value: number): void
}

/** Number input that lets you clear and retype; only valid values are passed on. */
export function NumField({ label, value, min = 1, max, step, suffix, disabled, onCommit }: Props) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText((t) => (Number(t) === value ? t : String(value)))
  }, [value])
  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="w-14 flex-none text-[var(--muted)]">{label}</span>
      <input
        type="number"
        aria-label={label}
        className="input-sm w-24"
        value={text}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value)
          const n = Number(e.target.value)
          if (
            e.target.value !== '' &&
            Number.isFinite(n) &&
            n >= min &&
            (max === undefined || n <= max)
          ) {
            onCommit(n)
          }
        }}
        onBlur={() => setText(String(value))}
      />
      {suffix && <span className="text-[var(--muted)]">{suffix}</span>}
    </label>
  )
}
