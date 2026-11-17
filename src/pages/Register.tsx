import { UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api'
import { usePageTitle } from '../app/context'
import logo from '../assets/logo.svg'
import { Field } from '../components/Field'
import { SubmitButton } from '../components/SubmitButton'
import { useFormAction } from '../hooks/useFormAction'

// Outside the app shell: the new account is signed in right away and lands on the overview.
export default function Register() {
  const navigate = useNavigate()
  usePageTitle('Criar conta')

  const { state, onSubmit, pending } = useFormAction(async (form) => {
    await register({
      name: String(form.get('name')).trim(),
      email: String(form.get('email')).trim(),
      password: String(form.get('password')),
    })
    navigate('/', { replace: true })
  }, 'Não foi possível criar a conta. Tente novamente.')

  return (
    <main className="login">
      <form className="card login-card" onSubmit={onSubmit}>
        <div className="brand login-brand">
          <img src={logo} alt="" width={32} height={32} />
          <span className="brand-text">
            <span className="brand-name">VaultShare</span>
            <span className="brand-tagline">ARQUIVOS SOB CONTROLE</span>
          </span>
        </div>
        <h1 className="login-title">Criar sua conta</h1>
        <Field label="Nome" error={state.fields?.name}>
          {(control) => <input {...control} name="name" className="input" required autoComplete="name" />}
        </Field>
        <Field label="E-mail" error={state.fields?.email}>
          {(control) => (
            <input {...control} name="email" type="email" className="input" required autoComplete="email" />
          )}
        </Field>
        <Field label="Senha" hint="Pelo menos 8 caracteres." error={state.fields?.password}>
          {(control) => (
            <input
              {...control}
              name="password"
              type="password"
              className="input"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          )}
        </Field>
        {state.error && !state.fields && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        <SubmitButton
          pending={pending}
          className="button button-primary login-submit"
          icon={<UserPlus size={16} aria-hidden="true" />}
        >
          Criar conta
        </SubmitButton>
        <p className="login-switch">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
        <p className="login-legal">
          Ao criar a conta, você concorda com o tratamento dos seus dados descrito na{' '}
          <Link to="/privacidade">Política de privacidade</Link>.
        </p>
      </form>
    </main>
  )
}
