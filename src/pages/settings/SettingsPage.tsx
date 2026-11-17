import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getSettings } from '../../api'
import { useApp, useData } from '../../app/context'
import { PageTitle } from '../../components/PageTitle'
import { StatusMessage } from '../../components/StatusMessage'
import { AccountForm } from './AccountForm'
import { AppearanceSection } from './AppearanceSection'
import { DataSection } from './DataSection'

export default function SettingsPage() {
  const { user } = useApp()
  const settings = useData(getSettings)
  const { hash } = useLocation()

  // Links like /configuracoes#seus-dados (from the privacy policy) land on the right section.
  useEffect(() => {
    if (hash && settings.data) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash, settings.data])

  return (
    <>
      <PageTitle title="Ajustes da conta e da privacidade" />
      {settings.data ? (
        // Keyed by the saved values so a refresh after saving re-seeds the form.
        <AccountForm key={`${user.name}|${user.email}`} user={user} settings={settings.data} />
      ) : (
        <StatusMessage error={settings.error} lines={4} />
      )}
      <div className="settings">
        <AppearanceSection />
        <DataSection />
      </div>
    </>
  )
}
