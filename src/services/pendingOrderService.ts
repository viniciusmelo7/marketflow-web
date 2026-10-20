const LEGACY_PENDING_ORDER_STORAGE_KEY = 'marketflow.pendingOrderId'
const ORDER_INTENT_STORAGE_PREFIX = 'marketflow.orderIntent.'

export type PendingOrderIntent = {
  userId: string
  idempotencyKey: string
  orderId: string | null
  status: 'active' | 'conflict'
  legacy?: boolean
}

function getIntentStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getLegacyStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function getIntentStorageKey(userId: string): string {
  return `${ORDER_INTENT_STORAGE_PREFIX}${encodeURIComponent(userId)}`
}

function isPendingOrderIntent(value: unknown, userId: string): value is PendingOrderIntent {
  if (typeof value !== 'object' || value === null) return false

  const intent = value as Partial<PendingOrderIntent>
  return (
    intent.userId === userId &&
    typeof intent.idempotencyKey === 'string' &&
    intent.idempotencyKey.trim().length > 0 &&
    (typeof intent.orderId === 'string' || intent.orderId === null) &&
    (intent.status === 'active' || intent.status === 'conflict')
  )
}

function createIdempotencyKey(): string {
  if (typeof window === 'undefined' || !window.crypto?.randomUUID) {
    throw new Error('Secure idempotency key generation is unavailable.')
  }

  return window.crypto.randomUUID()
}

function readStoredIntent(userId: string): PendingOrderIntent | null {
  const storage = getIntentStorage()
  if (!storage) return null

  try {
    const value = storage.getItem(getIntentStorageKey(userId))
    if (!value) return null

    const intent: unknown = JSON.parse(value)
    if (isPendingOrderIntent(intent, userId)) return intent

    storage.removeItem(getIntentStorageKey(userId))
  } catch {
    return null
  }

  return null
}

export function getPendingOrderIntent(userId: string | null): PendingOrderIntent | null {
  if (!userId) return null

  const storedIntent = readStoredIntent(userId)
  if (storedIntent) return storedIntent

  // Older versions stored only the order ID. Keep it recoverable, but do not
  // associate it with this user until the authenticated GET /orders/{id} succeeds.
  const storage = getLegacyStorage()
  if (!storage) return null

  try {
    const legacyOrderId = storage.getItem(LEGACY_PENDING_ORDER_STORAGE_KEY)?.trim()
    if (!legacyOrderId) return null

    return {
      userId,
      idempotencyKey: '',
      orderId: legacyOrderId,
      status: 'active',
      legacy: true,
    }
  } catch {
    return null
  }
}

export function createPendingOrderIntent(
  userId: string,
  keyFactory: () => string = createIdempotencyKey,
): PendingOrderIntent | null {
  const storage = getIntentStorage()
  if (!storage || !userId) return null

  const existing = readStoredIntent(userId)
  if (existing) return existing

  let idempotencyKey: string
  try {
    idempotencyKey = keyFactory()
  } catch {
    return null
  }

  if (!idempotencyKey.trim() || idempotencyKey.length > 255) return null

  const intent: PendingOrderIntent = {
    userId,
    idempotencyKey,
    orderId: null,
    status: 'active',
  }

  try {
    storage.setItem(getIntentStorageKey(userId), JSON.stringify(intent))
    return intent
  } catch {
    return null
  }
}

export function savePendingOrderId(
  userId: string,
  idempotencyKey: string,
  orderId: string,
): PendingOrderIntent | null {
  const intent = readStoredIntent(userId)
  if (!intent || intent.idempotencyKey !== idempotencyKey || !orderId.trim()) {
    return null
  }

  const updatedIntent = { ...intent, orderId, status: 'active' as const }
  const storage = getIntentStorage()
  if (!storage) return null

  try {
    storage.setItem(getIntentStorageKey(userId), JSON.stringify(updatedIntent))
    return updatedIntent
  } catch {
    return null
  }
}

export function adoptLegacyPendingOrder(
  userId: string,
  orderId: string,
  keyFactory: () => string = createIdempotencyKey,
): PendingOrderIntent | null {
  const storage = getIntentStorage()
  if (!storage || !userId || !orderId.trim()) return null

  const existing = readStoredIntent(userId)
  if (existing) return existing

  let idempotencyKey: string
  try {
    idempotencyKey = keyFactory()
  } catch {
    return null
  }

  if (!idempotencyKey.trim() || idempotencyKey.length > 255) return null

  const intent: PendingOrderIntent = {
    userId,
    idempotencyKey,
    orderId,
    status: 'active',
  }

  try {
    storage.setItem(getIntentStorageKey(userId), JSON.stringify(intent))
    const legacyStorage = getLegacyStorage()
    if (legacyStorage?.getItem(LEGACY_PENDING_ORDER_STORAGE_KEY) === orderId) {
      legacyStorage.removeItem(LEGACY_PENDING_ORDER_STORAGE_KEY)
    }
    return intent
  } catch {
    return null
  }
}

export function markPendingOrderConflict(
  userId: string,
  idempotencyKey: string,
): PendingOrderIntent | null {
  const intent = readStoredIntent(userId)
  if (!intent || intent.idempotencyKey !== idempotencyKey) return null

  const conflictedIntent = { ...intent, status: 'conflict' as const }
  const storage = getIntentStorage()
  if (!storage) return null

  try {
    storage.setItem(getIntentStorageKey(userId), JSON.stringify(conflictedIntent))
    return conflictedIntent
  } catch {
    return null
  }
}

export function clearPendingOrderId(
  userId: string | null,
  expectedOrderId?: string,
): void {
  const storage = getIntentStorage()
  if (!storage) return

  try {
    if (userId) {
      const intent = readStoredIntent(userId)
      if (!expectedOrderId || !intent || intent.orderId === expectedOrderId) {
        storage.removeItem(getIntentStorageKey(userId))
      }
    }

    const legacyStorage = getLegacyStorage()
    const legacyOrderId = legacyStorage?.getItem(LEGACY_PENDING_ORDER_STORAGE_KEY)
    if (legacyOrderId && (!expectedOrderId || legacyOrderId === expectedOrderId)) {
      legacyStorage?.removeItem(LEGACY_PENDING_ORDER_STORAGE_KEY)
    }
  } catch {
    // Keep confirmation usable if browser storage is unavailable.
  }
}
