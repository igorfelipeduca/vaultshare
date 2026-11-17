import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import { ArrowRight, FilePlus2, Link2, Lock, SlidersHorizontal, Upload, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError, getActivity, getOverview, uploadFile } from '../api'
import type { OverviewStats } from '../api'
import { useApp, useData, usePageTitle } from '../app/context'
import { EventList } from '../components/EventList'
import { StatusMessage } from '../components/StatusMessage'
import { formatBytes } from '../format'
import { prefersReducedMotion } from '../lib/preferences'

const DIAL_TICKS = 60
const DIAL_ANGLES = Array.from({ length: DIAL_TICKS }, (_, index) => index)

// Animates a number toward its target. Runs instantly under reduced motion or in a hidden tab, where frames don't fire.
function useTween(target: number, duration = 900) {
  const [value, setValue] = useState(target)
  const current = useRef(target)
  const frame = useRef(0)
  const instant = prefersReducedMotion() || document.hidden

  useEffect(() => {
    if (instant) {
      current.current = target
      return
    }
    const from = current.current
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const next = from + (target - from) * (1 - (1 - progress) ** 4)
      current.current = next
      setValue(next)
      if (progress < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration, instant])

  return instant ? target : value
}

// A combination-lock dial: the bezel turns into place and the ticks light up clockwise up to the storage used.
function VaultDial({ stats }: { stats?: OverviewStats }) {
  const used = useTween(stats?.storageUsedBytes ?? 0)
  const ratio = stats ? Math.min(stats.storageUsedBytes / stats.storageQuotaBytes, 1) : 0
  const lit = Math.round(ratio * DIAL_TICKS)
  const level = ratio >= 0.9 ? 'dial dial-full' : 'dial'

  return (
    <div className={level}>
      <svg className="dial-art" viewBox="0 0 260 260" aria-hidden="true">
        <g className="dial-bezel">
          <circle className="dial-knurl" cx="130" cy="130" r="124" />
          <path className="dial-notch" d="M130 2 l5 9 h-10 Z" />
        </g>
        {DIAL_ANGLES.map((index) => (
          <line
            key={index}
            className={index < lit ? 'dial-tick dial-tick-on' : 'dial-tick'}
            x1="130"
            y1="20"
            x2="130"
            y2={index % 5 === 0 ? 38 : 32}
            transform={`rotate(${index * 6} 130 130)`}
            style={{ '--i': index } as CSSProperties}
          />
        ))}
        <circle className="dial-face" cx="130" cy="130" r="86" />
      </svg>
      <dl className="dial-readout">
        <dt>Armazenamento utilizado</dt>
        <dd className="dial-value">{stats ? formatBytes(used) : '–'}</dd>
        <dd className="dial-hint">{stats ? `de ${formatBytes(stats.storageQuotaBytes)} protegidos` : ' '}</dd>
      </dl>
    </div>
  )
}

function Metric({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  tone: string
  label: string
  value?: number
  hint: string
}) {
  return (
    <li className="metric">
      <span className={`tile tone-${tone}`}>
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <dl className="metric-text">
        <dt>{label}</dt>
        <dd className="metric-value">{value ?? '–'}</dd>
        <dd className="metric-hint">{hint}</dd>
      </dl>
    </li>
  )
}

export default function Overview() {
  const { refresh, notify, openDialog } = useApp()
  const overview = useData(getOverview)
  const activity = useData(() => getActivity(4))
  const fileInput = useRef<HTMLInputElement>(null)
  const stats = overview.data
  usePageTitle('Tudo protegido, tudo sob controle.')

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const uploaded = await uploadFile(file)
      refresh()
      notify(`${uploaded.name} enviado.`)
    } catch (cause) {
      notify(cause instanceof ApiError ? cause.message : 'Não foi possível enviar o arquivo.', 'error')
    }
  }

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title" className="hero-title">
            Tudo protegido, tudo sob controle.
          </h1>
          <p className="hero-status">
            <span className="pulse" aria-hidden="true" />
            Centro de segurança ativo
          </p>
          <input ref={fileInput} type="file" hidden onChange={upload} />
          <button
            type="button"
            className="button button-primary button-large"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={16} strokeWidth={2} aria-hidden="true" />
            Enviar arquivo
          </button>
        </div>
        <VaultDial stats={stats} />
      </section>
      {overview.error && <StatusMessage error />}
      <ul className="metrics">
        <Metric
          icon={Lock}
          tone="green"
          label="Arquivos protegidos"
          value={stats?.protectedFiles}
          hint="Criptografia ativa"
        />
        <Metric
          icon={Link2}
          tone="violet"
          label="Links ativos"
          value={stats?.activeLinks}
          hint="Com regras de acesso"
        />
        <Metric
          icon={Users}
          tone="amber"
          label="Acessos recentes"
          value={stats?.recentAccesses}
          hint="Nos últimos 7 dias"
        />
      </ul>
      <div className="overview-bottom">
        <section className="card" aria-labelledby="recent-activity">
          <div className="card-heading">
            <h2 id="recent-activity" className="card-title">
              Atividade recente
            </h2>
            <Link to="/atividade" className="more-link">
              Ver tudo
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {activity.data ? (
            <EventList events={activity.data} empty="Nenhuma atividade recente." />
          ) : (
            <StatusMessage error={activity.error} lines={4} />
          )}
        </section>
        <section className="card" aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="card-title">
            Ações rápidas
          </h2>
          <button type="button" className="quick-action" onClick={() => openDialog({ kind: 'file' })}>
            <FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" />
            Criar arquivo
            <ArrowRight className="quick-arrow" size={16} aria-hidden="true" />
          </button>
          <button type="button" className="quick-action" onClick={() => openDialog({ kind: 'link' })}>
            <Link2 size={18} strokeWidth={1.75} aria-hidden="true" />
            Gerar link de compartilhamento
            <ArrowRight className="quick-arrow" size={16} aria-hidden="true" />
          </button>
          <Link to="/configuracoes" className="quick-action">
            <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
            Ajustar configurações
            <ArrowRight className="quick-arrow" size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </>
  )
}
