// Page chunks, loaded on demand by React.lazy and preloaded in the background once the user is signed in.
export const pages = {
  overview: () => import('./pages/Overview'),
  files: () => import('./pages/Files'),
  links: () => import('./pages/Links'),
  activity: () => import('./pages/Activity'),
  settings: () => import('./pages/settings/SettingsPage'),
  search: () => import('./pages/Search'),
  notFound: () => import('./pages/NotFound'),
  login: () => import('./pages/Login'),
  register: () => import('./pages/Register'),
  sharedLink: () => import('./pages/SharedLink'),
  privacy: () => import('./pages/Privacy'),
}

export function preloadPages() {
  for (const load of Object.values(pages)) load().catch(() => {})
}
