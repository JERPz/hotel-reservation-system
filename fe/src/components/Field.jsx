import { useId } from 'react'

import { cn } from '../lib/cn'

const CONTROL_BASE =
  'w-full rounded-2xl border-2 bg-slate-50/50 py-3.5 text-sm font-medium text-slate-900 ' +
  'placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

/**
 * A labelled form control with an optional leading icon and an error message.
 *
 * The login and signup screens repeated this same block of markup eight times.
 * Beyond the duplication, none of those copies associated the <label> with its
 * input, so clicking a label did nothing and screen readers could not announce
 * which field they were on. Here the ids are generated and wired up, and the
 * error is linked via aria-describedby.
 */
export function Field({
  label,
  icon: Icon,
  error,
  hint,
  className = '',
  inputClassName = '',
  as = 'input',
  children,
  ...props
}) {
  const generatedId = useId()
  const id = props.id ?? generatedId
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  const control = (
    <>
      {Icon ? (
        <span
          className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400"
          aria-hidden="true"
        >
          <Icon size={18} />
        </span>
      ) : null}

      {as === 'select' ? (
        <select
          {...props}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            CONTROL_BASE,
            'cursor-pointer appearance-none pr-4',
            Icon ? 'pl-12' : 'pl-4',
            error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-100 focus:border-sky-500',
            inputClassName,
          )}
        >
          {children}
        </select>
      ) : (
        <input
          {...props}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            CONTROL_BASE,
            'pr-4',
            Icon ? 'pl-12' : 'pl-4',
            error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-100 focus:border-sky-500',
            inputClassName,
          )}
        />
      )}
    </>
  )

  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <label htmlFor={id} className="ml-1 block text-sm font-bold text-slate-700">
          {label}
        </label>
      ) : null}

      <div className="relative">{control}</div>

      {hint && !error ? (
        <p id={hintId} className="ml-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="ml-1 text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
