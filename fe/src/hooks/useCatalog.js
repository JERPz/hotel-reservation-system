import { useMemo } from 'react'

import { roomTypesApi } from '../api'
import { useAsync } from './useAsync'

/** Load every bookable room type. */
export function useRoomTypes() {
  const { data, loading, error, reload } = useAsync(({ signal }) => roomTypesApi.list({ signal }), [], {
    initialData: [],
  })

  return { roomTypes: data ?? [], loading, error, reload }
}

/**
 * Load a single room type.
 *
 * Fetched by id rather than filtered out of the full list, so a direct link to a
 * room works without downloading the whole catalogue.
 */
export function useRoomType(typeId) {
  const enabled = Boolean(typeId)

  const { data, loading, error, reload } = useAsync(
    ({ signal }) => roomTypesApi.get(typeId, { signal }),
    [typeId],
    { enabled },
  )

  return { roomType: data, loading: enabled && loading, error, reload }
}

/** Search and sort room types on the client, which is cheap for a small list. */
export function useFilteredRoomTypes(roomTypes, query) {
  return useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return roomTypes

    return roomTypes.filter((roomType) =>
      `${roomType.name} ${roomType.description}`.toLowerCase().includes(trimmed),
    )
  }, [roomTypes, query])
}
