import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function EmptyState({ icon: Icon, title, action }: { icon: LucideIcon; title: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p>{title}</p>
      {action}
    </div>
  )
}
