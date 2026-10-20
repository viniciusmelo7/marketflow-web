export function createOrderRequestConfig(idempotencyKey: string) {
  if (!idempotencyKey.trim() || idempotencyKey.length > 255) {
    throw new Error('A valid Idempotency-Key is required to create an order.')
  }

  return { headers: { 'Idempotency-Key': idempotencyKey } }
}
