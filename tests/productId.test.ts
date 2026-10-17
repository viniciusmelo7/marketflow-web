import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isValidProductId } from '../src/utils/productId.ts'

test('accepts a canonical UUID product identifier', () => {
  assert.equal(isValidProductId('755986f1-5282-49f0-9b35-64f00ebc7729'), true)
})

test('accepts uppercase hexadecimal UUID identifiers', () => {
  assert.equal(isValidProductId('755986F1-5282-49F0-9B35-64F00EBC7729'), true)
})

test('rejects empty and malformed product identifiers', () => {
  assert.equal(isValidProductId(''), false)
  assert.equal(isValidProductId('not-a-uuid'), false)
  assert.equal(isValidProductId('755986f1-5282-49f0-9b35'), false)
  assert.equal(isValidProductId(' 755986f1-5282-49f0-9b35-64f00ebc7729 '), false)
})
