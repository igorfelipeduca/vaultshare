import { getActivity } from '../api'
import { useData } from '../app/context'
import { EventList } from '../components/EventList'
import { PageTitle } from '../components/PageTitle'
import { StatusMessage } from '../components/StatusMessage'

export default function Activity() {
  const activity = useData(() => getActivity())

  return (
    <>
      <PageTitle title="Histórico da sua conta" subtitle="Acessos, links e arquivos, do mais recente ao mais antigo." />
      <section className="card" aria-label="Histórico de atividades">
        {activity.data ? (
          <EventList events={activity.data} empty="Nenhuma atividade registrada." />
        ) : (
          <StatusMessage error={activity.error} lines={5} />
        )}
      </section>
    </>
  )
}
