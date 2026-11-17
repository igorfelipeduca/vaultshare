import { TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { deleteAccount } from '../api'
import { Dialog } from '../components/Dialog'
import { Field } from '../components/Field'

// LGPD art. 18, VI. Asks for the password again so a session left open on a shared computer cannot erase the account.
export function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()

  const submit = async (form: FormData) => {
    await deleteAccount(String(form.get('password')))
    navigate('/login?conta=excluida', { replace: true })
  }

  return (
    <Dialog
      title="Excluir sua conta"
      icon={TriangleAlert}
      tone="danger"
      submitLabel="Excluir conta definitivamente"
      description={
        <p>
          Seus arquivos, links, histórico e dados de cadastro serão apagados agora e não poderão ser recuperados. Se
          quiser uma cópia, baixe seus dados antes.
        </p>
      }
      onClose={onClose}
      onSubmit={submit}
    >
      <Field label="Confirme com sua senha">
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
    </Dialog>
  )
}
