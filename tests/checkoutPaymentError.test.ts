import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getCheckoutApiErrorMessage,
  isCheckoutConfirmationPendingError,
} from '../src/utils/checkoutPaymentError.ts'
import { isOrderCreationConflict } from '../src/utils/orderCreationError.ts'

test('reads the backend GlobalExceptionHandler error field', () => {
  assert.equal(
    getCheckoutApiErrorMessage({
      status: 409,
      error: 'Checkout Session is complete; payment confirmation is pending',
    }),
    'Checkout Session is complete; payment confirmation is pending',
  )
})

test('recognizes only the completed checkout awaiting webhook confirmation', () => {
  const payload = {
    error: 'Checkout Session is complete; payment confirmation is pending',
  }

  assert.equal(isCheckoutConfirmationPendingError(409, payload), true)
  assert.equal(isCheckoutConfirmationPendingError(409, { error: 'Order cannot be paid' }), false)
  assert.equal(isCheckoutConfirmationPendingError(502, payload), false)
})

test('recognizes order creation conflicts separately from other failures', () => {
  assert.equal(isOrderCreationConflict(409), true)
  assert.equal(isOrderCreationConflict(502), false)
  assert.equal(isOrderCreationConflict(undefined), false)
})
