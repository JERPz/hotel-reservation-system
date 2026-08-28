import { availabilityApi } from '../api'
import { nightsBetween } from '../lib/date'
import { useAsync } from './useAsync'

/**
 * Ask the server what is available for a stay.
 *
 * This replaces the old client-side calculation entirely. That version downloaded
 * every room and every booking in the system, then decided a room was taken only
 * when a booking's check-in date exactly equalled the requested check-in date — so
 * a room booked from the 1st to the 10th appeared free on the 5th.
 */
export function useAvailability({ typeId, checkIn, checkOut }) {
  // Only ask once the inputs describe a real stay of at least one night.
  const enabled = Boolean(typeId && checkIn && checkOut && nightsBetween(checkIn, checkOut) > 0)

  const { data, loading, error, reload } = useAsync(
    ({ signal }) => availabilityApi.check({ typeId, checkIn, checkOut, signal }),
    [typeId, checkIn, checkOut],
    { enabled },
  )

  return {
    availability: data,
    availableCount: data?.available_count ?? 0,
    maxRooms: data?.max_rooms ?? 0,
    pricePerNight: data?.price_per_night ?? 0,
    nights: data?.nights ?? nightsBetween(checkIn, checkOut),
    totalRooms: data?.total_rooms ?? 0,
    loading: enabled && loading,
    error,
    reload,
  }
}

/**
 * Per-day availability for a month, used by the calendar.
 *
 * The whole month arrives in one request; the server computes it with a single
 * grouped query.
 */
export function useAvailabilityCalendar({ typeId, month }) {
  const enabled = Boolean(typeId && month)

  const { data, loading, error, reload } = useAsync(
    ({ signal }) => availabilityApi.calendar({ typeId, month, signal }),
    [typeId, month],
    { enabled },
  )

  return {
    days: data?.days ?? [],
    totalRooms: data?.total_rooms ?? 0,
    loading: enabled && loading,
    error,
    reload,
  }
}
