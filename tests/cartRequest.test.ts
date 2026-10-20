import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCartRequest } from '../src/utils/cartRequest.ts'

test('releases the cart loading state when a delete request fails', async () => {
  let isLoading = true

  await assert.rejects(
    runCartRequest(
      () => Promise.reject(new Error('HTTP 409')),
      () => {
        isLoading = false
      },
    ),
    /HTTP 409/,
  )

  assert.equal(isLoading, false)
})
