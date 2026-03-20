import { useLocation, Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export default function AdminRoute({ children }) {
  const { isAuthed, user } = useAuth()
  const location = useLocation()

  if (!isAuthed) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  const role = String(user?.Role?.Name || '').toLowerCase()
  if (role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
