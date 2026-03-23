import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import Button from '../components/Button'
import { LayoutDashboard, Users, Calendar, CheckCircle2, Clock, XCircle, AlertCircle, ArrowLeft, MoreHorizontal, Search, TrendingUp, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

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

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([])
  const [users, setUsers] = useState([])
  const [roomTypes, setRoomTypes] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [bookingsData, usersData, roomTypesData, statusesData] = await Promise.all([
        api.getBookings(), 
        api.getUsers(), 
        api.getRoomTypes(), 
        api.getBookingStatuses()
      ])
      setBookings(Array.isArray(bookingsData) ? bookingsData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setRoomTypes(Array.isArray(roomTypesData) ? roomTypesData : [])
      setStatuses(Array.isArray(statusesData) ? statusesData : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => String(b?.Status?.Name || '').toLowerCase().includes('pending')).length
    const confirmed = bookings.filter((b) => String(b?.Status?.Name || '').toLowerCase().includes('confirmed')).length
    const canceled = bookings.filter((b) => String(b?.Status?.Name || '').toLowerCase().includes('cancel')).length
    const revenue = bookings
      .filter(b => !String(b?.Status?.Name || '').toLowerCase().includes('cancel'))
      .reduce((acc, b) => acc + (Number(b.Room?.type?.Price) || 0), 0)
    
    return { total: bookings.length, pending, confirmed, canceled, users: users.length, revenue }
  }, [bookings, users])

  const filteredBookings = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => String(b?.CreatedAt || '').localeCompare(String(a?.CreatedAt || '')))
    if (!search.trim()) return sorted
    const q = search.toLowerCase()
    return sorted.filter(b => 
      String(b.ID).includes(q) ||
      (b.User?.FirstName + ' ' + b.User?.LastName).toLowerCase().includes(q) ||
      b.Room?.Name.toLowerCase().includes(q) ||
      b.Status?.Name.toLowerCase().includes(q)
    )
  }, [bookings, search])

  async function onUpdateBooking(id, statusName) {
    const status = statuses.find((s) => String(s.Name).toLowerCase().includes(statusName))
    if (!status) return
    
    const toastId = toast.loading('กำลังอัปเดตสถานะ...')
    try {
      await api.updateBooking({ id, status_id: Number(status.ID) })
      setBookings((prev) => prev.map((b) => (b.ID === id ? { ...b, Status: { ...b.Status, Name: status.Name } } : b)))
      toast.success('อัปเดตสถานะสำเร็จ', { id: toastId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err), { id: toastId })
    }
  }

  const getStatusColor = (statusName) => {
    const name = String(statusName || '').toLowerCase()
    if (name.includes('confirm') || name.includes('success')) return 'bg-emerald-50 text-emerald-600 border-emerald-100'
    if (name.includes('cancel')) return 'bg-rose-50 text-rose-600 border-rose-100'
    if (name.includes('pending')) return 'bg-amber-50 text-amber-600 border-amber-100'
    return 'bg-slate-50 text-slate-600 border-slate-100'
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-12 w-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 mt-4 font-medium">กำลังโหลดข้อมูลแผงควบคุม...</p>
    </div>
  )

  if (error) return (
    <div className="mx-auto max-w-2xl mt-12 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
        <AlertCircle size={24} />
      </div>
      <h2 className="text-xl font-bold text-rose-900 mb-2">เกิดข้อผิดพลาด</h2>
      <p className="text-rose-700">{error}</p>
      <button onClick={fetchData} className="mt-6 rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white hover:bg-slate-800">ลองใหม่อีกครั้ง</button>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group mb-2">
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-bold">กลับหน้าหลัก</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <LayoutDashboard size={28} />
            </div>
            แผงควบคุมแอดมิน
          </h1>
          <p className="text-slate-500">จัดการการจอง, ตรวจสอบผู้ใช้ และดูแลระบบทั้งหมด</p>
        </div>

        <div className="relative w-full max-w-xs">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาการจอง..."
            className="w-full rounded-2xl border-2 border-slate-100 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'ผู้ใช้ทั้งหมด', value: stats.users, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'การจองทั้งหมด', value: stats.total, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'ยอดจองที่ยืนยัน', value: stats.confirmed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'รายได้รวม (ประมาณ)', value: `฿${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <div key={i} className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className={`h-14 w-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <stat.icon size={28} />
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
            <div className={`text-3xl font-black ${stat.color} mt-1`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Booking Management Table */}
      <div className="rounded-[2.5rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">รายการจองล่าสุด</h2>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100">
              <Clock size={12} /> Pending: {stats.pending}
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-4">ID</th>
                <th className="px-8 py-4">ผู้เข้าพัก</th>
                <th className="px-8 py-4">ห้อง / ประเภท</th>
                <th className="px-8 py-4">เช็คอิน - เช็คเอาท์</th>
                <th className="px-8 py-4">สถานะ</th>
                <th className="px-8 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={40} className="text-slate-200" />
                      <p className="text-slate-500 font-medium">ไม่พบข้อมูลการจองที่ต้องการ</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.ID} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 font-bold text-slate-400 text-xs">#{booking.ID.toString().padStart(5, '0')}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-black text-xs">
                          {(booking.User?.FirstName || 'U').charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{booking.User?.FirstName} {booking.User?.LastName}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{booking.User?.Email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-slate-900">ห้อง {booking.Room?.Name || '-'}</div>
                      <div className="text-[10px] text-sky-600 font-black uppercase tracking-widest">{booking.Room?.type?.Name || 'Unknown'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-slate-900">
                        {formatDateOnly(booking.CheckIn)} - {formatDateOnly(booking.CheckOut)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">จองเมื่อ {formatDateTime(booking.CreatedAt)}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(booking.Status?.Name)}`}>
                        {String(booking.Status?.Name).toLowerCase().includes('pending') && <Clock size={12} />}
                        {String(booking.Status?.Name).toLowerCase().includes('confirm') && <CheckCircle2 size={12} />}
                        {String(booking.Status?.Name).toLowerCase().includes('cancel') && <XCircle size={12} />}
                        {booking.Status?.Name}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {String(booking.Status?.Name).toLowerCase().includes('pending') && (
                          <>
                            <button 
                              onClick={() => onUpdateBooking(booking.ID, 'confirm')}
                              className="h-9 px-4 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                            >
                              ยืนยัน
                            </button>
                            <button 
                              onClick={() => onUpdateBooking(booking.ID, 'cancel')}
                              className="h-9 px-4 rounded-xl border-2 border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </>
                        )}
                        <button className="h-9 w-9 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all flex items-center justify-center">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900">ลูกค้าล่าสุด</h2>
            <Users size={20} className="text-slate-400" />
          </div>
          <ul className="space-y-4">
            {users.slice(0, 8).map((user) => (
              <li key={user.ID} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white text-slate-900 flex items-center justify-center font-black text-xs border border-slate-100">
                    {user.FirstName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{user.FirstName} {user.LastName}</div>
                    <div className="text-[10px] text-slate-500">{user.Email}</div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-100">
                  {user.Role?.Name || 'user'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900">ประเภทห้องพัก</h2>
            <Calendar size={20} className="text-slate-400" />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {roomTypes.map((type) => (
              <div key={type.ID} className="rounded-2xl border-2 border-slate-50 p-5 flex items-center justify-between hover:border-sky-100 hover:bg-sky-50/30 transition-all">
                <div>
                  <div className="text-sm font-black text-slate-900">{type.Name}</div>
                  <div className="text-xs font-bold text-sky-600 mt-1">฿{type.Price.toLocaleString()} / คืน</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนห้อง</div>
                  <div className="text-xl font-black text-slate-900">{type.RoomsCount ?? '0'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
