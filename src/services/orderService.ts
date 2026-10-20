import axios from 'axios'
import type { OrderResponse } from '../types/order'
import { isOrderResponse } from '../utils/orderResponse'
import {
  createOrderLookupConfig,
  isOrderLookupNotFound,
} from '../utils/orderLookupRequest'
import { createOrderRequestConfig } from '../utils/orderRequest'
import api from './api'

export async function createOrder(idempotencyKey: string): Promise<OrderResponse> {
  const response = await api.post<OrderResponse>(
    '/orders',
    undefined,
    createOrderRequestConfig(idempotencyKey),
  )
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

export async function getOrderByIdempotencyKey(
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<OrderResponse | null> {
  try {
    const response = await api.get<unknown>(
      '/orders/by-idempotency-key',
      createOrderLookupConfig(idempotencyKey, signal),
    )

    if (!isOrderResponse(response.data)) {
      throw new Error('The order lookup returned an invalid response.')
    }

    return response.data
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      isOrderLookupNotFound(error.response?.status)
    ) return null
    throw error
  }
}
