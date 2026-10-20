import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  adoptLegacyPendingOrder,
  clearPendingOrderId,
  createPendingOrderIntent,
  getPendingOrderIntent,
  markPendingOrderConflict,
  savePendingOrderId,
} from '../src/services/pendingOrderService.ts'

function installSessionStorage() {
  function createStorage() {
    const values = new Map<string, string>()
    return {
    getItem(key: string) {
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
    removeItem(key: string) {
      values.delete(key)
    },
    }
  }
  const localStorage = createStorage()
  const sessionStorage = createStorage()
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage,
      sessionStorage,
      crypto: { randomUUID: () => 'generated-key' },
    },
  })

  return {
    restore() {
      if (previousWindow) {
        Object.defineProperty(globalThis, 'window', previousWindow)
      } else {
        Reflect.deleteProperty(globalThis, 'window')
      }
    },
    localStorage,
    sessionStorage,
  }
}

test('reuses the persisted key after an ambiguous network failure and page reload', async () => {
  const environment = installSessionStorage()
  try {
    const first = createPendingOrderIntent('user-1', () => 'attempt-key-1')
    const attemptedKeys: string[] = []
    async function simulatedCreateOrder(key: string) {
      attemptedKeys.push(key)
      if (attemptedKeys.length === 1) throw new Error('Network timeout')
      return { id: 'order-1' }
    }

    await assert.rejects(simulatedCreateOrder(first!.idempotencyKey), /Network timeout/)
    const retry = getPendingOrderIntent('user-1')

    assert.equal(first?.idempotencyKey, 'attempt-key-1')
    assert.equal(retry?.idempotencyKey, 'attempt-key-1')
    assert.deepEqual(attemptedKeys, ['attempt-key-1'])

    const replayedOrder = await simulatedCreateOrder(retry!.idempotencyKey)
    assert.equal(replayedOrder.id, 'order-1')
    assert.deepEqual(attemptedKeys, ['attempt-key-1', 'attempt-key-1'])
    assert.equal(
      savePendingOrderId('user-1', 'attempt-key-1', 'order-1')?.orderId,
      'order-1',
    )

    const resumedAfterReload = getPendingOrderIntent('user-1')
    assert.equal(resumedAfterReload?.idempotencyKey, 'attempt-key-1')
    assert.equal(resumedAfterReload?.orderId, 'order-1')
  } finally {
    environment.restore()
  }
})

test('keeps intents isolated by authenticated user', () => {
  const environment = installSessionStorage()
  try {
    createPendingOrderIntent('user-1', () => 'user-one-key')
    createPendingOrderIntent('user-2', () => 'user-two-key')

    assert.equal(getPendingOrderIntent('user-1')?.idempotencyKey, 'user-one-key')
    assert.equal(getPendingOrderIntent('user-2')?.idempotencyKey, 'user-two-key')
  } finally {
    environment.restore()
  }
})

test('a creation conflict stays blocked and does not generate another key', () => {
  const environment = installSessionStorage()
  try {
    let generatedKeyCount = 0
    const keyFactory = () => `attempt-key-${++generatedKeyCount}`
    const initial = createPendingOrderIntent('user-1', keyFactory)
    assert.ok(initial)

    const conflicted = markPendingOrderConflict('user-1', initial.idempotencyKey)
    const retry = createPendingOrderIntent('user-1', keyFactory)

    assert.equal(conflicted?.status, 'conflict')
    assert.equal(retry?.status, 'conflict')
    assert.equal(retry?.idempotencyKey, initial.idempotencyKey)
    assert.equal(generatedKeyCount, 1)
  } finally {
    environment.restore()
  }
})

test('a new independent purchase gets a new key after the previous intent is cleared', () => {
  const environment = installSessionStorage()
  try {
    const first = createPendingOrderIntent('user-1', () => 'attempt-key-1')
    savePendingOrderId('user-1', 'attempt-key-1', 'order-1')
    clearPendingOrderId('user-1', 'order-1')
    const next = createPendingOrderIntent('user-1', () => 'attempt-key-2')

    assert.equal(first?.idempotencyKey, 'attempt-key-1')
    assert.equal(next?.idempotencyKey, 'attempt-key-2')
  } finally {
    environment.restore()
  }
})

test('legacy pending order is associated only after the caller verifies it', () => {
  const environment = installSessionStorage()
  try {
    environment.sessionStorage.setItem('marketflow.pendingOrderId', 'legacy-order')
    const legacy = getPendingOrderIntent('user-1')
    assert.equal(legacy?.legacy, true)
    assert.equal(legacy?.orderId, 'legacy-order')

    const adopted = adoptLegacyPendingOrder('user-1', 'legacy-order', () => 'adopted-key')
    assert.equal(adopted?.legacy, undefined)
    assert.equal(adopted?.userId, 'user-1')
    assert.equal(adopted?.idempotencyKey, 'adopted-key')
    assert.equal(adopted?.orderId, 'legacy-order')
    assert.equal(environment.sessionStorage.getItem('marketflow.pendingOrderId'), null)
  } finally {
    environment.restore()
  }
})
