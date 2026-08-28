/**
 * Persisted session storage.
 *
 * Kept in its own module so the API client and the auth provider can both reach
 * the token without importing each other.
 */

const TOKEN_KEY = 'hotel.token'
const USER_KEY = 'hotel.user'

/** Fired when the API rejects the stored token, so the UI can sign the user out. */
export const UNAUTHORIZED_EVENT = 'hotel:unauthorized'

function safeRead(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    // Private browsing modes can throw on access.
    return null
  }
}

function safeWrite(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Nothing useful to do; the session simply will not persist.
  }
}

export function getToken() {
  return safeRead(TOKEN_KEY) ?? ''
}

export function getStoredUser() {
  const raw = safeRead(USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    // Corrupted entry, treat as signed out.
    safeWrite(USER_KEY, null)
    return null
  }
}

export function storeSession({ token, user }) {
  safeWrite(TOKEN_KEY, token || null)
  safeWrite(USER_KEY, user ? JSON.stringify(user) : null)
}

export function clearSession() {
  safeWrite(TOKEN_KEY, null)
  safeWrite(USER_KEY, null)
}

/** Notify the app that the stored credentials are no longer accepted. */
export function notifyUnauthorized() {
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
}
