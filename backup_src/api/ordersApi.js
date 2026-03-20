import fetchClient from './client'

export const getOrders = async () => {
  return await fetchClient('/orders')
}

export const getOrderById = async (id) => {
  return await fetchClient(`/orders/${id}`)
}

export const cancelOrder = async (id) => {
  return await fetchClient(`/orders/${id}/status`, {
    method: 'PATCH',
    body: { status: 5 } // Using 5 to represent Cancelled in status payload
  })
}
