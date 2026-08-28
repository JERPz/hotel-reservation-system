import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Read the current query string.
 *
 * This was defined independently in Login, Signup and Booking; it lives here now.
 */
export function useQueryParams() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

/**
 * Resolve the post-login redirect target.
 *
 * Only same-origin relative paths are accepted. Without that check, a crafted
 * `?redirect=https://evil.example` link would turn the login page into an open
 * redirect that borrows this site's credibility.
 */
export function useRedirectTarget(fallback = '/') {
  const params = useQueryParams()

  return useMemo(() => {
    const raw = params.get('redirect')
    if (!raw) return fallback

    let decoded
    try {
      decoded = decodeURIComponent(raw)
    } catch {
      return fallback
    }

    // Must be a rooted path, and must not begin a scheme-relative URL ("//host").
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback
    return decoded
  }, [params, fallback])
}
