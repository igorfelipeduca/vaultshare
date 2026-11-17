import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

interface SubmitButtonProps {
  pending: boolean
  disabled?: boolean
  className?: string
  icon?: ReactNode
  children: ReactNode
}

export function SubmitButton({
  pending,
  disabled,
  className = 'button button-primary',
  icon,
  children,
}: SubmitButtonProps) {
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}
