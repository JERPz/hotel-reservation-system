# Hotel Reservation System API Docs

## Base URL
- Local development: `http://localhost:8080`

---

## 1) Auth Routes

### 1.1 POST /api/auth/register
Register a new user.
- Body (JSON):
  ```json
  {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "0812345678",
    "password": "secret123",
    "role_id": 2
  }
  ```
- Response: `201 Created` with message
  ```json
  {"message":"registered"}
  ```

### 1.2 POST /api/auth/login
Login user and receive JWT.
- Body (JSON):
  ```json
  {
    "email": "john@example.com",
    "password": "secret123"
  }
  ```
- Response: `200 OK`
  ```json
  {
    "token": "eyJ...",
    "user": { ... user object ... }
  }
  ```

---

## 2) User Routes

### 2.1 POST /api/users/register
Register user (same as auth/register but returns user object).
- Body (JSON):
  ```json
  {
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "phone": "0812345679",
    "password": "verysecret",
    "role_id": 2
  }
  ```
- Response: `200 OK` user object.

### 2.2 POST /api/users/login
User login (returns JWT token)
- Body (JSON):
  ```json
  {
    "email": "jane@example.com",
    "password": "verysecret"
  }
  ```
- Response: `200 OK`
  ```json
  {"token":"eyJ..."}
  ```

### 2.3 GET /api/users
Get all users (admin-level expected, no auth check implemented). 
- Response: `200 OK` array of users.

---

## 3) Room-Type Routes

### 3.1 GET /api/room-types
List all room types.
- Response: `200 OK` array of room types.

### 3.2 POST /api/room-types/create
Create new room type.
- Body (JSON):
  ```json
  {
    "name": "Deluxe",
    "price_per_night": 1200,
    "description": "Deluxe sea view room"
  }
  ```
- Response: `200 OK` created room type object.

---

## 4) Room Routes

### 4.1 GET /api/rooms
Get all rooms (protected with JWT middleware).
- Headers: `Authorization: Bearer <token>`
- Response: `200 OK` array of rooms.

### 4.2 POST /api/rooms/create
Create new room (protected with JWT middleware).
- Headers: `Authorization: Bearer <token>`
- Body (JSON):
  ```json
  {
    "room_number": "101",
    "room_type_id": 1,
    "price": 1200,
    "is_available": true
  }
  ```
- Response: `201 Created` created room.

---

## 5) Booking Routes

### 5.1 GET /api/bookings
Get all bookings.
- Response: `200 OK` array of bookings.

### 5.2 POST /api/bookings/create
Create booking.
- Body (JSON):
  ```json
  {
    "user_id": 1,
    "room_id": 1,
    "status_id": 1,
    "check_in": "2026-03-20T14:00:00Z",
    "check_out": "2026-03-22T12:00:00Z"
  }
  ```
- Response: `200 OK` booking object.

### 5.3 POST /api/bookings/update
Update booking status.
- Body (JSON):
  ```json
  {
    "id": 1,
    "status_id": 2
  }
  ```
- Response: `200 OK` updated booking.

---

## 6) Booking Status

### 6.1 GET /api/booking-status
Get all booking status records.
- Response: `200 OK` array of status values.

---

## 7) Roles

### 7.1 GET /api/roles
Get all roles.
- Response: `200 OK` array of roles.

---

## Notes
- Use `Authorization: Bearer <JWT>` for protected endpoints (`/api/rooms` endpoints currently require JWT).
- Use `SEED=1 APP_ENV=development` when running server to ensure seed runs if needed.
- Start server in `be/`:
  ```bash
  PORT=8082 SEED=1 APP_ENV=development JWT_SECRET=your-secret DATABASE_URL="<your-db-url>" go run main.go
  ```
