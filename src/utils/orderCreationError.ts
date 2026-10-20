export function isOrderCreationConflict(status: number | undefined): boolean {
  return status === 409
}

export const ORDER_CREATION_CONFLICT_MESSAGE =
  'A tentativa de criar o pedido entrou em conflito com o carrinho atual. Nenhum novo pedido foi criado. A tentativa anterior foi preservada para evitar duplicidade.'
