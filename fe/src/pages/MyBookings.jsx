import { ArrowLeft, CalendarX2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import { Field } from '../components/Field'
import { ReservationCard } from '../components/ReservationCard'
import { EmptyState, ErrorState, LoadingState } from '../components/states'
import { useGroupedBookings, useMyBookings } from '../hooks/useBookings'
import { statusLabel } from '../lib/status'

/**
 * The signed-in guest's reservations.
 *
 * Data comes from /api/bookings/me, which the server scopes to the caller. The
 * previous screen downloaded every booking in the database and filtered client
 * side, so one guest's page contained every other guest's reservations.
 *
 * Rows are grouped by reference, so a three-room booking shows as one reservation.
 */
export default function MyBookings() {
  const { bookings, loading, error, reload, cancelReservation } = useMyBookings()
  const reservations = useGroupedBookings(bookings)

  const [search, setSearch] = useState('')
  const [cancellingReference, setCancellingReference] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return reservations

    return reservations.filter((reservation) => {
      const roomNumbers = reservation.rooms.map((room) => room?.number ?? '').join(' ')
      const haystack = [
        reservation.reference,
        reservation.roomType?.name ?? '',
        statusLabel(reservation.status),
        reservation.status,
        roomNumbers,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [reservations, search])

  async function handleCancel(reservation) {
    setCancellingReference(reservation.reference)
    try {
      await cancelReservation(reservation.reference)
      toast.success('ยกเลิกการจองสำเร็จ')
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setCancellingReference('')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-10">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-2">
          <Link
            to="/"
            className="group mb-2 inline-flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            <span className="text-sm font-bold">กลับหน้าหลัก</span>
          </Link>
          <h1 className="text-3xl font-black text-slate-900 md:text-4xl">การจองของฉัน</h1>
          <p className="text-slate-500">ตรวจสอบและจัดการรายการจองห้องพักทั้งหมดของคุณ</p>
        </div>

        {reservations.length > 0 ? (
          <Field
            icon={Search}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหารหัสการจอง ชื่อห้อง หรือสถานะ..."
            aria-label="ค้นหาการจอง"
            className="w-full max-w-xs"
            inputClassName="bg-white"
          />
        ) : null}
      </header>

      {loading ? (
        <LoadingState label="กำลังโหลดรายการจองของคุณ..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : reservations.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="คุณยังไม่มีรายการจอง"
          message="เริ่มต้นการพักผ่อนของคุณด้วยการเลือกห้องพักที่ถูกใจ"
          action={
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-sky-100 transition-all hover:bg-sky-700"
            >
              จองห้องพักเลย
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="ไม่พบรายการที่ค้นหา"
          message="ลองใช้คำค้นหาอื่น หรือล้างช่องค้นหาเพื่อดูทั้งหมด"
          action={
            <button
              type="button"
              onClick={() => setSearch('')}
              className="font-bold text-sky-600 underline decoration-2 underline-offset-4 hover:text-sky-700"
            >
              แสดงทั้งหมด
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {filtered.map((reservation) => (
            <ReservationCard
              key={reservation.reference}
              reservation={reservation}
              onCancel={handleCancel}
              cancelling={cancellingReference === reservation.reference}
            />
          ))}
        </div>
      )}
    </div>
  )
}
