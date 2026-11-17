import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Check, Clock, Copy, Eye, Globe, Lock, TimerOff, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ShareLink } from '../api'
import { useApp } from '../app/context'
import { linkRules } from '../format'
import type { LinkRuleKind } from '../format'
import { FileTile } from './FileTile'

const RULE_ICONS: Record<LinkRuleKind, LucideIcon> = {
  expiry: Clock,
  expired: TimerOff,
  password: Lock,
  readonly: Eye,
  accesses: Users,
  open: Globe,
}

const extensionOf = (name: string) => (name.includes('.') ? (name.split('.').pop() ?? '') : '')

function LinkCard({ link, index }: { link: ShareLink; index: number }) {
  const { notify } = useApp()
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(undefined)
  const rules = linkRules(link)
  const expired = rules.some((rule) => rule.kind === 'expired')

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${link.url}`)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1800)
      notify(`Link de ${link.fileName} copiado.`)
    } catch {
      notify('Não foi possível copiar o link. Copie o endereço manualmente.', 'error')
    }
  }

  return (
    <li
      className={expired ? 'link-card enter link-expired' : 'link-card enter'}
      style={{ '--i': index } as CSSProperties}
    >
      <FileTile type={extensionOf(link.fileName)} />
      <div className="link-info">
        <h2 className="link-name">{link.fileName}</h2>
        <ul className="rules">
          {rules.map(({ kind, label }) => {
            const Icon = RULE_ICONS[kind]
            return (
              <li key={kind} className={`rule rule-${kind}`}>
                <Icon size={12} strokeWidth={2.25} aria-hidden="true" />
                {label}
              </li>
            )
          })}
        </ul>
      </div>
      <div className="link-address">
        <span className="link-url" title={link.url}>
          {link.url}
        </span>
        <button
          type="button"
          className={copied ? 'copy-button copy-done' : 'copy-button'}
          aria-label={`Copiar link de ${link.fileName}`}
          onClick={copy}
        >
          <span className="copy-icons" aria-hidden="true">
            <Copy className="copy-idle" size={14} strokeWidth={2} />
            <Check className="copy-check" size={14} strokeWidth={2.5} />
          </span>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </li>
  )
}

export function LinkList({ links }: { links: ShareLink[] }) {
  return (
    <ul className="link-list">
      {links.map((link, index) => (
        <LinkCard key={link.id} link={link} index={index} />
      ))}
    </ul>
  )
}
