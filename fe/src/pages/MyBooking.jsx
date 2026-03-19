import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../controllers/useAuth'
import { api } from '../services/api'

function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

export default function MyBooking() {
  const { user } = useAuth()

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function run() {
      setLoading(true)
      setError('')
      try {
        const data = await api.getBookings()
        if (!alive) return
        setBookings(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
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

  const myBookings = useMemo(() => {
    const myId = Number(user?.ID || 0)
    return bookings
      .filter((b) => Number(b?.UserID || 0) === myId && b?.Room && b?.Status)
      .slice()
      .sort((a, b) => String(b?.CreatedAt || '').localeCompare(String(a?.CreatedAt || '')))
  }, [bookings, user])

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-700">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">{error}</div>
      </div>
    )
  }

  if (!user?.ID) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-700">ไม่พบข้อมูลผู้ใช้</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">
          <Link to="/" className="hover:underline">
            Home
          </Link>{' '}
          / MyBooking
        </div>
        <h1 className="text-2xl font-semibold mt-2">My Booking</h1>
        <p className="text-slate-600 mt-2">รายการจองของผู้ใช้ที่ล็อกอินอยู่</p>
      </div>

      {myBookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-semibold">ยังไม่มีการจอง</div>
          <div className="text-slate-600 mt-2">กลับไปเลือกห้องที่หน้า Home แล้วทำการจองได้เลย</div>
          <div className="mt-4">
            <Link to="/" className="text-slate-900 font-medium hover:underline">
              ไปหน้า Home
            </Link>
          </div>
        </div>
      ) : null}

      {myBookings.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 text-sm font-medium text-slate-700">
            <div className="col-span-2">Booking ID</div>
            <div className="col-span-2">Room</div>
            <div className="col-span-3">Check-in</div>
            <div className="col-span-3">Check-out</div>
            <div className="col-span-2">Status</div>
          </div>
          <div className="divide-y divide-slate-100">
            {myBookings.map((b) => (
              <div key={b.ID} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                <div className="col-span-2 font-medium text-slate-900">{b.ID}</div>
                <div className="col-span-2 text-slate-700">{b.Room.Number}</div>
                <div className="col-span-3 text-slate-700">{formatDateTime(b.CheckIn)}</div>
                <div className="col-span-3 text-slate-700">{formatDateTime(b.CheckOut)}</div>
                <div className="col-span-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {b.Status.Name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
