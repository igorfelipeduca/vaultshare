import { usePreferences } from '../../app/PreferencesProvider'
import { Segmented } from '../../components/Segmented'
import type { MotionPreference, TextSize, ThemePreference } from '../../lib/preferences'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
]

const MOTION_OPTIONS: { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'reduce', label: 'Reduzidas' },
]

const TEXT_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'normal', label: 'Padrão' },
  { value: 'large', label: 'Grande' },
  { value: 'larger', label: 'Maior' },
]

// Device-only preferences: they apply instantly and are never sent to the server.
export function AppearanceSection() {
  const { preferences, setPreference } = usePreferences()

  return (
    <section className="card settings-panel" aria-labelledby="settings-appearance">
      <div>
        <h2 id="settings-appearance" className="card-title">
          Aparência e acessibilidade
        </h2>
        <p className="section-hint">Vale só para este navegador e muda na hora, sem precisar salvar.</p>
      </div>
      <Segmented
        legend="Tema"
        name="pref-theme"
        options={THEME_OPTIONS}
        value={preferences.theme}
        onChange={(value) => setPreference('theme', value)}
      />
      <Segmented
        legend="Animações"
        name="pref-motion"
        options={MOTION_OPTIONS}
        value={preferences.motion}
        onChange={(value) => setPreference('motion', value)}
      />
      <Segmented
        legend="Tamanho do texto"
        name="pref-text"
        options={TEXT_OPTIONS}
        value={preferences.textSize}
        onChange={(value) => setPreference('textSize', value)}
      />
    </section>
  )
}
