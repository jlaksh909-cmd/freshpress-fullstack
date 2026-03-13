import fetchClient from './client'

export const createBooking = async (bookingData) => {
  return await fetchClient('/bookings', {
    method: 'POST',
    body: bookingData,
  })
}

export const getBookings = async () => {
  return await fetchClient('/bookings')
}

export const cancelBooking = async (id) => {
  return await fetchClient(`/bookings/${id}/cancel`, {
    method: 'PATCH',
  })
}
