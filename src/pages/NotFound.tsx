import { Compass, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageTitle } from '../components/PageTitle'

export default function NotFound() {
  return (
    <>
      <PageTitle title="Página não encontrada" />
      <EmptyState
        icon={Compass}
        title="Este endereço não existe ou mudou de lugar."
        action={
          <Link to="/" className="button button-ghost">
            <LayoutDashboard size={16} aria-hidden="true" />
            Voltar para a visão geral
          </Link>
        }
      />
    </>
  )
}
