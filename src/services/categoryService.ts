import type { Category } from '../types/category'
import api from './api'

export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  const response = await api.get<Category[]>('/categories', { signal })
  return response.data
}
