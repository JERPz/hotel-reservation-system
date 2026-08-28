import { CheckCircle2, Clock, HelpCircle, XCircle } from 'lucide-react'

import { cn } from '../lib/cn'
import { BOOKING_STATUS, statusPresentation } from '../lib/status'

const ICONS = {
  [BOOKING_STATUS.PENDING]: Clock,
  [BOOKING_STATUS.CONFIRMED]: CheckCircle2,
  [BOOKING_STATUS.CANCELED]: XCircle,
}

/**
 * Booking status pill.
 *
 * Colours and labels come from lib/status so this component and any other reader
 * of a status cannot disagree.
 */
export function StatusBadge({ status, className = '' }) {
  const { label, badge } = statusPresentation(status)
  const Icon = ICONS[status] ?? HelpCircle

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
        'text-[10px] font-black uppercase tracking-widest',
        badge,
        className,
      )}
    >
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  )
}
