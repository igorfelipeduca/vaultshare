import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { applyPreferences, readPreferences, savePreferences } from '../lib/preferences'
import type { Preferences } from '../lib/preferences'

interface PreferencesValue {
  preferences: Preferences
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
}

const PreferencesContext = createContext<PreferencesValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences)

  // Applies to the DOM synchronously so callers (e.g. the theme view transition) see the change immediately.
  const setPreference = useCallback<PreferencesValue['setPreference']>((key, value) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value }
      savePreferences(next)
      applyPreferences(next)
      return next
    })
  }, [])

  // "Sistema" follows the OS live: switching the OS to dark or reduced motion updates the page without a reload.
  useEffect(() => {
    applyPreferences(preferences)
    const queries = [matchMedia('(prefers-color-scheme: dark)'), matchMedia('(prefers-reduced-motion: reduce)')]
    const update = () => applyPreferences(preferences)
    for (const query of queries) query.addEventListener('change', update)
    return () => {
      for (const query of queries) query.removeEventListener('change', update)
    }
  }, [preferences])

  const value = useMemo(() => ({ preferences, setPreference }), [preferences, setPreference])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider')
  return value
}
