/**
 * Date helpers for the booking flow.
 *
 * The API exchanges plain calendar dates as `YYYY-MM-DD`. Every conversion goes
 * through this module so the app has one definition of "a day".
 *
 * Parsing matters here: `new Date('2026-09-01')` is interpreted as UTC midnight,
 * so reading it back with local getters shifts the date backwards for anyone west
 * of UTC. These helpers build local dates from the parts instead, which is what
 * the previous scattered `new Date(value)` calls got wrong.
 */

const LOCALE = 'th-TH'

/** Parse `YYYY-MM-DD` into a local Date at midnight. Returns null if invalid. */
export function parseYmd(value) {
  if (typeof value !== 'string') return null

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return null

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? null : date
}

/** Format a Date as `YYYY-MM-DD` using local calendar parts. */
export function toYmd(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today at local midnight. */
export function today() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Today as `YYYY-MM-DD`. */
export function todayYmd() {
  return toYmd(today())
}

/** Add days to a Date, returning a new Date. */
export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Add days to a `YYYY-MM-DD` string, returning a new `YYYY-MM-DD` string. */
export function addDaysYmd(value, days) {
  const date = parseYmd(value)
  return date ? toYmd(addDays(date, days)) : ''
}

/** Nights between two `YYYY-MM-DD` strings. Zero when the range is invalid. */
export function nightsBetween(checkIn, checkOut) {
  const start = parseYmd(checkIn)
  const end = parseYmd(checkOut)
  if (!start || !end) return 0

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const nights = Math.round((end.getTime() - start.getTime()) / millisecondsPerDay)
  return nights > 0 ? nights : 0
}

/** True when the date is strictly before today. */
export function isPast(value) {
  const date = value instanceof Date ? value : parseYmd(value)
  return date ? date.getTime() < today().getTime() : false
}

/** Long form, e.g. "1 กันยายน 2569". */
export function formatLongDate(value) {
  const date = value instanceof Date ? value : parseYmd(value)
  if (!date) return '-'
  return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Short form, e.g. "1 ก.ย. 2569". */
export function formatShortDate(value) {
  const date = value instanceof Date ? value : parseYmd(value)
  if (!date) return '-'
  return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Compact numeric form, e.g. "01/09/69". */
export function formatCompactDate(value) {
  const date = value instanceof Date ? value : parseYmd(value)
  if (!date) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
}

/**
 * Format an ISO timestamp with its time component.
 *
 * Used for audit-style fields such as "booked at", which are real instants
 * rather than calendar days, so standard Date parsing is correct here.
 */
export function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** First day of the month containing the given date. */
export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** Shift a Date by whole months, landing on the first of the month. */
export function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

/** Format a Date as the `YYYY-MM` the API expects for calendar queries. */
export function toMonthKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/** Month and year for display, e.g. "กันยายน 2569". */
export function formatMonthLabel(date) {
  return date.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
}

/** Weekday initials, Sunday first, matching the calendar grid layout. */
export const WEEKDAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

/** How many blank cells precede the first of the month in a Sunday-first grid. */
export function leadingBlankDays(monthStart) {
  return monthStart.getDay()
}
