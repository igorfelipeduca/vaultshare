import { useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { LogOut, Menu, Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { logout } from '../api'
import { useApp } from '../app/context'
import { initials } from '../format'
import { Notifications } from './Notifications'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useApp()
  const searchInput = useRef<HTMLInputElement>(null)
  const query = params.get('q') ?? ''
  const shortcut = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInput.current?.focus()
        searchInput.current?.select()
      }
    }
    document.addEventListener('keydown', focusSearch)
    return () => document.removeEventListener('keydown', focusSearch)
  }, [])

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get('q')).trim()
    if (q) navigate(`/buscar?q=${encodeURIComponent(q)}`)
  }

  const signOut = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="header">
      <button type="button" className="icon-button menu-button" popoverTarget="sidebar" aria-label="Abrir menu">
        <Menu size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <search className="search-region">
        <form className="search" onSubmit={onSearch}>
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          <input
            ref={searchInput}
            key={query}
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Buscar arquivos, links ou pessoas"
            aria-label="Buscar arquivos, links ou pessoas"
            aria-keyshortcuts="Meta+K Control+K"
          />
          <span className="search-shortcut" aria-hidden="true">
            {shortcut}
          </span>
        </form>
      </search>
      <ThemeToggle />
      <Notifications />
      <div className="user">
        <span className="avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className="user-meta">
          <span className="user-name">{user.name}</span>
          <span className="user-plan">{user.plan}</span>
        </span>
        <span className="sr-only user-sr-name">{user.name}</span>
      </div>
      <button type="button" className="icon-button" onClick={signOut} aria-label="Sair da conta" title="Sair">
        <LogOut size={17} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </header>
  )
}
