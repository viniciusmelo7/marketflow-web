export type CartItem = {
  id: string
  productId: string
  productName: string
  price: number
  quantity: number
  subtotal: number
}

export type Cart = {
  id: string
  userId: string
  items: CartItem[]
  total: number
}

export type AddCartItemRequest = {
  productId: string
  quantity: number
}

export type UpdateCartItemRequest = {
  quantity: number
}
