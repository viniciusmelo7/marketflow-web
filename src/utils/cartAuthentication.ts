import axios from 'axios'

export const CART_LOGIN_REQUIRED_NOTICE =
  'Entre na sua conta para acessar e atualizar o carrinho.'

export const CART_SESSION_EXPIRED_NOTICE =
  'Sua sessão pode ter expirado ou não estar autorizada. Entre novamente para continuar.'

export function isCartAuthenticationError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 401 || error.response?.status === 403)
  )
}
