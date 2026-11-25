import { useCallback, useState } from 'react'
import type { ComponentProps, KeyboardEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { FieldControlProps } from './Field'

type PasswordInputProps = FieldControlProps & Omit<ComponentProps<'input'>, 'type' | 'className' | 'id' | 'ref'>

// Password control for <Field>: an optional "show password" toggle (so the user can check what was typed without
// a confirmation field) and a Caps Lock warning. The text goes back to hidden on submit, so password managers and
// anyone looking at the screen afterwards only see dots.
export function PasswordInput({
  'aria-describedby': describedBy,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const capsId = `${props.id}-caps`

  // Stable callback ref (React 19 cleanup form): re-hides the text whenever the surrounding form is submitted.
  const watchForm = useCallback((input: HTMLInputElement | null) => {
    const form = input?.form
    if (!form) return
    const hide = () => setVisible(false)
    form.addEventListener('submit', hide)
    return () => form.removeEventListener('submit', hide)
  }, [])

  const checkCapsLock = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState('CapsLock'))

  return (
    <>
      <div className="password-input">
        <input
          {...props}
          type={visible ? 'text' : 'password'}
          className="input"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={[describedBy, capsLock ? capsId : undefined].filter(Boolean).join(' ') || undefined}
          onKeyDown={(event) => {
            checkCapsLock(event)
            onKeyDown?.(event)
          }}
          onKeyUp={(event) => {
            checkCapsLock(event)
            onKeyUp?.(event)
          }}
          onBlur={(event) => {
            setCapsLock(false)
            onBlur?.(event)
          }}
          ref={watchForm}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label="Mostrar senha"
          aria-pressed={visible}
          aria-controls={props.id}
          title={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visible ? (
            <EyeOff size={17} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Eye size={17} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>
      {capsLock && (
        <p id={capsId} className="field-warning" role="status">
          O Caps Lock está ativado.
        </p>
      )}
    </>
  )
}
