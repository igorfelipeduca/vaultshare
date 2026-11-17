import { Bell } from 'lucide-react'
import { getNotifications } from '../api'
import { useData } from '../app/context'
import { EventList } from './EventList'
import { StatusMessage } from './StatusMessage'

export function Notifications() {
  const notifications = useData(getNotifications)

  return (
    <>
      <button type="button" className="icon-button bell-button" popoverTarget="notifications" aria-label="Notificações">
        <Bell size={17} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <section id="notifications" className="notifications" popover="auto" aria-labelledby="notifications-title">
        <h2 id="notifications-title" className="card-title">
          Notificações
        </h2>
        {notifications.data ? (
          <EventList events={notifications.data} empty="Nenhuma notificação por aqui." />
        ) : (
          <StatusMessage error={notifications.error} />
        )}
      </section>
    </>
  )
}
