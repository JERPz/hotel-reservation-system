# Hotel Reservation System

A fullstack hotel booking application. Guests browse room types, check real
availability by date, and book; staff confirm or cancel reservations from an admin
dashboard.

- **Frontend** — React 19, Vite, Tailwind CSS v4, React Router
- **Backend** — Go, `net/http`, GORM, PostgreSQL, JWT auth

---

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Go | 1.24+ | Backend |
| Bun | 1.2+ | Frontend package manager and dev server |
| PostgreSQL | 14+ | Local install, Docker, or a hosted instance such as Supabase |

---

## Quick start

Both halves must be running: the frontend talks to the API over HTTP.

### 1. Backend

```bash
cd be
cp .env.example .env
```

Edit `be/.env` and set the two required values:

- `DATABASE_URL` — your Postgres connection string
- `JWT_SECRET` — at least 32 characters. Generate one with `openssl rand -base64 48`

The server refuses to start if either is missing, and there is no insecure
fallback signing key.

```bash
go run .
```

On boot it connects, migrates the schema, and (outside production) seeds roles,
booking statuses, three room types with ten rooms each, and two demo logins:

| Email | Role | Password |
| --- | --- | --- |
| `admin@example.com` | admin | `demo1234` |
| `user@example.com` | user | `demo1234` |

Confirm it is up:

```bash
curl localhost:8080/api/health
```

### 2. Frontend

```bash
cd fe
cp .env.example .env
bun install
bun run dev
```

Open <http://localhost:5173>.

`fe/.env` only needs `VITE_API_BASE_URL`, which defaults to
`http://localhost:8080`. Anything in that file ships to the browser, so never put
a secret there.

---

## Project layout

```
hotel-reservation-system/
├── be/                        Go API
│   ├── main.go                Wiring and lifecycle only
│   ├── doc.md                 API reference
│   └── internal/
│       ├── config/            Typed configuration from the environment
│       ├── models/            Database entities
│       ├── database/          Connection, migration, seeding
│       ├── security/          Password hashing and token issuing
│       ├── store/             Data access; the only package that runs SQL
│       ├── service/           Business rules: validation, pricing, permissions
│       ├── httpx/             JSON helpers and the typed API error
│       ├── middleware/        Request id, logging, recovery, CORS, auth
│       └── api/               Handlers, response DTOs, route table
└── fe/                        React client
    └── src/
        ├── api/               HTTP client, session storage, endpoint groups
        ├── auth/              Auth context, provider, route guards
        ├── hooks/             Data-loading hooks
        ├── lib/               Dates, currency, status and image helpers
        ├── components/        Reusable UI
        ├── layouts/           Page shell
        └── pages/             Route screens
```

### Backend layering

Requests flow in one direction, and each layer has one job:

```
api  →  service  →  store  →  database
```

- **api** decodes requests and encodes DTOs. No business rules, no SQL.
- **service** owns the rules: what a valid stay is, who may cancel, how a stay is
  priced.
- **store** owns every query. It knows nothing about HTTP.

DTOs in `api` are deliberately separate from the entities in `models`, so a column
rename cannot silently change the public API or leak a field that should stay
private.

Access control is declared as data in `api/server.go`. The route table states the
required level (`public`, `authed`, `admin`) next to every path, so the security
posture is readable in one place.

---

## How availability works

Bookings occupy the half-open range `[check_in, check_out)`: a stay from the 3rd to
the 5th uses the nights of the 3rd and 4th, and the room is free again on the 5th.
Two stays conflict when

```
existing.check_in < requested.check_out AND existing.check_out > requested.check_in
```

This is evaluated in SQL, on the server. Cancelled bookings are excluded, so
cancelling releases a room immediately.

Creating a booking re-checks availability inside a transaction that first locks the
candidate rooms in a consistent order. Two guests competing for the last room
therefore serialise: one succeeds and the other receives `409 Conflict`. Checking
before the transaction, without locks, cannot close that window.

---

## Common commands

```bash
# Backend
cd be
go run .                 # start the API
go build ./...           # compile
go vet ./...             # static analysis
gofmt -l .               # list unformatted files (should print nothing)

# Frontend
cd fe
bun run dev              # dev server with hot reload
bun run build            # production build into dist/
bun run preview          # serve the production build
bun run lint             # ESLint
```

---

## Configuration reference

Backend (`be/.env`, see `be/.env.example`):

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | Postgres DSN (`DIRECT_URL` also accepted) |
| `JWT_SECRET` | yes | — | Token signing key, minimum 32 characters |
| `APP_ENV` | no | `development` | `production` enables JSON logs and strict CORS |
| `PORT` | no | `8080` | Listen port |
| `CORS_ORIGIN` | no | — | Comma-separated allowed origins; required in production |
| `JWT_TTL` | no | `24h` | Token lifetime |
| `SEED` | no | `true` outside production | Run the seeder on boot |
| `SEED_DEMO_PASSWORD` | no | `demo1234` in development | Demo account password; empty skips them |
| `LOG_SQL` | no | `false` | Log every SQL statement |

Frontend (`fe/.env`, see `fe/.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend base URL, no trailing slash |

---

## Deploying

Set `APP_ENV=production`, which additionally requires `CORS_ORIGIN` to list your
frontend origins explicitly (`*` is rejected). Use a distinct `JWT_SECRET` per
environment, and leave `SEED_DEMO_PASSWORD` unset so no demo logins are created.

The API shuts down gracefully on `SIGINT` and `SIGTERM`, draining in-flight
requests within `SHUTDOWN_TIMEOUT`.

---

## API

Full reference, including request and response examples for every endpoint, is in
[`be/doc.md`](./be/doc.md).

---

## Author

JERPz
