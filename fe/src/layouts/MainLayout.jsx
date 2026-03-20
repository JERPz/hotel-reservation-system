import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../controllers/useAuth'

export default function MainLayout() {
  const { isAuthed } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {isAuthed && <Navbar />}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <Outlet />
      </main>
    </div>
  )
}
