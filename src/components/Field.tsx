import { useId } from 'react'
import type { ReactNode } from 'react'

export interface FieldControlProps {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: (control: FieldControlProps) => ReactNode
}

// Label + control + optional hint and error, wired with aria-describedby / aria-invalid for screen readers.
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
