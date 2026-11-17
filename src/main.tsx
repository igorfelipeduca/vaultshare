import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque'
import './styles.css'
import AppShell from './app/AppShell'
import { PreferencesProvider } from './app/PreferencesProvider'
import { pages } from './routes'

const Overview = lazy(pages.overview)
const Files = lazy(pages.files)
const Links = lazy(pages.links)
const Activity = lazy(pages.activity)
const Settings = lazy(pages.settings)
const Search = lazy(pages.search)
const NotFound = lazy(pages.notFound)
const Login = lazy(pages.login)
const Privacy = lazy(pages.privacy)

const root = document.getElementById('root')
if (!root) throw new Error('Elemento #root não encontrado em index.html')

createRoot(root).render(
  <StrictMode>
    <PreferencesProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route path="privacidade" element={<Privacy />} />
            <Route element={<AppShell />}>
              <Route index element={<Overview />} />
              <Route path="arquivos" element={<Files />} />
              <Route path="links" element={<Links />} />
              <Route path="atividade" element={<Activity />} />
              <Route path="configuracoes" element={<Settings />} />
              <Route path="buscar" element={<Search />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </PreferencesProvider>
  </StrictMode>,
)
