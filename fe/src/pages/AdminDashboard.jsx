import {
  ArrowLeft,
  BedDouble,
  CalendarCheck,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Search,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '../components/states'
import { useAdminDashboard } from '../hooks/useBookings'
import { formatDateTime, formatShortDate } from '../lib/date'
import { formatBaht, formatNumber } from '../lib/money'
import { BOOKING_STATUS, STATUS_FILTERS, statusLabel } from '../lib/status'

export default function AdminDashboard() {
  const {
    stats,
    bookings,
    bookingsTotal,
    users,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    reload,
    updateStatus,
  } = useAdminDashboard()

  const [search, setSearch] = useState('')
  const [pendingId, setPendingId] = useState(null)

  /**
   * Free-text search across the booking table.
   *
   * Every field is coerced with String() before matching. The previous version
   * called `.toLowerCase()` directly on `booking.Room.Name` and `booking.Status.Name`;
   * `Room` has a number rather than a name, so that property was always undefined
   * and typing a single character into this box threw a TypeError and blanked the
   * page.
   */
  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return bookings

    return bookings.filter((booking) => {
      const haystack = [
        booking.id,
        booking.reference,
        booking.guest?.full_name,
        booking.guest?.email,
        booking.room?.number,
        booking.room?.type?.name,
        booking.status,
        statusLabel(booking.status),
      ]
        .map((value) => String(value ?? ''))
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [bookings, search])

  async function handleStatusChange(booking, status) {
    setPendingId(booking.id)
    try {
      await updateStatus(booking.id, status)
      toast.success(status === BOOKING_STATUS.CONFIRMED ? 'ยืนยันการจองแล้ว' : 'ยกเลิกการจองแล้ว')
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setPendingId(null)
    }
  }

  if (loading) return <LoadingState label="กำลังโหลดข้อมูลแผงควบคุม..." />
  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="space-y-10 pb-10">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-2">
          <Link
            to="/"
            className="group mb-2 inline-flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            <span className="text-sm font-bold">กลับหน้าหลัก</span>
          </Link>
          <h1 className="flex items-center gap-4 text-3xl font-black text-slate-900 md:text-4xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <LayoutDashboard size={26} aria-hidden="true" />
            </span>
            แผงควบคุมผู้ดูแล
          </h1>
          <p className="text-slate-500">จัดการการจอง ตรวจสอบผู้ใช้ และดูภาพรวมของระบบ</p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="ภาพรวม">
        <StatCard
          icon={Users}
          label="ผู้ใช้ทั้งหมด"
          value={formatNumber(users.length)}
          tone="bg-sky-50 text-sky-600"
        />
        <StatCard
          icon={CalendarCheck}
          label="การจองทั้งหมด"
          value={formatNumber(stats?.total_bookings ?? 0)}
          tone="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="ยืนยันแล้ว"
          value={formatNumber(stats?.confirmed_bookings ?? 0)}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Wallet}
          label="รายได้รวม"
          value={formatBaht(stats?.revenue ?? 0)}
          tone="bg-amber-50 text-amber-600"
          hint={`${formatNumber(stats?.room_nights_sold ?? 0)} คืน-ห้อง`}
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-black text-slate-900">รายการจอง</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
              <Clock size={12} aria-hidden="true" /> รอยืนยัน {stats?.pending_bookings ?? 0}
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Field
              as="select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="กรองตามสถานะ"
              className="w-full sm:w-44"
              inputClassName="bg-white py-2.5"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Field>

            <Field
              icon={Search}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาการจอง..."
              aria-label="ค้นหาการจอง"
              className="w-full sm:w-64"
              inputClassName="bg-white py-2.5"
            />
          </div>
        </header>

        {filteredBookings.length === 0 ? (
          <EmptyState
            icon={Search}
            title="ไม่พบข้อมูลการจอง"
            message={search ? 'ลองใช้คำค้นหาอื่น' : 'ยังไม่มีการจองในสถานะนี้'}
            className="border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">
                รายการจองทั้งหมด {bookingsTotal} รายการ แสดง {filteredBookings.length} รายการ
              </caption>
              <thead className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-4">รหัส</th>
                  <th scope="col" className="px-6 py-4">ผู้เข้าพัก</th>
                  <th scope="col" className="px-6 py-4">ห้อง</th>
                  <th scope="col" className="px-6 py-4">วันที่เข้าพัก</th>
                  <th scope="col" className="px-6 py-4">ยอดรวม</th>
                  <th scope="col" className="px-6 py-4">สถานะ</th>
                  <th scope="col" className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    busy={pendingId === booking.id}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <header className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">ลูกค้าล่าสุด</h2>
          <Users size={20} className="text-slate-400" aria-hidden="true" />
        </header>

        {users.length === 0 ? (
          <p className="text-sm text-slate-500">ยังไม่มีผู้ใช้ในระบบ</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {users.slice(0, 10).map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 transition-colors hover:bg-slate-100"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-xs font-black text-slate-900">
                    {initialOf(user)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{user.full_name}</p>
                    <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="block rounded-full border border-slate-100 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {user.role}
                  </span>
                  <span className="mt-1 block text-[10px] font-bold text-slate-400">
                    {user.booking_count} การจอง
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone, hint }) {
  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}>
        <Icon size={26} aria-hidden="true" />
      </span>
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs font-medium text-slate-400">{hint}</p> : null}
    </article>
  )
}

function BookingRow({ booking, busy, onStatusChange }) {
  const isPending = booking.status === BOOKING_STATUS.PENDING
  const isCanceled = booking.status === BOOKING_STATUS.CANCELED

  return (
    <tr className="transition-colors hover:bg-slate-50/60">
      <td className="px-6 py-5">
        <span className="block font-mono text-xs font-bold tracking-wider text-slate-900">
          {booking.reference}
        </span>
        <span className="text-[10px] text-slate-400">#{booking.id}</span>
      </td>

      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-700">
            {initialOf(booking.guest)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{booking.guest?.full_name ?? '-'}</p>
            <p className="truncate text-[11px] text-slate-500">{booking.guest?.email ?? '-'}</p>
          </div>
        </div>
      </td>

      <td className="px-6 py-5">
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <BedDouble size={14} className="text-slate-400" aria-hidden="true" />
          ห้อง {booking.room?.number ?? '-'}
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">
          {booking.room?.type?.name ?? '-'}
        </p>
      </td>

      <td className="px-6 py-5">
        <p className="text-sm font-bold text-slate-900">
          {formatShortDate(booking.check_in)} – {formatShortDate(booking.check_out)}
        </p>
        <p className="text-[10px] font-medium text-slate-400">
          {booking.nights} คืน · จองเมื่อ {formatDateTime(booking.created_at)}
        </p>
      </td>

      <td className="px-6 py-5 text-sm font-black text-slate-900">{formatBaht(booking.total_price)}</td>

      <td className="px-6 py-5">
        <StatusBadge status={booking.status} />
      </td>

      <td className="px-6 py-5">
        <div className="flex items-center justify-end gap-2">
          {isPending ? (
            <Button
              variant="success"
              size="sm"
              loading={busy}
              onClick={() => onStatusChange(booking, BOOKING_STATUS.CONFIRMED)}
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              ยืนยัน
            </Button>
          ) : null}

          {!isCanceled ? (
            <Button
              variant="danger"
              size="sm"
              loading={busy && !isPending}
              onClick={() => onStatusChange(booking, BOOKING_STATUS.CANCELED)}
            >
              <XCircle size={14} aria-hidden="true" />
              ยกเลิก
            </Button>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">—</span>
          )}
        </div>
      </td>
    </tr>
  )
}

/**
 * First initial for an avatar placeholder.
 *
 * Falls back through name, email, then a neutral character. The old code called
 * `user.FirstName.charAt(0)` directly, which threw whenever a profile had no first
 * name.
 */
function initialOf(person) {
  const source = person?.first_name || person?.full_name || person?.email || '?'
  return String(source).trim().charAt(0).toUpperCase() || '?'
}
