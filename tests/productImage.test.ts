import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getProductImageUrl,
  shouldDisplayProductImage,
} from '../src/utils/productImage.ts'
import {
  resolveCartProductImageKey,
  resolveLocalProductImageKey,
} from '../src/utils/productImageMapping.ts'
import { getCartProductImageClass } from '../src/utils/cartProductImage.ts'

test('accepts HTTP and HTTPS product image URLs', () => {
  assert.equal(getProductImageUrl('https://cdn.example.com/item.jpg'), 'https://cdn.example.com/item.jpg')
  assert.equal(getProductImageUrl('http://cdn.example.com/item.jpg'), 'http://cdn.example.com/item.jpg')
})

test('returns no image for missing, null, empty, or unsupported URLs', () => {
  assert.equal(getProductImageUrl(undefined), null)
  assert.equal(getProductImageUrl(null), null)
  assert.equal(getProductImageUrl('  '), null)
  assert.equal(getProductImageUrl('javascript:alert(1)'), null)
  assert.equal(getProductImageUrl('/images/item.jpg'), null)
})

test('hides a product image after its URL fails to load', () => {
  const imageUrl = 'https://cdn.example.com/item.jpg'

  assert.equal(shouldDisplayProductImage(imageUrl, undefined), true)
  assert.equal(shouldDisplayProductImage(imageUrl, imageUrl), false)
  assert.equal(shouldDisplayProductImage(imageUrl, 'https://cdn.example.com/old.jpg'), true)
  assert.equal(shouldDisplayProductImage(null, undefined), false)
})

test('maps known API image paths to their local product assets', () => {
  assert.equal(
    resolveLocalProductImageKey(
      'https://images.unsplash.com/photo-1562819606-b7a0ebd7e7c5?auto=format&w=800',
      'Teclado Mecânico',
    ),
    'mechanical-keyboard',
  )
  assert.equal(
    resolveLocalProductImageKey(
      'https://images.unsplash.com/photo-1770195483917-b3bb444b7a29?auto=format&w=800',
      'Cadeira Gamer Ergonômica',
    ),
    'gaming-chair',
  )
})

test('uses a deterministic local asset when imageUrl is missing or null', () => {
  assert.equal(
    resolveLocalProductImageKey(undefined, 'Headset Gamer'),
    'gaming-headset',
  )
  assert.equal(
    resolveLocalProductImageKey(null, 'Computador Gamer de Entrada'),
    'gaming-pc',
  )
})

test('does not guess an image when neither URL nor product name matches', () => {
  assert.equal(resolveLocalProductImageKey(null, 'Produto desconhecido'), null)
  assert.equal(
    resolveLocalProductImageKey('https://cdn.example.com/unknown.jpg', 'Headset Gamer'),
    null,
  )
})

test('keeps the Mouse Gamer Pro URL and uses the approved catalog framing in the cart', () => {
  const mouseImageUrl =
    'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=800&q=80'

  assert.equal(getProductImageUrl(mouseImageUrl), mouseImageUrl)
  assert.equal(resolveLocalProductImageKey(mouseImageUrl, 'Mouse Gamer Pro'), null)
  assert.equal(resolveCartProductImageKey(mouseImageUrl, 'Mouse Gamer Pro'), 'gaming-mouse')
  assert.equal(resolveCartProductImageKey(null, 'Mouse Gamer Pro'), 'gaming-mouse')
  assert.equal(
    getCartProductImageClass('/photo-1527814050087-3793815479db'),
    'object-cover scale-110',
  )
})

test('keeps the existing contained thumbnail treatment for other cart products', () => {
  assert.equal(getCartProductImageClass('/photo-1562819606-b7a0ebd7e7c5'), 'object-contain p-1.5')
})
