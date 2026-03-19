import { useCallback, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import { api } from '../services/api'

function loadStoredUser() {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(() => loadStoredUser())

  const login = useCallback(async ({ email, password }) => {
    const result = await api.login({ email, password })
    const nextToken = result?.token || ''
    const nextUser = result?.user || null

    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem('token', nextToken)
    localStorage.setItem('user', JSON.stringify(nextUser))

    return { token: nextToken, user: nextUser }
  }, [])

  const logout = useCallback(() => {
    setToken('')
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }, [])

  const value = useMemo(() => ({ token, user, login, logout, isAuthed: Boolean(token) }), [token, user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
