import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  DoorOpen,
  Shield,
  Tv,
  Users,
  Wifi,
  Wind,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'

import { AvailabilityCalendar } from '../components/AvailabilityCalendar'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { ErrorState, LoadingState } from '../components/states'
import { useAvailability, useAvailabilityCalendar } from '../hooks/useAvailability'
import { useRoomType } from '../hooks/useCatalog'
import {
  addDaysYmd,
  addMonths,
  formatCompactDate,
  startOfMonth,
  toMonthKey,
  toYmd,
  todayYmd,
} from '../lib/date'
import { formatBaht } from '../lib/money'
import { galleryFor } from '../lib/roomImages'

const AMENITIES = [
  { icon: Wifi, label: 'Wi-Fi ความเร็วสูง' },
  { icon: Coffee, label: 'ชา กาแฟ ฟรี' },
  { icon: Tv, label: 'สมาร์ททีวี' },
  { icon: Wind, label: 'เครื่องปรับอากาศ' },
]

const POLICIES = [
  'เช็คอิน 14:00 น. | เช็คเอาท์ 12:00 น.',
  'รูมเซอร์วิสตลอด 24 ชั่วโมง',
  'สระว่ายน้ำและฟิตเนสส่วนกลาง',
  'ยกเลิกฟรีก่อนถึงวันเข้าพัก',
]

export default function RoomDetail() {
  const { typeId } = useParams()
  const navigate = useNavigate()

  const { roomType, loading: roomTypeLoading, error: roomTypeError, reload } = useRoomType(typeId)

  const [checkIn, setCheckIn] = useState(() => todayYmd())
  const [checkOut, setCheckOut] = useState(() => addDaysYmd(todayYmd(), 1))
  const [roomCount, setRoomCount] = useState(1)
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth())

  const { availableCount, maxRooms, nights, pricePerNight, loading: availabilityLoading, error: availabilityError } =
    useAvailability({ typeId, checkIn, checkOut })

  const calendar = useAvailabilityCalendar({ typeId, month: toMonthKey(calendarMonth) })

  const gallery = useMemo(() => galleryFor(roomType), [roomType])
  const [activeImage, setActiveImage] = useState(0)

  // The selection is clamped on read rather than corrected in an effect. If
  // availability drops below what the user had picked, the effective value follows
  // immediately in the same render, instead of showing a stale number for one frame
  // and then re-rendering.
  const selectedRooms = maxRooms > 0 ? Math.min(roomCount, maxRooms) : 1

  const unitPrice = pricePerNight || roomType?.price || 0
  const total = unitPrice * nights * selectedRooms
  const soldOut = availableCount === 0

  function handleCheckInChange(value) {
    setCheckIn(value)
    // Check-out must stay strictly after check-in.
    if (!value) return
    if (addDaysYmd(value, 0) >= checkOut) {
      setCheckOut(addDaysYmd(value, 1))
    }
  }

  function handleCalendarSelect(date) {
    const ymd = toYmd(date)
    setCheckIn(ymd)
    setCheckOut(addDaysYmd(ymd, 1))
    toast.success(`เลือกวันเช็คอิน ${formatCompactDate(ymd)}`)
  }

  function handleBook() {
    if (soldOut) {
      toast.error('ขออภัย ห้องพักเต็มในวันที่เลือก')
      return
    }
    navigate(
      `/booking?type_id=${typeId}&check_in=${checkIn}&check_out=${checkOut}&room_count=${selectedRooms}`,
    )
  }

  if (roomTypeLoading) return <LoadingState label="กำลังโหลดรายละเอียดห้องพัก..." />

  if (roomTypeError) {
    return <ErrorState message={roomTypeError} onRetry={reload} />
  }

  if (!roomType) {
    return <ErrorState title="ไม่พบห้องพัก" message="ไม่พบประเภทห้องที่คุณกำลังมองหา" />
  }

  return (
    <div className="space-y-12 pb-10">
      <Link
        to="/"
        className="group inline-flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" aria-hidden="true" />
        <span className="text-sm font-bold">กลับไปหน้าหลัก</span>
      </Link>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <Gallery
            images={gallery}
            activeIndex={activeImage}
            onChange={setActiveImage}
            roomTypeName={roomType.name}
          />

          <section className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-label="สิ่งอำนวยความสะดวก">
            {AMENITIES.map((amenity) => {
              const AmenityIcon = amenity.icon
              return (
                <div
                  key={amenity.label}
                  className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-white p-5 text-center transition-all hover:border-sky-100 hover:bg-sky-50/30"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
                    <AmenityIcon size={22} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-slate-700">{amenity.label}</span>
                </div>
              )
            })}
          </section>

          <section className="space-y-6">
            <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900">
              <span className="h-8 w-1.5 rounded-full bg-sky-600" aria-hidden="true" />
              รายละเอียดห้องพัก
            </h2>

            <p className="max-w-3xl text-lg leading-relaxed text-slate-600">{roomType.description}</p>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <Users size={20} className="text-sky-600" aria-hidden="true" />
                <div>
                  <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">รองรับ</dt>
                  <dd className="text-sm font-bold text-slate-900">{roomType.capacity} ท่าน</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <DoorOpen size={20} className="text-sky-600" aria-hidden="true" />
                <div>
                  <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    ห้องประเภทนี้ทั้งหมด
                  </dt>
                  <dd className="text-sm font-bold text-slate-900">{roomType.room_count} ห้อง</dd>
                </div>
              </div>
            </dl>

            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {POLICIES.map((policy) => (
                <li key={policy} className="flex items-center gap-3 font-medium text-slate-600">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-500" aria-hidden="true" />
                  {policy}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100 md:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">ราคาต่อคืน</p>
              <p className="text-4xl font-black text-slate-900">{formatBaht(unitPrice)}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="เช็คอิน"
                icon={CalendarIcon}
                type="date"
                value={checkIn}
                min={todayYmd()}
                onChange={(event) => handleCheckInChange(event.target.value)}
              />
              <Field
                label="เช็คเอาท์"
                icon={CalendarIcon}
                type="date"
                value={checkOut}
                min={addDaysYmd(checkIn, 1)}
                onChange={(event) => setCheckOut(event.target.value)}
              />
            </div>

            <Field
              as="select"
              label="จำนวนห้องพัก"
              icon={Users}
              value={selectedRooms}
              onChange={(event) => setRoomCount(Number(event.target.value))}
              disabled={soldOut || maxRooms === 0}
              hint={
                availabilityLoading
                  ? 'กำลังตรวจสอบห้องว่าง...'
                  : soldOut
                    ? 'ไม่มีห้องว่างในวันที่เลือก'
                    : `ว่าง ${availableCount} ห้อง (จองได้สูงสุด ${maxRooms} ห้องต่อครั้ง)`
              }
            >
              {Array.from({ length: Math.max(maxRooms, 1) }).map((_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1} ห้อง
                </option>
              ))}
            </Field>

            {availabilityError ? (
              <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {availabilityError}
              </p>
            ) : null}

            <dl className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex justify-between font-medium text-slate-600">
                <dt>
                  {formatBaht(unitPrice)} × {nights} คืน
                </dt>
                <dd>{formatBaht(unitPrice * nights)}</dd>
              </div>
              <div className="flex justify-between font-medium text-slate-600">
                <dt>จำนวนห้อง</dt>
                <dd>× {selectedRooms}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-xl font-black text-slate-900">
                <dt>ยอดรวมทั้งหมด</dt>
                <dd className="text-sky-600">{formatBaht(total)}</dd>
              </div>
            </dl>

            <Button
              size="lg"
              className="w-full"
              onClick={handleBook}
              disabled={soldOut || nights === 0}
              loading={availabilityLoading}
            >
              {soldOut ? 'ห้องเต็มในวันที่เลือก' : 'ดำเนินการจอง'}
              {!soldOut ? <ArrowRight size={20} aria-hidden="true" /> : null}
            </Button>

            <p className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-[11px] font-bold uppercase leading-relaxed tracking-widest text-slate-500">
              <Shield size={22} className="shrink-0 text-slate-400" aria-hidden="true" />
              ตรวจสอบห้องว่างจากระบบจริง ยกเลิกฟรีก่อนวันเข้าพัก
            </p>
          </div>
        </aside>
      </div>

      <AvailabilityCalendar
        month={calendarMonth}
        days={calendar.days}
        loading={calendar.loading}
        totalRooms={calendar.totalRooms}
        onPreviousMonth={() => setCalendarMonth((month) => addMonths(month, -1))}
        onNextMonth={() => setCalendarMonth((month) => addMonths(month, 1))}
        onSelectDate={handleCalendarSelect}
      />
    </div>
  )
}

/** Image carousel with keyboard-reachable controls and dot navigation. */
function Gallery({ images, activeIndex, onChange, roomTypeName }) {
  const total = images.length
  const safeIndex = total > 0 ? activeIndex % total : 0

  return (
    <section className="space-y-4" aria-label={`ภาพห้องพักประเภท ${roomTypeName}`}>
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-slate-100 shadow-xl">
        <img
          src={images[safeIndex]}
          alt={`ห้องพักประเภท ${roomTypeName} ภาพที่ ${safeIndex + 1} จาก ${total}`}
          className="h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
          aria-hidden="true"
        />

        <h1 className="absolute bottom-6 left-6 right-6 text-3xl font-black text-white md:text-4xl">
          {roomTypeName}
        </h1>

        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onChange((safeIndex - 1 + total) % total)}
              aria-label="ภาพก่อนหน้า"
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-white/25 text-white backdrop-blur-md transition-colors hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onChange((safeIndex + 1) % total)}
              aria-label="ภาพถัดไป"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-white/25 text-white backdrop-blur-md transition-colors hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="flex justify-center gap-2">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => onChange(index)}
              aria-label={`ดูภาพที่ ${index + 1}`}
              aria-current={index === safeIndex}
              className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                index === safeIndex ? 'w-8 bg-sky-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
