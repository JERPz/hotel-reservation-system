/**
 * Booking status presentation.
 *
 * The API returns exact status names (`pending`, `confirmed`, `canceled`), so this
 * module maps them directly. The old code did fuzzy `includes('confirm')` matching
 * in two separate files, which meant the two views could disagree.
 */

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELED: 'canceled',
}

const PRESENTATION = {
  [BOOKING_STATUS.PENDING]: {
    label: 'รอยืนยัน',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: 'ยืนยันแล้ว',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  [BOOKING_STATUS.CANCELED]: {
    label: 'ยกเลิกแล้ว',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
}

const UNKNOWN = {
  label: 'ไม่ทราบสถานะ',
  badge: 'bg-slate-50 text-slate-600 border-slate-200',
  dot: 'bg-slate-400',
}

/** Label and Tailwind classes for a status name. */
export function statusPresentation(status) {
  return PRESENTATION[status] ?? UNKNOWN
}

/** Human-readable label for a status name. */
export function statusLabel(status) {
  return statusPresentation(status).label
}

/** The statuses shown as filter options on the admin dashboard. */
export const STATUS_FILTERS = [
  { value: '', label: 'ทั้งหมด' },
  { value: BOOKING_STATUS.PENDING, label: 'รอยืนยัน' },
  { value: BOOKING_STATUS.CONFIRMED, label: 'ยืนยันแล้ว' },
  { value: BOOKING_STATUS.CANCELED, label: 'ยกเลิกแล้ว' },
]
