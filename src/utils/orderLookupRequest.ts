export function createOrderLookupConfig(
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  if (!idempotencyKey.trim() || idempotencyKey.length > 255) {
    throw new Error('A valid Idempotency-Key is required to look up an order.')
  }

  return {
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  }
}

export function isOrderLookupNotFound(status: number | undefined): boolean {
  return status === 404
}
