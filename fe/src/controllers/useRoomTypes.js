import { useEffect, useState } from 'react'
import { api } from '../services/api'

export function useRoomTypes() {
  const [roomTypes, setRoomTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function run() {
      setLoading(true)
      setError('')
      try {
        const data = await api.getRoomTypes()
        if (!alive) return
        setRoomTypes(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
        setRoomTypes([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    run()
    return () => {
      alive = false
    }
  }, [])

  return { roomTypes, loading, error }
}
