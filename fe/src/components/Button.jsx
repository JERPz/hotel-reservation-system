export default function Button({ variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const styles =
    variant === 'secondary'
      ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
      : 'bg-gradient-to-r from-slate-900 to-slate-700 text-white hover:from-slate-700 hover:to-slate-500'

  return <button className={`${base} ${styles} ${className}`} {...props} />
}
