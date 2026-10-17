import type { OrderResponse } from '../types/order'
import api from './api'

export async function createOrder(): Promise<OrderResponse> {
  const response = await api.post<OrderResponse>('/orders')
  return response.data
}

export async function getOrderById(
  orderId: string,
  signal?: AbortSignal,
): Promise<OrderResponse> {
  const response = await api.get<OrderResponse>(
    `/orders/${encodeURIComponent(orderId)}`,
    { signal },
  )
  return response.data
}
