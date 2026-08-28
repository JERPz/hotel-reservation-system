import { Home } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-8xl font-black text-slate-200" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="mt-2 text-slate-500">ขออภัย เราไม่พบหน้าเว็บที่คุณกำลังมองหา</p>

      {/*
        A router Link rather than a bare anchor, so returning home does not trigger a
        full page reload and lose the current session state.
      */}
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-sky-700"
      >
        <Home size={18} aria-hidden="true" />
        กลับหน้าหลัก
      </Link>
    </div>
  )
}
