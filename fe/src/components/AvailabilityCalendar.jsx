import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '../lib/cn'
import { WEEKDAY_LABELS, formatMonthLabel, leadingBlankDays, parseYmd } from '../lib/date'
import { Spinner } from './Spinner'

/**
 * Month grid of free rooms per night.
 *
 * The counts come straight from the server, which computes them with a single
 * query over the real bookings. The old version derived them in the browser from
 * a partial copy of the data and only counted bookings whose check-in date was
 * exactly the day in question, so a multi-night stay left every day after its
 * first looking free.
 */
export function AvailabilityCalendar({
  month,
  days,
  loading = false,
  totalRooms = 0,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
}) {
  // Index by date so the grid can look up each cell in constant time.
  const byDate = new Map(days.map((day) => [day.date, day]))

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const blanks = leadingBlankDays(month)

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900">
            <span className="h-8 w-1.5 rounded-full bg-sky-600" aria-hidden="true" />
            ปฏิทินห้องว่าง
          </h2>
          {totalRooms > 0 ? (
            <p className="mt-1 text-sm text-slate-500">ห้องพักประเภทนี้มีทั้งหมด {totalRooms} ห้อง</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPreviousMonth}
            aria-label="เดือนก่อนหน้า"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>

          <span
            className="min-w-[10rem] text-center text-sm font-black uppercase tracking-widest text-slate-700"
            aria-live="polite"
          >
            {formatMonthLabel(month)}
          </span>

          <button
            type="button"
            onClick={onNextMonth}
            aria-label="เดือนถัดไป"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="md" label="กำลังโหลดปฏิทิน..." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {WEEKDAY_LABELS.map((weekday) => (
              <div key={weekday} className="text-center">
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {Array.from({ length: blanks }).map((_, index) => (
              <div key={`blank-${index}`} aria-hidden="true" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const dayNumber = index + 1
              const date = new Date(month.getFullYear(), month.getMonth(), dayNumber)
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`

              const info = byDate.get(key)
              const available = info?.available_count ?? 0
              const soldOut = info?.sold_out ?? available <= 0
              const inPast = info?.in_past ?? false
              const selectable = Boolean(onSelectDate) && !inPast && !soldOut

              return (
                <CalendarCell
                  key={key}
                  date={key}
                  dayNumber={dayNumber}
                  available={available}
                  soldOut={soldOut}
                  inPast={inPast}
                  selectable={selectable}
                  onSelect={onSelectDate}
                />
              )
            })}
          </div>

          <p className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
              มีห้องว่าง
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden="true" />
              เต็ม
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
              ผ่านมาแล้ว
            </span>
          </p>
        </>
      )}
    </section>
  )
}

/** One day in the calendar grid. */
function CalendarCell({ date, dayNumber, available, soldOut, inPast, selectable, onSelect }) {
  const label = inPast
    ? `${dayNumber} ผ่านมาแล้ว`
    : soldOut
      ? `${dayNumber} เต็ม`
      : `${dayNumber} ว่าง ${available} ห้อง`

  const content = (
    <>
      <span className="text-sm font-bold text-slate-900">{dayNumber}</span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-black',
          inPast
            ? 'bg-slate-100 text-slate-400'
            : soldOut
              ? 'bg-rose-50 text-rose-600'
              : 'bg-emerald-50 text-emerald-600',
        )}
      >
        {inPast ? '—' : soldOut ? 'เต็ม' : `ว่าง ${available}`}
      </span>
    </>
  )

  const shared = cn(
    'flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4',
    inPast && 'opacity-50',
  )

  if (!selectable) {
    return (
      <div className={shared} aria-label={label}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(parseYmd(date))}
      aria-label={`เลือกวันที่ ${label}`}
      className={cn(
        shared,
        'cursor-pointer transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
      )}
    >
      {content}
    </button>
  )
}
