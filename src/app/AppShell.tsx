import { Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, RotateCw } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { UNAUTHORIZED_EVENT, getMe } from '../api'
import type { User } from '../api'
import logo from '../assets/logo.svg'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { Skeleton } from '../components/StatusMessage'
import { CreateFileDialog } from '../dialogs/CreateFileDialog'
import { CreateLinkDialog } from '../dialogs/CreateLinkDialog'
import { preloadPages } from '../routes'
import { AppContext, RevisionContext, useData } from './context'
import type { DialogRequest } from './context'

type Tone = 'ok' | 'error'

// Signed-in area. The session is checked before anything renders, so a signed-out visitor goes straight to
// /login instead of seeing the app shell flash with loading placeholders.
export default function AppShell() {
  const navigate = useNavigate()
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])

  // Any 401 from the API means the session is gone: go to the login screen and come back here afterwards.
  useEffect(() => {
    const toLogin = () => {
      // Several requests can fail at once (and twice under StrictMode): only the first one redirects.
      if (window.location.pathname === '/login') return
      const next = window.location.pathname + window.location.search
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true })
    }
    window.addEventListener(UNAUTHORIZED_EVENT, toLogin)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, toLogin)
  }, [navigate])

  return (
    <RevisionContext.Provider value={revision}>
      <SessionGate refresh={refresh} />
    </RevisionContext.Provider>
  )
}

function SessionGate({ refresh }: { refresh: () => void }) {
  const session = useData(getMe)

  if (session.data) return <Shell user={session.data} refresh={refresh} />

  return (
    <main className="splash">
      <img src={logo} alt="" width={40} height={40} className="splash-logo" />
      {session.error ? (
        <div className="status" role="alert">
          <p>Não foi possível conectar ao VaultShare.</p>
          <button type="button" className="button button-ghost" onClick={refresh}>
            <RotateCw size={16} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      ) : (
        <p className="sr-only" role="status">
          Carregando…
        </p>
      )}
    </main>
  )
}

function Shell({ user, refresh }: { user: User; refresh: () => void }) {
  const revision = useContext(RevisionContext)
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)
  const toastTimer = useRef<number>(undefined)
  const [toast, setToast] = useState<{ message: string; tone: Tone; visible: boolean }>({
    message: '',
    tone: 'ok',
    visible: false,
  })
  const [dialog, setDialog] = useState<DialogRequest | null>(null)

  // The text stays through the exit transition and is cleared afterwards, so a repeated message is announced again.
  const notify = useCallback((message: string, tone: Tone = 'ok') => {
    setToast({ message, tone, visible: true })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }))
      toastTimer.current = window.setTimeout(() => setToast((current) => ({ ...current, message: '' })), 250)
    }, 4500)
  }, [])

  const context = useMemo(
    () => ({ user, revision, refresh, notify, openDialog: setDialog }),
    [user, revision, refresh, notify],
  )

  // Fetches the other pages' code while the browser is idle, so the first visit to each route is instant.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 1200))
    idle(preloadPages)
  }, [])

  // Moves focus to the new page so keyboard and screen reader users start at its content.
  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  const closeDialog = () => setDialog(null)

  return (
    <AppContext.Provider value={context}>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <div className="shell">
        <Sidebar />
        <div className="content">
          <Header />
          <main id="main" className="body" ref={main} tabIndex={-1}>
            <div key={pathname} className="page">
              <Suspense fallback={<Skeleton lines={4} />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
      {dialog?.kind === 'file' && <CreateFileDialog onClose={closeDialog} />}
      {dialog?.kind === 'link' && <CreateLinkDialog fileId={dialog.fileId} onClose={closeDialog} />}
      <div
        className={toast.visible ? `toast toast-${toast.tone} toast-visible` : `toast toast-${toast.tone}`}
        role="status"
      >
        {toast.message &&
          (toast.tone === 'error' ? (
            <CircleAlert size={16} aria-hidden="true" />
          ) : (
            <CircleCheck size={16} aria-hidden="true" />
          ))}
        {toast.message}
      </div>
    </AppContext.Provider>
  )
}
