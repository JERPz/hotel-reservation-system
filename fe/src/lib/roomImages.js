/**
 * Illustrative photography per room type.
 *
 * This map used to be duplicated in Home, RoomDetail, Booking and MyBooking, and
 * each copy picked images by substring-matching the room type's display name.
 * The API now returns a stable `slug` for every room type, so lookups key on that
 * and survive a rename or translation of the display name.
 */

import frontside from '../assets/pic/frontside.png'
import reception from '../assets/pic/reception.png'
import single1 from '../assets/pic/single_1.png'
import single2 from '../assets/pic/single_2.png'
import single3 from '../assets/pic/single_3.png'
import double1 from '../assets/pic/double_1.png'
import double2 from '../assets/pic/double_2.png'
import double3 from '../assets/pic/double_3.png'
import suite1 from '../assets/pic/suite_1.png'
import suite2 from '../assets/pic/suite_2.png'
import suite3 from '../assets/pic/suite_3.png'

export const HERO_IMAGE = frontside
export const RECEPTION_IMAGE = reception

const GALLERIES = {
  single: [single1, single2, single3],
  double: [double1, double2, double3],
  suite: [suite1, suite2, suite3],
}

const FALLBACK_GALLERY = GALLERIES.single

/**
 * Resolve the gallery for a room type.
 *
 * Accepts the room type object, so callers do not have to remember whether to
 * pass the slug or the name. Falls back to matching the name for room types added
 * after these images were bundled.
 */
export function galleryFor(roomType) {
  if (!roomType) return FALLBACK_GALLERY

  const slug = String(roomType.slug ?? '').toLowerCase()
  if (GALLERIES[slug]) return GALLERIES[slug]

  const name = String(roomType.name ?? '').toLowerCase()
  const matched = Object.keys(GALLERIES).find((key) => name.includes(key))
  return matched ? GALLERIES[matched] : FALLBACK_GALLERY
}

/** One image from a room type's gallery, cycling by index. */
export function imageFor(roomType, index = 0) {
  const gallery = galleryFor(roomType)
  const safeIndex = Number.isFinite(index) ? Math.abs(Math.trunc(index)) : 0
  return gallery[safeIndex % gallery.length]
}
