import { Hotel, Mail, MapPin, Phone } from 'lucide-react'

/** Site footer with contact details and hotel policy times. */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white">
              <Hotel size={20} aria-hidden="true" />
            </span>
            <span>
              <span className="text-sky-600">30</span>Rooms
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-500">
            ที่พักใจกลางกรุงเทพฯ พร้อมห้องพักหลากหลายสไตล์ และบริการที่ใส่ใจในทุกรายละเอียด
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">ติดต่อเรา</h2>
          <ul className="space-y-2 text-sm text-slate-500">
            <li className="flex items-center gap-2">
              <MapPin size={16} className="text-slate-400" aria-hidden="true" />
              กรุงเทพมหานคร ประเทศไทย
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="text-slate-400" aria-hidden="true" />
              <a href="tel:+6620000000" className="hover:text-sky-600">
                02-000-0000
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} className="text-slate-400" aria-hidden="true" />
              <a href="mailto:hello@30rooms.example" className="hover:text-sky-600">
                hello@30rooms.example
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">เวลาเข้าพัก</h2>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>เช็คอิน: 14:00 น. เป็นต้นไป</li>
            <li>เช็คเอาท์: ก่อน 12:00 น.</li>
            <li>เคาน์เตอร์ต้อนรับเปิด 24 ชั่วโมง</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-6 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} 30Rooms. สงวนลิขสิทธิ์.
      </div>
    </footer>
  )
}
