import axios from 'axios'
import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import { getOrderById } from '../services/orderService'
import {
  adoptLegacyPendingOrder,
  clearPendingOrderId,
  getPendingOrderIntent,
} from '../services/pendingOrderService'
import { getSession } from '../services/sessionService'
import type { OrderResponse } from '../types/order'
import {
  getOrderConfirmationOutcome,
  shouldClearPendingOrderId,
} from '../utils/orderConfirmation'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_DURATION_MS = 60_000
const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

type VerificationState =
  | 'loading'
  | 'processing'
  | 'confirmed'
  | 'review'
  | 'payment-failed'
  | 'cancelled'
  | 'unknown'
  | 'unavailable'

function getQueryErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Não foi possível consultar o pedido. Tente novamente.'
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    return 'Sua sessão pode ter expirado. Entre novamente para consultar o pedido.'
  }

  if (!error.response) {
    return 'Não foi possível conectar ao serviço de pedidos. Verifique sua conexão e tente novamente.'
  }

  if (error.response.status >= 500) {
    return 'O serviço de pedidos está temporariamente indisponível. Tente consultar novamente.'
  }

  return `Não foi possível consultar o pedido (HTTP ${error.response.status}). Tente novamente.`
}

function CheckoutConfirmationPage() {
  const [confirmationUserId] = useState(() => getSession()?.id ?? null)
  const [orderIntent] = useState(() =>
    getPendingOrderIntent(confirmationUserId),
  )
  const orderId = orderIntent?.orderId ?? null
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [verificationState, setVerificationState] =
    useState<VerificationState>(() => (orderId ? 'loading' : 'unavailable'))
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [requiresLogin, setRequiresLogin] = useState(false)
  const [queryErrorMessage, setQueryErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      return
    }

    const currentOrderId = orderId
    const controller = new AbortController()
    const deadline = Date.now() + MAX_POLL_DURATION_MS
    let isDisposed = false
    let retryTimer: number | undefined
    let deadlineTimer: number | undefined

    function stopPolling() {
      if (deadlineTimer !== undefined) {
        window.clearTimeout(deadlineTimer)
        deadlineTimer = undefined
      }
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer)
        retryTimer = undefined
      }
    }

    function setUnavailable(error?: unknown) {
      if (isDisposed) return
      stopPolling()
      setRequiresLogin(
        axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403),
      )
      setQueryErrorMessage(error ? getQueryErrorMessage(error) : null)
      setVerificationState('unavailable')
    }

    async function checkOrder() {
      try {
        const result = await getOrderById(currentOrderId, controller.signal)
        if (isDisposed) return
        if (!confirmationUserId || getSession()?.id !== confirmationUserId) {
          stopPolling()
          setRequiresLogin(true)
          setQueryErrorMessage(
            'Entre novamente na conta que iniciou esta compra para consultar o pedido.',
          )
          setVerificationState('unavailable')
          return
        }

        if (orderIntent?.legacy && confirmationUserId) {
          const adoptedIntent = adoptLegacyPendingOrder(
            confirmationUserId,
            currentOrderId,
          )
          if (!adoptedIntent) {
            setUnavailable()
            setQueryErrorMessage(
              'Não foi possível preservar o pedido para esta conta. Tente consultar novamente antes de continuar.',
            )
            return
          }
        }

        setOrder(result)
        setRequiresLogin(false)
        setQueryErrorMessage(null)

        const outcome = getOrderConfirmationOutcome(result)
        if (outcome !== 'pending') {
          stopPolling()
          if (shouldClearPendingOrderId(outcome)) {
            clearPendingOrderId(confirmationUserId, currentOrderId)
          }
          setVerificationState(outcome)
          return
        }

        if (Date.now() >= deadline) {
          setUnavailable()
          return
        }

        setVerificationState('processing')
        retryTimer = window.setTimeout(
          () => void checkOrder(),
          Math.min(POLL_INTERVAL_MS, deadline - Date.now()),
        )
      } catch (error) {
        if (!controller.signal.aborted) setUnavailable(error)
      }
    }

    deadlineTimer = window.setTimeout(() => {
      deadlineTimer = undefined
      controller.abort()
      setUnavailable()
    }, MAX_POLL_DURATION_MS)

    void checkOrder()

    return () => {
      isDisposed = true
      if (deadlineTimer !== undefined) window.clearTimeout(deadlineTimer)
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
      controller.abort()
    }
  }, [orderId, retryAttempt, confirmationUserId, orderIntent?.legacy])

  function retryOrderQuery() {
    setOrder(null)
    setRequiresLogin(false)
    setQueryErrorMessage(null)
    setVerificationState('loading')
    setRetryAttempt((attempt) => attempt + 1)
  }

  return (
    <MainLayout>
      <div className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-4 py-10 sm:px-8">
        <section
          aria-labelledby="confirmation-title"
          aria-busy={verificationState === 'loading' || verificationState === 'processing'}
          aria-live="polite"
          className="w-full rounded-3xl border border-slate-200/90 bg-white px-6 py-9 text-center shadow-[0_8px_36px_-28px_rgba(16,42,67,0.35)] sm:px-10 sm:py-12"
          role={
            verificationState === 'unavailable' ||
            verificationState === 'payment-failed' ||
            verificationState === 'cancelled'
              ? 'alert'
              : 'status'
          }
        >
          {verificationState === 'loading' || verificationState === 'processing' ? (
            <>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin"
                  size={27}
                />
              </span>
              <h1
                className="mt-6 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
                id="confirmation-title"
              >
                {verificationState === 'loading'
                  ? 'Verificando seu pedido'
                  : 'Pagamento em processamento'}
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                {verificationState === 'loading'
                  ? 'Estamos consultando o status atualizado do pedido.'
                  : 'A confirmação do pagamento pode levar alguns instantes. Esta página continuará consultando o pedido.'}
              </p>
              {order && (
                <p className="mt-5 text-sm font-medium text-slate-500">
                  Pedido {order.id}
                </p>
              )}
            </>
          ) : verificationState === 'confirmed' ? (
            <>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 aria-hidden="true" size={29} />
              </span>
              <h1
                className="mt-6 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
                id="confirmation-title"
              >
                Pagamento confirmado
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                O backend confirmou o pagamento do seu pedido. Obrigado por comprar na MarketFlow.
              </p>
              {order && (
                <div className="mx-auto mt-6 max-w-sm rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p>Pedido {order.id}</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    Total: {priceFormatter.format(order.total)}
                  </p>
                </div>
              )}
            </>
          ) : verificationState === 'review' ? (
            <>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                <AlertCircle aria-hidden="true" size={28} />
              </span>
              <h1
                className="mt-6 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
                id="confirmation-title"
              >
                Pedido em análise
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                O pedido está em análise operacional. Não é necessário repetir o pagamento. Você pode consultar o status novamente mais tarde.
              </p>
              {order && (
                <p className="mt-5 text-sm font-medium text-slate-500">
                  Pedido {order.id}
                </p>
              )}
            </>
          ) : verificationState === 'payment-failed' ? (
            <>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-700">
                <AlertCircle aria-hidden="true" size={28} />
              </span>
              <h1
                className="mt-6 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
                id="confirmation-title"
              >
                Pagamento não concluído
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                O backend informou que o pagamento deste pedido não foi concluído.
              </p>
              {order && (
                <p className="mt-5 text-sm font-medium text-slate-500">
                  Pedido {order.id}
                </p>
              )}
            </>
          ) : verificationState === 'cancelled' ? (
            <>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                <AlertCircle aria-hidden="true" size={28} />
              </span>
              <h1
                className="mt-6 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
                id="confirmation-title"
              >
                Pedido cancelado
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                O backend informou que este pedido foi cancelado.
              </p>
              {order && (
                <p className="mt-5 text-sm font-medium text-slate-500">
                  Pedido {order.id}
                </p>
              )}
            </>
          ) : verificationState === 'unknown' ? (
            <>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                <AlertCircle aria-hidden="true" size={28} />
              </span>
              <h1
                className="mt-6 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
                id="confirmation-title"
              >
                Status do pedido não reconhecido
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                O backend retornou um status que esta versão da loja não reconhece. Não podemos afirmar que o pagamento foi concluído ou falhou.
              </p>
              {order && (
                <p className="mt-5 text-sm font-medium text-slate-500">
                  Pedido {order.id}
                </p>
              )}
            </>
          ) : (
            <>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                <AlertCircle aria-hidden="true" size={28} />
              </span>
              <h1
                className="mt-6 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
                id="confirmation-title"
              >
                Não foi possível confirmar agora
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                {queryErrorMessage ??
                  'Não foi possível confirmar o status do pedido agora. Isso não significa necessariamente que o pagamento falhou.'}
              </p>
              {requiresLogin && (
                <Link
                  className="mt-4 inline-flex rounded-lg font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
                  to="/login"
                >
                  Entre novamente para consultar o pedido
                </Link>
              )}
              {!orderId && (
                <p className="mt-4 text-sm text-slate-500">
                  Não encontramos um pedido pendente nesta sessão do navegador.
                </p>
              )}
            </>
          )}

          {orderId &&
            verificationState !== 'loading' &&
            verificationState !== 'processing' &&
            verificationState !== 'confirmed' && (
              <button
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                onClick={retryOrderQuery}
                type="button"
              >
                Consultar pedido novamente
              </button>
            )}

          <div className="mt-8 border-t border-slate-100 pt-6">
            <Link
              className="inline-flex items-center gap-2 rounded-lg font-semibold text-brand-700 transition-colors hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
              to="/"
            >
              <ArrowLeft aria-hidden="true" size={17} />
              Voltar à loja
            </Link>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}

export default CheckoutConfirmationPage
