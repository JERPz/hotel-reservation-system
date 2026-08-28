import {
  CalendarCheck,
  Hotel,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  UserPlus,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { cn } from '../lib/cn'

/**
 * Primary navigation.
 *
 * Always rendered, for signed-in and anonymous visitors alike. The layout used to
 * mount it only when authenticated, which left the public catalogue and room detail
 * pages with no navigation at all — a first-time visitor could reach a room page
 * and then had no way back except the browser button.
 */

const linkClass = ({ isActive }) =>
  cn(
    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
    isActive ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  )

export function Navbar() {
  const { user, isAuthenticated, isAdmin, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // The mobile menu closes from the link handlers below rather than from an effect
  // watching the location. Reacting to navigation would mean rendering the new page
  // once with the menu still open, then again to close it.
  const closeMenu = () => setMenuOpen(false)

  const links = [
    { to: '/', label: 'หน้าแรก', icon: Hotel, end: true },
    ...(isAuthenticated ? [{ to: '/my-bookings', label: 'การจองของฉัน', icon: CalendarCheck }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'จัดการระบบ', icon: LayoutDashboard }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="group flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white transition-colors group-hover:bg-sky-700">
              <Hotel size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="text-sky-600">30</span>Rooms
            </span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex" aria-label="เมนูหลัก">
            {links.map((link) => {
              const LinkIcon = link.icon
              return (
                <NavLink key={link.to} to={link.to} className={linkClass} end={link.end}>
                  <LinkIcon size={18} aria-hidden="true" />
                  {link.label}
                </NavLink>
              )
            })}

            <span className="mx-2 h-6 w-px bg-slate-200" aria-hidden="true" />

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="flex flex-col items-end leading-tight">
                  <span className="text-xs font-semibold text-slate-900">{user.full_name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">{user.role}</span>
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                >
                  <LogOut size={16} aria-hidden="true" />
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}>
                  <LogIn size={18} aria-hidden="true" />
                  เข้าสู่ระบบ
                </NavLink>
                <Link
                  to="/signup"
                  className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                >
                  <UserPlus size={18} aria-hidden="true" />
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 md:hidden"
          >
            {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>

        {menuOpen ? (
          <nav id="mobile-menu" className="mt-4 space-y-2 pb-4 md:hidden" aria-label="เมนูหลัก">
            {links.map((link) => {
              const LinkIcon = link.icon
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={linkClass}
                  end={link.end}
                  onClick={closeMenu}
                >
                  <LinkIcon size={18} aria-hidden="true" />
                  {link.label}
                </NavLink>
              )
            })}

            <span className="my-2 block h-px bg-slate-100" aria-hidden="true" />

            {isAuthenticated ? (
              <>
                <div className="px-4 py-2">
                  <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu()
                    signOut()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <LogOut size={16} aria-hidden="true" />
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass} onClick={closeMenu}>
                  <LogIn size={18} aria-hidden="true" />
                  เข้าสู่ระบบ
                </NavLink>
                <NavLink to="/signup" className={linkClass} onClick={closeMenu}>
                  <UserPlus size={18} aria-hidden="true" />
                  สมัครสมาชิก
                </NavLink>
              </>
            )}
          </nav>
        ) : null}
      </div>
    </header>
  )
}
