import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import {
  getCart,
  removeCartItem,
  updateCartItem,
} from '../services/cartService'
import { createOrder } from '../services/orderService'
import { createCheckoutSession } from '../services/paymentService'
import {
  getPendingOrderId,
  savePendingOrderId,
} from '../services/pendingOrderService'
import type { Cart } from '../types/cart'

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function isUnauthorized(error: unknown) {
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 401 || error.response?.status === 403)
  )
}

type CartActionError = {
  message: string
  requiresLogin: boolean
}

function getCartActionError(error: unknown): CartActionError {
  if (isUnauthorized(error)) {
    return {
      message: 'Sua sessão pode ter expirado. Entre novamente para atualizar o carrinho.',
      requiresLogin: true,
    }
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return {
        message: 'Não foi possível conectar à loja. Verifique sua conexão e tente novamente.',
        requiresLogin: false,
      }
    }

    return {
      message: `Não foi possível atualizar o carrinho (HTTP ${error.response.status}). Tente novamente.`,
      requiresLogin: false,
    }
  }

  return {
    message: 'Não foi possível atualizar o carrinho. Tente novamente.',
    requiresLogin: false,
  }
}

function getCheckoutErrorMessage(
  error: unknown,
  stage: 'order' | 'payment',
): string {
  if (axios.isAxiosError(error)) {
    const responseData: unknown = error.response?.data

    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData.trim().slice(0, 240)
    }

    if (typeof responseData === 'object' && responseData !== null) {
      const payload = responseData as { message?: unknown; detail?: unknown }
      const message = [payload.message, payload.detail].find(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      )
      if (message) return message.trim().slice(0, 240)
    }

    if (error.response?.status) {
      return stage === 'order'
        ? `Não foi possível criar o pedido (HTTP ${error.response.status}).`
        : `Não foi possível iniciar o pagamento (HTTP ${error.response.status}).`
    }
  }

  return stage === 'order'
    ? 'Não foi possível criar o pedido. Verifique sua conexão e tente novamente.'
    : 'O pedido foi criado, mas não foi possível iniciar o pagamento. Tente novamente.'
}

function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [requiresLogin, setRequiresLogin] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [actionError, setActionError] = useState<CartActionError | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(
    () => getPendingOrderId(),
  )
  const [checkoutError, setCheckoutError] = useState<{
    message: string
    requiresLogin: boolean
  } | null>(null)
  const checkoutInProgressRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCart() {
      setIsLoading(true)
      setHasLoadError(false)
      setRequiresLogin(false)
      setActionError(null)

      try {
        const result = await getCart(controller.signal)
        if (!controller.signal.aborted) setCart(result)
      } catch (error) {
        if (!controller.signal.aborted) {
          setHasLoadError(true)
          setRequiresLogin(isUnauthorized(error))
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadCart()

    return () => controller.abort()
  }, [loadAttempt])

  async function changeQuantity(itemId: string, quantity: number) {
    if (isUpdating || !Number.isInteger(quantity) || quantity < 1) return

    setIsUpdating(true)
    setActionError(null)

    try {
      const updatedCart = await updateCartItem(itemId, { quantity })
      setCart(updatedCart)
    } catch (error) {
      setActionError(getCartActionError(error))
    } finally {
      setIsUpdating(false)
    }
  }

  async function deleteItem(itemId: string) {
    if (isUpdating) return

    setIsUpdating(true)
    setActionError(null)

    try {
      const updatedCart = await removeCartItem(itemId)
      setCart(updatedCart)
    } catch (error) {
      setActionError(getCartActionError(error))
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleCheckout() {
    if (
      !cart ||
      cart.items.length === 0 ||
      checkoutInProgressRef.current ||
      isUpdating
    ) {
      return
    }

    checkoutInProgressRef.current = true
    setIsCheckingOut(true)
    setCheckoutError(null)
    let stage: 'order' | 'payment' = pendingOrderId ? 'payment' : 'order'

    try {
      let orderId = pendingOrderId

      if (!orderId) {
        const order = await createOrder()
        if (!order.id.trim()) {
          throw new Error('The order response did not contain an order ID.')
        }
        orderId = order.id
        setPendingOrderId(orderId)
      }

      stage = 'payment'
      if (!savePendingOrderId(orderId)) {
        throw new Error('PENDING_ORDER_STORAGE_UNAVAILABLE')
      }
      const payment = await createCheckoutSession(orderId)
      if (!payment.checkoutUrl.trim()) {
        throw new Error('The payment service returned an empty checkout URL.')
      }

      window.location.assign(payment.checkoutUrl)
    } catch (error) {
      const requiresLogin = isUnauthorized(error)
      setCheckoutError({
        message: requiresLogin
          ? 'Sua sessão pode ter expirado. Entre novamente para continuar.'
          : error instanceof Error &&
              error.message === 'PENDING_ORDER_STORAGE_UNAVAILABLE'
            ? 'Não foi possível preservar o pedido nesta sessão do navegador. Verifique as permissões de armazenamento e tente novamente.'
            : getCheckoutErrorMessage(error, stage),
        requiresLogin,
      })
    } finally {
      checkoutInProgressRef.current = false
      setIsCheckingOut(false)
    }
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <div className="mb-7 sm:mb-9">
          <Link
            className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-brand-700 transition-colors hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
            to="/"
          >
            <ArrowLeft aria-hidden="true" size={17} />
            Voltar à loja
          </Link>
          <div className="mt-5 flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <ShoppingCart aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
                Sua seleção
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Carrinho
              </h1>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div
            className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"
            role="status"
          >
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin text-brand-600"
              size={20}
            />
            Carregando seu carrinho…
          </div>
        ) : hasLoadError ? (
          <div
            className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white px-6 text-center"
            role="alert"
          >
            <AlertCircle aria-hidden="true" className="mb-3 text-rose-600" size={25} />
            <p className="font-semibold text-slate-800">
              {requiresLogin
                ? 'Entre na sua conta para acessar o carrinho.'
                : 'Não foi possível carregar seu carrinho.'}
            </p>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              {requiresLogin
                ? 'Sua sessão pode ter expirado. Faça login e tente acessar o carrinho novamente.'
                : 'Verifique sua conexão e tente novamente.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                className="min-h-10 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                type="button"
              >
                Tentar novamente
              </button>
              {requiresLogin && (
                <Link
                  className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  to="/login"
                >
                  Ir para login
                </Link>
              )}
            </div>
          </div>
        ) : cart && cart.items.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
            <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-slate-50 text-slate-400">
              <ShoppingCart aria-hidden="true" size={27} />
            </span>
            <h2 className="font-semibold text-slate-800">Seu carrinho está vazio</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Volte à loja para conferir os produtos disponíveis.
            </p>
            <Link
              className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              to="/"
            >
              Voltar à loja
            </Link>
          </div>
        ) : cart ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
            <section aria-label="Itens do carrinho" className="space-y-3">
              {actionError && (
                <p
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                  role="alert"
                >
                  {actionError.message}
                  {actionError.requiresLogin && (
                    <Link
                      className="mt-2 inline-flex font-semibold underline underline-offset-2 hover:text-rose-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                      to="/login"
                    >
                      Ir para login
                    </Link>
                  )}
                </p>
              )}
              {cart.items.map((item) => (
                <article
                  className="grid gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_12px_-8px_rgba(16,42,67,0.28)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
                  key={item.id}
                >
                  <div className="min-w-0">
                    <h2 className="break-words font-semibold leading-6 text-slate-900">
                      {item.productName}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {priceFormatter.format(item.price)} por unidade
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
                    <div
                      aria-label={`Quantidade: ${item.quantity}`}
                      className="inline-flex h-10 items-center rounded-lg border border-slate-200"
                    >
                      <button
                        aria-label={`Diminuir quantidade de ${item.productName}`}
                        className="grid size-10 place-items-center rounded-l-lg text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={isUpdating || isCheckingOut || pendingOrderId !== null || item.quantity <= 1}
                        onClick={() => void changeQuantity(item.id, item.quantity - 1)}
                        type="button"
                      >
                        <Minus aria-hidden="true" size={15} />
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        aria-label={`Aumentar quantidade de ${item.productName}`}
                        className="grid size-10 place-items-center rounded-r-lg text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:cursor-wait disabled:opacity-50"
                        disabled={isUpdating || isCheckingOut || pendingOrderId !== null}
                        onClick={() => void changeQuantity(item.id, item.quantity + 1)}
                        type="button"
                      >
                        <Plus aria-hidden="true" size={15} />
                      </button>
                    </div>
                    <div className="min-w-24 text-right">
                      <p className="text-xs font-medium text-slate-500">Subtotal</p>
                      <p className="mt-0.5 font-bold text-slate-950">
                        {priceFormatter.format(item.subtotal)}
                      </p>
                    </div>
                    <button
                      aria-label={`Remover ${item.productName} do carrinho`}
                      className="grid size-10 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-wait disabled:opacity-50"
                      disabled={isUpdating || isCheckingOut || pendingOrderId !== null}
                      onClick={() => void deleteItem(item.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_-8px_rgba(16,42,67,0.28)] sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Resumo do pedido
              </h2>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm font-medium text-slate-600">Total</span>
                <span className="text-xl font-bold tracking-tight text-slate-950">
                  {priceFormatter.format(cart.total)}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                O total é informado pela loja com base nos itens do carrinho.
              </p>
              {pendingOrderId && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  Seu pedido já foi criado. A nova tentativa continuará com este pedido.
                </p>
              )}
              {checkoutError && (
                <div
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-800"
                  role="alert"
                >
                  <p>{checkoutError.message}</p>
                  {checkoutError.requiresLogin && (
                    <Link
                      className="mt-2 inline-flex font-semibold underline underline-offset-2 hover:text-rose-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                      to="/login"
                    >
                      Ir para login
                    </Link>
                  )}
                </div>
              )}
              <button
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-wait disabled:opacity-60"
                disabled={isCheckingOut || isUpdating || cart.items.length === 0}
                onClick={() => void handleCheckout()}
                type="button"
              >
                {isCheckingOut ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                    {pendingOrderId ? 'Iniciando pagamento…' : 'Criando pedido…'}
                  </>
                ) : pendingOrderId ? (
                  'Tentar pagamento novamente'
                ) : (
                  'Finalizar compra'
                )}
              </button>
            </aside>
          </div>
        ) : null}
      </div>
    </MainLayout>
  )
}

export default CartPage
