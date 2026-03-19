import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import { useAvailability } from '../controllers/useAvailability'
import { useRoomTypes } from '../controllers/useRoomTypes'

function toYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function nightsBetween(checkIn, checkOut) {
  const a = new Date(checkIn)
  const b = new Date(checkOut)
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  const diff = b.getTime() - a.getTime()
  return diff > 0 ? Math.round(diff / (1000 * 60 * 60 * 24)) : 0
}

export default function RoomDetail() {
  const { typeId } = useParams()
  const navigate = useNavigate()

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [checkIn, setCheckIn] = useState(() => toYmd(today))
  const [checkOut, setCheckOut] = useState(() => toYmd(addDays(today, 1)))
  const [qty, setQty] = useState(1)

  const { roomTypes, loading: rtLoading, error: rtError } = useRoomTypes()
  const roomType = useMemo(() => roomTypes.find((rt) => String(rt?.ID) === String(typeId)) || null, [roomTypes, typeId])

  const { availableRooms, next14, loading, error } = useAvailability({ typeId, checkIn, checkOut })

  const nights = nightsBetween(checkIn, checkOut)
  const maxQty = Math.max(availableRooms.length, 1)

  const pageLoading = rtLoading || loading
  const pageError = rtError || error

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-700">Loading...</div>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">{pageError}</div>
      </div>
    )
  }

  if (!roomType) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-700">ไม่พบประเภทห้อง</div>
      </div>
    )
  }

  function onBook() {
    const cleanQty = Math.min(Math.max(Number(qty) || 1, 1), maxQty)
    navigate(`/booking?typeId=${encodeURIComponent(String(typeId))}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&qty=${encodeURIComponent(String(cleanQty))}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">
            <Link to="/" className="hover:underline">
              Home
            </Link>{' '}
            / RoomDetail
          </div>
          <h1 className="text-2xl font-semibold mt-2">{roomType.Name}</h1>
          <p className="text-slate-600 mt-2">{roomType.Description}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-right min-w-[220px]">
          <div className="text-sm text-slate-500">ราคา/คืน</div>
          <div className="text-2xl font-semibold">{Number(roomType.Price).toLocaleString()}</div>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">เช็คห้องว่าง</h2>
              <p className="text-sm text-slate-600 mt-1">เลือกช่วงวันที่ แล้วระบบจะแสดงจำนวนห้องว่าง</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">Check-in</div>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 bg-white"
              />
            </label>
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">Check-out</div>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 bg-white"
              />
            </label>
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">จำนวนห้อง</div>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 bg-white"
              />
              <div className="text-xs text-slate-500 mt-1">สูงสุด {availableRooms.length} ห้อง (ตามช่วงวันที่)</div>
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="text-sm text-slate-700">
              {nights > 0 ? (
                <>
                  ว่าง {availableRooms.length} ห้อง • {nights} คืน
                </>
              ) : (
                <>กรุณาเลือกช่วงวันที่ให้ถูกต้อง</>
              )}
            </div>
            <Button onClick={onBook} disabled={nights === 0 || availableRooms.length === 0}>
              จองห้อง
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold">วันที่ว่าง (14 วันถัดไป)</h3>
          <div className="mt-3 space-y-2">
            {next14.map((d) => (
              <div key={d.date} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{d.date}</span>
                <span className="font-medium">{d.availableCount} ห้อง</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
