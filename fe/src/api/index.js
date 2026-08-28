import { request, requestList, requestPage } from './client'

/**
 * The API surface, grouped by resource.
 *
 * Each function names its parameters explicitly, so a caller cannot silently
 * shift an argument. The mapping to the wire format's snake_case happens here and
 * nowhere else.
 */

export const authApi = {
  /** POST /api/auth/register -> { token, expires_at, user } */
  register({ firstName, lastName, email, phone, password }) {
    return request('api/auth/register', {
      method: 'POST',
      body: {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
      },
    })
  },

  /** POST /api/auth/login -> { token, expires_at, user } */
  login({ email, password }) {
    return request('api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
  },

  /** GET /api/auth/me -> user. Used to revalidate a stored token on boot. */
  me({ signal } = {}) {
    return request('api/auth/me', { signal })
  },
}

export const roomTypesApi = {
  /** GET /api/room-types -> room type array */
  list({ signal } = {}) {
    return requestList('api/room-types', { signal })
  },

  /** GET /api/room-types/{id} -> room type */
  get(id, { signal } = {}) {
    return request(`api/room-types/${id}`, { signal })
  },
}

export const roomsApi = {
  /** GET /api/rooms -> room array */
  list({ typeId, signal } = {}) {
    return requestList('api/rooms', { params: { type_id: typeId }, signal })
  },
}

export const availabilityApi = {
  /**
   * GET /api/availability
   *
   * Returns `{ room_type, nights, price_per_night, total_rooms, available_count,
   * available_rooms, max_rooms }`. Availability is computed server-side against
   * the database, so it accounts for every overlapping booking.
   */
  check({ typeId, checkIn, checkOut, signal }) {
    return request('api/availability', {
      params: { type_id: typeId, check_in: checkIn, check_out: checkOut },
      signal,
    })
  },

  /**
   * GET /api/availability/calendar
   *
   * Returns `{ room_type, month, total_rooms, days: [{ date, available_count,
   * sold_out, in_past }] }` for a whole month in one request.
   */
  calendar({ typeId, month, signal }) {
    return request('api/availability/calendar', {
      params: { type_id: typeId, month },
      signal,
    })
  },
}

export const bookingsApi = {
  /**
   * POST /api/bookings -> { reference, bookings, total_price }
   *
   * The guest is taken from the authenticated session; there is no user id to
   * pass. The server re-verifies availability inside a transaction, so a 409 here
   * means the rooms were genuinely taken.
   */
  create({ typeId, roomCount, checkIn, checkOut }) {
    return request('api/bookings', {
      method: 'POST',
      body: {
        type_id: Number(typeId),
        room_count: Number(roomCount),
        check_in: checkIn,
        check_out: checkOut,
      },
    })
  },

  /** GET /api/bookings/me -> the signed-in guest's bookings */
  mine({ limit, offset, signal } = {}) {
    return requestPage('api/bookings/me', { params: { limit, offset }, signal })
  },

  /** GET /api/bookings/{id} -> booking */
  get(id, { signal } = {}) {
    return request(`api/bookings/${id}`, { signal })
  },

  /** PATCH /api/bookings/{id}/status -> booking */
  updateStatus({ id, status }) {
    return request(`api/bookings/${id}/status`, {
      method: 'PATCH',
      body: { status },
    })
  },

  /** POST /api/bookings/reference/{reference}/cancel -> { reference, bookings } */
  cancelReservation(reference) {
    return request(`api/bookings/reference/${encodeURIComponent(reference)}/cancel`, {
      method: 'POST',
    })
  },

  /** GET /api/booking-statuses -> status array */
  statuses({ signal } = {}) {
    return requestList('api/booking-statuses', { signal })
  },
}

export const adminApi = {
  /** GET /api/bookings -> every booking, optionally filtered by status */
  bookings({ status, limit, offset, signal } = {}) {
    return requestPage('api/bookings', { params: { status, limit, offset }, signal })
  },

  /** GET /api/bookings/stats -> aggregate counts and revenue */
  stats({ signal } = {}) {
    return request('api/bookings/stats', { signal })
  },

  /** GET /api/users -> accounts with booking counts */
  users({ limit, offset, signal } = {}) {
    return requestPage('api/users', { params: { limit, offset }, signal })
  },

  /** POST /api/room-types -> created room type */
  createRoomType({ name, description, price, capacity }) {
    return request('api/room-types', {
      method: 'POST',
      body: { name, description, price: Number(price), capacity: Number(capacity) },
    })
  },

  /** POST /api/rooms -> created room */
  createRoom({ number, typeId }) {
    return request('api/rooms', {
      method: 'POST',
      body: { number: Number(number), type_id: Number(typeId) },
    })
  },
}

export { ApiError, errorMessage } from './client'
