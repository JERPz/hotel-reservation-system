import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { useAuth } from '../controllers/useAuth'
import { useAvailability } from '../controllers/useAvailability'
import { useRoomTypes } from '../controllers/useRoomTypes'
import { api } from '../services/api'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function nightsBetween(checkIn, checkOut) {
  const a = new Date(checkIn)
  const b = new Date(checkOut)
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  const diff = b.getTime() - a.getTime()
  return diff > 0 ? Math.round(diff / (1000 * 60 * 60 * 24)) : 0
}

export default function Booking() {
  const query = useQuery()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthed, user } = useAuth()

  const typeId = query.get('typeId') || ''
  const checkIn = query.get('checkIn') || ''
  const checkOut = query.get('checkOut') || ''
  const qty = Math.max(Number(query.get('qty') || 1), 1)

  const { roomTypes, loading: rtLoading, error: rtError } = useRoomTypes()
  const roomType = useMemo(() => roomTypes.find((rt) => String(rt.ID) === String(typeId)) || null, [roomTypes, typeId])

  const { availableRooms, loading: avLoading, error: avError } = useAvailability({ typeId, checkIn, checkOut })

  const nights = nightsBetween(checkIn, checkOut)
  const unitPrice = roomType ? Number(roomType.Price) : 0
  const total = unitPrice * qty * nights

  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [success, setSuccess] = useState(false)

  const pageLoading = rtLoading || avLoading
  const pageError = rtError || avError

  if (!typeId || !checkIn || !checkOut) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-700">ข้อมูลการจองไม่ครบ</div>
      </div>
    )
  }

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

  if (nights === 0) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-700">ช่วงวันที่ไม่ถูกต้อง</div>
      </div>
    )
  }

  async function onPay() {
    setPayError('')

    if (!isAuthed) {
      const redirect = encodeURIComponent(location.pathname + location.search)
      navigate(`/login?redirect=${redirect}`)
      return
    }

    if (!user?.ID) {
      setPayError('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่')
      return
    }

    if (availableRooms.length < qty) {
      setPayError('จำนวนห้องว่างไม่พอสำหรับช่วงวันที่ที่เลือก')
      return
    }

    setPaying(true)
    try {
      const statuses = await api.getBookingStatuses()
      const confirmed = Array.isArray(statuses)
        ? statuses.find((s) => String(s?.Name || '').toLowerCase().includes('confirmed')) || statuses[0]
        : null
      const statusId = Number(confirmed?.ID || 1)

      const selectedRooms = availableRooms.slice(0, qty)
      for (const r of selectedRooms) {
        await api.createBooking({
          user_id: Number(user.ID),
          room_id: Number(r.ID),
          status_id: statusId,
          check_in: checkIn,
          check_out: checkOut,
        })
      }

      setSuccess(true)
    } catch (e) {
      setPayError(e instanceof Error ? e.message : String(e))
    } finally {
      setPaying(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="text-xl font-semibold text-emerald-900">จองสำเร็จ</div>
        <div className="text-emerald-900/80 mt-2">สามารถดูรายการจองได้ที่หน้า MyBooking</div>
        <div className="mt-5 flex gap-3">
          <Link to="/my-bookings">
            <Button>ไปหน้า MyBooking</Button>
          </Link>
          <Link to="/">
            <Button variant="secondary">กลับหน้า Home</Button>
          </Link>
        </div>
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
          / Booking
        </div>
        <h1 className="text-2xl font-semibold mt-2">Booking</h1>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-500">Room Type</div>
            <div className="text-lg font-semibold">{roomType.Name}</div>
            <div className="text-slate-600 text-sm mt-1">{roomType.Description}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Check-in</span>
              <span className="font-medium">{checkIn}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-600">Check-out</span>
              <span className="font-medium">{checkOut}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-600">จำนวนห้อง</span>
              <span className="font-medium">{qty}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-600">จำนวนคืน</span>
              <span className="font-medium">{nights}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">ราคา/คืน</span>
            <span className="font-medium">{Number(roomType.Price).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-slate-600">รวมทั้งหมด</span>
            <span className="text-lg font-semibold">{Number.isFinite(total) ? total.toLocaleString() : '-'}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          ว่าง {availableRooms.length} ห้อง สำหรับช่วงวันที่ที่เลือก
        </div>

        {!isAuthed ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
            ต้อง Login หรือ Signup ก่อนจึงจะกดจ่ายเงินได้
          </div>
        ) : null}

        {payError ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 text-sm">{payError}</div> : null}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Link to={`/room-types/${typeId}`} className="text-sm text-slate-700 hover:underline">
            กลับไปหน้า RoomDetail
          </Link>
          <Button onClick={onPay} disabled={paying || nights === 0 || availableRooms.length === 0}>
            {paying ? 'กำลังจ่ายเงิน...' : 'จ่ายเงิน (Mock)'}
          </Button>
        </div>
      </section>
    </div>
  )
}
