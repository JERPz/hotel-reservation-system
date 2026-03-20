import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './controllers/AuthProvider'
import ProtectedRoute from './controllers/ProtectedRoute'
import AdminRoute from './controllers/AdminRoute'
import MainLayout from './layouts/MainLayout'
import Booking from './pages/Booking'
import Home from './pages/Home'
import Login from './pages/Login'
import MyBooking from './pages/MyBooking'
import RoomDetail from './pages/RoomDetail'
import Signup from './pages/Signup'
import AdminDashboard from './pages/AdminDashboard'
import { Toaster } from 'react-hot-toast'

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="text-9xl font-black text-slate-100">404</div>
      <div className="text-2xl font-bold text-slate-900 mt-4">ไม่พบหน้าที่คุณต้องการ</div>
      <p className="text-slate-500 mt-2">ขออภัย เราไม่พบหน้าเว็บที่คุณกำลังมองหา</p>
      <a href="/" className="mt-8 rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white hover:bg-sky-700 transition-colors">
        กลับหน้าหลัก
      </a>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" reverseOrder={false} />
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/room-types/:typeId" element={<RoomDetail />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute>
                  <MyBooking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
