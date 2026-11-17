import { useEffect, useId, useRef, useState } from 'react'
import type { MouseEvent, ReactNode, SyntheticEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useFormAction } from '../hooks/useFormAction'
import { SubmitButton } from './SubmitButton'

const EXIT_MS = 140

interface DialogProps {
  title: string
  icon: LucideIcon
  submitLabel: string
  tone?: 'default' | 'danger'
  description?: ReactNode
  canSubmit?: boolean
  onClose: () => void
  onSubmit: (form: FormData) => Promise<void>
  children: ReactNode
}

// Native modal <dialog>: the browser traps focus, closes on Esc and returns focus to the opener on close().
export function Dialog({
  title,
  icon: Icon,
  submitLabel,
  tone = 'default',
  description,
  canSubmit = true,
  onClose,
  onSubmit,
  children,
}: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closing = useRef(false)
  const titleId = useId()
  const descriptionId = useId()
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
  }, [])

  // Plays the exit transition, then closes natively before the parent unmounts the dialog.
  const close = () => {
    if (closing.current) return
    closing.current = true
    setLeaving(true)
    window.setTimeout(() => {
      dialog.current?.close()
      onClose()
    }, EXIT_MS)
  }

  const {
    state,
    onSubmit: submit,
    pending,
  } = useFormAction(async (form) => {
    await onSubmit(form)
    close()
  })

  const cancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault()
    close()
  }

  // Mouse-only shortcut: keyboard users already close the native dialog with Esc (handled by onCancel).
  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialog.current) close()
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard equivalent is the native Esc → onCancel
    <dialog
      ref={dialog}
      className={leaving ? 'dialog dialog-leaving' : 'dialog'}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={cancel}
      onClose={onClose}
      onClick={closeOnBackdrop}
    >
      <form className="dialog-form" onSubmit={submit}>
        <div className="dialog-heading">
          <span className={tone === 'danger' ? 'tile tone-rose' : 'tile tone-blue'}>
            <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h2 id={titleId} className="dialog-title">
            {title}
          </h2>
        </div>
        {description && (
          <div id={descriptionId} className="dialog-description">
            {description}
          </div>
        )}
        {children}
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button button-ghost" onClick={close}>
            Cancelar
          </button>
          <SubmitButton
            pending={pending}
            disabled={!canSubmit}
            className={tone === 'danger' ? 'button button-danger' : 'button button-primary'}
          >
            {submitLabel}
          </SubmitButton>
        </div>
      </form>
    </dialog>
  )
}
