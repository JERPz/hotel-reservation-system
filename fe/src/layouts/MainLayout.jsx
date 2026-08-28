import { Outlet } from 'react-router-dom'

import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'

/**
 * Shell shared by every page.
 *
 * The navbar renders unconditionally. Previously it was gated on being signed in,
 * so anonymous visitors browsing the catalogue had no navigation at all.
 *
 * The skip link gives keyboard users a way past the navigation on every page.
 */
export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-sky-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>

      <Navbar />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
