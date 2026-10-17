import type { CheckoutSessionResponse } from '../types/payment'
import api from './api'

export async function createCheckoutSession(
  orderId: string,
): Promise<CheckoutSessionResponse> {
  const response = await api.post<CheckoutSessionResponse>(
    `/payments/${encodeURIComponent(orderId)}`,
  )
  return response.data
}
