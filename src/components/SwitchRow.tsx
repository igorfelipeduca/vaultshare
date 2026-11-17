import type { LucideIcon } from 'lucide-react'

interface SwitchRowProps {
  icon: LucideIcon
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function SwitchRow({ icon: Icon, label, hint, checked, onChange }: SwitchRowProps) {
  return (
    <label className="switch-row">
      <span className="tile tone-blue">
        <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="switch-text">
        <span className="switch-label">{label}</span>
        <span className="switch-hint">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        className="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}
