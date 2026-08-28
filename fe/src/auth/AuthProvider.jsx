import { useCallback, useEffect, useMemo, useState } from 'react'

import { authApi } from '../api'
import {
  UNAUTHORIZED_EVENT,
  clearSession,
  getStoredUser,
  getToken,
  storeSession,
} from '../api/session'
import { AuthContext } from './AuthContext'

/**
 * Owns the authenticated session.
 *
 * Two behaviours the previous version lacked:
 *
 *  1. The stored token is revalidated against `/api/auth/me` on boot. Previously
 *     a stale or revoked token stayed "signed in" until a request happened to
 *     fail, and the cached user object could drift from the server (for example
 *     after a role change).
 *  2. It listens for the unauthorized event the API client raises, so any 401
 *     anywhere in the app signs the user out in one place.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  // Start in a loading state only when there is a token worth checking.
  const [initialising, setInitialising] = useState(() => Boolean(getToken()))

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  // Revalidate a persisted token once on mount.
  useEffect(() => {
    // With no token there is nothing to check, and `initialising` already
    // started as false, so the effect has no work to do.
    if (!getToken()) return

    const controller = new AbortController()
    let active = true

    authApi
      .me({ signal: controller.signal })
      .then((fresh) => {
        if (!active) return
        setUser(fresh)
        storeSession({ token: getToken(), user: fresh })
      })
      .catch((error) => {
        if (!active || error?.name === 'AbortError') return
        // The client already cleared storage on a 401; mirror that in state.
        clearSession()
        setUser(null)
      })
      .finally(() => {
        if (active) setInitialising(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  // React to a rejected token raised from anywhere in the app.
  useEffect(() => {
    function handleUnauthorized() {
      setUser(null)
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const session = await authApi.login({ email, password })
    storeSession({ token: session.token, user: session.user })
    setUser(session.user)
    return session.user
  }, [])

  const signUp = useCallback(async (details) => {
    // Register returns a session, so a new guest is signed in immediately rather
    // than being asked to log in again straight after.
    const session = await authApi.register(details)
    storeSession({ token: session.token, user: session.user })
    setUser(session.user)
    return session.user
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(user?.is_admin),
      initialising,
      signIn,
      signUp,
      signOut,
    }),
    [user, initialising, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
