import type { OrderResponse } from '../types/order.ts'
import { getOrderConfirmationOutcome } from './orderConfirmation.ts'

export type OrderLookup = (
  idempotencyKey: string,
) => Promise<OrderResponse | null>

export function shouldStartPaymentForOrder(order: OrderResponse): boolean {
  return getOrderConfirmationOutcome(order) === 'pending'
}

export async function recoverOrderByIdempotencyKey(
  idempotencyKey: string,
  lookup: OrderLookup,
  options: {
    attempts?: number
    intervalMs?: number
    wait?: (durationMs: number) => Promise<void>
  } = {},
): Promise<OrderResponse | null> {
  const attempts = Math.max(1, options.attempts ?? 3)
  const intervalMs = Math.max(0, options.intervalMs ?? 400)
  const wait =
    options.wait ??
    ((durationMs) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, durationMs)
      }))

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const order = await lookup(idempotencyKey)
    if (order) return order
    if (attempt < attempts - 1) await wait(intervalMs)
  }

  return null
}

export async function recoverOrCreateOrder(
  idempotencyKey: string,
  shouldRecover: boolean,
  lookup: OrderLookup,
  create: (key: string) => Promise<OrderResponse>,
  options: {
    attempts?: number
    intervalMs?: number
    wait?: (durationMs: number) => Promise<void>
  } = {},
): Promise<OrderResponse> {
  if (shouldRecover) {
    const recoveredOrder = await recoverOrderByIdempotencyKey(
      idempotencyKey,
      lookup,
      options,
    )
    if (recoveredOrder) return recoveredOrder
  }

  return create(idempotencyKey)
}
