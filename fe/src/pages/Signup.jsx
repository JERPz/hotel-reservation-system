import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { useAuth } from '../controllers/useAuth'
import { api } from '../services/api'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function Signup() {
  const navigate = useNavigate()
  const query = useQuery()
  const { login } = useAuth()

  const redirect = query.get('redirect') || '/'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.signup({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
        role_id: 2,
      })
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
        <h1 className="text-2xl font-semibold">Signup</h1>
        <p className="text-slate-600 text-sm mt-2">สมัครสมาชิกเพื่อทำการจองห้องพัก</p>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 text-sm mt-4">{error}</div> : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">First name</div>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 bg-white"
              />
            </label>
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">Last name</div>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 bg-white"
              />
            </label>
          </div>

          <label className="block">
            <div className="text-sm text-slate-600 mb-1">Phone</div>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 bg-white"
            />
          </label>

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
            {loading ? 'กำลังสมัคร...' : 'Signup'}
          </Button>
        </form>

        <div className="text-sm text-slate-600 mt-4">
          มีบัญชีแล้ว?{' '}
          <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-slate-900 font-medium hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
