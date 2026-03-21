import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'

function parseDate(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function toYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toYmdFromValue(value) {
  const d = parseDate(value)
  if (!d) return null
  d.setHours(0, 0, 0, 0)
  return toYmd(d)
}

function roomTypeId(room) {
  return room?.type_id ?? room?.TypeID ?? null
}

function bookingStatusName(booking) {
  return (
    booking?.Status?.Name ??
    booking?.status?.name ??
    booking?.StatusName ??
    booking?.status_name ??
    ''
  )
}

function bookingRoomIds(booking) {
  const one = booking?.RoomID ?? booking?.room_id ?? booking?.roomId
  const many = booking?.RoomIDs ?? booking?.room_ids ?? booking?.roomIds
  const ids = []

  if (Array.isArray(many)) {
    for (const v of many) {
      const n = Number(v)
      if (Number.isFinite(n)) ids.push(n)
    }
  }

  const oneN = Number(one)
  if (Number.isFinite(oneN)) ids.push(oneN)

  return ids
}

function monthKeyFrom(input) {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function useAvailability({ typeId, checkIn, checkOut, month }) {
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
    if (!Number.isFinite(tId)) {
      return { roomsOfType: [], availableRooms: [], monthDays: [] }
    }

    const roomsOfType = rooms.filter((r) => Number(roomTypeId(r)) === tId)
    const roomsOfTypeIds = new Set(roomsOfType.map((r) => Number(r?.ID ?? r?.id)).filter(Number.isFinite))

    const start = parseDate(checkIn)
    const end = parseDate(checkOut)
    const hasRange = Boolean(start && end && start < end)

    const reservedRoomIds = new Set()
    if (hasRange) {
      start.setHours(0, 0, 0, 0)
      const checkInKey = toYmd(start)
      for (const b of bookings) {
        const statusName = String(bookingStatusName(b)).toLowerCase()
        if (statusName.includes('cancel')) continue

        const bCheckInKey = toYmdFromValue(b?.CheckIn)
        if (!bCheckInKey) continue

        if (bCheckInKey === checkInKey) {
          for (const roomId of bookingRoomIds(b)) {
            if (roomsOfTypeIds.has(roomId)) reservedRoomIds.add(roomId)
          }
        }
      }
    }

    const availableRooms = hasRange ? roomsOfType.filter((r) => !reservedRoomIds.has(Number(r?.ID ?? r?.id))) : roomsOfType

    const mk = monthKeyFrom(month) || monthKeyFrom(new Date())
    const [yStr, mStr] = String(mk).split('-')
    const y = Number(yStr)
    const m = Number(mStr) - 1
    const monthStart = new Date(y, m, 1)
    monthStart.setHours(0, 0, 0, 0)
    const monthEnd = new Date(y, m + 1, 1)
    monthEnd.setHours(0, 0, 0, 0)

    const relevantBookings = bookings.filter((b) => {
      const statusName = String(bookingStatusName(b)).toLowerCase()
      if (statusName.includes('cancel')) return false

      const bCheckInKey = toYmdFromValue(b?.CheckIn)
      if (!bCheckInKey) return false
      if (bCheckInKey < toYmd(monthStart) || bCheckInKey >= toYmd(monthEnd)) return false

      const ids = bookingRoomIds(b)
      for (const id of ids) {
        if (roomsOfTypeIds.has(id)) return true
      }
      return false
    })

    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const monthDays = Array.from({ length: daysInMonth }).map((_, idx) => {
      const day = idx + 1
      const dayStart = new Date(y, m, day)
      dayStart.setHours(0, 0, 0, 0)
      const dayKey = toYmd(dayStart)

      const reserved = new Set()
      for (const b of relevantBookings) {
        const bCheckInKey = toYmdFromValue(b?.CheckIn)
        if (!bCheckInKey) continue
        if (bCheckInKey !== dayKey) continue

        for (const roomId of bookingRoomIds(b)) {
          if (roomsOfTypeIds.has(roomId)) reserved.add(roomId)
        }
      }

      const availableCount = Math.max(roomsOfTypeIds.size - reserved.size, 0)
      return { date: toYmd(dayStart), availableCount }
    })

    return { roomsOfType, availableRooms, monthDays }
  }, [rooms, bookings, typeId, checkIn, checkOut, month])

  return { ...computed, loading, error }
}
