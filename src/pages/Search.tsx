import { SearchX } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { search } from '../api'
import { useData } from '../app/context'
import { EmptyState } from '../components/EmptyState'
import { FileList } from '../components/FileList'
import { LinkList } from '../components/LinkList'
import { PageTitle } from '../components/PageTitle'
import { StatusMessage } from '../components/StatusMessage'
import { initials, plural } from '../format'

export default function Search() {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const results = useData(() => search(query), query)
  const data = results.data
  const total = data ? data.files.length + data.links.length + data.people.length : 0
  const subtitle = data ? plural(total, 'resultado', 'resultados') : ''

  return (
    <>
      <PageTitle title={`Resultados para “${query}”`} subtitle={subtitle} />
      {!data && <StatusMessage error={results.error} />}
      {data && total === 0 && <EmptyState icon={SearchX} title="Nada encontrado. Tente outro termo." />}
      {data && data.files.length > 0 && (
        <section className="result-group" aria-labelledby="result-files">
          <h2 id="result-files" className="card-title">
            Arquivos
          </h2>
          <FileList files={data.files} />
        </section>
      )}
      {data && data.links.length > 0 && (
        <section className="result-group" aria-labelledby="result-links">
          <h2 id="result-links" className="card-title">
            Links
          </h2>
          <LinkList links={data.links} />
        </section>
      )}
      {data && data.people.length > 0 && (
        <section className="result-group" aria-labelledby="result-people">
          <h2 id="result-people" className="card-title">
            Pessoas
          </h2>
          <ul className="file-list">
            {data.people.map((person) => (
              <li key={person.id} className="file-row person-row">
                <span className="avatar" aria-hidden="true">
                  {initials(person.name)}
                </span>
                <div className="file-meta">
                  <p className="file-name">{person.name}</p>
                  <p className="person-email">{person.email}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
