import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRoomTypes } from '../controllers/useRoomTypes'
import { useAuth } from '../controllers/useAuth'
import HotelCard from '../components/HotelCard'
import { Search, MapPin, Sparkles, ShieldCheck, Clock, ArrowRight, LogIn } from 'lucide-react'
import frontsideImage from '../assets/pic/frontside.png'
import receptionImage from '../assets/pic/reception.png'
import singleImage1 from '../assets/pic/single_1.png'
import singleImage2 from '../assets/pic/single_2.png'
import singleImage3 from '../assets/pic/single_3.png'
import doubleImage1 from '../assets/pic/double_1.png'
import doubleImage2 from '../assets/pic/double_2.png'
import doubleImage3 from '../assets/pic/double_3.png'
import suiteImage1 from '../assets/pic/suite_1.png'
import suiteImage2 from '../assets/pic/suite_2.png'
import suiteImage3 from '../assets/pic/suite_3.png'

const imageMap = {
  single: [singleImage1, singleImage2, singleImage3],
  double: [doubleImage1, doubleImage2, doubleImage3],
  suite: [suiteImage1, suiteImage2, suiteImage3],
}

function getRoomImage(roomType, idx) {
  const key = String(roomType || '').toLowerCase()
  const list = imageMap[key] || imageMap.single
  return list[idx % list.length]
}

export default function Home() {
  const { isAuthed } = useAuth()
  const { roomTypes, loading, error } = useRoomTypes()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return roomTypes
    const q = search.toLowerCase()
    return roomTypes.filter((r) => `${r.Name} ${r.Description}`.toLowerCase().includes(q))
  }, [roomTypes, search])

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูลห้องพัก...</p>
      </div>
    </div>
  )
  
  if (error) return (
    <div className="mx-auto max-w-2xl mt-12 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
        <ShieldCheck size={24} />
      </div>
      <h2 className="text-xl font-bold text-rose-900 mb-2">เกิดข้อผิดพลาด</h2>
      <p className="text-rose-700">{error}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-6 rounded-xl bg-rose-600 px-6 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
      >
        ลองใหม่อีกครั้ง
      </button>
    </div>
  )

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-900 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-40">
          <img src={frontsideImage} alt="Hero Background" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent" />
        </div>
        
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center p-8 md:p-16 lg:p-20">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/20 border border-sky-500/30 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-300 backdrop-blur-md">
              <Sparkles size={14} className="animate-pulse" /> Welcome to 30Rooms
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
                Experience <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Luxury & Comfort</span>
              </h1>
              <p className="text-slate-300 text-lg md:text-xl max-w-xl leading-relaxed">
                สัมผัสประสบการณ์การพักผ่อนที่เหนือระดับ กับห้องพักหลากหลายสไตล์ที่ออกแบบมาเพื่อคุณโดยเฉพาะ จองง่าย รวดเร็ว พร้อมบริการระดับพรีเมียม
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {!isAuthed ? (
                <>
                  <Link to="/signup" className="group rounded-2xl bg-sky-600 px-8 py-4 text-base font-bold text-white hover:bg-sky-500 transition-all duration-300 shadow-lg shadow-sky-900/20 flex items-center gap-2">
                    เริ่มต้นใช้งาน
                    <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link to="/login" className="group rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 text-base font-bold text-white hover:bg-white/20 transition-all duration-300 flex items-center gap-2">
                    <LogIn size={20} />
                    เข้าสู่ระบบ
                  </Link>
                </>
              ) : (
                <Link to="/my-bookings" className="group rounded-2xl bg-sky-600 px-8 py-4 text-base font-bold text-white hover:bg-sky-500 transition-all duration-300 shadow-lg shadow-sky-900/20 flex items-center gap-2">
                  ดูการจองของฉัน
                  <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                </Link>
              )}
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                    <img src={getRoomImage('single', i)} alt="User" className="h-full w-full object-cover" />
                  </div>
                ))}
                <div className="h-10 w-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                  +500
                </div>
              </div>
              <div className="text-sm text-slate-400 font-medium">
                <span className="text-white font-bold block">500+ Happy Guests</span>
                Joined us this month
              </div>
            </div>
          </div>

          <div className="hidden lg:block relative">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 blur-2xl" />
            <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
              <img src={receptionImage} alt="Featured" className="h-[450px] w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent p-8">
                <div className="flex items-center gap-3 text-sky-400 mb-2">
                  <MapPin size={18} />
                  <span className="text-sm font-bold tracking-widest uppercase">Bangkok, Thailand</span>
                </div>
                <div className="text-2xl font-bold text-white">Luxury Lobby & Reception</div>
                <div className="text-slate-300 text-sm mt-1">Modern, Boutique and Cozy spaces</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Clock, title: 'บริการต้อนรับ 24 ชม.', desc: 'ทีมงานมืออาชีพพร้อมดูแลคุณตลอดเวลา', color: 'bg-amber-50 text-amber-600' },
          { icon: ShieldCheck, title: 'ความปลอดภัยสูงสุด', desc: 'ระบบรักษาความปลอดภัยและกล้องวงจรปิด 24 ชม.', color: 'bg-emerald-50 text-emerald-600' },
          { icon: Sparkles, title: '4 สไตล์ห้องพัก', desc: 'Modern, Luxury, Boutique และ Cozy', color: 'bg-sky-50 text-sky-600' }
        ].map((feat, i) => (
          <div key={i} className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-5">
            <div className={`h-14 w-14 shrink-0 rounded-2xl ${feat.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
              <feat.icon size={28} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">{feat.title}</div>
              <div className="text-sm text-slate-500 mt-0.5">{feat.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Room Selection Header */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sky-600 font-bold text-sm tracking-widest uppercase">
              <div className="h-1 w-8 bg-sky-600 rounded-full" />
              Room Selection
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">ค้นหาห้องพักที่ใช่สำหรับคุณ</h2>
          </div>
          
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาตามชื่อห้อง หรือคำอธิบาย..."
              className="w-full rounded-2xl border-2 border-slate-100 bg-white py-4 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Room Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filtered.map((roomType, idx) => (
              <HotelCard
                key={roomType.ID}
                roomType={roomType}
                image={getRoomImage(roomType.Name, idx)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-4">
              <Search size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">ไม่พบห้องพักที่ค้นหา</h3>
            <p className="text-slate-500 mt-2">ลองใช้คำค้นหาอื่น หรือล้างตัวกรองเพื่อดูห้องพักทั้งหมด</p>
            <button 
              onClick={() => setSearch('')}
              className="mt-6 text-sky-600 font-bold hover:text-sky-700 underline underline-offset-4"
            >
              แสดงห้องพักทั้งหมด
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
