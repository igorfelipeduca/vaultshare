import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { Activity, Folder, LayoutDashboard, Link2, Settings, ShieldCheck } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import logo from '../assets/logo.svg'

const NAV_ITEMS = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/arquivos', label: 'Meus arquivos', icon: Folder },
  { to: '/links', label: 'Links compartilhados', icon: Link2 },
  { to: '/atividade', label: 'Atividade', icon: Activity },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const sidebar = useRef<HTMLElement>(null)
  const activeIndex = NAV_ITEMS.findIndex((item) => item.to === pathname)

  const closeDrawer = () => {
    if (sidebar.current?.matches(':popover-open')) sidebar.current.hidePopover()
  }

  return (
    <aside id="sidebar" className="sidebar" popover="auto" ref={sidebar}>
      <Link to="/" className="brand" onClick={closeDrawer}>
        <img src={logo} alt="" width={32} height={32} />
        <span className="brand-text">
          <span className="brand-name">VaultShare</span>
          <span className="brand-tagline">ARQUIVOS SOB CONTROLE</span>
        </span>
      </Link>
      <nav className="nav" aria-label="Principal">
        {activeIndex >= 0 && (
          <span className="nav-indicator" style={{ '--active': activeIndex } as CSSProperties} aria-hidden="true" />
        )}
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className="nav-item" onClick={closeDrawer}>
            <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Link to="/privacidade" className="privacy" onClick={closeDrawer}>
        <span className="privacy-title">
          <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
          Privacidade ativa
        </span>
        <span className="privacy-text">Seus arquivos são protegidos antes do compartilhamento</span>
        <span className="privacy-link">Política de privacidade</span>
      </Link>
    </aside>
  )
}
