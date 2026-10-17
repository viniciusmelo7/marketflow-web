import type {
  AddCartItemRequest,
  Cart,
  UpdateCartItemRequest,
} from '../types/cart'
import api from './api'

export async function getCart(signal?: AbortSignal): Promise<Cart> {
  const response = await api.get<Cart>('/cart', { signal })
  return response.data
}

export async function addCartItem(
  request: AddCartItemRequest,
  signal?: AbortSignal,
): Promise<Cart> {
  const response = await api.post<Cart>('/cart/items', request, { signal })
  return response.data
}

export async function updateCartItem(
  itemId: string,
  request: UpdateCartItemRequest,
  signal?: AbortSignal,
): Promise<Cart> {
  const response = await api.put<Cart>(`/cart/items/${itemId}`, request, {
    signal,
  })
  return response.data
}

export async function removeCartItem(
  itemId: string,
  signal?: AbortSignal,
): Promise<Cart> {
  const response = await api.delete<Cart>(`/cart/items/${itemId}`, { signal })
  return response.data
}
