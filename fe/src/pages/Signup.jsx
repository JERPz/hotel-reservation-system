import { ArrowLeft, Lock, Mail, Phone, User, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { ApiError } from '../api'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { useRedirectTarget } from '../hooks/useQueryParams'

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  password: '',
}

/**
 * Registration.
 *
 * Registering now returns a session, so the new guest is signed in by the same
 * request. The old flow called register and then immediately called login again,
 * which meant a successful signup followed by a failed login left the user staring
 * at an error despite their account having been created.
 *
 * Note there is no role selector: the server always assigns the standard user role.
 */
export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const redirectTo = useRedirectTarget('/')

  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [snakeCase(name)]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFieldErrors({})

    try {
      await signUp(form)
      toast.success('สมัครสมาชิกสำเร็จ ยินดีต้อนรับ')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setFieldErrors(error.fields)
      }
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg py-8">
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
            <UserPlus size={24} aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-black text-slate-900">สมัครสมาชิก</h1>
          <p className="mt-2 text-slate-500">สร้างบัญชีเพื่อจองห้องพักและติดตามการจองของคุณ</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field
              label="ชื่อ"
              icon={User}
              name="firstName"
              autoComplete="given-name"
              placeholder="ชื่อจริง"
              value={form.firstName}
              onChange={(event) => update('firstName', event.target.value)}
              error={fieldErrors.first_name}
              required
            />
            <Field
              label="นามสกุล"
              name="lastName"
              autoComplete="family-name"
              placeholder="นามสกุล"
              value={form.lastName}
              onChange={(event) => update('lastName', event.target.value)}
              error={fieldErrors.last_name}
            />
          </div>

          <Field
            label="เบอร์โทรศัพท์"
            icon={Phone}
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="08X-XXX-XXXX"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            error={fieldErrors.phone}
          />

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
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            error={fieldErrors.password}
            hint="อย่างน้อย 8 ตัวอักษร และต้องมีตัวเลขหรือสัญลักษณ์ผสมด้วย"
            required
          />

          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            {submitting ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิก'}
          </Button>
        </form>

        <footer className="mt-8 border-t border-slate-100 pt-8 text-center">
          <p className="text-sm font-medium text-slate-500">
            มีบัญชีอยู่แล้ว?{' '}
            <Link
              to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
              className="font-bold text-sky-600 underline decoration-2 underline-offset-4 hover:text-sky-700"
            >
              เข้าสู่ระบบที่นี่
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}

/** Map a form field name to the API field name used in validation errors. */
function snakeCase(name) {
  return name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}
