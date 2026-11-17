import { File, FileArchive, FileText, Image } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const FILE_TILES: Record<string, { icon: LucideIcon; tone: string }> = {
  PDF: { icon: FileText, tone: 'rose' },
  PNG: { icon: Image, tone: 'violet' },
  JPG: { icon: Image, tone: 'violet' },
  JPEG: { icon: Image, tone: 'violet' },
  DOCX: { icon: FileText, tone: 'blue' },
  DOC: { icon: FileText, tone: 'blue' },
  ZIP: { icon: FileArchive, tone: 'amber' },
}

export function FileTile({ type }: { type: string }) {
  const { icon: Icon, tone } = FILE_TILES[type.toUpperCase()] ?? { icon: File, tone: 'slate' }
  return (
    <span className={`tile tone-${tone}`}>
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
    </span>
  )
}
