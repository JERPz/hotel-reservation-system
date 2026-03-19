import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../controllers/useAuth'

const navLinkClass = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`

export default function Navbar() {
  const { user, isAuthed, logout } = useAuth()

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-slate-900">
          Hotel Reservation
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <NavLink to="/my-bookings" className={navLinkClass}>
            MyBooking
          </NavLink>

          <div className="w-px h-6 bg-slate-200 mx-2" />

          {isAuthed ? (
            <>
              <span className="text-sm text-slate-600 hidden sm:inline">
                {user?.FirstName ? `${user?.FirstName} ${user?.LastName || ''}`.trim() : user?.Email || 'User'}
              </span>
              <button
                type="button"
                onClick={logout}
                className="px-3 py-2 rounded-md text-sm font-medium text-white bg-slate-900 hover:bg-slate-800"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Login
              </NavLink>
              <NavLink to="/signup" className={navLinkClass}>
                Signup
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
