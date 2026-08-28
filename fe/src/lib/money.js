/**
 * Currency formatting. All prices in this application are Thai baht.
 */

const formatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Format an amount as `฿1,800`.
 *
 * Non-numeric input renders as `฿0` rather than `฿NaN`, so a missing price never
 * shows the user a broken value.
 */
export function formatBaht(amount) {
  const value = Number(amount)
  return `฿${formatter.format(Number.isFinite(value) ? value : 0)}`
}

/** Format a plain number with thousands separators and no currency symbol. */
export function formatNumber(amount) {
  const value = Number(amount)
  return formatter.format(Number.isFinite(value) ? value : 0)
}
