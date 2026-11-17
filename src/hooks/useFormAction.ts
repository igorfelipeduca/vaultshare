import { startTransition, useActionState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api'

export interface FormState {
  error: string
  fields?: Record<string, string>
}

const IDLE: FormState = { error: '' }

// React 19 action state (pending flag, last error) for a form. It is dispatched from onSubmit instead of
// <form action> on purpose: <form action> resets uncontrolled fields, which would wipe what the user typed on error.
export function useFormAction(
  action: (form: FormData) => Promise<void>,
  fallback = 'Não foi possível concluir a ação.',
) {
  const [state, dispatch, pending] = useActionState<FormState, FormData>(async (_previous, form) => {
    try {
      await action(form)
      return IDLE
    } catch (cause) {
      return cause instanceof ApiError ? { error: cause.message, fields: cause.fields } : { error: fallback }
    }
  }, IDLE)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(() => dispatch(form))
  }

  return { state, onSubmit, pending }
}
