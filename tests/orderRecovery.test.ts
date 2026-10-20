import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createPendingOrderIntent,
  getPendingOrderIntent,
} from '../src/services/pendingOrderService.ts'
import type { OrderResponse } from '../src/types/order.ts'
import {
  recoverOrCreateOrder,
  shouldStartPaymentForOrder,
} from '../src/utils/orderRecovery.ts'
import { isOrderResponse } from '../src/utils/orderResponse.ts'
import { recoverOrderByIdempotencyKey } from '../src/utils/orderRecovery.ts'

function installStorage() {
  const values = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage, sessionStorage: localStorage },
  })
  return () => {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
}

function order(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: 'order-1',
    status: 'PENDING_PAYMENT',
    total: 19.9,
    createdAt: '2026-10-19T12:00:00Z',
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productName: 'Product',
        unitPrice: 19.9,
        quantity: 1,
        subtotal: 19.9,
      },
    ],
    inventoryStatus: 'RESERVED',
    paymentReviewRequired: false,
    ...overrides,
  }
}

test('a recovered order is returned without needing a new creation call', async () => {
  const recovered = order()
  let lookups = 0
  const result = await recoverOrderByIdempotencyKey(
    'attempt-key',
    async (key) => {
      assert.equal(key, 'attempt-key')
      lookups += 1
      return recovered
    },
    { attempts: 3, wait: async () => undefined },
  )

  assert.equal(result?.id, 'order-1')
  assert.equal(lookups, 1)
})

test('404 results are retried a bounded number of times before creation reuses the same key', async () => {
  const restore = installStorage()
  try {
    const intent = createPendingOrderIntent('user-1', () => 'attempt-key')
    assert.ok(intent)
    let attempts = 0
    const createCalls: string[] = []
    const recovered = await recoverOrCreateOrder(
      intent.idempotencyKey,
      true,
      async () => {
        attempts += 1
        return null
      },
      async (key) => {
        createCalls.push(key)
        return order()
      },
      { attempts: 3, wait: async () => undefined },
    )

    assert.equal(recovered.id, 'order-1')
    assert.equal(attempts, 3)
    assert.equal(getPendingOrderIntent('user-1')?.idempotencyKey, 'attempt-key')
    assert.deepEqual(createCalls, ['attempt-key'])
  } finally {
    restore()
  }
})

test('network and server errors stop recovery and leave the attempt persisted', async () => {
  const restore = installStorage()
  try {
    const intent = createPendingOrderIntent('user-1', () => 'attempt-key')
    assert.ok(intent)

    for (const error of [new Error('Network error'), Object.assign(new Error('Server error'), { status: 500 })]) {
      await assert.rejects(
        recoverOrderByIdempotencyKey(intent.idempotencyKey, async () => {
          throw error
        }, { attempts: 3, wait: async () => undefined }),
        error,
      )
      assert.equal(getPendingOrderIntent('user-1')?.idempotencyKey, 'attempt-key')
    }
  } finally {
    restore()
  }
})

test('a persisted key can be resumed after reload without being read for another user', () => {
  const restore = installStorage()
  try {
    createPendingOrderIntent('user-1', () => 'attempt-key')
    assert.equal(getPendingOrderIntent('user-1')?.idempotencyKey, 'attempt-key')
    assert.equal(getPendingOrderIntent('user-2'), null)
  } finally {
    restore()
  }
})

test('a recovered order skips creation and retains its ID for the caller to persist', async () => {
  const recovered = order({ id: 'recovered-order' })
  let createCalls = 0
  const result = await recoverOrCreateOrder(
    'attempt-key',
    true,
    async () => recovered,
    async () => {
      createCalls += 1
      return order()
    },
    { wait: async () => undefined },
  )

  assert.equal(result.id, 'recovered-order')
  assert.equal(createCalls, 0)
})

test('only pending orders may continue to payment', () => {
  assert.equal(shouldStartPaymentForOrder(order()), true)
  for (const status of ['PAID', 'PAYMENT_FAILED', 'CANCELLED'] as const) {
    assert.equal(shouldStartPaymentForOrder(order({ status })), false)
  }
  assert.equal(
    shouldStartPaymentForOrder(order({ paymentReviewRequired: true })),
    false,
  )
})

test('validates the full order response shape while allowing unknown runtime states', () => {
  assert.equal(isOrderResponse(order()), true)
  assert.equal(isOrderResponse(order({ status: 'REFUNDED' as OrderResponse['status'] })), true)
  assert.equal(isOrderResponse({ id: 'order-1', status: 'PAID' }), false)
})
