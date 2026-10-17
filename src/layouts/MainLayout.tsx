import type { ReactNode } from 'react'
import SiteHeader from '../components/SiteHeader'

type MainLayoutProps = {
  children: ReactNode
}

function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fb]">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
          <p className="text-sm font-semibold tracking-tight text-slate-800">
            Market<span className="text-brand-600">Flow</span>
          </p>
          <p className="text-xs text-slate-500 sm:text-sm">Projeto de portfólio</p>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
