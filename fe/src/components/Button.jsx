import { cn } from '../lib/cn'

const VARIANTS = {
  primary: 'bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-100',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
  secondary: 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300',
  danger: 'bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-100',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5',
}

/**
 * The application's button.
 *
 * Renders a real <button> and keeps the disabled state tied to `loading`, so a
 * form cannot be submitted twice by an impatient double click.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-bold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  )
}
