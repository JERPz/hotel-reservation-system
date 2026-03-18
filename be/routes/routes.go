package routes

import "net/http"

func RegisterHTTPHandlers(mux *http.ServeMux) {
    mux.HandleFunc("/api/users/register", RegisterUser)
    mux.HandleFunc("/api/users/login", LoginUser)
    mux.HandleFunc("/api/users", GetUsers)

    mux.HandleFunc("/api/room-types", GetRoomTypes)
    mux.HandleFunc("/api/room-types/create", CreateRoomType)

    mux.HandleFunc("/api/rooms", GetRooms)
    mux.HandleFunc("/api/rooms/create", CreateRoom)

    mux.HandleFunc("/api/bookings", GetBookings)
    mux.HandleFunc("/api/bookings/create", CreateBooking)
    mux.HandleFunc("/api/bookings/update", UpdateBooking)

    mux.HandleFunc("/api/booking-status", GetBookingStatus)
    mux.HandleFunc("/api/roles", GetRoles)
    mux.HandleFunc("/api/auth/register", RegisterAuth)
    mux.HandleFunc("/api/auth/login", LoginAuth)
}
