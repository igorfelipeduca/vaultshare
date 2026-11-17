import type { ReactNode } from 'react'
import { usePageTitle } from '../app/context'

interface PageTitleProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageTitle({ title, subtitle, action }: PageTitleProps) {
  usePageTitle(title)

  return (
    <div className="title-row">
      <div className="titles">
        <h1>{title}</h1>
        {subtitle !== undefined && <p className="subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
