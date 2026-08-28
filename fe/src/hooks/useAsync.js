import { useCallback, useEffect, useRef, useState } from 'react'

import { errorMessage } from '../api'

/**
 * Run an async function and track its state.
 *
 * Every data-loading screen previously repeated the same twenty lines: an `alive`
 * flag, three pieces of state, and a try/catch/finally. This centralises that,
 * and adds two things the copies did not have: request cancellation via
 * AbortSignal, and a `reload` function so error states can offer a retry that does
 * not reload the whole page.
 *
 * @param {(options: { signal: AbortSignal }) => Promise<any>} loader
 * @param {Array} deps        Re-runs when these change.
 * @param {object} [options]
 * @param {boolean} [options.enabled=true]  Skip loading while false.
 * @param {any} [options.initialData]
 */
export function useAsync(loader, deps = [], { enabled = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')

  // Bumping this re-runs the effect without changing the caller's deps.
  const [reloadToken, setReloadToken] = useState(0)

  // Held in a ref so changing the loader identity between renders does not
  // retrigger the request; `deps` is the intended trigger.
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let active = true

    setLoading(true)
    setError('')

    loaderRef
      .current({ signal: controller.signal })
      .then((result) => {
        if (!active) return
        setData(result)
      })
      .catch((caught) => {
        // An aborted request is a cancellation, not a failure to report.
        if (!active || caught?.name === 'AbortError') return
        setError(errorMessage(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reloadToken, ...deps])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  return { data, loading, error, reload, setData }
}
