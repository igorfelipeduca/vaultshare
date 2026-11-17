import { Link2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createLink, getFiles, getSettings } from '../api'
import { useApp, useData } from '../app/context'
import { Dialog } from '../components/Dialog'
import { Field } from '../components/Field'
import { Segmented } from '../components/Segmented'
import { StatusMessage } from '../components/StatusMessage'

const VALIDITY_OPTIONS = [
  { value: '1', label: '24 horas' },
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: 'never', label: 'Sem limite' },
]

export function CreateLinkDialog({ fileId, onClose }: { fileId?: string; onClose: () => void }) {
  const { refresh, notify } = useApp()
  const navigate = useNavigate()
  const files = useData(getFiles)
  const settings = useData(getSettings)
  const ready = Boolean(files.data?.length && settings.data)
  const passwordRequired = settings.data?.requirePassword ?? true

  const submit = async (form: FormData) => {
    const validity = String(form.get('validity'))
    const link = await createLink({
      fileId: String(form.get('fileId')),
      expiresInDays: validity === 'never' ? null : Number(validity),
      password: String(form.get('password')) || null,
    })
    refresh()
    notify(`Link criado para ${link.fileName}.`)
    navigate('/links')
  }

  return (
    <Dialog
      title="Gerar link de compartilhamento"
      icon={Link2}
      submitLabel="Gerar link"
      canSubmit={ready}
      onClose={onClose}
      onSubmit={submit}
    >
      {files.data?.length === 0 && <p className="status">Crie um arquivo antes de gerar um link.</p>}
      {!ready && files.data?.length !== 0 && <StatusMessage error={files.error || settings.error} />}
      {ready && (
        <>
          <Field label="Arquivo">
            {(control) => (
              <select {...control} name="fileId" className="input" defaultValue={fileId}>
                {files.data?.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Segmented legend="Validade" name="validity" options={VALIDITY_OPTIONS} defaultValue="7" />
          <Field
            label={passwordRequired ? 'Senha' : 'Senha (opcional)'}
            hint={
              passwordRequired
                ? 'Sua conta exige senha em novos links. Mínimo de 8 caracteres.'
                : 'Mínimo de 8 caracteres.'
            }
          >
            {(control) => (
              <input
                {...control}
                name="password"
                type="password"
                className="input"
                required={passwordRequired}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            )}
          </Field>
        </>
      )}
    </Dialog>
  )
}
