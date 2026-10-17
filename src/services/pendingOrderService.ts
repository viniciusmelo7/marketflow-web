const PENDING_ORDER_STORAGE_KEY = 'marketflow.pendingOrderId'

export function getPendingOrderId(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const orderId = window.sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY)
    return orderId?.trim() || null
  } catch {
    return null
  }
}

export function savePendingOrderId(orderId: string): boolean {
  if (typeof window === 'undefined' || !orderId.trim()) return false

  try {
    window.sessionStorage.setItem(PENDING_ORDER_STORAGE_KEY, orderId)
    return true
  } catch {
    return false
  }
}

export function clearPendingOrderId(): void {
  try {
    window.sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY)
  } catch {
    // Keep confirmation usable if browser storage is unavailable.
  }
}
