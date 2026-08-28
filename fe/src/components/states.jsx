import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'

import { cn } from '../lib/cn'
import { Button } from './Button'
import { Spinner } from './Spinner'

/**
 * The three states every data-driven screen needs.
 *
 * Each of these was hand-rolled per page before: five copies of the loading
 * spinner, four of the error panel, three of the empty placeholder. They drifted
 * apart, and the error copies offered `window.location.reload()` as the only
 * recovery, which threw away all other state on the page. These take a `onRetry`
 * callback so a failed request can be retried on its own.
 */

/** Centred loading state for a whole page or panel. */
export function LoadingState({ label = 'กำลังโหลดข้อมูล...', className = '' }) {
  return (
    <div className={cn('flex min-h-[40vh] items-center justify-center py-16', className)}>
      <Spinner label={label} />
    </div>
  )
}

/** Error panel with an optional retry action. */
export function ErrorState({
  title = 'เกิดข้อผิดพลาด',
  message,
  onRetry,
  isOffline = false,
  className = '',
}) {
  const Icon = isOffline ? WifiOff : AlertCircle

  return (
    <div
      role="alert"
      className={cn(
        'mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center',
        className,
      )}
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <Icon size={24} />
      </div>

      <h2 className="text-xl font-bold text-rose-900">{title}</h2>
      {message ? <p className="mt-2 text-rose-700">{message}</p> : null}

      {onRetry ? (
        <Button variant="dark" size="md" className="mt-6" onClick={onRetry}>
          <RefreshCw size={16} />
          ลองใหม่อีกครั้ง
        </Button>
      ) : null}
    </div>
  )
}

/** Placeholder for a successful request that returned nothing. */
export function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div
      className={cn(
        'rounded-3xl border-2 border-dashed border-slate-200 bg-white p-16 text-center',
        className,
      )}
    >
      {Icon ? (
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
          <Icon size={40} />
        </div>
      ) : null}

      <h3 className="text-2xl font-black text-slate-900">{title}</h3>
      {message ? <p className="mx-auto mt-2 max-w-sm text-slate-500">{message}</p> : null}
      {action ? <div className="mt-8 flex justify-center">{action}</div> : null}
    </div>
  )
}
