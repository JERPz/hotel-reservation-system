import { Navigate, useLocation } from 'react-router-dom'

import { Spinner } from '../components/Spinner'
import { useAuth } from './useAuth'

/**
 * Route guards.
 *
 * Both guards wait for the initial token check to finish before deciding. Without
 * that, a signed-in guest who reloads on a protected page is bounced to the login
 * screen for a moment because the session has not been confirmed yet.
 */

function LoadingScreen() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label="กำลังตรวจสอบสิทธิ์การเข้าใช้งาน..." />
    </div>
  )
}

/** Build a login redirect that returns the user to where they were heading. */
function loginPath(location) {
  const target = encodeURIComponent(location.pathname + location.search)
  return `/login?redirect=${target}`
}

/** Requires any signed-in guest. */
export function RequireAuth({ children }) {
  const { isAuthenticated, initialising } = useAuth()
  const location = useLocation()

  if (initialising) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to={loginPath(location)} replace />

  return children
}

/** Requires an administrator. */
export function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin, initialising } = useAuth()
  const location = useLocation()

  if (initialising) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to={loginPath(location)} replace />
  // A signed-in non-admin is sent home rather than to the login page, which would
  // imply that signing in again might help.
  if (!isAdmin) return <Navigate to="/" replace />

  return children
}
