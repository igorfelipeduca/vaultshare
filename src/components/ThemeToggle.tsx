import type { MouseEvent } from 'react'
import { Moon, Sun } from 'lucide-react'
import { flushSync } from 'react-dom'
import { usePreferences } from '../app/PreferencesProvider'
import { prefersReducedMotion, resolvedTheme } from '../lib/preferences'

// Quick switch between light and dark. Picking one here replaces "Sistema"; Configurações can bring it back.
export function ThemeToggle() {
  const { preferences, setPreference } = usePreferences()
  const current = preferences.theme === 'system' ? resolvedTheme() : preferences.theme
  const next = current === 'dark' ? 'light' : 'dark'

  const apply = () => flushSync(() => setPreference('theme', next))

  // The new theme grows out of the button as a circle. Browsers without view transitions swap instantly.
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (!document.startViewTransition || prefersReducedMotion()) {
      apply()
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    document
      .startViewTransition(apply)
      .ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 550, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
        )
      })
      .catch(() => {})
  }

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      data-theme-icon={current}
      onClick={toggle}
      aria-label={next === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro'}
    >
      <Sun className="theme-sun" size={17} strokeWidth={1.75} aria-hidden="true" />
      <Moon className="theme-moon" size={17} strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}
