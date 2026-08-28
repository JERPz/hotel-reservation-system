# Hotel Reservation API

Base URL (local): `http://localhost:8080`

## Conventions

**Field naming.** Every request and response field is `snake_case`.

**Dates.** Calendar dates are plain `YYYY-MM-DD` strings, never timestamps. A stay
covers the half-open range `[check_in, check_out)`: booking the 3rd to the 5th
occupies the nights of the 3rd and 4th, and the room is free again on the 5th.
Timestamps that represent a real instant (`created_at`, `expires_at`) are RFC 3339.

**Authentication.** Send the token from register or login as a bearer credential:

```
Authorization: Bearer <token>
```

The token is verified and the account re-loaded on every request, so revoking or
demoting an account takes effect immediately rather than when the token expires.

**Errors.** Every failure uses one envelope. `fields` is present only for
validation failures.

```json
{
  "error": {
    "code": "unprocessable_entity",
    "message": "Some of the details provided are not valid.",
    "fields": { "password": "must be at least 8 characters" }
  }
}
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `bad_request` | Malformed request or query parameter |
| 401 | `unauthorized` | Missing, invalid or expired token |
| 403 | `forbidden` | Authenticated but not permitted |
| 404 | `not_found` | No such resource, or not visible to you |
| 405 | `method_not_allowed` | Wrong verb; response carries an `Allow` header |
| 409 | `conflict` | Duplicate email, or rooms taken since you looked |
| 415 | `unsupported_media_type` | `Content-Type` was not `application/json` |
| 422 | `unprocessable_entity` | Well-formed but failed validation |
| 500 | `internal_error` | Server fault; details are logged, not returned |

**Collections.** List endpoints return a consistent envelope. `limit` is clamped
to 200.

```json
{ "items": [], "total": 0, "limit": 100, "offset": 0 }
```

**Correlation.** Every response carries an `X-Request-Id`. Send your own to have
it echoed back and used in the server logs.

---

## Endpoint summary

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/health` | Public |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Signed in |
| GET | `/api/room-types` | Public |
| GET | `/api/room-types/{id}` | Public |
| POST | `/api/room-types` | Admin |
| GET | `/api/rooms` | Public |
| POST | `/api/rooms` | Admin |
| GET | `/api/availability` | Public |
| GET | `/api/availability/calendar` | Public |
| GET | `/api/booking-statuses` | Public |
| POST | `/api/bookings` | Signed in |
| GET | `/api/bookings/me` | Signed in |
| GET | `/api/bookings/{id}` | Owner or admin |
| PATCH | `/api/bookings/{id}/status` | Owner (cancel only) or admin |
| POST | `/api/bookings/reference/{reference}/cancel` | Owner or admin |
| GET | `/api/bookings` | Admin |
| GET | `/api/bookings/stats` | Admin |
| GET | `/api/users` | Admin |
| GET | `/api/roles` | Admin |

---

## Health

### `GET /api/health`

```json
{ "status": "ok", "database": "ok", "uptime": "2m14s", "time": "2026-09-01T10:00:00Z" }
```

Returns `503` with `"status": "degraded"` when the database is unreachable.

---

## Authentication

### `POST /api/auth/register`

Creates an account and signs it in. The role is always the standard user role;
there is no way to request a different one, and sending an unexpected field such
as `role_id` is rejected with `400`.

Request:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "0812345678",
  "password": "secret123"
}
```

`201 Created`:

```json
{
  "token": "eyJ...",
  "expires_at": "2026-09-02T10:00:00Z",
  "user": {
    "id": 3,
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "0812345678",
    "role": "user",
    "is_admin": false,
    "created_at": "2026-09-01T10:00:00Z"
  }
}
```

Passwords must be at least 8 characters and combine letters with at least one
number or symbol. A duplicate email returns `409`.

### `POST /api/auth/login`

```json
{ "email": "john@example.com", "password": "secret123" }
```

`200 OK` with the same shape as register. An unknown email and a wrong password
produce the identical `401`, so the endpoint cannot be used to discover which
addresses are registered.

### `GET /api/auth/me`

Returns the signed-in user object. Used to revalidate a stored token on page load.

---

## Room types

### `GET /api/room-types`

```json
{
  "items": [
    {
      "id": 1,
      "name": "Single",
      "slug": "single",
      "description": "Single bed, bright and compact with a work desk.",
      "price": 1000,
      "capacity": 1,
      "room_count": 10
    }
  ],
  "total": 3, "limit": 3, "offset": 0
}
```

`slug` is a stable lowercase key derived from the name; clients use it to select
per-type assets without string-matching a display name that may be renamed.

### `GET /api/room-types/{id}`

A single room type, same shape as above.

### `POST /api/room-types` — admin

```json
{ "name": "Deluxe", "description": "Sea view", "price": 2400, "capacity": 2 }
```

`201 Created` with the room type. A duplicate name returns `409`.

---

## Rooms

### `GET /api/rooms`

Optional `type_id` narrows the result.

```json
{
  "items": [
    { "id": 1, "number": 101, "type_id": 1, "type": { "id": 1, "name": "Single", "slug": "single", "price": 1000 } }
  ],
  "total": 30, "limit": 30, "offset": 0
}
```

### `POST /api/rooms` — admin

```json
{ "number": 401, "type_id": 2 }
```

---

## Availability

### `GET /api/availability`

Which rooms of a type are free for a whole stay.

| Parameter | Required | Notes |
| --- | --- | --- |
| `type_id` | yes | Room type id |
| `check_in` | yes | `YYYY-MM-DD`, today or later |
| `check_out` | yes | `YYYY-MM-DD`, after `check_in`, max 30 nights |

```
GET /api/availability?type_id=1&check_in=2026-09-01&check_out=2026-09-03
```

```json
{
  "room_type": { "id": 1, "name": "Single", "slug": "single", "price": 1000, "capacity": 1, "room_count": 10 },
  "check_in": "2026-09-01",
  "check_out": "2026-09-03",
  "nights": 2,
  "price_per_night": 1000,
  "total_rooms": 10,
  "available_count": 8,
  "available_rooms": [{ "id": 1, "number": 101, "type_id": 1 }],
  "max_rooms": 5
}
```

A room is unavailable when any non-cancelled booking overlaps the requested range,
tested as `existing.check_in < requested.check_out AND existing.check_out >
requested.check_in`. Cancelling a booking releases its room immediately.

`max_rooms` is the largest `room_count` that `POST /api/bookings` will accept for
this request, so a client can bound its selector without hardcoding the policy.

### `GET /api/availability/calendar`

Free room count for every night of a month, in one request.

| Parameter | Required | Notes |
| --- | --- | --- |
| `type_id` | yes | Room type id |
| `month` | no | `YYYY-MM`, defaults to the current month |

```json
{
  "room_type": { "id": 1, "name": "Single", "slug": "single", "price": 1000, "capacity": 1, "room_count": 10 },
  "month": "2026-09",
  "total_rooms": 10,
  "days": [
    { "date": "2026-09-01", "available_count": 8, "sold_out": false, "in_past": false },
    { "date": "2026-09-02", "available_count": 0, "sold_out": true, "in_past": false }
  ]
}
```

---

## Bookings

### `POST /api/bookings`

Reserves rooms for the signed-in guest. There is no `user_id` field: the guest is
taken from the token.

```json
{ "type_id": 1, "room_count": 2, "check_in": "2026-09-01", "check_out": "2026-09-03" }
```

`201 Created`:

```json
{
  "reference": "K7M2QPXR",
  "total_price": 4000,
  "bookings": [
    {
      "id": 11,
      "reference": "K7M2QPXR",
      "status_id": 1,
      "status": "pending",
      "check_in": "2026-09-01",
      "check_out": "2026-09-03",
      "nights": 2,
      "total_price": 2000,
      "room": { "id": 1, "number": 101, "type_id": 1, "type": { "id": 1, "name": "Single", "slug": "single", "price": 1000 } },
      "can_cancel": true,
      "created_at": "2026-08-28T09:00:00Z"
    }
  ]
}
```

Reserving several rooms creates one booking row per room, all sharing a
`reference`, so a client can present and cancel them as one reservation.

New bookings start as `pending`. `total_price` is captured at booking time, so
later price changes do not rewrite historical revenue.

Availability is re-checked inside a transaction that locks the candidate rooms, so
two guests racing for the last room cannot both succeed. The loser receives `409`.

Limits: at most 5 rooms per request, at most 30 nights, check-in today or later and
within 365 days.

### `GET /api/bookings/me`

The caller's own bookings, newest first. Accepts `limit` and `offset`.

### `GET /api/bookings/{id}`

One booking. Visible to its owner and to staff. Anyone else receives `404` rather
than `403`, so the endpoint does not confirm that a booking exists to someone with
no right to know.

### `PATCH /api/bookings/{id}/status`

```json
{ "status": "confirmed" }
```

Permitted transitions:

| Actor | Allowed |
| --- | --- |
| Admin | `pending` → `confirmed`, and any live booking → `canceled` |
| Guest | own booking → `canceled`, only before the check-in date |

`canceled` is terminal, and nothing can move back to `pending`. Violations return
`409`; a guest attempting to confirm receives `403`.

### `POST /api/bookings/reference/{reference}/cancel`

Cancels every room booked under one reference in a single call. Same authorisation
rules as above.

```json
{ "reference": "K7M2QPXR", "bookings": [] }
```

### `GET /api/bookings` — admin

Every booking. Optional `status` filter (`pending`, `confirmed`, `canceled`), plus
`limit` and `offset`. Responses include a `guest` block, which is omitted when a
guest reads their own bookings.

### `GET /api/bookings/stats` — admin

```json
{
  "total_bookings": 42,
  "pending_bookings": 5,
  "confirmed_bookings": 34,
  "canceled_bookings": 3,
  "revenue": 128400,
  "room_nights_sold": 96
}
```

`revenue` and `room_nights_sold` sum the stored per-booking totals and exclude
cancelled bookings.

---

## Reference data

### `GET /api/booking-statuses`

```json
{ "items": [{ "id": 1, "name": "pending" }], "total": 3, "limit": 3, "offset": 0 }
```

### `GET /api/roles` — admin

```json
{ "items": [{ "id": 1, "name": "admin" }], "total": 2, "limit": 2, "offset": 0 }
```

### `GET /api/users` — admin

Accounts with their live booking counts. Password hashes are never serialised.

```json
{
  "items": [
    {
      "id": 1,
      "first_name": "Admin",
      "last_name": "User",
      "full_name": "Admin User",
      "email": "admin@example.com",
      "phone": "0812345678",
      "role": "admin",
      "is_admin": true,
      "booking_count": 0,
      "created_at": "2026-08-28T09:00:00Z"
    }
  ],
  "total": 2, "limit": 100, "offset": 0
}
```

---

## Upgrading an existing database

This version adds three required columns to `bookings` (`reference`, `nights`,
`total_price`), narrows `check_in`/`check_out` from a timestamp to a date, and
tightens several previously nullable columns. Postgres will not add a `NOT NULL`
column to a table that already holds rows, so the server prepares existing data
before migrating. On the first boot against an older database it will:

- convert `check_in` and `check_out` to `date`
- assign every existing booking a `reference`, grouping rows that share a guest,
  a date range and a creation second, which reconstructs reservations that were
  originally booked together
- derive `nights` from the stored dates, treating any stay as at least one night
- derive `total_price` from the room type's current price × nights (the old schema
  never recorded what a booking cost, so this is an approximation; from now on the
  total is captured at booking time)
- replace `NULL` in `users.first_name`, `users.last_name` and
  `users.password_hash` with an empty string, default a missing `users.role_id` to
  the standard user role, and a missing `bookings.status_id` to `pending`

Each step is logged and runs at most once. The whole preparation happens in one
transaction, so a failure leaves the schema untouched.

Two situations stop the migration deliberately rather than guessing:

- a booking with no guest, room or dates, or a room with no type
- a foreign key pointing at a row that no longer exists

Both cases are reported with the query needed to inspect them. Repair or remove
those rows and redeploy.

## Running locally

```bash
cd be
cp .env.example .env      # then set DATABASE_URL and JWT_SECRET
go run .
```

The server migrates the schema on boot and, outside production, seeds roles,
booking statuses, three room types with ten rooms each, and two demo accounts:

| Email | Role | Password |
| --- | --- | --- |
| `admin@example.com` | admin | `SEED_DEMO_PASSWORD` (default `demo1234`) |
| `user@example.com` | user | `SEED_DEMO_PASSWORD` (default `demo1234`) |

These exist for development only. Set `SEED_DEMO_PASSWORD` to empty to seed the
inventory without creating any logins.

Quick check:

```bash
curl -s localhost:8080/api/health
curl -s localhost:8080/api/room-types

TOKEN=$(curl -s localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"demo1234"}' | jq -r .token)

curl -s localhost:8080/api/users -H "Authorization: Bearer $TOKEN"
```
