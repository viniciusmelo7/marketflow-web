import type { OrderResponse } from '../types/order.ts'

export function isOrderResponse(value: unknown): value is OrderResponse {
  if (typeof value !== 'object' || value === null) return false

  const order = value as Partial<OrderResponse>
  return (
    typeof order.id === 'string' &&
    order.id.trim().length > 0 &&
    typeof order.status === 'string' &&
    order.status.trim().length > 0 &&
    typeof order.total === 'number' &&
    Number.isFinite(order.total) &&
    typeof order.createdAt === 'string' &&
    typeof order.inventoryStatus === 'string' &&
    order.inventoryStatus.trim().length > 0 &&
    typeof order.paymentReviewRequired === 'boolean' &&
    Array.isArray(order.items) &&
    order.items.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.productId === 'string' &&
        typeof item.productName === 'string' &&
        typeof item.unitPrice === 'number' &&
        Number.isFinite(item.unitPrice) &&
        typeof item.quantity === 'number' &&
        Number.isInteger(item.quantity) &&
        typeof item.subtotal === 'number' &&
        Number.isFinite(item.subtotal),
    )
  )
}
