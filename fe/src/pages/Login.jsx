import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { useAuth } from '../controllers/useAuth'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const query = useQuery()

  const redirect = query.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password })
      navigate(decodeURIComponent(redirect), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-slate-600 text-sm mt-2">เข้าสู่ระบบเพื่อทำการจองและดูรายการจองของคุณ</p>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 text-sm mt-4">{error}</div> : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <div className="text-sm text-slate-600 mb-1">Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 bg-white"
              required
            />
          </label>

          <label className="block">
            <div className="text-sm text-slate-600 mb-1">Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 bg-white"
              required
            />
          </label>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'Login'}
          </Button>
        </form>

        <div className="text-sm text-slate-600 mt-4">
          ยังไม่มีบัญชี?{' '}
          <Link to={`/signup?redirect=${encodeURIComponent(redirect)}`} className="text-slate-900 font-medium hover:underline">
            Signup
          </Link>
        </div>
      </div>
    </div>
  )
}
