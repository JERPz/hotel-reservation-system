const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

function getToken() {
  return localStorage.getItem('token') || ''
}

function buildUrl(path) {
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${API_BASE_URL}/${clean}`
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getToken()

  const res = await fetch(buildUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const msg = data?.message || data?.error || text || `HTTP ${res.status}`
    throw new Error(msg)
  }

  return data
}

export const api = {
  getRoomTypes() {
    return request('api/room-types')
  },
  getRooms() {
    return request('api/rooms')
  },
  getBookings() {
    return request('api/bookings')
  },
  getBookingStatuses() {
    return request('api/booking-status')
  },
  login({ email, password }) {
    return request('api/auth/login', { method: 'POST', body: { email, password } })
  },
  signup({ first_name, last_name, email, phone, password, role_id }) {
    return request('api/auth/register', {
      method: 'POST',
      body: { first_name, last_name, email, phone, password, role_id },
    })
  },
  createBooking({ user_id, room_id, status_id, check_in, check_out }) {
    return request('api/bookings/create', {
      method: 'POST',
      body: {
        UserID: user_id,
        RoomID: room_id,
        StatusID: status_id,
        CheckIn: check_in,
        CheckOut: check_out,
      },
    })
  },
}
