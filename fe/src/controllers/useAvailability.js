import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'

function parseDate(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart
}

function roomTypeId(room) {
  return room?.type_id ?? room?.TypeID ?? null
}

export function useAvailability({ typeId, checkIn, checkOut }) {
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function run() {
      setLoading(true)
      setError('')
      try {
        const [roomsData, bookingsData] = await Promise.all([api.getRooms(), api.getBookings()])
        if (!alive) return
        setRooms(Array.isArray(roomsData) ? roomsData : [])
        setBookings(Array.isArray(bookingsData) ? bookingsData : [])
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
        setRooms([])
        setBookings([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    run()
    return () => {
      alive = false
    }
  }, [])

  const computed = useMemo(() => {
    const tId = Number(typeId)
    const roomsOfType = rooms.filter((r) => Number(roomTypeId(r)) === tId)

    const start = parseDate(checkIn)
    const end = parseDate(checkOut)
    const hasRange = Boolean(start && end && start < end)

    const reservedRoomIds = new Set()
    if (hasRange) {
      for (const b of bookings) {
        const statusName = String(b?.Status?.Name || '').toLowerCase()
        if (statusName.includes('cancel')) continue

        const bStart = parseDate(b?.CheckIn)
        const bEnd = parseDate(b?.CheckOut)
        if (!bStart || !bEnd) continue

        if (overlaps(start, end, bStart, bEnd)) {
          reservedRoomIds.add(Number(b?.RoomID))
        }
      }
    }

    const availableRooms = hasRange ? roomsOfType.filter((r) => !reservedRoomIds.has(Number(r?.ID))) : roomsOfType

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const next14 = Array.from({ length: 14 }).map((_, i) => {
      const dayStart = addDays(today, i)
      const dayEnd = addDays(today, i + 1)

      const reserved = new Set()
      for (const b of bookings) {
        const statusName = String(b?.Status?.Name || '').toLowerCase()
        if (statusName.includes('cancel')) continue

        const bStart = parseDate(b?.CheckIn)
        const bEnd = parseDate(b?.CheckOut)
        if (!bStart || !bEnd) continue

        if (overlaps(dayStart, dayEnd, bStart, bEnd)) {
          reserved.add(Number(b?.RoomID))
        }
      }

      const availableCount = roomsOfType.reduce((acc, r) => acc + (reserved.has(Number(r?.ID)) ? 0 : 1), 0)
      return { date: toYmd(dayStart), availableCount }
    })

    return { roomsOfType, availableRooms, next14 }
  }, [rooms, bookings, typeId, checkIn, checkOut])

  return { ...computed, loading, error }
}
