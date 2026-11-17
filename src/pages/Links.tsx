import { Link2 } from 'lucide-react'
import { getLinks } from '../api'
import { useApp, useData } from '../app/context'
import { EmptyState } from '../components/EmptyState'
import { LinkList } from '../components/LinkList'
import { PageTitle } from '../components/PageTitle'
import { StatusMessage } from '../components/StatusMessage'
import { plural } from '../format'

export default function Links() {
  const { openDialog } = useApp()
  const links = useData(getLinks)
  const subtitle = links.data ? plural(links.data.length, 'link compartilhado', 'links compartilhados') : ''
  const newLink = (
    <button type="button" className="button button-primary" onClick={() => openDialog({ kind: 'link' })}>
      <Link2 size={16} strokeWidth={2} aria-hidden="true" />
      Gerar link
    </button>
  )

  return (
    <>
      <PageTitle title="Acesso com regras definidas" subtitle={subtitle} action={newLink} />
      {!links.data && <StatusMessage error={links.error} />}
      {links.data?.length === 0 && <EmptyState icon={Link2} title="Você ainda não gerou links." />}
      {links.data && <LinkList links={links.data} />}
    </>
  )
}
