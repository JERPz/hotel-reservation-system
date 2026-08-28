import { ArrowLeft, LogIn, Mail, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { ApiError } from '../api'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { useRedirectTarget } from '../hooks/useQueryParams'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const redirectTo = useRedirectTarget('/')

  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    // Clear the error as soon as the user edits the field it belongs to.
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFieldErrors({})

    try {
      await signIn(form)
      toast.success('เข้าสู่ระบบสำเร็จ')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      // The API reports per-field problems, so surface them on the inputs rather
      // than only in a toast.
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setFieldErrors(error.fields)
      }
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <Link
        to="/"
        className="group mb-8 inline-flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" aria-hidden="true" />
        <span className="text-sm font-medium">กลับหน้าหลัก</span>
      </Link>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100 md:p-10">
        <header className="mb-8">
          <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <LogIn size={24} aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-black text-slate-900">เข้าสู่ระบบ</h1>
          <p className="mt-2 text-slate-500">ยินดีต้อนรับกลับมา กรอกข้อมูลเพื่อเข้าใช้งาน</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <Field
            label="อีเมล"
            icon={Mail}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="example@mail.com"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            error={fieldErrors.email}
            required
          />

          <Field
            label="รหัสผ่าน"
            icon={Lock}
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            error={fieldErrors.password}
            required
          />

          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>

        <footer className="mt-8 border-t border-slate-100 pt-8 text-center">
          <p className="text-sm font-medium text-slate-500">
            ยังไม่มีบัญชี?{' '}
            <Link
              to={`/signup?redirect=${encodeURIComponent(redirectTo)}`}
              className="font-bold text-sky-600 underline decoration-2 underline-offset-4 hover:text-sky-700"
            >
              สมัครสมาชิกฟรี
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
