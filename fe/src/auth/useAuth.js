import { useContext } from 'react'

import { AuthContext } from './AuthContext'

/** Access the current session. Throws if used outside AuthProvider. */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}
