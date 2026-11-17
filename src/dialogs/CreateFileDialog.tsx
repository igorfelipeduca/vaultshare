import { FilePlus2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createFile } from '../api'
import { useApp } from '../app/context'
import { Dialog } from '../components/Dialog'
import { Field } from '../components/Field'
import { Segmented } from '../components/Segmented'

const FILE_TYPES = ['PDF', 'PNG', 'DOCX', 'ZIP'].map((type) => ({ value: type, label: type }))

export function CreateFileDialog({ onClose }: { onClose: () => void }) {
  const { refresh, notify } = useApp()
  const navigate = useNavigate()

  const submit = async (form: FormData) => {
    const file = await createFile({ name: String(form.get('name')).trim(), type: String(form.get('type')) })
    refresh()
    notify(`${file.name} criado.`)
    navigate('/arquivos')
  }

  return (
    <Dialog title="Criar arquivo" icon={FilePlus2} submitLabel="Criar" onClose={onClose} onSubmit={submit}>
      <Field label="Nome do arquivo">
        {(control) => (
          <input
            {...control}
            name="name"
            className="input"
            placeholder="Relatorio_agosto.pdf"
            required
            maxLength={200}
            autoComplete="off"
          />
        )}
      </Field>
      <Segmented legend="Tipo" name="type" options={FILE_TYPES} defaultValue="PDF" />
    </Dialog>
  )
}
