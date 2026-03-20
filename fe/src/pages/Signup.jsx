import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { useAuth } from '../controllers/useAuth'
import { api } from '../services/api'
import { User, Mail, Lock, Phone, UserPlus, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

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

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const toastId = toast.loading('กำลังสร้างบัญชี...')
    try {
      await api.signup({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
        role_id: 2,
      })
      toast.success('สมัครสมาชิกสำเร็จ!', { id: toastId })
      await login({ email, password })
      navigate(decodeURIComponent(redirect), { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err), { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 group">
        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
        <span className="text-sm font-medium">กลับหน้าหลัก</span>
      </Link>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 md:p-10 shadow-xl shadow-slate-100">
        <div className="mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-4">
            <UserPlus size={24} />
          </div>
          <h1 className="text-3xl font-black text-slate-900">สมัครสมาชิก</h1>
          <p className="text-slate-500 mt-2">ร่วมเป็นส่วนหนึ่งกับเรา เพื่อรับสิทธิพิเศษมากมาย</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">ชื่อ</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="ชื่อจริง"
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">นามสกุล</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="นามสกุล"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">เบอร์โทรศัพท์</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                <Phone size={18} />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08X-XXX-XXXX"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">อีเมล</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">รหัสผ่าน</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full py-4 rounded-2xl text-base font-bold shadow-lg shadow-sky-100" disabled={loading}>
            {loading ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิก'}
          </Button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500 font-medium">
            มีบัญชีอยู่แล้ว?{' '}
            <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-sky-600 font-bold hover:text-sky-700 underline underline-offset-4 decoration-2">
              เข้าสู่ระบบที่นี่
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
