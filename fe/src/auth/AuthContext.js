import { createContext } from 'react'

/**
 * Auth state shared across the app.
 *
 * Kept in its own module so the provider component and the `useAuth` hook can
 * import it without creating a cycle, and so this file stays free of components
 * (which keeps react-refresh happy).
 */
export const AuthContext = createContext(null)
