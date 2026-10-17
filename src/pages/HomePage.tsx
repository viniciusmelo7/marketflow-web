import CatalogSection from '../components/CatalogSection'
import MainLayout from '../layouts/MainLayout'

function HomePage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl shadow-slate-900/10">
          <div className="relative grid items-center gap-4 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:px-14 lg:py-14">
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/20 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200 sm:text-sm">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-sky-300" />
                Comércio digital em fluxo
              </span>
              <h1 className="mt-6 max-w-[13ch] text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Uma experiência de compra que flui.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Conheça a MarketFlow, um projeto de e-commerce em evolução, pensado para aproximar
                pessoas e produtos com clareza.
              </p>
              <a
                className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/20 transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
                href="#proposta"
              >
                Conheça a proposta
              </a>
            </div>

            <div aria-hidden="true" className="relative mx-auto grid aspect-square w-full max-w-[18rem] place-items-center sm:max-w-[21rem] lg:max-w-[23rem]">
              <div className="absolute inset-[8%] rotate-45 rounded-[2.5rem] border border-sky-100/10" />
              <div className="absolute inset-[18%] rounded-full border border-sky-100/15" />
              <div className="absolute inset-[29%] rotate-45 rounded-[1.75rem] border border-sky-100/20" />

              <div className="absolute left-[7%] top-[32%] size-2.5 rounded-full bg-sky-300 ring-[7px] ring-sky-300/10" />
              <div className="absolute right-[9%] top-[24%] size-2 rounded-full bg-blue-300 ring-[6px] ring-blue-300/10" />
              <div className="absolute bottom-[17%] left-[26%] size-2 rounded-full bg-sky-200 ring-[6px] ring-sky-200/10" />
              <div className="absolute left-[9%] top-1/2 h-px w-[82%] -rotate-[24deg] bg-gradient-to-r from-transparent via-sky-200/40 to-transparent" />
              <div className="absolute left-[9%] top-1/2 h-px w-[82%] rotate-[34deg] bg-gradient-to-r from-transparent via-blue-200/30 to-transparent" />

              <div className="relative grid size-28 place-items-center rounded-[1.75rem] border border-white/15 bg-white/[0.08] shadow-2xl shadow-slate-950/30 backdrop-blur-sm sm:size-32">
                <span className="text-4xl font-bold tracking-[-0.08em] text-white sm:text-5xl">MF</span>
                <span className="absolute -right-2 top-5 size-3 rounded-full bg-brand-600 ring-4 ring-brand-600/20" />
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 -z-10 size-80 rounded-full border border-white/[0.04]" />
        </section>

        <section
          id="proposta"
          className="mx-auto grid max-w-5xl gap-3 border-b border-slate-200/80 px-1 py-9 sm:gap-6 sm:py-11 md:grid-cols-[0.7fr_1.3fr] md:items-center"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">A proposta</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
              Um começo com foco no essencial.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            A MarketFlow está em construção. Esta é a base visual e de navegação para as próximas
            etapas do projeto.
          </p>
        </section>

        <CatalogSection />
      </div>
    </MainLayout>
  )
}

export default HomePage
