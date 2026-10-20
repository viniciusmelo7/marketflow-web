import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { OrderResponse } from '../src/types/order.ts'
import {
  getOrderConfirmationOutcome,
  shouldClearPendingOrderId,
} from '../src/utils/orderConfirmation.ts'

function createOrder(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: 'order-id',
    status: 'PENDING_PAYMENT',
    total: 100,
    createdAt: '2026-01-01T00:00:00',
    items: [],
    inventoryStatus: 'RESERVED',
    paymentReviewRequired: false,
    ...overrides,
  }
}

test('operational review takes priority over a paid status', () => {
  const order = createOrder({
    status: 'PAID',
    inventoryStatus: 'DEDUCTED',
    paymentReviewRequired: true,
  })

  assert.equal(getOrderConfirmationOutcome(order), 'review')
})

test('operational review takes priority over a cancelled status', () => {
  const order = createOrder({
    status: 'CANCELLED',
    inventoryStatus: 'REVIEW_REQUIRED',
  })

  assert.equal(getOrderConfirmationOutcome(order), 'review')
})

test('paid order without review is confirmed', () => {
  const order = createOrder({ status: 'PAID', inventoryStatus: 'DEDUCTED' })

  assert.equal(getOrderConfirmationOutcome(order), 'confirmed')
})

test('payment failure is distinct from cancellation', () => {
  const order = createOrder({ status: 'PAYMENT_FAILED' })

  assert.equal(getOrderConfirmationOutcome(order), 'payment-failed')
})

test('cancelled order without review is cancelled', () => {
  const order = createOrder({ status: 'CANCELLED' })

  assert.equal(getOrderConfirmationOutcome(order), 'cancelled')
})

test('pending payment remains pending', () => {
  assert.equal(getOrderConfirmationOutcome(createOrder()), 'pending')
})

test('inventory review status takes priority without the payment flag', () => {
  const order = createOrder({
    status: 'PAID',
    inventoryStatus: 'REVIEW_REQUIRED',
  })

  assert.equal(getOrderConfirmationOutcome(order), 'review')
})

test('unrecognized runtime status is neutral', () => {
  const order = createOrder({ status: 'REFUNDED' as OrderResponse['status'] })

  assert.equal(getOrderConfirmationOutcome(order), 'unknown')
})

test('pending order ID is cleared for terminal outcomes only', () => {
  assert.equal(shouldClearPendingOrderId('confirmed'), true)
  assert.equal(shouldClearPendingOrderId('payment-failed'), true)
  assert.equal(shouldClearPendingOrderId('cancelled'), true)
  assert.equal(shouldClearPendingOrderId('pending'), false)
  assert.equal(shouldClearPendingOrderId('review'), false)
  assert.equal(shouldClearPendingOrderId('unknown'), false)
})

test('pending order ID is retained when terminal status requires review', () => {
  const paidOrderUnderReview = createOrder({
    status: 'PAID',
    inventoryStatus: 'DEDUCTED',
    paymentReviewRequired: true,
  })
  const cancelledOrderUnderReview = createOrder({
    status: 'CANCELLED',
    inventoryStatus: 'REVIEW_REQUIRED',
  })

  assert.equal(
    shouldClearPendingOrderId(getOrderConfirmationOutcome(paidOrderUnderReview)),
    false,
  )
  assert.equal(
    shouldClearPendingOrderId(getOrderConfirmationOutcome(cancelledOrderUnderReview)),
    false,
  )
})
