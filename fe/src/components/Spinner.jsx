import { cn } from '../lib/cn'

const SIZES = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
}

/**
 * Loading indicator.
 *
 * `role="status"` plus the visually-hidden label means assistive technology
 * announces that content is loading, which a bare spinning div does not.
 */
export function Spinner({ size = 'lg', label = 'กำลังโหลด...', className = '' }) {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)} role="status" aria-live="polite">
      <div
        className={cn(
          'animate-spin rounded-full border-sky-600 border-t-transparent',
          SIZES[size] ?? SIZES.lg,
        )}
      />
      {label ? <p className="text-sm font-medium text-slate-500">{label}</p> : null}
      <span className="sr-only">{label || 'กำลังโหลด'}</span>
    </div>
  )
}
