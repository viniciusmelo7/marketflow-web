import type { Product } from '../types/product'
import api from './api'

export async function getProducts(signal?: AbortSignal): Promise<Product[]> {
  const response = await api.get<Product[]>('/products', { signal })
  return response.data
}
