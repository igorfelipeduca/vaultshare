// Client for the API described in BACKEND.md. Each function names the endpoint it calls and resolves
// with the documented shape. Errors reject with ApiError, whose message is pt-BR and safe to show.

export type FileType = string

export interface User {
  id: string
  name: string
  email: string
  plan: string
}

export interface UserSettings {
  requirePassword: boolean
  notifyAccess: boolean
  allowAccessRequests: boolean
}

export interface VaultFile {
  id: string
  name: string
  type: FileType
  sizeBytes: number
  createdAt: string
}

export interface ShareLink {
  id: string
  fileId: string
  fileName: string
  url: string
  expiresAt: string | null
  hasPassword: boolean
  readOnly: boolean
  accessCount: number
  createdAt: string
}

export type EventType =
  | 'file_accessed'
  | 'link_created'
  | 'password_added'
  | 'access_requested'
  | 'file_created'
  | 'file_uploaded'

export interface ActivityEvent {
  id: string
  type: EventType
  actor: string | null
  fileName: string | null
  createdAt: string
}

export interface OverviewStats {
  storageUsedBytes: number
  storageQuotaBytes: number
  protectedFiles: number
  activeLinks: number
  recentAccesses: number
}

export interface Person {
  id: string
  name: string
  email: string
}

export interface SearchResults {
  files: VaultFile[]
  links: ShareLink[]
  people: Person[]
}

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

// Fired on any 401 so the app can send the user to the login screen.
export const UNAUTHORIZED_EVENT = 'vaultshare:unauthorized'

export class ApiError extends Error {
  status: number
  code: string
  fields?: Record<string, string>

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  // The API refuses writes without this header (CSRF protection).
  if (method !== 'GET') headers['X-Requested-With'] = 'VaultShare'

  let response: Response
  try {
    response = await fetch(BASE_URL + path, { method, headers, body: payload, credentials: 'include' })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor. Verifique sua internet e tente novamente.')
  }

  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    throw new ApiError(
      response.status,
      data?.code ?? 'UNKNOWN_ERROR',
      data?.message ?? 'Não foi possível concluir a ação.',
      data?.fields,
    )
  }
  return data as T
}

// POST /auth/login
export const login = (email: string, password: string) => request<User>('POST', '/auth/login', { email, password })

// POST /auth/logout
export const logout = () => request<void>('POST', '/auth/logout')

// GET /me
export const getMe = () => request<User>('GET', '/me')

// PATCH /me
export const updateMe = (patch: Pick<User, 'name' | 'email'>) => request<User>('PATCH', '/me', patch)

// GET /me/settings
export const getSettings = () => request<UserSettings>('GET', '/me/settings')

// PUT /me/settings
export const updateSettings = (next: UserSettings) => request<UserSettings>('PUT', '/me/settings', next)

// GET /overview
export const getOverview = () => request<OverviewStats>('GET', '/overview')

// GET /activity?limit=
export const getActivity = (limit?: number) =>
  request<ActivityEvent[]>('GET', limit === undefined ? '/activity' : `/activity?limit=${limit}`)

// GET /notifications
export const getNotifications = () => request<ActivityEvent[]>('GET', '/notifications')

// GET /files
export const getFiles = () => request<VaultFile[]>('GET', '/files')

// POST /files
export const createFile = (input: { name: string; type: FileType }) => request<VaultFile>('POST', '/files', input)

// POST /files/upload (multipart/form-data)
export function uploadFile(upload: File) {
  const form = new FormData()
  form.append('file', upload)
  return request<VaultFile>('POST', '/files/upload', form)
}

// GET /links
export const getLinks = () => request<ShareLink[]>('GET', '/links')

// POST /links
export const createLink = (input: { fileId: string; expiresInDays: number | null; password: string | null }) =>
  request<ShareLink>('POST', '/links', input)

// GET /search?q=
export const search = (query: string) => request<SearchResults>('GET', `/search?q=${encodeURIComponent(query.trim())}`)

// GET /me/export (LGPD art. 18, II and V): returns the file so the caller can offer it as a download.
export async function exportMyData() {
  const response = await fetch(`${BASE_URL}/me/export`, { credentials: 'include' })
  if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  if (!response.ok)
    throw new ApiError(response.status, 'EXPORT_FAILED', 'Não foi possível gerar o arquivo com seus dados.')
  return response.blob()
}

// PUT /me/password: also signs out every other session.
export const changePassword = (currentPassword: string, newPassword: string) =>
  request<void>('PUT', '/me/password', { currentPassword, newPassword })

// DELETE /me/sessions: signs out every session except the current one.
export const endOtherSessions = () => request<{ ended: number }>('DELETE', '/me/sessions')

// DELETE /me (LGPD art. 18, VI)
export const deleteAccount = (password: string) => request<void>('DELETE', '/me', { password })
