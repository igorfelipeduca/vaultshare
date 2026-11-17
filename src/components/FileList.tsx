import type { CSSProperties } from 'react'
import { Share2 } from 'lucide-react'
import type { VaultFile } from '../api'
import { useApp } from '../app/context'
import { fileMeta, formatBytes, relativeTime } from '../format'
import { FileTile } from './FileTile'

export function FileList({ files }: { files: VaultFile[] }) {
  const { openDialog } = useApp()

  return (
    <ul className="file-list">
      {files.map((file, index) => (
        <li key={file.id} className="file-row enter" style={{ '--i': index } as CSSProperties}>
          <FileTile type={file.type} />
          <div className="file-meta">
            <p className="file-name">{file.name}</p>
            <p className="file-details">{fileMeta(file)}</p>
          </div>
          <span className="file-column file-size">{formatBytes(file.sizeBytes)}</span>
          <span className="file-column file-when">{relativeTime(file.createdAt, { ago: true })}</span>
          <button
            type="button"
            className="text-button share-button"
            aria-label={`Compartilhar ${file.name}`}
            onClick={() => openDialog({ kind: 'link', fileId: file.id })}
          >
            <Share2 size={14} strokeWidth={2} aria-hidden="true" />
            Compartilhar
          </button>
        </li>
      ))}
    </ul>
  )
}
