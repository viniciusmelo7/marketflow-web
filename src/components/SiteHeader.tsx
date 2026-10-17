import { ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'

function SiteHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white shadow-[0_4px_20px_-16px_rgba(16,42,67,0.45)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link
          className="shrink-0 text-lg font-bold tracking-tight text-slate-950 transition-colors hover:text-brand-700 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 sm:text-xl"
          to="/"
          aria-label="MarketFlow, página inicial"
        >
          Market<span className="text-brand-600">Flow</span>
        </Link>

        <nav aria-label="Navegação principal" className="flex items-center gap-1 sm:gap-5">
          <Link
            className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:px-3 sm:text-sm"
            to="/"
          >
            Início
          </Link>
          <a
            className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:px-3 sm:text-sm"
            href="#proposta"
          >
            Sobre
          </a>
          <Link
            aria-label="Carrinho de compras"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-2 text-xs font-semibold text-brand-700 transition-colors hover:border-brand-600 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:px-3 sm:text-sm"
            to="/cart"
          >
            <ShoppingCart aria-hidden="true" size={18} />
            <span className="hidden sm:inline">Carrinho</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default SiteHeader
