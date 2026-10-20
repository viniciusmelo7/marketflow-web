const CHECKOUT_CONFIRMATION_PENDING_MESSAGE =
  'Checkout Session is complete; payment confirmation is pending'

export function getCheckoutApiErrorMessage(data: unknown): string | null {
  if (typeof data === 'string' && data.trim()) return data.trim().slice(0, 240)
  if (typeof data !== 'object' || data === null) return null

  const payload = data as {
    message?: unknown
    detail?: unknown
    error?: unknown
  }
  const message = [payload.message, payload.detail, payload.error].find(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0,
  )

  return message?.trim().slice(0, 240) ?? null
}

export function isCheckoutConfirmationPendingError(
  status: number | undefined,
  data: unknown,
): boolean {
  return (
    status === 409 &&
    getCheckoutApiErrorMessage(data) === CHECKOUT_CONFIRMATION_PENDING_MESSAGE
  )
}
