import type { CSSProperties } from 'react'
import { useApp } from '../app/context'

const SKELETON_IDS = ['a', 'b', 'c', 'd', 'e', 'f']

export function StatusMessage({ error, lines = 3 }: { error?: boolean; lines?: number }) {
  const { refresh } = useApp()

  if (error) {
    return (
      <div className="status" role="alert">
        <p>Não foi possível carregar os dados.</p>
        <button type="button" className="text-button" onClick={refresh}>
          Tentar novamente
        </button>
      </div>
    )
  }
  return <Skeleton lines={lines} />
}

// Placeholder lines while content loads. Usable outside AppContext (e.g. as a Suspense fallback).
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-group" role="status">
      <span className="sr-only">Carregando…</span>
      {SKELETON_IDS.slice(0, lines).map((id, index) => (
        <span key={id} className="skeleton" aria-hidden="true" style={{ '--i': index } as CSSProperties} />
      ))}
    </div>
  )
}
