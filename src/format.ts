import type { ActivityEvent, ShareLink, SharedLink, VaultFile } from './api'

const DAY = 86_400_000
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit += 1
  }
  return `${number.format(value)} ${units[unit]}`
}

export function relativeTime(iso: string, { ago = false, now = Date.now() } = {}) {
  const prefix = ago ? 'há ' : ''
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${prefix}${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${prefix}${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ontem'
  if (days < 7) return `${days} dias`
  return `${Math.floor(days / 7)} sem`
}

export function fileMeta(file: VaultFile, now = Date.now()) {
  return `${file.type} · ${formatBytes(file.sizeBytes)} · ${relativeTime(file.createdAt, { ago: true, now })}`
}

export function expiryText(expiresAt: string, now = Date.now()) {
  const days = Math.ceil((new Date(expiresAt).getTime() - now) / DAY)
  return days > 0 ? `Expira em ${days} ${days === 1 ? 'dia' : 'dias'}` : 'Expirado'
}

export function sharedLinkMeta(link: SharedLink, now = Date.now()) {
  const parts = [link.fileType, formatBytes(link.sizeBytes)]
  if (link.expiresAt) parts.push(expiryText(link.expiresAt, now))
  return parts.join(' · ')
}

export type LinkRuleKind = 'expiry' | 'expired' | 'password' | 'readonly' | 'accesses' | 'open'

export function linkRules(link: ShareLink, now = Date.now()) {
  const rules: { kind: LinkRuleKind; label: string }[] = []
  if (link.expiresAt) {
    const label = expiryText(link.expiresAt, now)
    rules.push({ kind: label === 'Expirado' ? 'expired' : 'expiry', label })
  }
  if (link.hasPassword) rules.push({ kind: 'password', label: 'Senha ativa' })
  if (link.readOnly) rules.push({ kind: 'readonly', label: 'Somente leitura' })
  if (!link.expiresAt && !link.hasPassword && !link.readOnly) rules.push({ kind: 'open', label: 'Acesso livre' })
  if (link.accessCount > 0) {
    rules.push({ kind: 'accesses', label: `${link.accessCount} ${link.accessCount === 1 ? 'acesso' : 'acessos'}` })
  }
  return rules
}

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export function eventText({ type, actor, fileName }: ActivityEvent) {
  switch (type) {
    case 'file_accessed':
      return `${actor} acessou ${fileName}`
    case 'link_created':
      return `Você criou um link seguro para ${fileName}`
    case 'password_added':
      return `${fileName} recebeu proteção por senha`
    case 'access_requested':
      return `Novo pedido de acesso de ${actor}`
    case 'file_created':
      return `Você criou ${fileName}`
    case 'file_uploaded':
      return `Você enviou ${fileName}`
  }
}

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (words[0][0] + last).toUpperCase()
}
