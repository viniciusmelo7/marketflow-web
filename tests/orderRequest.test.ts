import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOrderRequestConfig } from '../src/utils/orderRequest.ts'
import {
  createOrderLookupConfig,
  isOrderLookupNotFound,
} from '../src/utils/orderLookupRequest.ts'

test('creates POST /orders config with the Idempotency-Key header', () => {
  assert.deepEqual(createOrderRequestConfig('attempt-key'), {
    headers: { 'Idempotency-Key': 'attempt-key' },
  })
})

test('rejects empty or overlong idempotency keys before the request', () => {
  assert.throws(() => createOrderRequestConfig('  '))
  assert.throws(() => createOrderRequestConfig('x'.repeat(256)))
  assert.doesNotThrow(() => createOrderRequestConfig('x'.repeat(255)))
})

test('creates authenticated lookup config with the Idempotency-Key header', () => {
  const controller = new AbortController()
  assert.deepEqual(createOrderLookupConfig('attempt-key', controller.signal), {
    headers: { 'Idempotency-Key': 'attempt-key' },
    signal: controller.signal,
  })
})

test('only HTTP 404 is treated as an absent idempotency association', () => {
  assert.equal(isOrderLookupNotFound(404), true)
  for (const status of [400, 401, 403, 409, 500, 502, undefined]) {
    assert.equal(isOrderLookupNotFound(status), false)
  }
})
