import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  PackageOpen,
  ShoppingCart,
  Tag,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { addCartItem } from '../services/cartService'
import { getCategories } from '../services/categoryService'
import { getProducts } from '../services/productService'
import { clearSession, getSession } from '../services/sessionService'
import type { Category } from '../types/category'
import type { Product } from '../types/product'
import {
  CART_LOGIN_REQUIRED_NOTICE,
  CART_SESSION_EXPIRED_NOTICE,
  isCartAuthenticationError,
} from '../utils/cartAuthentication'
import { isValidProductId } from '../utils/productId'

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

type AddFeedback = {
  kind: 'success' | 'error'
  message: string
}

function getAddErrorFeedback(error: unknown): AddFeedback {
  if (axios.isAxiosError(error)) {
    const responseData: unknown = error.response?.data
    if (typeof responseData === 'string' && responseData.trim()) {
      return { kind: 'error', message: responseData.trim().slice(0, 240) }
    }

    if (typeof responseData === 'object' && responseData !== null) {
      const payload = responseData as {
        message?: unknown
        error?: unknown
        detail?: unknown
      }
      const message = [payload.message, payload.error, payload.detail].find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
      if (message) {
        return { kind: 'error', message: message.trim().slice(0, 240) }
      }
    }

    if (error.response?.status) {
      return {
        kind: 'error',
        message: `Não foi possível adicionar este produto (HTTP ${error.response.status}).`,
      }
    }
  }

  return {
    kind: 'error',
    message: 'Não foi possível conectar à loja. Verifique sua conexão e tente novamente.',
  }
}

function CatalogSection() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [productsError, setProductsError] = useState(false)
  const [categoriesError, setCategoriesError] = useState(false)
  const [productsAttempt, setProductsAttempt] = useState(0)
  const [categoriesAttempt, setCategoriesAttempt] = useState(0)
  const [addingProductIds, setAddingProductIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [addFeedback, setAddFeedback] = useState<Record<string, AddFeedback>>(
    {},
  )
  const addingProductIdsRef = useRef(new Set<string>())
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  async function handleAddToCart(product: Product) {
    if (
      !isValidProductId(product.id) ||
      product.stock <= 0 ||
      addingProductIdsRef.current.has(product.id)
    ) {
      return
    }

    if (!getSession()) {
      navigate('/login', {
        replace: true,
        state: { notice: CART_LOGIN_REQUIRED_NOTICE },
      })
      return
    }

    addingProductIdsRef.current.add(product.id)
    setAddingProductIds(new Set(addingProductIdsRef.current))
    setAddFeedback((feedback) => {
      const nextFeedback = { ...feedback }
      delete nextFeedback[product.id]
      return nextFeedback
    })

    try {
      await addCartItem({ productId: product.id, quantity: 1 })
      if (isMountedRef.current) {
        setAddFeedback((feedback) => ({
          ...feedback,
          [product.id]: {
            kind: 'success',
            message: `${product.name} foi adicionado ao carrinho.`,
          },
        }))
      }
    } catch (error) {
      if (isMountedRef.current) {
        if (isCartAuthenticationError(error)) {
          clearSession()
          navigate('/login', {
            replace: true,
            state: { notice: CART_SESSION_EXPIRED_NOTICE },
          })
        } else {
          setAddFeedback((feedback) => ({
            ...feedback,
            [product.id]: getAddErrorFeedback(error),
          }))
        }
      }
    } finally {
      addingProductIdsRef.current.delete(product.id)
      if (isMountedRef.current) {
        setAddingProductIds(new Set(addingProductIdsRef.current))
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      setProductsLoading(true)
      setProductsError(false)

      try {
        const result = await getProducts(controller.signal)
        if (!controller.signal.aborted) setProducts(result)
      } catch {
        if (!controller.signal.aborted) setProductsError(true)
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false)
      }
    }

    void loadProducts()

    return () => controller.abort()
  }, [productsAttempt])

  useEffect(() => {
    const controller = new AbortController()

    async function loadCategories() {
      setCategoriesLoading(true)
      setCategoriesError(false)

      try {
        const result = await getCategories(controller.signal)
        if (!controller.signal.aborted) setCategories(result)
      } catch {
        if (!controller.signal.aborted) setCategoriesError(true)
      } finally {
        if (!controller.signal.aborted) setCategoriesLoading(false)
      }
    }

    void loadCategories()

    return () => controller.abort()
  }, [categoriesAttempt])

  return (
    <section aria-labelledby="catalog-title" className="scroll-mt-8 py-8 sm:py-10">
      <div className="mb-7 sm:mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Vitrine MarketFlow</p>
        <h2
          id="catalog-title"
          className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
        >
          Produtos
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
          Produtos e categorias disponíveis na loja.
        </p>
      </div>

      <div className="mb-7 rounded-2xl border border-slate-200/80 bg-white p-4 sm:mb-8 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Tag aria-hidden="true" className="text-brand-600" size={17} />
          <h3 className="text-sm font-semibold text-slate-800">Categorias</h3>
        </div>
        {categoriesLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500" role="status">
            <LoaderCircle aria-hidden="true" className="animate-spin text-brand-600" size={16} />
            Carregando categorias…
          </div>
        ) : categoriesError ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-rose-700" role="alert">
            <span>Não foi possível carregar as categorias.</span>
            <button
              className="rounded-md font-semibold underline underline-offset-4 hover:text-rose-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              onClick={() => setCategoriesAttempt((attempt) => attempt + 1)}
              type="button"
            >
              Tentar novamente
            </button>
          </div>
        ) : categories.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Categorias disponíveis">
            {categories.map((category) => (
              <li
                className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm font-medium text-slate-600"
                key={category.id}
              >
                {category.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nenhuma categoria disponível no momento.</p>
        )}
      </div>

      {productsLoading ? (
        <div
          className="flex min-h-52 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"
          role="status"
        >
          <LoaderCircle aria-hidden="true" className="animate-spin text-brand-600" size={20} />
          Carregando produtos…
        </div>
      ) : productsError ? (
        <div
          className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white px-6 text-center"
          role="alert"
        >
          <AlertCircle aria-hidden="true" className="mb-3 text-rose-600" size={24} />
          <p className="font-semibold text-slate-800">Não foi possível carregar os produtos.</p>
          <p className="mt-1 text-sm text-slate-500">Verifique sua conexão e tente novamente.</p>
          <button
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-wait disabled:opacity-60"
            disabled={productsLoading}
            onClick={() => setProductsAttempt((attempt) => attempt + 1)}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
          <PackageOpen aria-hidden="true" className="mb-3 text-slate-400" size={28} />
          <p className="font-semibold text-slate-800">Nenhum produto disponível no momento.</p>
          <p className="mt-1 text-sm text-slate-500">Volte em breve para conferir as novidades.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {products.map((product) => {
            const category = categories.find((item) => item.id === product.categoryId)
            const hasValidProductId = isValidProductId(product.id)

            return (
              <li
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_12px_-8px_rgba(16,42,67,0.28)] transition-shadow hover:shadow-[0_8px_24px_-16px_rgba(16,42,67,0.35)]"
                key={product.id}
              >
                <div
                  aria-hidden="true"
                  className="grid h-40 place-items-center border-b border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50/70 text-slate-300 sm:h-44"
                >
                  <div className="grid size-16 place-items-center rounded-2xl border border-white bg-white/80 shadow-sm">
                    <PackageOpen size={30} strokeWidth={1.5} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  {category && (
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
                      {category.name}
                    </p>
                  )}
                  <h3 className="text-base font-semibold leading-6 text-slate-900 sm:text-lg">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                      {product.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="font-bold tracking-tight text-slate-950">
                      <span className="mb-0.5 block text-xs font-medium tracking-normal text-slate-500">
                        Preço
                      </span>
                      <span className="text-xl sm:text-2xl">
                        {priceFormatter.format(product.price)}
                      </span>
                    </p>
                    <p className="pb-1 text-xs font-medium text-slate-500">
                      Estoque: {product.stock}
                    </p>
                  </div>
                  <button
                    aria-busy={addingProductIds.has(product.id)}
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                    disabled={
                      !hasValidProductId ||
                      product.stock <= 0 ||
                      addingProductIds.has(product.id)
                    }
                    onClick={() => void handleAddToCart(product)}
                    type="button"
                  >
                    {addingProductIds.has(product.id) ? (
                      <>
                        <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                        Adicionando…
                      </>
                    ) : !hasValidProductId ? (
                      'Produto indisponível'
                    ) : product.stock <= 0 ? (
                      'Sem estoque'
                    ) : (
                      <>
                        <ShoppingCart aria-hidden="true" size={17} />
                        Adicionar ao carrinho
                      </>
                    )}
                  </button>
                  {addFeedback[product.id] && (
                    <div
                      aria-live={addFeedback[product.id].kind === 'success' ? 'polite' : undefined}
                      className={`mt-3 flex items-start gap-2 text-sm leading-5 ${
                        addFeedback[product.id].kind === 'success'
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                      role={addFeedback[product.id].kind === 'success' ? 'status' : 'alert'}
                    >
                      {addFeedback[product.id].kind === 'success' ? (
                        <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
                      ) : (
                        <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
                      )}
                      <span>
                        {addFeedback[product.id].message}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default CatalogSection
