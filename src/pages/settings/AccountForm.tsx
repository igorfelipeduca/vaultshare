import { useState } from 'react'
import { Bell, KeyRound, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { updateMe, updateSettings } from '../../api'
import type { User, UserSettings } from '../../api'
import { useApp } from '../../app/context'
import { Field } from '../../components/Field'
import { SubmitButton } from '../../components/SubmitButton'
import { SwitchRow } from '../../components/SwitchRow'
import { initials } from '../../format'
import { useFormAction } from '../../hooks/useFormAction'

const PRIVACY_SWITCHES: { key: keyof UserSettings; icon: LucideIcon; label: string; hint: string }[] = [
  {
    key: 'requirePassword',
    icon: KeyRound,
    label: 'Exigir senha em novos links',
    hint: 'Todo link novo só abre com senha.',
  },
  {
    key: 'notifyAccess',
    icon: Bell,
    label: 'Notificar acessos aos arquivos',
    hint: 'Avisamos quando alguém abrir um arquivo seu.',
  },
  {
    key: 'allowAccessRequests',
    icon: UserPlus,
    label: 'Permitir pedidos de acesso',
    hint: 'Quem não tem acesso pode pedir permissão.',
  },
]

// Account and privacy settings are stored on the server and saved together.
export function AccountForm({ user, settings }: { user: User; settings: UserSettings }) {
  const { refresh, notify } = useApp()
  const [toggles, setToggles] = useState(settings)
  const [name, setName] = useState(user.name)

  const { state, onSubmit, pending } = useFormAction(async (form) => {
    await updateMe({ name: name.trim(), email: String(form.get('email')).trim() })
    await updateSettings(toggles)
    refresh()
    notify('Alterações salvas.')
  }, 'Não foi possível salvar as alterações.')

  return (
    <form className="settings" onSubmit={onSubmit} aria-describedby={state.error ? 'settings-error' : undefined}>
      <section className="card settings-panel" aria-labelledby="settings-account">
        <h2 id="settings-account" className="card-title">
          Conta
        </h2>
        <div className="profile">
          <span className="avatar avatar-large" aria-hidden="true">
            {initials(name)}
          </span>
          <div>
            <p className="profile-name">{name.trim() || 'Sem nome'}</p>
            <p className="profile-plan">{user.plan}</p>
          </div>
        </div>
        <Field label="Nome" error={state.fields?.name}>
          {(control) => (
            <input
              {...control}
              name="name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
              autoComplete="name"
            />
          )}
        </Field>
        <Field label="E-mail" error={state.fields?.email}>
          {(control) => (
            <input
              {...control}
              name="email"
              type="email"
              className="input"
              defaultValue={user.email}
              required
              maxLength={254}
              autoComplete="email"
            />
          )}
        </Field>
      </section>
      <section className="card settings-panel" aria-labelledby="settings-privacy">
        <h2 id="settings-privacy" className="card-title">
          Privacidade
        </h2>
        {PRIVACY_SWITCHES.map(({ key, icon, label, hint }) => (
          <SwitchRow
            key={key}
            icon={icon}
            label={label}
            hint={hint}
            checked={toggles[key]}
            onChange={(checked) => setToggles((current) => ({ ...current, [key]: checked }))}
          />
        ))}
      </section>
      <div className="settings-actions">
        {state.error && (
          <p id="settings-error" className="form-error" role="alert">
            {state.fields ? 'Revise os campos destacados.' : state.error}
          </p>
        )}
        <SubmitButton pending={pending}>Salvar alterações</SubmitButton>
      </div>
    </form>
  )
}
