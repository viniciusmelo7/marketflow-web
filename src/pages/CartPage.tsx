import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  LoaderCircle,
  Minus,
  PackageOpen,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import {
  getCart,
  removeCartItem,
  updateCartItem,
} from '../services/cartService'
import {
  createOrder,
  getOrderById,
  getOrderByIdempotencyKey,
} from '../services/orderService'
import { createCheckoutSession } from '../services/paymentService'
import {
  adoptLegacyPendingOrder,
  createPendingOrderIntent,
  getPendingOrderIntent,
  markPendingOrderConflict,
  savePendingOrderId,
  clearPendingOrderId,
  type PendingOrderIntent,
} from '../services/pendingOrderService'
import { getSession } from '../services/sessionService'
import type { Cart } from '../types/cart'
import type { OrderResponse } from '../types/order'
import type { OrderConfirmationOutcome } from '../utils/orderConfirmation'
import { CART_SESSION_EXPIRED_NOTICE } from '../utils/cartAuthentication'
import { runCartRequest } from '../utils/cartRequest'
import {
  getOrderConfirmationOutcome,
  shouldClearPendingOrderId,
} from '../utils/orderConfirmation'
import {
  shouldDisplayProductImage,
} from '../utils/productImage'
import { resolveCartProductImage } from '../utils/productImageResolver'
import { getCartProductImageClass } from '../utils/cartProductImage'
import {
  getCheckoutApiErrorMessage,
  isCheckoutConfirmationPendingError,
} from '../utils/checkoutPaymentError'
import {
  isOrderCreationConflict,
  ORDER_CREATION_CONFLICT_MESSAGE,
} from '../utils/orderCreationError'
import {
  recoverOrderByIdempotencyKey,
  recoverOrCreateOrder,
  shouldStartPaymentForOrder,
} from '../utils/orderRecovery'

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const expiredSessionLoginState = {
  notice: CART_SESSION_EXPIRED_NOTICE,
  reauthenticate: true,
}

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

type PendingOrderCheck = {
  orderId: string
  attempt: number
  outcome?: OrderConfirmationOutcome
  error?: {
    message: string
    requiresLogin: boolean
  }
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
    const responseMessage = getCheckoutApiErrorMessage(error.response?.data)
    if (responseMessage) return responseMessage

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

function getRecoveredOrderMessage(order: OrderResponse): string {
  const outcome = getOrderConfirmationOutcome(order)
  if (outcome === 'review') {
    return 'O pedido recuperado está em análise. Não é necessário repetir o pagamento.'
  }
  if (outcome === 'confirmed') {
    return 'O pedido recuperado já foi pago. Não iniciaremos outro pagamento.'
  }
  if (outcome === 'payment-failed') {
    return 'O pedido recuperado tem pagamento não concluído. Nenhum novo checkout foi iniciado.'
  }
  if (outcome === 'cancelled') {
    return 'O pedido recuperado foi cancelado. Nenhum novo checkout foi iniciado.'
  }
  if (outcome === 'unknown') {
    return 'O pedido foi recuperado, mas seu status não é reconhecido. Nenhum pagamento foi iniciado.'
  }
  return 'O pedido anterior foi recuperado. Por segurança, revise seu status antes de continuar.'
}

function CartPage() {
  const navigate = useNavigate()
  const [checkoutUserId] = useState(() => getSession()?.id ?? null)
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [requiresLogin, setRequiresLogin] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [failedProductImages, setFailedProductImages] = useState<
    Record<string, string | undefined>
  >({})
  const [actionError, setActionError] = useState<CartActionError | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [orderIntent, setOrderIntent] = useState<PendingOrderIntent | null>(
    () => getPendingOrderIntent(checkoutUserId),
  )
  const pendingOrderId = orderIntent?.orderId ?? null
  const [pendingOrderCheckAttempt, setPendingOrderCheckAttempt] = useState(0)
  const [pendingOrderCheck, setPendingOrderCheck] =
    useState<PendingOrderCheck | null>(null)
  const [checkoutError, setCheckoutError] = useState<{
    message: string
    requiresLogin: boolean
  } | null>(() =>
    orderIntent?.status === 'conflict'
      ? { message: ORDER_CREATION_CONFLICT_MESSAGE, requiresLogin: false }
      : null,
  )
  const checkoutInProgressRef = useRef(false)
  const currentPendingOrderCheck =
    pendingOrderCheck?.orderId === pendingOrderId &&
    pendingOrderCheck.attempt === pendingOrderCheckAttempt
      ? pendingOrderCheck
      : null
  const isReconcilingPendingOrder =
    pendingOrderId !== null && currentPendingOrderCheck === null
  const pendingOrderCheckError = currentPendingOrderCheck?.error ?? null
  const pendingOrderOutcome = currentPendingOrderCheck?.outcome ?? null

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

  useEffect(() => {
    if (!pendingOrderId) {
      return
    }

    const orderIdToReconcile = pendingOrderId
    const attemptToReconcile = pendingOrderCheckAttempt
    const controller = new AbortController()

    async function reconcilePendingOrder() {
      try {
        const order = await getOrderById(orderIdToReconcile, controller.signal)
        if (controller.signal.aborted) return
        if (getSession()?.id !== checkoutUserId) {
          setPendingOrderCheck({
            orderId: orderIdToReconcile,
            attempt: attemptToReconcile,
            error: {
              message: 'Entre novamente na conta que iniciou esta compra para continuar.',
              requiresLogin: true,
            },
          })
          return
        }

        let verifiedIntent = orderIntent
        if (verifiedIntent?.legacy && checkoutUserId) {
          verifiedIntent = adoptLegacyPendingOrder(
            checkoutUserId,
            orderIdToReconcile,
          )
          if (!verifiedIntent) {
            setPendingOrderCheck({
              orderId: orderIdToReconcile,
              attempt: attemptToReconcile,
              error: {
                message: 'Não foi possível vincular o pedido salvo à sua sessão. Tente verificar novamente antes de continuar.',
                requiresLogin: false,
              },
            })
            return
          }
          setOrderIntent(verifiedIntent)
        }

        const outcome = getOrderConfirmationOutcome(order)
        setPendingOrderCheck({
          orderId: orderIdToReconcile,
          attempt: attemptToReconcile,
          outcome,
        })
        if (shouldClearPendingOrderId(outcome)) {
          clearPendingOrderId(checkoutUserId, orderIdToReconcile)
          setOrderIntent(null)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const requiresLogin = isUnauthorized(error)
          setPendingOrderCheck({
            orderId: orderIdToReconcile,
            attempt: attemptToReconcile,
            error: {
              message: requiresLogin
                ? 'Sua sessão pode ter expirado. Entre novamente para confirmar o estado do pedido.'
                : 'Não foi possível confirmar o estado do pedido pendente. As ações do carrinho permanecem bloqueadas para evitar duplicidade.',
              requiresLogin,
            },
          })
        }
      }
    }

    void reconcilePendingOrder()

    return () => controller.abort()
  }, [pendingOrderId, pendingOrderCheckAttempt, checkoutUserId, orderIntent])

  async function changeQuantity(itemId: string, quantity: number) {
    if (
      isUpdating ||
      orderIntent !== null ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) return

    setIsUpdating(true)
    setActionError(null)

    try {
      const updatedCart = await runCartRequest(
        () => updateCartItem(itemId, { quantity }),
        () => setIsUpdating(false),
      )
      setCart(updatedCart)
    } catch (error) {
      setActionError(getCartActionError(error))
    }
  }

  async function deleteItem(itemId: string) {
    if (isUpdating || orderIntent !== null) return

    setIsUpdating(true)
    setActionError(null)

    try {
      const updatedCart = await runCartRequest(
        () => removeCartItem(itemId),
        () => setIsUpdating(false),
      )
      setCart(updatedCart)
    } catch (error) {
      setActionError(getCartActionError(error))
    }
  }

  async function retryOrderRecovery() {
    const intent = orderIntent
    if (
      !intent ||
      !intent.idempotencyKey ||
      checkoutInProgressRef.current ||
      !checkoutUserId
    ) {
      return
    }

    if (getSession()?.id !== checkoutUserId) {
      setCheckoutError({
        message: 'Entre novamente na conta que iniciou esta compra para recuperar o pedido.',
        requiresLogin: true,
      })
      return
    }

    checkoutInProgressRef.current = true
    setIsCheckingOut(true)
    setCheckoutError(null)
    try {
      const recoveredOrder = await recoverOrderByIdempotencyKey(
        intent.idempotencyKey,
        (key) => getOrderByIdempotencyKey(key),
      )
      if (!recoveredOrder) {
        setCheckoutError({
          message: 'Ainda não há um pedido associado à chave. A tentativa foi preservada; tente consultar novamente mais tarde.',
          requiresLogin: false,
        })
        return
      }

      const persistedIntent = savePendingOrderId(
        checkoutUserId,
        intent.idempotencyKey,
        recoveredOrder.id,
      )
      if (!persistedIntent) throw new Error('PENDING_ORDER_STORAGE_UNAVAILABLE')

      const outcome = getOrderConfirmationOutcome(recoveredOrder)
      if (outcome !== 'pending') {
        setOrderIntent(persistedIntent)
        navigate('/checkout/confirmation', { replace: true })
        return
      }

      const conflictIntent = markPendingOrderConflict(
        checkoutUserId,
        intent.idempotencyKey,
      )
      setOrderIntent(conflictIntent ?? { ...persistedIntent, status: 'conflict' })
      setCheckoutError({
        message: getRecoveredOrderMessage(recoveredOrder),
        requiresLogin: false,
      })
    } catch (error) {
      const requiresLogin = isUnauthorized(error)
      setCheckoutError({
        message: requiresLogin
          ? 'Sua sessão pode ter expirado. Entre novamente para recuperar o pedido pela mesma chave.'
          : getCheckoutErrorMessage(error, 'order'),
        requiresLogin,
      })
    } finally {
      checkoutInProgressRef.current = false
      setIsCheckingOut(false)
    }
  }

  async function handleOrderCreationConflict(intent: PendingOrderIntent) {
    if (!checkoutUserId) return

    let recoveredOrder: OrderResponse | null = null
    let recoveryError: unknown
    try {
      recoveredOrder = await recoverOrderByIdempotencyKey(
        intent.idempotencyKey,
        (key) => getOrderByIdempotencyKey(key),
      )
    } catch (error) {
      recoveryError = error
    }

    if (recoveredOrder) {
      const persistedIntent = savePendingOrderId(
        checkoutUserId,
        intent.idempotencyKey,
        recoveredOrder.id,
      )
      if (!persistedIntent) throw new Error('PENDING_ORDER_STORAGE_UNAVAILABLE')

      if (getOrderConfirmationOutcome(recoveredOrder) !== 'pending') {
        setOrderIntent(persistedIntent)
        navigate('/checkout/confirmation', { replace: true })
        return
      }

      const conflictIntent = markPendingOrderConflict(
        checkoutUserId,
        intent.idempotencyKey,
      )
      setOrderIntent(conflictIntent ?? { ...persistedIntent, status: 'conflict' })
      setCheckoutError({
        message: 'O pedido anterior foi recuperado, mas o carrinho mudou. Nenhum checkout foi iniciado. Consulte o status do pedido antes de continuar.',
        requiresLogin: false,
      })
      return
    }

    const conflictIntent = markPendingOrderConflict(
      checkoutUserId,
      intent.idempotencyKey,
    )
    setOrderIntent(conflictIntent ?? { ...intent, status: 'conflict' })
    const requiresLogin = isUnauthorized(recoveryError)
    setCheckoutError({
      message: requiresLogin
        ? 'Sua sessão pode ter expirado. Entre novamente para recuperar o pedido pela mesma chave.'
        : recoveryError
          ? getCheckoutErrorMessage(recoveryError, 'order')
          : ORDER_CREATION_CONFLICT_MESSAGE,
      requiresLogin,
    })
  }

  async function handleCheckout() {
    if (
      !cart ||
      (cart.items.length === 0 && orderIntent === null) ||
      checkoutInProgressRef.current ||
      isUpdating ||
      isReconcilingPendingOrder ||
      pendingOrderCheckError !== null ||
      orderIntent?.status === 'conflict' ||
      (pendingOrderId !== null && pendingOrderOutcome !== 'pending')
    ) {
      return
    }

    checkoutInProgressRef.current = true
    setIsCheckingOut(true)
    setCheckoutError(null)
    let stage: 'order' | 'payment' = pendingOrderId ? 'payment' : 'order'

    try {
      if (!checkoutUserId || getSession()?.id !== checkoutUserId) {
        setCheckoutError({
          message: 'Entre novamente na mesma conta para continuar esta compra.',
          requiresLogin: true,
        })
        return
      }

      let activeIntent = orderIntent
      if (!activeIntent) {
        activeIntent = createPendingOrderIntent(checkoutUserId)
        if (!activeIntent) throw new Error('ORDER_INTENT_STORAGE_UNAVAILABLE')
        setOrderIntent(activeIntent)
      }

      if (activeIntent.status === 'conflict') {
        setCheckoutError({
          message: ORDER_CREATION_CONFLICT_MESSAGE,
          requiresLogin: false,
        })
        return
      }

      let orderId = pendingOrderId

      if (!orderId) {
        if (activeIntent.legacy || !activeIntent.idempotencyKey) {
          throw new Error('PENDING_ORDER_STORAGE_UNAVAILABLE')
        }

        const isResumingUnknownCreation = orderIntent !== null
        let order: OrderResponse
        try {
          order = await recoverOrCreateOrder(
            activeIntent.idempotencyKey,
            isResumingUnknownCreation,
            getOrderByIdempotencyKey,
            createOrder,
          )
        } catch (error) {
          if (
            axios.isAxiosError(error) &&
            isOrderCreationConflict(error.response?.status)
          ) {
            await handleOrderCreationConflict(activeIntent)
            return
          }
          throw error
        }
        if (!order.id.trim()) {
          throw new Error('The order response did not contain an order ID.')
        }
        orderId = order.id
        const persistedIntent = savePendingOrderId(
          checkoutUserId,
          activeIntent.idempotencyKey,
          orderId,
        )
        if (!persistedIntent) {
          throw new Error('PENDING_ORDER_STORAGE_UNAVAILABLE')
        }
        activeIntent = persistedIntent
        setOrderIntent(activeIntent)

        if (!shouldStartPaymentForOrder(order)) {
          navigate('/checkout/confirmation', { replace: true })
          return
        }
      }

      stage = 'payment'
      const payment = await createCheckoutSession(orderId)
      if (!payment.checkoutUrl.trim()) {
        throw new Error('The payment service returned an empty checkout URL.')
      }

      window.location.assign(payment.checkoutUrl)
    } catch (error) {
      if (
        stage === 'payment' &&
        axios.isAxiosError(error) &&
        isCheckoutConfirmationPendingError(
          error.response?.status,
          error.response?.data,
        )
      ) {
        navigate('/checkout/confirmation', { replace: true })
        return
      }

      const requiresLogin = isUnauthorized(error)
      setCheckoutError({
        message: requiresLogin
          ? 'Sua sessão pode ter expirado. Entre novamente para continuar.'
          : error instanceof Error &&
              error.message === 'PENDING_ORDER_STORAGE_UNAVAILABLE'
            ? 'Não foi possível preservar o pedido nesta sessão do navegador. Verifique as permissões de armazenamento e tente novamente.'
            : error instanceof Error &&
                error.message === 'ORDER_INTENT_STORAGE_UNAVAILABLE'
              ? 'Não foi possível salvar a tentativa de compra com segurança. Nenhum pedido foi criado. Verifique o armazenamento do navegador e tente novamente.'
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
            Carregando seu carrinhoâ€¦
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
                  state={expiredSessionLoginState}
                  to="/login"
                >
                  Ir para login
                </Link>
              )}
            </div>
          </div>
        ) : cart && cart.items.length === 0 && orderIntent ? (
          <section
            aria-labelledby="resume-checkout-title"
            className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-amber-200 bg-white px-6 text-center"
            role="status"
          >
            <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <ShoppingCart aria-hidden="true" size={27} />
            </span>
            <h2 className="font-semibold text-slate-800" id="resume-checkout-title">
              Retomar sua compra
            </h2>
            <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">
              {orderIntent.status === 'conflict'
                ? ORDER_CREATION_CONFLICT_MESSAGE
                : pendingOrderId
                  ? 'O pedido salvo ainda pode ser retomado. Vamos reutilizar esse pedido para continuar ao pagamento.'
                  : 'Há uma tentativa de criação ainda sem resultado confirmado. A próxima tentativa reutilizará a mesma chave para recuperar o pedido sem duplicá-lo.'}
            </p>
            {pendingOrderCheckError && (
              <div className="mt-4 text-sm text-rose-700" role="alert">
                <p>{pendingOrderCheckError.message}</p>
                <button
                  className="mt-2 font-semibold underline underline-offset-2"
                  onClick={() => setPendingOrderCheckAttempt((attempt) => attempt + 1)}
                  type="button"
                >
                  Verificar novamente
                </button>
              </div>
            )}
            {checkoutError && (
              <p className="mt-4 max-w-lg text-sm text-rose-700" role="alert">
                {checkoutError.message}
              </p>
            )}
            {orderIntent.status === 'conflict' && !pendingOrderId && (
              <button
                className="mt-3 font-semibold text-brand-700 underline underline-offset-2 disabled:opacity-50"
                disabled={isCheckingOut}
                onClick={() => void retryOrderRecovery()}
                type="button"
              >
                {isCheckingOut ? 'Consultando pedidoâ€¦' : 'Tentar recuperar pedido'}
              </button>
            )}
            {orderIntent.status === 'conflict' && pendingOrderId && (
              <Link
                className="mt-3 font-semibold text-brand-700 underline underline-offset-2"
                to="/checkout/confirmation"
              >
                Consultar status do pedido
              </Link>
            )}
            <button
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                isCheckingOut ||
                isReconcilingPendingOrder ||
                pendingOrderCheckError !== null ||
                orderIntent.status === 'conflict' ||
                (pendingOrderId !== null && pendingOrderOutcome !== 'pending')
              }
              onClick={() => void handleCheckout()}
              type="button"
            >
              {isCheckingOut ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                  {pendingOrderId ? 'Iniciando pagamentoâ€¦' : 'Recuperando pedidoâ€¦'}
                </>
              ) : isReconcilingPendingOrder ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                  Verificando pedidoâ€¦
                </>
              ) : pendingOrderId ? (
                'Tentar pagamento novamente'
              ) : orderIntent.status === 'conflict' ? (
                'Tentativa preservada'
              ) : (
                'Retomar criação do pedido'
              )}
            </button>
            {checkoutError?.requiresLogin && (
              <Link
                className="mt-3 font-semibold text-brand-700 underline underline-offset-2"
                state={expiredSessionLoginState}
                to="/login"
              >
                Ir para login
              </Link>
            )}
          </section>
        ) : cart && cart.items.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
            <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-slate-50 text-slate-400">
              <ShoppingCart aria-hidden="true" size={27} />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Seu carrinho está vazio
            </h2>
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
                      state={expiredSessionLoginState}
                      to="/login"
                    >
                      Ir para login
                    </Link>
                  )}
                </p>
              )}
              {cart.items.map((item) => {
                const { url: imageUrl, sourcePath } = resolveCartProductImage(
                  item.imageUrl,
                  item.productName,
                )
                const showProductImage = shouldDisplayProductImage(
                  imageUrl,
                  failedProductImages[item.productId],
                )

                return (
                  <article
                    className="grid gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_12px_-8px_rgba(16,42,67,0.28)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
                    key={item.id}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50 text-slate-400 sm:size-24">
                        {showProductImage && imageUrl ? (
                          <img
                            alt={item.productName}
                            className={`h-full w-full ${getCartProductImageClass(sourcePath)}`}
                            loading="lazy"
                            onError={() => {
                              setFailedProductImages((failedImages) => {
                                if (failedImages[item.productId] === imageUrl) {
                                  return failedImages
                                }
                                return { ...failedImages, [item.productId]: imageUrl }
                              })
                            }}
                            src={imageUrl}
                          />
                        ) : (
                          <span
                            aria-label={`Imagem indisponível para ${item.productName}`}
                            className="grid size-full place-items-center"
                            role="img"
                          >
                            <PackageOpen aria-hidden="true" size={25} strokeWidth={1.5} />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="break-words font-semibold leading-6 text-slate-900">
                          {item.productName}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {priceFormatter.format(item.price)} por unidade
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-4">
                    <div
                      aria-label={`Quantidade: ${item.quantity}`}
                      className="inline-flex h-10 items-center rounded-lg border border-slate-200"
                      role="group"
                    >
                      <button
                        aria-label={`Diminuir quantidade de ${item.productName}`}
                        className="grid size-10 place-items-center rounded-l-lg text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={isUpdating || isCheckingOut || orderIntent !== null || item.quantity <= 1}
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
                        disabled={isUpdating || isCheckingOut || orderIntent !== null}
                        onClick={() => void changeQuantity(item.id, item.quantity + 1)}
                        type="button"
                      >
                        <Plus aria-hidden="true" size={15} />
                      </button>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-xs font-medium text-slate-500">Subtotal</p>
                      <p className="mt-0.5 whitespace-nowrap text-sm font-bold text-slate-950 sm:text-base">
                        {priceFormatter.format(item.subtotal)}
                      </p>
                    </div>
                    <button
                      aria-label={`Remover ${item.productName} do carrinho`}
                      className="grid size-10 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-wait disabled:opacity-50"
                      disabled={isUpdating || isCheckingOut || orderIntent !== null}
                      onClick={() => void deleteItem(item.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={17} />
                    </button>
                    </div>
                  </article>
                )
              })}
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
              {orderIntent?.status === 'active' && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  {pendingOrderId
                    ? 'Seu pedido já foi criado. A nova tentativa continuará com este pedido.'
                    : 'O resultado da criação ainda não foi confirmado. A próxima tentativa reutilizará a mesma chave de idempotência.'}
                </p>
              )}
              {pendingOrderCheckError && (
                <div
                  className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"
                  role="alert"
                >
                  <p>{pendingOrderCheckError.message}</p>
                  {pendingOrderCheckError.requiresLogin && (
                    <Link
                      className="mt-1 inline-flex font-semibold underline underline-offset-2"
                      state={expiredSessionLoginState}
                      to="/login"
                    >
                      Ir para login
                    </Link>
                  )}
                  <button
                    className="mt-1 block font-semibold underline underline-offset-2"
                    onClick={() => setPendingOrderCheckAttempt((attempt) => attempt + 1)}
                    type="button"
                  >
                    Verificar novamente
                  </button>
                </div>
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
                      state={expiredSessionLoginState}
                      to="/login"
                    >
                      Ir para login
                    </Link>
                  )}
                </div>
              )}
              {orderIntent?.status === 'conflict' && !pendingOrderId && (
                <button
                  className="mt-3 block text-sm font-semibold text-brand-700 underline underline-offset-2 disabled:opacity-50"
                  disabled={isCheckingOut}
                  onClick={() => void retryOrderRecovery()}
                  type="button"
                >
                  {isCheckingOut ? 'Consultando pedidoâ€¦' : 'Tentar recuperar pedido'}
                </button>
              )}
              {orderIntent?.status === 'conflict' && pendingOrderId && (
                <Link
                  className="mt-3 inline-flex text-sm font-semibold text-brand-700 underline underline-offset-2"
                  to="/checkout/confirmation"
                >
                  Consultar status do pedido
                </Link>
              )}
              <button
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-wait disabled:opacity-60"
                disabled={
                  isCheckingOut ||
                  isUpdating ||
                  isReconcilingPendingOrder ||
                  pendingOrderCheckError !== null ||
                  orderIntent?.status === 'conflict' ||
                  (pendingOrderId !== null && pendingOrderOutcome !== 'pending') ||
                  (cart.items.length === 0 && orderIntent === null)
                }
                onClick={() => void handleCheckout()}
                type="button"
              >
                {isCheckingOut ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                    {pendingOrderId ? 'Iniciando pagamentoâ€¦' : 'Criando pedidoâ€¦'}
                  </>
                ) : isReconcilingPendingOrder ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                    Verificando pedidoâ€¦
                  </>
                ) : pendingOrderId && pendingOrderOutcome === 'pending' ? (
                  'Tentar pagamento novamente'
                ) : pendingOrderId ? (
                  'Pedido em verificação'
                ) : orderIntent ? (
                  'Retomar criação do pedido'
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
