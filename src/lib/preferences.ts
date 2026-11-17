// Appearance and accessibility preferences. They live only on this device (localStorage) and are applied as
// data attributes on <html>. index.html runs the same resolution before first paint — keep the two in sync.

export type ThemePreference = 'system' | 'light' | 'dark'
export type MotionPreference = 'system' | 'reduce'
export type TextSize = 'normal' | 'large' | 'larger'

export interface Preferences {
  theme: ThemePreference
  motion: MotionPreference
  textSize: TextSize
}

export const DEFAULT_PREFERENCES: Preferences = { theme: 'system', motion: 'system', textSize: 'normal' }

const STORAGE_KEY = 'vaultshare:preferences'
const LEGACY_THEME_KEY = 'theme'

const THEMES: ThemePreference[] = ['system', 'light', 'dark']
const MOTIONS: MotionPreference[] = ['system', 'reduce']
const TEXT_SIZES: TextSize[] = ['normal', 'large', 'larger']

const pick = <T extends string>(value: unknown, allowed: T[], fallback: T) =>
  allowed.includes(value as T) ? (value as T) : fallback

export function readPreferences(): Preferences {
  let stored: Partial<Preferences> = {}
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {}
    stored.theme ??= (localStorage.getItem(LEGACY_THEME_KEY) as ThemePreference | null) ?? undefined
  } catch {
    // Blocked or corrupted storage: fall back to the system settings.
  }
  return {
    theme: pick(stored.theme, THEMES, DEFAULT_PREFERENCES.theme),
    motion: pick(stored.motion, MOTIONS, DEFAULT_PREFERENCES.motion),
    textSize: pick(stored.textSize, TEXT_SIZES, DEFAULT_PREFERENCES.textSize),
  }
}

export function savePreferences(preferences: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    localStorage.removeItem(LEGACY_THEME_KEY)
  } catch {
    // Without storage the choice only lasts for this visit.
  }
}

const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches
const systemReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export function applyPreferences({ theme, motion, textSize }: Preferences) {
  const root = document.documentElement.dataset
  root.theme = theme === 'system' ? (systemDark() ? 'dark' : 'light') : theme
  root.motion = motion === 'reduce' || systemReducedMotion() ? 'reduce' : 'full'
  root.textSize = textSize
}

export const resolvedTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
export const prefersReducedMotion = () => document.documentElement.dataset.motion === 'reduce'
