import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  DoorClosed,
  Info,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { bookingsApi } from '../api'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { ErrorState, LoadingState } from '../components/states'
import { useAvailability } from '../hooks/useAvailability'
import { useRoomType } from '../hooks/useCatalog'
import { useQueryParams } from '../hooks/useQueryParams'
import { formatLongDate } from '../lib/date'
import { formatBaht } from '../lib/money'
import { imageFor } from '../lib/roomImages'

/**
 * Booking confirmation step.
 *
 * The stay is described entirely by the query string so the page is linkable and
 * survives a reload. The server owns the final decision: it re-checks availability
 * inside a transaction, so a 409 here is authoritative rather than advisory.
 */
export default function Booking() {
  const params = useQueryParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const typeId = params.get('type_id') ?? ''
  const checkIn = params.get('check_in') ?? ''
  const checkOut = params.get('check_out') ?? ''
  const roomCount = Math.max(Number(params.get('room_count') ?? 1) || 1, 1)

  const { roomType, loading: roomTypeLoading, error: roomTypeError, reload } = useRoomType(typeId)
  const availability = useAvailability({ typeId, checkIn, checkOut })

  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)

  const nights = availability.nights
  const unitPrice = availability.pricePerNight || roomType?.price || 0
  const total = unitPrice * nights * roomCount

  async function handleConfirm() {
    if (!isAuthenticated) {
      const target = encodeURIComponent(location.pathname + location.search)
      navigate(`/login?redirect=${target}`)
      return
    }

    setSubmitting(true)
    try {
      const result = await bookingsApi.create({ typeId, roomCount, checkIn, checkOut })
      setConfirmation(result)
      toast.success('จองห้องพักสำเร็จ')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
      // Availability may have changed underneath us, so refresh what we show.
      availability.reload()
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return <Confirmation confirmation={confirmation} />
  }

  if (!typeId || !checkIn || !checkOut) {
    return (
      <ErrorState
        title="ข้อมูลการจองไม่ครบถ้วน"
        message="กรุณาเลือกประเภทห้องและวันที่เข้าพักอีกครั้ง"
        onRetry={() => navigate('/')}
      />
    )
  }

  if (roomTypeLoading || availability.loading) {
    return <LoadingState label="กำลังเตรียมข้อมูลการจอง..." />
  }

  if (roomTypeError) return <ErrorState message={roomTypeError} onRetry={reload} />
  if (availability.error) return <ErrorState message={availability.error} onRetry={availability.reload} />
  if (!roomType) return <ErrorState title="ไม่พบห้องพัก" message="ไม่พบประเภทห้องที่คุณเลือก" />

  const notEnoughRooms = availability.availableCount < roomCount

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-10">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="group mb-2 inline-flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            <span className="text-sm font-bold">ย้อนกลับ</span>
          </button>
          <h1 className="text-3xl font-black text-slate-900 md:text-4xl">ยืนยันการจองห้องพัก</h1>
          <p className="text-slate-500">ตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยันการจอง</p>
        </div>

        <ol className="hidden items-center gap-4 text-sm font-bold text-slate-400 md:flex">
          <li className="flex items-center gap-2 text-sky-600">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white">1</span>
            ตรวจสอบข้อมูล
          </li>
          <li className="h-px w-8 bg-slate-200" aria-hidden="true" />
          <li className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-200">2</span>
            จองสำเร็จ
          </li>
        </ol>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col md:flex-row">
              <div className="aspect-[4/3] overflow-hidden md:aspect-auto md:w-1/3">
                <img
                  src={imageFor(roomType)}
                  alt={`ห้องพักประเภท ${roomType.name}`}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-4 p-6 md:p-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{roomType.name}</h2>
                  <p className="mt-1 flex items-center gap-2 text-sm font-bold text-sky-600">
                    <MapPin size={14} aria-hidden="true" />
                    30Rooms Hotel, กรุงเทพมหานคร
                  </p>
                </div>

                <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{roomType.description}</p>

                <dl className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-6">
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">เช็คอิน</dt>
                    <dd className="text-base font-bold text-slate-900">{formatLongDate(checkIn)}</dd>
                    <dd className="text-xs text-slate-500">หลัง 14:00 น.</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">เช็คเอาท์</dt>
                    <dd className="text-base font-bold text-slate-900">{formatLongDate(checkOut)}</dd>
                    <dd className="text-xs text-slate-500">ก่อน 12:00 น.</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          {!isAuthenticated ? (
            <aside className="flex items-start gap-4 rounded-3xl border border-sky-100 bg-sky-50/60 p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white">
                <Info size={20} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">กรุณาเข้าสู่ระบบ</h3>
                <p className="mt-1 text-sm text-slate-600">
                  คุณต้องเข้าสู่ระบบก่อนทำการจอง เพื่อให้เราบันทึกการจองไว้ในบัญชีของคุณ
                </p>
                <Link
                  to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
                  className="mt-4 inline-block text-sm font-bold text-sky-600 underline decoration-2 underline-offset-4"
                >
                  เข้าสู่ระบบตอนนี้
                </Link>
              </div>
            </aside>
          ) : null}

          {notEnoughRooms ? (
            <aside
              role="alert"
              className="flex items-start gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-6"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white">
                <Info size={20} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">ห้องว่างไม่เพียงพอ</h3>
                <p className="mt-1 text-sm text-slate-600">
                  ขณะนี้เหลือห้องว่าง {availability.availableCount} ห้อง แต่คุณเลือกไว้ {roomCount} ห้อง
                  กรุณาย้อนกลับเพื่อปรับจำนวนห้องหรือเปลี่ยนวันที่
                </p>
              </div>
            </aside>
          ) : null}

          <section className="space-y-4">
            <h3 className="flex items-center gap-3 text-xl font-black text-slate-900">
              <span className="h-6 w-1.5 rounded-full bg-sky-600" aria-hidden="true" />
              สรุปข้อมูลการจอง
            </h3>

            <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SummaryTile icon={CalendarDays} label="ระยะเวลาการเข้าพัก" value={`${nights} คืน`} />
              <SummaryTile icon={DoorClosed} label="จำนวนห้อง" value={`${roomCount} ห้อง`} />
            </dl>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100 md:p-8">
            <h3 className="text-xl font-black text-slate-900">สรุปค่าใช้จ่าย</h3>

            <dl className="space-y-4">
              <div className="flex justify-between font-medium text-slate-600">
                <dt>ค่าห้องพัก ({nights} คืน)</dt>
                <dd>{formatBaht(unitPrice * nights)}</dd>
              </div>
              <div className="flex justify-between font-medium text-slate-600">
                <dt>จำนวนห้อง</dt>
                <dd>× {roomCount}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-4 font-medium text-slate-600">
                <dt>ภาษีและค่าบริการ</dt>
                <dd className="font-bold text-emerald-600">รวมแล้ว</dd>
              </div>
              <div className="flex justify-between border-t-2 border-slate-100 pt-4 text-2xl font-black text-slate-900">
                <dt>ยอดรวมทั้งหมด</dt>
                <dd className="text-sky-600">{formatBaht(total)}</dd>
              </div>
            </dl>

            <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-700">
                <CreditCard size={14} aria-hidden="true" /> วิธีการชำระเงิน
              </p>
              <p className="text-sm font-bold text-slate-900">ชำระเงิน ณ ที่พัก</p>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleConfirm}
              loading={submitting}
              disabled={notEnoughRooms || nights === 0}
            >
              {isAuthenticated ? 'ยืนยันการจอง' : 'เข้าสู่ระบบเพื่อจอง'}
            </Button>

            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                <ShieldCheck size={18} className="shrink-0 text-emerald-500" aria-hidden="true" />
                ตรวจสอบห้องว่างจากระบบจริง
              </li>
              <li className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-500" aria-hidden="true" />
                ยกเลิกฟรีก่อนวันเข้าพัก
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function SummaryTile({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-5">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
        <Icon size={22} aria-hidden="true" />
      </span>
      <span>
        <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</dt>
        <dd className="text-base font-bold text-slate-900">{value}</dd>
      </span>
    </div>
  )
}

/** Success screen, showing the booking reference the guest can quote to staff. */
function Confirmation({ confirmation }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-16 text-center">
      <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 size={60} aria-hidden="true" />
      </span>

      <div className="space-y-4">
        <h1 className="text-4xl font-black text-slate-900">การจองสำเร็จ</h1>
        <p className="mx-auto max-w-md text-lg text-slate-500">
          เราได้บันทึกการจองของคุณเรียบร้อยแล้ว สถานะจะเปลี่ยนเป็น &ldquo;ยืนยันแล้ว&rdquo; หลังเจ้าหน้าที่ตรวจสอบ
        </p>
      </div>

      <dl className="mx-auto max-w-sm space-y-3 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm">
        <div className="flex justify-between">
          <dt className="text-sm font-medium text-slate-500">รหัสการจอง</dt>
          <dd className="font-mono text-lg font-black tracking-widest text-slate-900">{confirmation.reference}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-3">
          <dt className="text-sm font-medium text-slate-500">จำนวนห้อง</dt>
          <dd className="font-bold text-slate-900">{confirmation.bookings.length} ห้อง</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-3">
          <dt className="text-sm font-medium text-slate-500">ยอดรวม</dt>
          <dd className="font-black text-sky-600">{formatBaht(confirmation.total_price)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/my-bookings"
          className="rounded-2xl bg-slate-900 px-8 py-4 text-base font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800"
        >
          ดูการจองของฉัน
        </Link>
        <Link
          to="/"
          className="rounded-2xl border-2 border-slate-200 px-8 py-4 text-base font-bold text-slate-600 transition-all hover:bg-slate-50"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  )
}
