import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthProvider'
import { RequireAdmin, RequireAuth } from './auth/RouteGuards'
import MainLayout from './layouts/MainLayout'
import AdminDashboard from './pages/AdminDashboard'
import Booking from './pages/Booking'
import Home from './pages/Home'
import Login from './pages/Login'
import MyBookings from './pages/MyBookings'
import NotFound from './pages/NotFound'
import RoomDetail from './pages/RoomDetail'
import Signup from './pages/Signup'

/**
 * Application shell and route table.
 *
 * The router sits inside AuthProvider so the guards can read the session, and the
 * guards are the only place a route's access level is declared.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'text-sm font-medium',
          }}
        />

        <Routes>
          <Route element={<MainLayout />}>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/room-types/:typeId" element={<RoomDetail />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Requires a signed-in guest */}
            <Route
              path="/my-bookings"
              element={
                <RequireAuth>
                  <MyBookings />
                </RequireAuth>
              }
            />

            {/* Requires an administrator */}
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
