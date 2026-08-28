import { CalendarDays, Clock, CreditCard, DoorClosed, MapPin, XCircle } from 'lucide-react'

import { formatDateTime, formatShortDate } from '../lib/date'
import { formatBaht } from '../lib/money'
import { imageFor } from '../lib/roomImages'
import { Button } from './Button'
import { StatusBadge } from './StatusBadge'

/**
 * One reservation in "my bookings".
 *
 * Takes a grouped reservation (see useGroupedBookings), so a three-room booking
 * renders as one card listing three room numbers rather than three near-identical
 * cards.
 *
 * Two corrections over the previous card: the amount shown is the reservation's
 * real total for the whole stay, whereas before it printed the room type's nightly
 * price under a "total" label; and the room number comes from `room.number`, where
 * the old markup read a `Room.Name` field that never existed and so always showed
 * a dash.
 */
export function ReservationCard({ reservation, onCancel, cancelling = false }) {
  const { roomType, rooms, status, checkIn, checkOut, nights, totalPrice, canCancel, reference } = reservation

  const roomNumbers = rooms
    .map((room) => room?.number)
    .filter(Boolean)
    .join(', ')

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <div className="flex flex-col md:flex-row">
        <div className="relative aspect-[16/9] overflow-hidden md:aspect-auto md:w-1/3">
          <img
            src={imageFor(roomType)}
            alt={roomType?.name ? `ห้องพักประเภท ${roomType.name}` : 'ห้องพัก'}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
            aria-hidden="true"
          />
          <div className="absolute bottom-5 left-5 right-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">
              {rooms.length > 1 ? `${rooms.length} ห้อง` : 'ห้อง'} {roomNumbers || '-'}
            </p>
            <p className="text-xl font-black text-white">{roomType?.name ?? 'ไม่ทราบประเภทห้อง'}</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <dl className="grid grid-cols-2 gap-8">
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">เช็คอิน</dt>
                <dd className="text-base font-bold text-slate-900">{formatShortDate(checkIn)}</dd>
                <dd className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock size={12} aria-hidden="true" /> 14:00 น.
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">เช็คเอาท์</dt>
                <dd className="text-base font-bold text-slate-900">{formatShortDate(checkOut)}</dd>
                <dd className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock size={12} aria-hidden="true" /> 12:00 น.
                </dd>
              </div>
            </dl>

            <StatusBadge status={status} />
          </div>

          <div className="flex flex-wrap items-center gap-6 border-t border-slate-100 pt-6">
            <Detail icon={CalendarDays} label="ระยะเวลา" value={`${nights} คืน`} />
            <Detail icon={DoorClosed} label="จำนวนห้อง" value={`${rooms.length} ห้อง`} />
            <Detail icon={CreditCard} label="ยอดรวมทั้งหมด" value={formatBaht(totalPrice)} emphasise />
            <Detail icon={MapPin} label="สถานที่" value="Bangkok, TH" />
          </div>

          {canCancel ? (
            <div className="flex justify-end">
              <Button variant="danger" onClick={() => onCancel(reservation)} loading={cancelling}>
                <XCircle size={18} aria-hidden="true" />
                ยกเลิกการจอง
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3 md:px-8">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          จองเมื่อ {formatDateTime(reservation.createdAt)}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          รหัสการจอง {reference}
        </span>
      </footer>
    </article>
  )
}

function Detail({ icon: Icon, label, value, emphasise = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <span className={emphasise ? 'text-lg font-black text-slate-900' : 'text-sm font-bold text-slate-900'}>
          {value}
        </span>
      </span>
    </div>
  )
}
