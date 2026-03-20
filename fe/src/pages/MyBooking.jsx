import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../controllers/useAuth'
import { api } from '../services/api'
import { Calendar, CreditCard, Clock, CheckCircle2, XCircle, AlertCircle, ArrowLeft, MoreHorizontal, MapPin, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import singleImage1 from '../assets/pic/single_1.png'
import singleImage2 from '../assets/pic/single_2.png'
import singleImage3 from '../assets/pic/single_3.png'
import doubleImage1 from '../assets/pic/double_1.png'
import doubleImage2 from '../assets/pic/double_2.png'
import doubleImage3 from '../assets/pic/double_3.png'
import suiteImage1 from '../assets/pic/suite_1.png'
import suiteImage2 from '../assets/pic/suite_2.png'
import suiteImage3 from '../assets/pic/suite_3.png'

const roomImageMap = {
  single: [singleImage1, singleImage2, singleImage3],
  double: [doubleImage1, doubleImage2, doubleImage3],
  suite: [suiteImage1, suiteImage2, suiteImage3],
}

function getRoomImage(typeName, idx = 0) {
  if (!typeName) return singleImage1
  const key = String(typeName).toLowerCase()
  if (key.includes('double')) return roomImageMap.double[idx % roomImageMap.double.length]
  if (key.includes('suite')) return roomImageMap.suite[idx % roomImageMap.suite.length]
  return roomImageMap.single[idx % roomImageMap.single.length]
}

function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDateOnly(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric'
  })
}

export default function MyBooking() {
  const { user } = useAuth()

  const [bookings, setBookings] = useState([])
  const [bookingStatuses, setBookingStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const fetchStatuses = async () => {
    try {
      const statuses = await api.getBookingStatuses()
      setBookingStatuses(Array.isArray(statuses) ? statuses : [])
    } catch {
      setBookingStatuses([])
    }
  }

  const fetchBookings = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getBookings()
      setBookings(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatuses()
    fetchBookings()
  }, [])

  const myBookings = useMemo(() => {
    const myId = Number(user?.ID || user?.id || 0)
    const filtered = bookings
      .filter((b) => {
        const bUserId = Number(b?.UserID || b?.user_id || 0)
        // Ensure Room, Type (RoomType) and Status exist before rendering
        return bUserId === myId && b?.Room?.type && b?.Status
      })
      .slice()
      .sort((a, b) => String(b?.CreatedAt || b?.created_at || '').localeCompare(String(a?.CreatedAt || a?.created_at || '')))

    if (!search.trim()) return filtered
    const q = search.toLowerCase()
    return filtered.filter(b => 
      (b.Room?.type?.Name || '').toLowerCase().includes(q) ||
      (b.Status?.Name || '').toLowerCase().includes(q) ||
      (b.Room?.Name || '').toLowerCase().includes(q)
    )
  }, [bookings, user, search])

  const cancelBooking = async (bookingId) => {
    const canceled = bookingStatuses.find((s) => String(s?.Name || '').toLowerCase().includes('cancel'))
    if (!canceled?.ID) {
      toast.error('ไม่พบสถานะยกเลิก กรุณาลองใหม่ภายหลัง')
      return
    }

    const toastId = toast.loading('กำลังดำเนินการยกเลิก...')
    try {
      await api.updateBooking({ id: bookingId, status_id: Number(canceled.ID) })
      const data = await api.getBookings()
      setBookings(Array.isArray(data) ? data : [])
      toast.success('ยกเลิกการจองสำเร็จ', { id: toastId })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e), { id: toastId })
    }
  }

  const getStatusColor = (statusName) => {
    const name = String(statusName || '').toLowerCase()
    if (name.includes('confirm') || name.includes('success')) return 'bg-emerald-50 text-emerald-600 border-emerald-100'
    if (name.includes('cancel')) return 'bg-rose-50 text-rose-600 border-rose-100'
    if (name.includes('pending')) return 'bg-amber-50 text-amber-600 border-amber-100'
    return 'bg-slate-50 text-slate-600 border-slate-100'
  }

  const getStatusIcon = (statusName) => {
    const name = String(statusName || '').toLowerCase()
    if (name.includes('confirm') || name.includes('success')) return <CheckCircle2 size={14} />
    if (name.includes('cancel')) return <XCircle size={14} />
    if (name.includes('pending')) return <Clock size={14} />
    return <AlertCircle size={14} />
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-12 w-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 mt-4 font-medium">กำลังโหลดรายการจองของคุณ...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group mb-2">
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-bold">กลับหน้าหลัก</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900">การจองของฉัน</h1>
          <p className="text-slate-500">ตรวจสอบและจัดการรายการจองห้องพักทั้งหมดของคุณ</p>
        </div>

        <div className="relative w-full max-w-xs">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาตามชื่อห้อง หรือสถานะ..."
            className="w-full rounded-2xl border-2 border-slate-100 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold text-rose-900 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-rose-700">{error}</p>
          <button onClick={fetchBookings} className="mt-6 rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white hover:bg-slate-800">ลองใหม่อีกครั้ง</button>
        </div>
      ) : myBookings.length === 0 ? (
        <div className="rounded-[3rem] border-2 border-dashed border-slate-200 p-20 text-center bg-white shadow-sm">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-6">
            <Calendar size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900">คุณยังไม่มีรายการจอง</h3>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">เริ่มต้นประสบการณ์การพักผ่อนที่ยอดเยี่ยมด้วยการเลือกจองห้องพักที่คุณถูกใจ</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-8 py-4 text-base font-bold text-white hover:bg-sky-700 transition-all shadow-lg shadow-sky-100">
            จองห้องพักเลย
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {myBookings.map((booking) => (
            <div key={booking.ID} className="group relative rounded-[2.5rem] border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex flex-col md:flex-row">
                {/* Status Badge (Mobile Only) */}
                <div className="md:hidden absolute top-4 right-4 z-10">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${getStatusColor(booking.Status.Name)} shadow-sm`}>
                    {getStatusIcon(booking.Status.Name)}
                    {booking.Status.Name}
                  </div>
                </div>

                {/* Left Side: Room Summary */}
                <div className="md:w-1/3 relative aspect-[16/9] md:aspect-auto overflow-hidden">
                  <img 
                    src={getRoomImage(booking.Room?.type?.Name)} 
                    alt={booking.Room?.type?.Name || 'Room'} 
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">เลขห้อง: {booking.Room?.Name || '-'}</div>
                    <div className="text-xl font-black text-white">{booking.Room?.type?.Name || 'Unknown Type'}</div>
                  </div>
                </div>

                {/* Right Side: Details */}
                <div className="md:w-2/3 p-8 md:p-10 flex flex-col justify-between gap-8">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="grid grid-cols-2 gap-8 md:gap-12">
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เช็คอิน</div>
                        <div className="text-base font-bold text-slate-900">{formatDateOnly(booking.CheckIn)}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Clock size={12} /> 14:00 น.
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เช็คเอาท์</div>
                        <div className="text-base font-bold text-slate-900">{formatDateOnly(booking.CheckOut)}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Clock size={12} /> 12:00 น.
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:block">
                      <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(booking.Status.Name)}`}>
                        {getStatusIcon(booking.Status.Name)}
                        {booking.Status.Name}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-8 border-t border-slate-100">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3 text-slate-500">
                        <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">ยอดรวมทั้งหมด</div>
                          <div className="text-lg font-black text-slate-900">฿{Number(booking.Room?.type?.Price || 0).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500">
                        <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">สถานที่</div>
                          <div className="text-sm font-bold text-slate-900">Bangkok, TH</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {String(booking.Status.Name).toLowerCase().includes('pending') && (
                        <button 
                          onClick={() => cancelBooking(booking.ID)}
                          className="flex-1 md:flex-none px-6 py-3 rounded-2xl border-2 border-rose-100 text-rose-600 text-sm font-bold hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                        >
                          <XCircle size={18} />
                          ยกเลิกการจอง
                        </button>
                      )}
                      <button className="flex-1 md:flex-none h-12 w-12 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all flex items-center justify-center">
                        <MoreHorizontal size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer Info */}
              <div className="bg-slate-50 px-8 py-3 flex items-center justify-between border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  จองเมื่อ: {formatDateTime(booking.CreatedAt)}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  ID: #{booking.ID.toString().padStart(6, '0')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
