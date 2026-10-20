import type { OrderResponse } from '../types/order.ts'

export type OrderConfirmationOutcome =
  | 'review'
  | 'confirmed'
  | 'payment-failed'
  | 'cancelled'
  | 'pending'
  | 'unknown'

export function shouldClearPendingOrderId(
  outcome: OrderConfirmationOutcome,
): boolean {
  return (
    outcome === 'confirmed' ||
    outcome === 'payment-failed' ||
    outcome === 'cancelled'
  )
}

export function getOrderConfirmationOutcome(
  order: OrderResponse,
): OrderConfirmationOutcome {
  if (
    order.paymentReviewRequired ||
    order.inventoryStatus === 'REVIEW_REQUIRED'
  ) {
    return 'review'
  }

  switch (order.status) {
    case 'PAID':
      return 'confirmed'
    case 'PAYMENT_FAILED':
      return 'payment-failed'
    case 'CANCELLED':
      return 'cancelled'
    case 'PENDING_PAYMENT':
      return 'pending'
    default:
      return 'unknown'
  }
}
