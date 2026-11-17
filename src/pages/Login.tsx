import { CircleCheck, LogIn } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { login } from '../api'
import { usePageTitle } from '../app/context'
import logo from '../assets/logo.svg'
import { Field } from '../components/Field'
import { SubmitButton } from '../components/SubmitButton'
import { useFormAction } from '../hooks/useFormAction'

// Only same-app paths, so the login page cannot be used as an open redirect.
const safeNext = (next: string | null) =>
  next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : '/'

// Outside the app shell: shown when there is no session.
export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const accountDeleted = params.get('conta') === 'excluida'
  usePageTitle('Entrar')

  const { state, onSubmit, pending } = useFormAction(async (form) => {
    await login(String(form.get('email')).trim(), String(form.get('password')))
    navigate(safeNext(params.get('next')), { replace: true })
  }, 'Não foi possível entrar. Tente novamente.')

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
        <h1 className="login-title">Entrar na sua conta</h1>
        {accountDeleted && (
          <p className="notice notice-ok" role="status">
            <CircleCheck size={16} aria-hidden="true" />
            Sua conta e todos os seus dados foram excluídos.
          </p>
        )}
        <Field label="E-mail">
          {(control) => (
            <input {...control} name="email" type="email" className="input" required autoComplete="username" />
          )}
        </Field>
        <Field label="Senha">
          {(control) => (
            <input
              {...control}
              name="password"
              type="password"
              className="input"
              required
              autoComplete="current-password"
            />
          )}
        </Field>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        <SubmitButton
          pending={pending}
          className="button button-primary login-submit"
          icon={<LogIn size={16} aria-hidden="true" />}
        >
          Entrar
        </SubmitButton>
        <p className="login-switch">
          Não tem conta? <Link to="/cadastro">Criar conta</Link>
        </p>
        <p className="login-legal">
          Usamos apenas um cookie essencial para manter você conectado, sem rastreamento nem publicidade.{' '}
          <Link to="/privacidade">Política de privacidade</Link>
        </p>
      </form>
    </main>
  )
}
