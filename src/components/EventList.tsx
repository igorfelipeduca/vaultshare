import type { CSSProperties } from 'react'
import { Clock, Eye, FilePlus2, KeyRound, Link2, Upload, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityEvent, EventType } from '../api'
import { eventText, relativeTime } from '../format'
import { EmptyState } from './EmptyState'

const EVENT_ICONS: Record<EventType, { icon: LucideIcon; tone: string }> = {
  file_accessed: { icon: Eye, tone: 'blue' },
  link_created: { icon: Link2, tone: 'violet' },
  password_added: { icon: KeyRound, tone: 'green' },
  access_requested: { icon: UserPlus, tone: 'amber' },
  file_created: { icon: FilePlus2, tone: 'blue' },
  file_uploaded: { icon: Upload, tone: 'blue' },
}

export function EventList({ events, empty }: { events: ActivityEvent[]; empty: string }) {
  if (events.length === 0) return <EmptyState icon={Clock} title={empty} />

  return (
    <ul className="events">
      {events.map((event, index) => {
        const { icon: Icon, tone } = EVENT_ICONS[event.type]
        return (
          <li key={event.id} className="event enter" style={{ '--i': index } as CSSProperties}>
            <span className={`event-icon tone-${tone}`}>
              <Icon size={14} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="event-text">{eventText(event)}</span>
            <time className="event-time" dateTime={event.createdAt}>
              {relativeTime(event.createdAt)}
            </time>
          </li>
        )
      })}
    </ul>
  )
}
