export type OrderItemResponse = {
  id: string
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  subtotal: number
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'CANCELLED'

export type InventoryStatus =
  | 'NOT_RESERVED'
  | 'RESERVED'
  | 'DEDUCTED'
  | 'RELEASED'
  | 'REVIEW_REQUIRED'

export type OrderResponse = {
  id: string
  status: OrderStatus
  total: number
  createdAt: string
  items: OrderItemResponse[]
  inventoryStatus: InventoryStatus
  paymentReviewRequired: boolean
}
