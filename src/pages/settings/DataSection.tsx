import { useState } from 'react'
import { Download, FileText, LoaderCircle, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError, exportMyData } from '../../api'
import { useApp } from '../../app/context'
import { DeleteAccountDialog } from '../../dialogs/DeleteAccountDialog'

// LGPD art. 18: the user exercises access, portability and deletion here without having to ask anyone.
export function DataSection() {
  const { notify } = useApp()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const download = async () => {
    setExporting(true)
    try {
      const blob = await exportMyData()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'vaultshare-meus-dados.json'
      anchor.click()
      URL.revokeObjectURL(url)
      notify('Arquivo com seus dados baixado.')
    } catch (cause) {
      notify(cause instanceof ApiError ? cause.message : 'Não foi possível baixar seus dados.', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section id="seus-dados" className="card settings-panel" aria-labelledby="settings-data">
      <div>
        <h2 id="settings-data" className="card-title">
          Seus dados
        </h2>
        <p className="section-hint">
          Direitos garantidos pela LGPD. Saiba mais na <Link to="/privacidade">política de privacidade</Link>.
        </p>
      </div>
      <div className="data-action">
        <div>
          <p className="data-action-title">Baixar meus dados</p>
          <p className="switch-hint">Cadastro, configurações, arquivos, links e histórico em um arquivo JSON.</p>
        </div>
        <button
          type="button"
          className="button button-ghost"
          onClick={download}
          disabled={exporting}
          aria-busy={exporting || undefined}
        >
          {exporting ? (
            <LoaderCircle className="spin" size={16} aria-hidden="true" />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          Baixar
        </button>
      </div>
      <div className="data-action">
        <div>
          <p className="data-action-title">Política de privacidade</p>
          <p className="switch-hint">Quais dados tratamos, por quê e por quanto tempo.</p>
        </div>
        <Link to="/privacidade" className="button button-ghost">
          <FileText size={16} aria-hidden="true" />
          Ler
        </Link>
      </div>
      <div className="data-action data-action-danger">
        <div>
          <p className="data-action-title">Excluir conta</p>
          <p className="switch-hint">Apaga para sempre sua conta, arquivos, links e histórico.</p>
        </div>
        <button type="button" className="button button-danger-outline" onClick={() => setDeleting(true)}>
          <Trash2 size={16} aria-hidden="true" />
          Excluir
        </button>
      </div>
      {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}
    </section>
  )
}
