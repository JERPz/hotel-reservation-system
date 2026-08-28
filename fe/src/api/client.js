import { clearSession, getToken, notifyUnauthorized } from './session'

/**
 * The single HTTP entry point for the app.
 *
 * Responsibilities kept here so no caller repeats them: attaching the bearer
 * token, parsing the server's error envelope into a typed error, unwrapping list
 * responses, and reacting to an expired session.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '')

/**
 * A failed request.
 *
 * `code` and `fields` mirror the server's error envelope, so forms can highlight
 * individual inputs instead of only showing a banner.
 */
export class ApiError extends Error {
  constructor({ message, status, code, fields }) {
    super(message)
    this.name = 'ApiError'
    this.status = status ?? 0
    this.code = code ?? 'unknown'
    this.fields = fields ?? {}
  }

  /** True when the request failed because the browser could not reach the API. */
  get isNetworkError() {
    return this.status === 0
  }
}

function buildUrl(path, params) {
  const url = new URL(`${BASE_URL}/${String(path).replace(/^\/+/, '')}`)

  for (const [key, value] of Object.entries(params ?? {})) {
    // Skip absent values so callers can pass optional filters unconditionally.
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/**
 * Perform a request and return the decoded body.
 *
 * @param {string} path      API path, with or without a leading slash.
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {object} [options.body]   Serialised as JSON.
 * @param {object} [options.params] Query string values.
 * @param {AbortSignal} [options.signal]
 */
export async function request(path, { method = 'GET', body, params, signal } = {}) {
  const token = getToken()

  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    // Re-throw cancellations untouched so callers can ignore them.
    if (error?.name === 'AbortError') throw error

    throw new ApiError({
      message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อของคุณ',
      status: 0,
      code: 'network_error',
    })
  }

  const payload = await readBody(response)

  if (!response.ok) {
    // A rejected token means the stored session is stale; clear it and let the
    // auth provider redirect, rather than leaving the UI half signed-in.
    if (response.status === 401) {
      clearSession()
      notifyUnauthorized()
    }

    const envelope = payload?.error ?? {}
    throw new ApiError({
      message: envelope.message || fallbackMessage(response.status),
      status: response.status,
      code: envelope.code,
      fields: envelope.fields,
    })
  }

  return payload
}

/** Read a response body, tolerating empty (204) responses and non-JSON bodies. */
async function readBody(response) {
  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    // The server always speaks JSON; anything else means a proxy or gateway
    // answered instead.
    return null
  }
}

function fallbackMessage(status) {
  if (status >= 500) return 'เซิร์ฟเวอร์เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
  if (status === 404) return 'ไม่พบข้อมูลที่ต้องการ'
  if (status === 403) return 'คุณไม่มีสิทธิ์ในการดำเนินการนี้'
  return 'คำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
}

/**
 * Request a collection endpoint and return just the items.
 *
 * Every collection response is `{ items, total, limit, offset }`; most callers
 * only need `items`, and always get an array.
 */
export async function requestList(path, options) {
  const payload = await request(path, options)
  return Array.isArray(payload?.items) ? payload.items : []
}

/** Request a collection endpoint and return items plus pagination metadata. */
export async function requestPage(path, options) {
  const payload = await request(path, options)
  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    total: Number(payload?.total ?? 0),
    limit: Number(payload?.limit ?? 0),
    offset: Number(payload?.offset ?? 0),
  }
}

/** Extract a user-facing message from any thrown value. */
export function errorMessage(error) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return String(error)
}
