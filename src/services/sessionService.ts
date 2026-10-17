import type { AuthSession, UserRole } from '../types/auth'

const SESSION_STORAGE_KEY = 'marketflow.session'

function isUserRole(value: unknown): value is UserRole {
  return value === 'CLIENT' || value === 'ADMIN'
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false

  const session = value as Partial<AuthSession>

  return (
    typeof session.token === 'string' &&
    session.token.trim().length > 0 &&
    typeof session.id === 'string' &&
    typeof session.name === 'string' &&
    typeof session.email === 'string' &&
    isUserRole(session.role)
  )
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function getSession(): AuthSession | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const serializedSession = storage.getItem(SESSION_STORAGE_KEY)
    if (!serializedSession) return null

    const session: unknown = JSON.parse(serializedSession)
    if (isAuthSession(session)) return session

    storage.removeItem(SESSION_STORAGE_KEY)
    return null
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null
}

export function saveSession(session: AuthSession): void {
  if (!isAuthSession(session)) {
    throw new Error('Cannot save an invalid MarketFlow session.')
  }

  const storage = getStorage()
  if (!storage) throw new Error('Browser storage is unavailable.')

  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  try {
    getStorage()?.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Ignore storage access errors so logout does not break the application.
  }
}
