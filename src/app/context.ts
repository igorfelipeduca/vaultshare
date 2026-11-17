import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { User } from '../api'

export type DialogRequest = { kind: 'file' } | { kind: 'link'; fileId?: string }

interface AppContextValue {
  user: User
  revision: number
  refresh: () => void
  notify: (message: string, tone?: 'ok' | 'error') => void
  openDialog: (request: DialogRequest) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

// Revision counter shared by every useData call. It exists before the session is known, so the session itself
// can be loaded with useData.
export const RevisionContext = createContext<number>(0)

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppContext')
  return value
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | VaultShare`
  }, [title])
}

export interface DataState<T> {
  data?: T
  error?: boolean
}

// Loads data on mount and again whenever `key` changes or a mutation calls refresh().
// Keeps the previous data on screen while reloading.
export function useData<T>(load: () => Promise<T>, key?: unknown): DataState<T> {
  const revision = useContext(RevisionContext)
  const [state, setState] = useState<DataState<T>>({})
  // `load` is usually a new inline function on every render, so it is read from a ref and `key` marks real changes.
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: revision and key are re-run triggers, not values read here
  useEffect(() => {
    let current = true
    loadRef.current().then(
      (data) => current && setState({ data }),
      () => current && setState((previous) => ({ data: previous.data, error: true })),
    )
    return () => {
      current = false
    }
  }, [revision, key])

  return state
}
