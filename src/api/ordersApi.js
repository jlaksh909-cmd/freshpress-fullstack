import fetchClient from './client'

export const getOrders = async () => {
  return await fetchClient('/orders')
}

export const getOrderById = async (id) => {
  return await fetchClient(`/orders/${id}`)
}
