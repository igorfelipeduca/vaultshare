import { CircleCheck, Download, Link2Off } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { downloadSharedFile, getSharedLink } from '../api'
import { useData, usePageTitle } from '../app/context'
import logo from '../assets/logo.svg'
import { Field } from '../components/Field'
import { FileTile } from '../components/FileTile'
import { SubmitButton } from '../components/SubmitButton'
import { sharedLinkMeta } from '../format'
import { useFormAction } from '../hooks/useFormAction'

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  // The click starts the download synchronously; the URL only has to outlive this task.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// Public page for whoever receives a share link: no session, outside the app shell.
export default function SharedLink() {
  const slug = useParams().slug ?? ''
  const { data: link, error } = useData(() => getSharedLink(slug), slug)
  const [downloaded, setDownloaded] = useState(false)
  usePageTitle(link ? link.fileName : 'Arquivo compartilhado')

  const { state, onSubmit, pending } = useFormAction(async (form) => {
    if (!link) return
    const password = link.hasPassword ? String(form.get('password')) : null
    saveBlob(await downloadSharedFile(slug, password), link.fileName)
    setDownloaded(true)
  }, 'Não foi possível baixar o arquivo. Tente novamente.')

  const meta = link ? sharedLinkMeta(link) : ''
  const canDownload = Boolean(link?.hasContent)

  return (
    <main className="login">
      <section className="card login-card" aria-busy={!link && !error}>
        <div className="brand login-brand">
          <img src={logo} alt="" width={32} height={32} />
          <span className="brand-text">
            <span className="brand-name">VaultShare</span>
            <span className="brand-tagline">ARQUIVOS SOB CONTROLE</span>
          </span>
        </div>

        {error && (
          <>
            <h1 className="login-title">Link indisponível</h1>
            <p className="notice notice-muted">
              <Link2Off size={16} aria-hidden="true" />
              Este link não existe ou expirou. Peça um novo link a quem compartilhou o arquivo.
            </p>
          </>
        )}

        {link && (
          <>
            <h1 className="login-title">Arquivo compartilhado com você</h1>
            <div className="shared-file">
              <FileTile type={link.fileType} />
              <div className="shared-file-text">
                <p className="shared-file-name">{link.fileName}</p>
                <p className="shared-file-meta">{meta}</p>
              </div>
            </div>

            {!canDownload && <p className="notice notice-muted">Este arquivo ainda não tem conteúdo para baixar.</p>}

            {canDownload && (
              <form className="shared-form" onSubmit={onSubmit}>
                {link.hasPassword && (
                  <Field label="Senha do link" error={state.fields?.password}>
                    {(control) => (
                      <input
                        {...control}
                        name="password"
                        type="password"
                        className="input"
                        required
                        autoComplete="off"
                      />
                    )}
                  </Field>
                )}
                {state.error && !state.fields?.password && (
                  <p className="form-error" role="alert">
                    {state.error}
                  </p>
                )}
                {downloaded && !state.error && (
                  <p className="notice notice-ok" role="status">
                    <CircleCheck size={16} aria-hidden="true" />
                    Download iniciado.
                  </p>
                )}
                <SubmitButton
                  pending={pending}
                  className="button button-primary login-submit"
                  icon={<Download size={16} aria-hidden="true" />}
                >
                  Baixar arquivo
                </SubmitButton>
              </form>
            )}
          </>
        )}

        <p className="login-legal">
          O arquivo fica cifrado no VaultShare e cada acesso é registrado para quem compartilhou, sem identificar você.{' '}
          <Link to="/privacidade">Política de privacidade</Link>
        </p>
      </section>
    </main>
  )
}
