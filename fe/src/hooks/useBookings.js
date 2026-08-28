import { useCallback, useMemo, useState } from 'react'

import { adminApi, bookingsApi } from '../api'
import { useAsync } from './useAsync'

/**
 * The signed-in guest's own bookings.
 *
 * The server scopes this to the caller. The old screen fetched every booking in
 * the system and filtered by user id in the browser, which meant any guest could
 * read every other guest's reservations.
 */
export function useMyBookings() {
  const { data, loading, error, reload } = useAsync(({ signal }) => bookingsApi.mine({ signal }), [], {
    initialData: { items: [], total: 0 },
  })

  const bookings = data?.items ?? []

  /** Cancel a whole reservation, then refresh the list. */
  const cancelReservation = useCallback(
    async (reference) => {
      await bookingsApi.cancelReservation(reference)
      reload()
    },
    [reload],
  )

  return { bookings, total: data?.total ?? 0, loading, error, reload, cancelReservation }
}

/**
 * Group bookings that share a reference into one reservation.
 *
 * A multi-room request creates one row per room. Presenting them as a single
 * reservation is what a guest expects, and it means the totals shown add up.
 */
export function useGroupedBookings(bookings) {
  return useMemo(() => {
    const groups = new Map()

    for (const booking of bookings) {
      // Bookings predating the reference column group by id so nothing vanishes.
      const key = booking.reference || `booking-${booking.id}`

      const existing = groups.get(key)
      if (!existing) {
        groups.set(key, {
          reference: key,
          status: booking.status,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          nights: booking.nights,
          roomType: booking.room?.type ?? null,
          rooms: [booking.room].filter(Boolean),
          totalPrice: booking.total_price,
          canCancel: booking.can_cancel,
          createdAt: booking.created_at,
          bookingIds: [booking.id],
        })
        continue
      }

      if (booking.room) existing.rooms.push(booking.room)
      existing.totalPrice += booking.total_price
      existing.bookingIds.push(booking.id)
      // The group is only cancellable if every row in it is.
      existing.canCancel = existing.canCancel && booking.can_cancel
    }

    return Array.from(groups.values())
  }, [bookings])
}

/**
 * Everything the admin dashboard renders: stats, bookings and accounts.
 *
 * Loaded together so the three requests share one loading and error state instead
 * of three independent ones.
 */
export function useAdminDashboard() {
  const [statusFilter, setStatusFilter] = useState('')

  const { data, loading, error, reload, setData } = useAsync(
    async ({ signal }) => {
      const [stats, bookings, users] = await Promise.all([
        adminApi.stats({ signal }),
        adminApi.bookings({ status: statusFilter, signal }),
        adminApi.users({ signal }),
      ])
      return { stats, bookings: bookings.items, bookingsTotal: bookings.total, users: users.items }
    },
    [statusFilter],
  )

  /**
   * Confirm or cancel a booking.
   *
   * The changed row is patched in place from the server's response so the table
   * updates immediately, and the stats are refreshed because revenue and the
   * per-status counts both depend on it.
   */
  const updateStatus = useCallback(
    async (id, status) => {
      const updated = await bookingsApi.updateStatus({ id, status })

      setData((current) => {
        if (!current) return current
        return {
          ...current,
          bookings: current.bookings.map((booking) => (booking.id === id ? updated : booking)),
        }
      })

      reload()
      return updated
    },
    [reload, setData],
  )

  return {
    stats: data?.stats ?? null,
    bookings: data?.bookings ?? [],
    bookingsTotal: data?.bookingsTotal ?? 0,
    users: data?.users ?? [],
    statusFilter,
    setStatusFilter,
    loading,
    error,
    reload,
    updateStatus,
  }
}
