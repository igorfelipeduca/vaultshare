import { useState } from 'react'
import { FilePlus2, FolderOpen } from 'lucide-react'
import { getFiles } from '../api'
import { useApp, useData } from '../app/context'
import { EmptyState } from '../components/EmptyState'
import { FileList } from '../components/FileList'
import { PageTitle } from '../components/PageTitle'
import { StatusMessage } from '../components/StatusMessage'
import { formatBytes, plural } from '../format'

export default function Files() {
  const { openDialog } = useApp()
  const files = useData(getFiles)
  const [filter, setFilter] = useState('all')
  const all = files.data ?? []
  const types = [...new Set(all.map((file) => file.type))]
  const visible = filter === 'all' ? all : all.filter((file) => file.type === filter)
  const totalBytes = all.reduce((sum, file) => sum + file.sizeBytes, 0)
  const subtitle = files.data ? `${plural(all.length, 'arquivo', 'arquivos')} · ${formatBytes(totalBytes)}` : ''
  const newFile = (
    <button type="button" className="button button-primary" onClick={() => openDialog({ kind: 'file' })}>
      <FilePlus2 size={16} strokeWidth={2} aria-hidden="true" />
      Novo arquivo
    </button>
  )

  return (
    <>
      <PageTitle title="Documentos armazenados" subtitle={subtitle} action={newFile} />
      {types.length > 1 && (
        <fieldset className="chips">
          <legend className="sr-only">Filtrar por tipo</legend>
          {['all', ...types].map((type) => (
            <button
              key={type}
              type="button"
              className="chip"
              aria-pressed={filter === type}
              onClick={() => setFilter(type)}
            >
              {type === 'all' ? 'Todos' : type}
            </button>
          ))}
        </fieldset>
      )}
      {!files.data && <StatusMessage error={files.error} lines={5} />}
      {files.data?.length === 0 && <EmptyState icon={FolderOpen} title="Você ainda não tem arquivos." />}
      {files.data && <FileList files={visible} />}
    </>
  )
}
