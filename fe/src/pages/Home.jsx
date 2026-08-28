import { ArrowRight, Clock, LogIn, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { Field } from '../components/Field'
import { RoomTypeCard } from '../components/RoomTypeCard'
import { EmptyState, ErrorState, LoadingState } from '../components/states'
import { useFilteredRoomTypes, useRoomTypes } from '../hooks/useCatalog'
import { HERO_IMAGE, RECEPTION_IMAGE } from '../lib/roomImages'

const FEATURES = [
  {
    icon: Clock,
    title: 'บริการต้อนรับ 24 ชม.',
    description: 'ทีมงานพร้อมดูแลคุณตลอดเวลา ไม่ว่าจะมาถึงกี่โมง',
    tone: 'bg-amber-50 text-amber-600',
  },
  {
    icon: ShieldCheck,
    title: 'จองอย่างมั่นใจ',
    description: 'ตรวจสอบห้องว่างแบบเรียลไทม์ และยกเลิกฟรีก่อนวันเข้าพัก',
    tone: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Sparkles,
    title: 'ห้องพักหลากหลายสไตล์',
    description: 'ตั้งแต่ห้องเดี่ยวกะทัดรัด ไปจนถึงห้องสวีทพร้อมวิวเมือง',
    tone: 'bg-sky-50 text-sky-600',
  },
]

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { roomTypes, loading, error, reload } = useRoomTypes()
  const [search, setSearch] = useState('')

  const filtered = useFilteredRoomTypes(roomTypes, search)

  return (
    <div className="space-y-16 pb-10">
      <Hero isAuthenticated={isAuthenticated} />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3" aria-label="จุดเด่นของที่พัก">
        {FEATURES.map(({ icon: Icon, title, description, tone }) => (
          <article
            key={title}
            className="group flex items-center gap-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${tone}`}
            >
              <Icon size={28} aria-hidden="true" />
            </span>
            <span>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            </span>
          </article>
        ))}
      </section>

      <section className="space-y-8">
        <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-sky-600">
              <span className="h-1 w-8 rounded-full bg-sky-600" aria-hidden="true" />
              ห้องพักของเรา
            </p>
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">ค้นหาห้องพักที่ใช่สำหรับคุณ</h2>
          </div>

          <Field
            icon={Search}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาตามชื่อห้อง หรือคำอธิบาย..."
            aria-label="ค้นหาห้องพัก"
            className="w-full max-w-md"
            inputClassName="bg-white"
          />
        </header>

        {loading ? (
          <LoadingState label="กำลังโหลดข้อมูลห้องพัก..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={search ? 'ไม่พบห้องพักที่ค้นหา' : 'ยังไม่มีห้องพักให้จอง'}
            message={
              search
                ? 'ลองใช้คำค้นหาอื่น หรือล้างตัวกรองเพื่อดูห้องพักทั้งหมด'
                : 'กรุณากลับมาตรวจสอบอีกครั้งในภายหลัง'
            }
            action={
              search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="font-bold text-sky-600 underline decoration-2 underline-offset-4 hover:text-sky-700"
                >
                  แสดงห้องพักทั้งหมด
                </button>
              ) : null
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((roomType, index) => (
              <RoomTypeCard key={roomType.id} roomType={roomType} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Hero({ isAuthenticated }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-900 text-white shadow-2xl">
      <div className="absolute inset-0 opacity-40">
        <img src={HERO_IMAGE} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        <div
          className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="relative grid grid-cols-1 items-center gap-12 p-8 md:p-16 lg:grid-cols-2 lg:p-20">
        <div className="space-y-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-200 backdrop-blur-md">
            <Sparkles size={14} aria-hidden="true" /> ยินดีต้อนรับสู่ 30Rooms
          </p>

          <div className="space-y-4">
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
              พักผ่อนอย่าง
              <br />
              <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                สะดวกและสบายใจ
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-300 md:text-xl">
              เลือกห้องพักที่ถูกใจ ตรวจสอบวันว่างได้ทันที และจองเสร็จในไม่กี่ขั้นตอน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/my-bookings"
                className="group inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-sky-900/20 transition-all duration-300 hover:bg-sky-500"
              >
                ดูการจองของฉัน
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-sky-900/20 transition-all duration-300 hover:bg-sky-500"
                >
                  เริ่มต้นใช้งาน
                  <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20"
                >
                  <LogIn size={20} aria-hidden="true" />
                  เข้าสู่ระบบ
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div
            className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
            <img src={RECEPTION_IMAGE} alt="ล็อบบี้และเคาน์เตอร์ต้อนรับของโรงแรม" className="h-[420px] w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent p-8">
              <p className="mb-2 flex items-center gap-3 text-sky-300">
                <MapPin size={18} aria-hidden="true" />
                <span className="text-sm font-bold uppercase tracking-widest">กรุงเทพมหานคร</span>
              </p>
              <p className="text-2xl font-bold text-white">ล็อบบี้และเคาน์เตอร์ต้อนรับ</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
