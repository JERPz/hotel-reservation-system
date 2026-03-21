import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import { useAvailability } from '../controllers/useAvailability'
import { useRoomTypes } from '../controllers/useRoomTypes'
import { Calendar as CalendarIcon, Users, CheckCircle2, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Star, Wifi, Coffee, Tv, Wind, Shield } from 'lucide-react'
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

function toYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toDmyYY(ymd) {
  if (!ymd) return ''
  const [y, m, d] = String(ymd).split('-')
  if (!y || !m || !d) return String(ymd)
  return `${d}/${m}/${String(y).slice(-2)}`
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function nightsBetween(checkIn, checkOut) {
  const a = new Date(checkIn)
  const b = new Date(checkOut)
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  const diff = b.getTime() - a.getTime()
  return diff > 0 ? Math.round(diff / (1000 * 60 * 60 * 24)) : 0
}

const roomImageMap = {
  single: [singleImage1, singleImage2, singleImage3],
  double: [doubleImage1, doubleImage2, doubleImage3],
  suite: [suiteImage1, suiteImage2, suiteImage3],
}

function getRoomImages(roomName) {
  if (!roomName) return [singleImage1]
  const lowerName = String(roomName).toLowerCase()
  if (lowerName.includes('double')) return roomImageMap.double
  if (lowerName.includes('suite')) return roomImageMap.suite
  return roomImageMap.single
}

export default function RoomDetail() {
  const { typeId } = useParams()
  const navigate = useNavigate()

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [checkIn, setCheckIn] = useState(() => toYmd(today))
  const [checkOut, setCheckOut] = useState(() => toYmd(addDays(today, 1)))
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())

  const { roomTypes, loading: rtLoading, error: rtError } = useRoomTypes()
  const roomType = useMemo(() => roomTypes.find((rt) => String(rt.ID) === String(typeId)) || null, [roomTypes, typeId])
  const images = useMemo(() => getRoomImages(roomType?.Name), [roomType])

  const { availableRooms, monthDays, loading, error } = useAvailability({ typeId, checkIn, checkOut, month: calendarMonth })

  const nights = nightsBetween(checkIn, checkOut)
  const maxQty = Math.max(availableRooms.length, 1)
  const monthDaysMap = useMemo(() => new Map(monthDays.map((d) => [d.date, d.availableCount])), [monthDays])
  const monthStart = useMemo(() => {
    const d = new Date(calendarMonth)
    d.setHours(0, 0, 0, 0)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }, [calendarMonth])
  const daysInMonth = useMemo(() => new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate(), [monthStart])
  const leadingBlanks = useMemo(() => new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).getDay(), [monthStart])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % images.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [images])

  const handleBook = () => {
    if (availableRooms.length === 0) {
      toast.error('ขออภัย ห้องพักเต็มในวันที่เลือก')
      return
    }
    navigate(`/booking?typeId=${typeId}&checkIn=${checkIn}&checkOut=${checkOut}&qty=${qty}`)
  }

  if (rtLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-12 w-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 mt-4 font-medium">กำลังโหลดรายละเอียดห้องพัก...</p>
      </div>
    )
  }

  if (rtError || error) {
    return (
      <div className="mx-auto max-w-2xl mt-12 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-xl font-bold text-rose-900 mb-2">เกิดข้อผิดพลาด</h2>
        <p className="text-rose-700">{rtError || error}</p>
        <button onClick={() => navigate(-1)} className="mt-6 rounded-xl bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto">
          <ArrowLeft size={16} /> กลับไปก่อนหน้า
        </button>
      </div>
    )
  }

  if (!roomType) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-700">ไม่พบประเภทห้อง</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group">
        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
        <span className="text-sm font-bold">กลับไปหน้าหลัก</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Images & Info */}
        <div className="lg:col-span-2 space-y-10">
          <section className="space-y-6">
            <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-100 aspect-[16/9] shadow-2xl">
              <img src={images[activeImage]} alt={roomType.Name} className="h-full w-full object-cover transition-opacity duration-700" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              
              <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
                    <Star size={14} className="fill-white" /> Recommended
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-white">{roomType.Name}</h1>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveImage((prev) => (prev - 1 + images.length) % images.length)}
                    className="h-12 w-12 rounded-2xl bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-all"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={() => setActiveImage((prev) => (prev + 1) % images.length)}
                    className="h-12 w-12 rounded-2xl bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-all"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>

              <div className="absolute top-8 left-8 flex gap-2">
                {images.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveImage(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${activeImage === i ? 'w-8 bg-white' : 'w-4 bg-white/40'}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Wifi, label: 'Free High Speed Wi-Fi' },
                { icon: Coffee, label: 'Complimentary Coffee' },
                { icon: Tv, label: 'Smart TV & Netflix' },
                { icon: Wind, label: 'Air Conditioning' }
              ].map((amenity, i) => (
                <div key={i} className="flex flex-col items-center gap-3 p-6 rounded-3xl border border-slate-100 bg-white hover:border-sky-100 hover:bg-sky-50/30 transition-all text-center">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
                    <amenity.icon size={24} />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{amenity.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="h-8 w-1.5 bg-sky-600 rounded-full" />
              รายละเอียดห้องพัก
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed max-w-3xl">
              {roomType.Description}. ห้องพักที่ได้รับการออกแบบอย่างพิถีพิถัน ผสมผสานความทันสมัยและความสะดวกสบายเข้าด้วยกันอย่างลงตัว พร้อมวิวที่สวยงามและการตกแต่งระดับพรีเมียมที่จะทำให้การพักผ่อนของคุณน่าจดจำ
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                'เช็คอิน: 14:00 น. | เช็คเอาท์: 12:00 น.',
                'รูมเซอร์วิสตลอด 24 ชั่วโมง',
                'สระว่ายน้ำและฟิตเนสส่วนกลาง',
                'บริการทำความสะอาดทุกวัน'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-600 font-medium">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Booking Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/50 space-y-8">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">ราคาต่อคืน</div>
                <div className="text-4xl font-black text-slate-900">฿{Number(roomType.Price).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star size={16} className="fill-amber-500" />
                  4.8
                </div>
                <div className="text-xs text-slate-400 font-medium">(120+ รีวิว)</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Check-In</label>
                  <div className="relative">
                    <CalendarIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      type="date" 
                      value={checkIn} 
                      onChange={(e) => {
                        const nextCheckIn = e.target.value
                        setCheckIn(nextCheckIn)
                        const nextOut = addDays(new Date(nextCheckIn), 1)
                        setCheckOut(toYmd(nextOut))
                      }}
                      min={toYmd(today)}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-bold text-transparent caret-transparent focus:border-sky-500 focus:bg-white focus:outline-none transition-all cursor-pointer" 
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-11 right-4 flex items-center text-sm font-bold text-slate-900">
                      {toDmyYY(checkIn)}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Check-Out</label>
                  <div className="relative">
                    <CalendarIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      type="date" 
                      value={checkOut} 
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={toYmd(addDays(new Date(checkIn), 1))}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-bold text-transparent caret-transparent focus:border-sky-500 focus:bg-white focus:outline-none transition-all cursor-pointer" 
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-11 right-4 flex items-center text-sm font-bold text-slate-900">
                      {toDmyYY(checkOut)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                  จำนวนห้องพัก
                  <span className="text-sky-600 font-bold">ว่าง {availableRooms.length} ห้อง</span>
                </label>
                <div className="relative">
                  <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select 
                    value={qty} 
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-bold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none transition-all cursor-pointer appearance-none"
                  >
                    {[...Array(maxQty)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1} ห้อง</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>฿{Number(roomType.Price).toLocaleString()} x {nights} คืน</span>
                <span>฿{(roomType.Price * nights).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>จำนวน {qty} ห้อง</span>
                <span>x {qty}</span>
              </div>
              <div className="flex justify-between text-xl font-black text-slate-900 pt-2">
                <span>ยอดรวมทั้งหมด</span>
                <span className="text-sky-600">฿{(roomType.Price * nights * qty).toLocaleString()}</span>
              </div>
            </div>

            <Button 
              className="w-full py-5 rounded-2xl text-lg font-black shadow-xl shadow-sky-100 flex items-center justify-center gap-3"
              disabled={availableRooms.length === 0}
              onClick={handleBook}
            >
              {availableRooms.length === 0 ? 'ขออภัย ห้องเต็ม' : 'จองทันที'}
              <ArrowLeft size={20} className="rotate-180" />
            </Button>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
              <Shield size={24} className="text-slate-400 shrink-0" />
              <div>
                การจองที่ปลอดภัย <br />
                พร้อมการรับประกันราคาที่ดีที่สุด
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Availability Grid */}
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="h-8 w-1.5 bg-sky-600 rounded-full" />
            ปฏิทินห้องว่าง
          </h2>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-sm font-black text-slate-700 uppercase tracking-widest">
              {monthStart.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1
            const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day)
            d.setHours(0, 0, 0, 0)
            const ymd = toYmd(d)
            const availableCount = monthDaysMap.get(ymd) ?? 0
            const isPast = d < today
            const label = availableCount > 0 ? `ว่าง ${availableCount}` : 'เต็ม'
            const pill = availableCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            const card = isPast ? 'opacity-50' : ''

            return (
              <div
                key={ymd}
                className={`rounded-2xl border border-slate-100 bg-white p-4 flex flex-col items-center gap-2 shadow-sm ${card}`}
              >
                <div className="text-sm font-bold text-slate-900">{day}</div>
                <div className={`mt-1 text-xs font-black px-2 py-0.5 rounded-full ${pill}`}>{label}</div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
