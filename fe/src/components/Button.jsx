export default function Button({ variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'
  const styles =
    variant === 'secondary'
      ? 'bg-white border border-slate-200 text-slate-900 hover:bg-slate-50'
      : 'bg-slate-900 text-white hover:bg-slate-800'

  return <button className={`${base} ${styles} ${className}`} {...props} />
}
