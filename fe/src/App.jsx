import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './controllers/AuthProvider'
import ProtectedRoute from './controllers/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import Booking from './pages/Booking'
import Home from './pages/Home'
import Login from './pages/Login'
import MyBooking from './pages/MyBooking'
import RoomDetail from './pages/RoomDetail'
import Signup from './pages/Signup'

function NotFound() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="text-xl font-semibold">404</div>
      <div className="text-slate-600 mt-2">ไม่พบหน้าที่คุณต้องการ</div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
