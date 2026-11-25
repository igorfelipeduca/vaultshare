import { useRef, useState } from 'react'
import { KeyRound, LoaderCircle, MonitorSmartphone } from 'lucide-react'
import { ApiError, changePassword, endOtherSessions } from '../../api'
import { useApp } from '../../app/context'
import { Field } from '../../components/Field'
import { PasswordInput } from '../../components/PasswordInput'
import { SubmitButton } from '../../components/SubmitButton'
import { endedSessionsText } from '../../format'
import { useFormAction } from '../../hooks/useFormAction'

// Password change and "sign out everywhere else". Changing the password also ends the other sessions on the server.
export function SecuritySection() {
  const { user, notify } = useApp()
  const form = useRef<HTMLFormElement>(null)
  const [ending, setEnding] = useState(false)

  const { state, onSubmit, pending } = useFormAction(async (data) => {
    await changePassword(String(data.get('currentPassword')), String(data.get('newPassword')))
    form.current?.reset()
    notify('Senha alterada. As outras sessões foram encerradas.')
  }, 'Não foi possível alterar a senha.')

  const endOthers = async () => {
    setEnding(true)
    try {
      const { ended } = await endOtherSessions()
      notify(endedSessionsText(ended))
    } catch (cause) {
      notify(cause instanceof ApiError ? cause.message : 'Não foi possível encerrar as outras sessões.', 'error')
    } finally {
      setEnding(false)
    }
  }

  return (
    <section className="card settings-panel" aria-labelledby="settings-security">
      <div>
        <h2 id="settings-security" className="card-title">
          Segurança
        </h2>
        <p className="section-hint">Ao trocar a senha, os outros navegadores e dispositivos são desconectados.</p>
      </div>
      <form
        ref={form}
        className="security-form"
        onSubmit={onSubmit}
        aria-describedby={state.error ? 'security-error' : undefined}
      >
        {/* Lets password managers know which account the new password belongs to. */}
        <input type="email" name="username" value={user.email} autoComplete="username" readOnly hidden />
        <Field label="Senha atual" error={state.fields?.currentPassword}>
          {(control) => (
            <PasswordInput
              {...control}
              name="currentPassword"
              required
              maxLength={1024}
              autoComplete="current-password"
            />
          )}
        </Field>
        <Field
          label="Nova senha"
          hint="Mínimo de 8 caracteres. Uma frase longa é mais segura e mais fácil de lembrar."
          error={state.fields?.newPassword}
        >
          {(control) => (
            <PasswordInput
              {...control}
              name="newPassword"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          )}
        </Field>
        <div className="settings-actions">
          {state.error && (
            <p id="security-error" className="form-error" role="alert">
              {state.error}
            </p>
          )}
          <SubmitButton pending={pending} icon={<KeyRound size={16} aria-hidden="true" />}>
            Alterar senha
          </SubmitButton>
        </div>
      </form>
      <div className="data-action">
        <div>
          <p className="data-action-title">Encerrar outras sessões</p>
          <p className="switch-hint">Desconecta todos os outros navegadores e dispositivos. Este continua conectado.</p>
        </div>
        <button
          type="button"
          className="button button-ghost"
          onClick={endOthers}
          disabled={ending}
          aria-busy={ending || undefined}
        >
          {ending ? (
            <LoaderCircle className="spin" size={16} aria-hidden="true" />
          ) : (
            <MonitorSmartphone size={16} aria-hidden="true" />
          )}
          Encerrar
        </button>
      </div>
    </section>
  )
}
