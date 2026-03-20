import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../controllers/useAuth'
import { Home, Calendar, LayoutDashboard, LogOut, LogIn, UserPlus, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../utils/cn'

const navLinkClass = ({ isActive }) =>
  cn(
    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
    isActive 
      ? 'bg-sky-600 text-white shadow-md shadow-sky-200' 
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  )

export default function Navbar() {
  const { user, isAuthed, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white group-hover:bg-sky-700 transition-colors">
              <Home size={24} />
            </div>
            <span><span className="text-sky-600">30</span>Rooms</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <NavLink to="/" className={navLinkClass} end>
              <Home size={18} />
              หน้าแรก
            </NavLink>
            {isAuthed ? (
              <>
                <NavLink to="/my-bookings" className={navLinkClass}>
                  <Calendar size={18} />
                  การจองของฉัน
                </NavLink>
                {String(user?.Role?.Name || '').toLowerCase() === 'admin' ? (
                  <NavLink to="/admin" className={navLinkClass}>
                    <LayoutDashboard size={18} />
                    จัดการระบบ
                  </NavLink>
                ) : null}
                <div className="w-px h-6 bg-slate-200 mx-2" />
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-slate-900 leading-none">
                      {user?.FirstName ? `${user?.FirstName} ${user?.LastName || ''}`.trim() : user?.Email || 'User'}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.Role?.Name || 'User'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all duration-200 shadow-sm"
                  >
                    <LogOut size={16} />
                    ออกจากระบบ
                  </button>
                </div>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  <LogIn size={18} />
                  เข้าสู่ระบบ
                </NavLink>
                <Link 
                  to="/signup" 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-all duration-200 shadow-sm shadow-sky-100"
                >
                  <UserPlus size={18} />
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
            <NavLink to="/" className={navLinkClass} onClick={() => setIsOpen(false)} end>
              <Home size={18} />
              หน้าแรก
            </NavLink>
            {isAuthed ? (
              <>
                <NavLink to="/my-bookings" className={navLinkClass} onClick={() => setIsOpen(false)}>
                  <Calendar size={18} />
                  การจองของฉัน
                </NavLink>
                {String(user?.Role?.Name || '').toLowerCase() === 'admin' ? (
                  <NavLink to="/admin" className={navLinkClass} onClick={() => setIsOpen(false)}>
                    <LayoutDashboard size={18} />
                    จัดการระบบ
                  </NavLink>
                ) : null}
                <div className="h-px bg-slate-100 my-2" />
                <div className="px-4 py-2 flex flex-col">
                  <span className="text-sm font-semibold text-slate-900">
                    {user?.FirstName ? `${user?.FirstName} ${user?.LastName || ''}`.trim() : user?.Email || 'User'}
                  </span>
                  <span className="text-xs text-slate-500">{user?.Role?.Name || 'User'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800"
                >
                  <LogOut size={16} />
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass} onClick={() => setIsOpen(false)}>
                  <LogIn size={18} />
                  เข้าสู่ระบบ
                </NavLink>
                <NavLink to="/signup" className={navLinkClass} onClick={() => setIsOpen(false)}>
                  <UserPlus size={18} />
                  สมัครสมาชิก
                </NavLink>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
