import { ShoppingCart } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative inline-flex min-h-11 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:rounded-full after:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:px-3 sm:text-sm ${
    isActive
      ? 'text-brand-700 after:bg-brand-600'
      : 'text-slate-600 after:bg-transparent hover:text-brand-700'
  }`

function SiteHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-6 sm:px-8 sm:py-4">
        <Link
          className="inline-flex shrink-0 items-center rounded-full text-slate-950 transition-colors hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
          to="/"
          aria-label="MarketFlow, página inicial"
        >
          <span className="text-lg font-extrabold tracking-[-0.045em] sm:text-xl">
            Market<span className="text-brand-600">Flow</span>
          </span>
        </Link>

        <nav
          aria-label="Navegação principal"
          className="flex shrink-0 items-center gap-0.5 sm:gap-2"
        >
          <NavLink className={navLinkClass} end to="/">
            Início
          </NavLink>
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-full px-2 text-xs font-semibold text-slate-600 transition-colors hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:px-3 sm:text-sm"
            href="#proposta"
          >
            Sobre
          </a>
          <NavLink
            aria-label="Carrinho de compras"
            className={({ isActive }) =>
              `relative inline-flex size-11 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 hover:text-brand-700 sm:h-11 sm:w-auto sm:gap-2 sm:px-3 ${
                isActive
                  ? 'text-brand-700 after:bg-brand-600'
                  : 'after:bg-transparent'
              }`
            }
            to="/cart"
          >
            <ShoppingCart aria-hidden="true" size={18} />
            <span className="hidden text-sm font-semibold sm:inline">Carrinho</span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

export default SiteHeader
