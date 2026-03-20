import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { useAuth } from '../controllers/useAuth'
import { useAvailability } from '../controllers/useAvailability'
import { useRoomTypes } from '../controllers/useRoomTypes'
import { api } from '../services/api'
import { Calendar, Users, CreditCard, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft, Info, MapPin, Star } from 'lucide-react'
import singleImage1 from '../assets/pic/single_1.png'
import singleImage2 from '../assets/pic/single_2.png'
import singleImage3 from '../assets/pic/single_3.png'
import doubleImage1 from '../assets/pic/double_1.png'
import doubleImage2 from '../assets/pic/double_2.png'
import doubleImage3 from '../assets/pic/double_3.png'
import suiteImage1 from '../assets/pic/suite_1.png'
import suiteImage2 from '../assets/pic/suite_2.png'
import suiteImage3 from '../assets/pic/suite_3.png'
import toast from 'react-hot-toast'

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
  const [success, setSuccess] = useState(false)

  const pageLoading = rtLoading || avLoading
  const pageError = rtError || avError

  async function onPay() {
    if (!isAuthed) {
      const currentPath = location.pathname + location.search
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`)
      return
    }

    if (availableRooms.length < qty) {
      toast.error('ขออภัย ห้องพักเต็มในวันที่เลือก')
      return
    }

    setPaying(true)
    const toastId = toast.loading('กำลังประมวลผลการจอง...')
    try {
      const roomIds = availableRooms.slice(0, qty).map((r) => r.ID)
      await api.createBooking({
        user_id: Number(user?.ID),
        check_in: checkIn,
        check_out: checkOut,
        room_ids: roomIds,
      })
      toast.success('จองห้องพักสำเร็จ!', { id: toastId })
      setSuccess(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err), { id: toastId })
    } finally {
      setPaying(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
          <CheckCircle2 size={64} />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900">การจองสำเร็จ!</h1>
          <p className="text-lg text-slate-500 max-w-md mx-auto">
            เราได้รับข้อมูลการจองของคุณเรียบร้อยแล้ว คุณสามารถตรวจสอบรายละเอียดการจองได้ที่เมนู "การจองของฉัน"
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
          <Link to="/my-bookings" className="rounded-2xl bg-slate-900 px-8 py-4 text-base font-bold text-white hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
            ดูการจองของฉัน
          </Link>
          <Link to="/" className="rounded-2xl border-2 border-slate-200 px-8 py-4 text-base font-bold text-slate-600 hover:bg-slate-50 transition-all">
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    )
  }

  if (!typeId || !checkIn || !checkOut) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4">
          <Info size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">ข้อมูลการจองไม่ครบถ้วน</h2>
        <p className="text-slate-500 mt-2">กรุณาเลือกประเภทห้องและวันที่จองใหม่</p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-sky-600 px-6 py-2 text-sm font-bold text-white hover:bg-sky-700">กลับไปเลือกห้อง</Link>
      </div>
    )
  }

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-12 w-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 mt-4 font-medium">กำลังเตรียมข้อมูลการจอง...</p>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-rose-900">เกิดข้อผิดพลาด</h2>
        <p className="text-rose-700 mt-2">{pageError}</p>
        <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white hover:bg-slate-800">ลองใหม่อีกครั้ง</button>
      </div>
    )
  }

  if (!roomType) return null

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group mb-2">
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-bold">ย้อนกลับ</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900">ยืนยันการจองห้องพัก</h1>
          <p className="text-slate-500">กรุณาตรวจสอบข้อมูลการจองของคุณก่อนทำการชำระเงิน</p>
        </div>
        
        <div className="hidden md:flex items-center gap-4 text-sm font-bold text-slate-400">
          <div className="flex items-center gap-2 text-sky-600">
            <div className="h-8 w-8 rounded-full bg-sky-600 text-white flex items-center justify-center">1</div>
            ตรวจสอบข้อมูล
          </div>
          <div className="h-px w-8 bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-slate-200 flex items-center justify-center">2</div>
            การจองสำเร็จ
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Booking Details */}
        <div className="lg:col-span-2 space-y-8">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3 aspect-[4/3] md:aspect-auto relative overflow-hidden">
                <img src={getRoomImage(roomType.Name)} alt={roomType.Name} className="h-full w-full object-cover" />
              </div>
              <div className="p-8 md:w-2/3 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{roomType.Name}</h2>
                    <div className="flex items-center gap-3 text-sky-600 text-sm font-bold mt-1">
                      <MapPin size={14} />
                      <span>30Rooms Hotel, Bangkok</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star size={16} className="fill-amber-500" />
                    4.8
                  </div>
                </div>
                
                <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
                  {roomType.Description}
                </p>

                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เช็คอิน</div>
                    <div className="text-base font-bold text-slate-900">{new Date(checkIn).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div className="text-xs text-slate-500">หลัง 14:00 น.</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เช็คเอาท์</div>
                    <div className="text-base font-bold text-slate-900">{new Date(checkOut).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div className="text-xs text-slate-500">ก่อน 12:00 น.</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {!isAuthed && (
            <div className="rounded-3xl border border-sky-100 bg-sky-50/50 p-6 flex items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                <Info size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">กรุณาเข้าสู่ระบบ</h3>
                <p className="text-slate-600 text-sm mt-1">
                  คุณต้องเข้าสู่ระบบก่อนทำการจองห้องพัก เพื่อรับคำยืนยันและการจัดการการจองที่ง่ายขึ้น
                </p>
                <Link 
                  to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
                  className="mt-4 inline-block text-sky-600 font-bold text-sm underline underline-offset-4 decoration-2"
                >
                  เข้าสู่ระบบตอนนี้
                </Link>
              </div>
            </div>
          )}

          <section className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <div className="h-6 w-1.5 bg-sky-600 rounded-full" />
              สรุปข้อมูลการจอง
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
                  <Calendar size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">ระยะเวลาการเข้าพัก</div>
                  <div className="text-base font-bold text-slate-900">{nights} คืน</div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">จำนวนห้อง</div>
                  <div className="text-base font-bold text-slate-900">{qty} ห้อง</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Payment Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/50 space-y-8">
            <h3 className="text-xl font-black text-slate-900">สรุปค่าใช้จ่าย</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>ค่าห้องพัก ({nights} คืน)</span>
                <span>฿{(unitPrice * nights).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>จำนวนห้อง ({qty} ห้อง)</span>
                <span>x {qty}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium pt-4 border-t border-slate-100">
                <span>ภาษีและค่าบริการ</span>
                <span className="text-emerald-600 font-bold">ฟรี</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-slate-900 pt-4 border-t-2 border-slate-50">
                <span>ยอดรวมทั้งหมด</span>
                <span className="text-sky-600">฿{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-widest">
                  <CreditCard size={14} /> วิธีการชำระเงิน
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-900">
                  <div className="h-8 w-12 rounded bg-white border border-slate-200 flex items-center justify-center text-xs text-sky-600 italic">VISA</div>
                  ชำระเงิน ณ ที่พัก
                </div>
              </div>

              <Button 
                className="w-full py-5 rounded-2xl text-lg font-black shadow-xl shadow-sky-100 flex items-center justify-center gap-3"
                onClick={onPay}
                disabled={paying}
              >
                {paying ? 'กำลังประมวลผล...' : (isAuthed ? 'ยืนยันการจอง' : 'เข้าสู่ระบบเพื่อจอง')}
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                ข้อมูลของคุณปลอดภัย 100%
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                ยกเลิกฟรี 24 ชม. ก่อนเข้าพัก
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
