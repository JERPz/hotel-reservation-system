import HotelCard from '../components/HotelCard'
import { useRoomTypes } from '../controllers/useRoomTypes'

export default function Home() {
  const { roomTypes, loading, error } = useRoomTypes()
  const data = roomTypes

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-700">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">{error}</div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-700">ไม่พบข้อมูลประเภทห้อง</div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-white border border-slate-200 p-6">
        <h1 className="text-2xl font-semibold">Welcome to our Hotel</h1>
        <p className="text-slate-600 mt-3 leading-relaxed">
          โรงแรมของเราตั้งอยู่ใจกลางเมือง พร้อมบริการที่ใส่ใจในรายละเอียด เหมาะทั้งทริปพักผ่อนและทริปทำงาน
          เรามีห้องพักหลายประเภทให้เลือก และระบบจองที่ใช้งานง่ายผ่านเว็บไซต์
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Room Types</h2>
            <p className="text-slate-600 text-sm mt-1">เลือกดูรายละเอียดของห้องแต่ละประเภทได้จากรายการด้านล่าง</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((rt) => (
            <HotelCard key={rt.ID} roomType={rt} />
          ))}
        </div>
      </section>
    </div>
  )
}
