import CatalogSection from '../components/CatalogSection'
import MainLayout from '../layouts/MainLayout'

function HomePage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-10">
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl shadow-slate-900/10">
          <div className="relative grid items-center gap-3 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:px-14 lg:py-14">
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/20 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200 sm:text-sm">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-sky-300" />
                Tecnologia para o dia a dia
              </span>
              <h1 className="mt-5 max-w-[13ch] text-4xl font-bold leading-[1.04] tracking-tight text-white sm:mt-6 sm:text-5xl lg:text-[3.75rem]">
                Tecnologia que acompanha o seu ritmo.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Encontre produtos de tecnologia em uma experiência de compra clara,
                organizada e simples de acompanhar.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/20 transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
                  href="#catalog-title"
                >
                  Explorar catálogo
                </a>
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
                  href="#proposta"
                >
                  Conheça a MarketFlow
                </a>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="relative mx-auto mt-3 grid aspect-square w-full max-w-[16rem] place-items-center sm:mt-1 sm:max-w-[19rem] lg:mt-0 lg:max-w-[22rem]"
            >
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
          className="mx-auto mt-6 max-w-7xl scroll-mt-24 rounded-3xl border border-slate-200/80 bg-white px-6 py-8 sm:mt-8 sm:px-8 sm:py-10 lg:px-12"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_0.9fr] md:items-end md:gap-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
                A proposta
              </p>
              <h2 className="mt-3 max-w-[20ch] text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                Comprar tecnologia deveria ser simples.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Encontre o que você precisa, organize sua compra e acompanhe cada etapa sem complicação.
            </p>
          </div>

          <ol className="mt-8 grid divide-y divide-slate-200 border-t border-slate-200 md:mt-10 md:grid-cols-3 md:divide-x md:divide-y-0">
            <li className="py-5 md:py-0 md:pr-6 lg:pr-8">
              <span className="text-xs font-bold tracking-[0.12em] text-brand-700">01</span>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                Explore com facilidade
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                Consulte os produtos disponíveis e encontre o que procura.
              </p>
            </li>
            <li className="py-5 md:px-6 md:py-0 lg:px-8">
              <span className="text-xs font-bold tracking-[0.12em] text-brand-700">02</span>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                Organize sua compra
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                Adicione produtos ao carrinho e revise seus itens.
              </p>
            </li>
            <li className="py-5 md:py-0 md:pl-6 lg:pl-8">
              <span className="text-xs font-bold tracking-[0.12em] text-brand-700">03</span>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                Acompanhe cada etapa
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                Consulte o status dos pedidos pelas funcionalidades já existentes.
              </p>
            </li>
          </ol>
        </section>

        <CatalogSection />
      </div>
    </MainLayout>
  )
}

export default HomePage
