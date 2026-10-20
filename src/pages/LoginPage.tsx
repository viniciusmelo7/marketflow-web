import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { AlertCircle, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../services/authService'
import { getSession, saveSession } from '../services/sessionService'

function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navigationState = location.state as
    | { notice?: unknown; reauthenticate?: unknown }
    | null
  const notice =
    typeof navigationState?.notice === 'string'
      ? navigationState.notice
      : null
  const isReauthentication = navigationState?.reauthenticate === true
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  if (getSession() && !isReauthentication) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password) {
      setErrorMessage('Informe seu e-mail e sua senha para continuar.')
      return
    }

    setIsSubmitting(true)

    try {
      const session = await login({ email: normalizedEmail, password })

      try {
        saveSession(session)
      } catch {
        setErrorMessage(
          'Não foi possível manter sua sessão neste navegador. Verifique as permissões de armazenamento e tente novamente.',
        )
        return
      }

      navigate('/', { replace: true })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setErrorMessage('E-mail ou senha inválidos. Verifique seus dados e tente novamente.')
      } else if (axios.isAxiosError(error) && !error.response) {
        setErrorMessage('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.')
      } else {
        setErrorMessage('Não foi possível entrar agora. Tente novamente em instantes.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] lg:grid lg:grid-cols-2">
      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <Link
          className="relative z-10 w-fit text-xl font-bold tracking-tight text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
          to="/"
          aria-label="MarketFlow, página inicial"
        >
          Market<span className="text-sky-300">Flow</span>
        </Link>

        <div className="relative z-10 max-w-lg pb-12 xl:pb-20">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-200">
            Sua loja, em fluxo
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Boas-vindas à MarketFlow.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
            Entre na sua conta para continuar sua experiência.
          </p>
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-32 size-[34rem] rounded-full border border-sky-100/[0.08]">
          <div className="absolute inset-12 rounded-full border border-sky-100/[0.08]" />
          <div className="absolute inset-28 rotate-45 rounded-[3rem] border border-sky-100/[0.1]" />
        </div>
        <p className="relative z-10 text-xs text-slate-400">Projeto de portfólio</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <Link
            className="mb-8 inline-block text-xl font-bold tracking-tight text-slate-950 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 lg:hidden"
            to="/"
            aria-label="MarketFlow, página inicial"
          >
            Market<span className="text-brand-600">Flow</span>
          </Link>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_36px_-28px_rgba(16,42,67,0.35)] sm:p-9">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
                Acesse sua conta
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Entrar
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use seu e-mail e sua senha para acessar a MarketFlow.
              </p>
            </div>

            {notice && (
              <p
                aria-live="polite"
                className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-5 text-amber-900"
                role="status"
              >
                {notice}
              </p>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="email">
                  E-mail
                </label>
                <div className="relative">
                  <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    autoComplete="email"
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                    id="email"
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@exemplo.com"
                    required
                    type="email"
                    value={email}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="password">
                  Senha
                </label>
                <div className="relative">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    autoComplete="current-password"
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                    id="password"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha"
                    required
                    type="password"
                    value={password}
                  />
                </div>
              </div>

              {errorMessage && (
                <div
                  aria-live="polite"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-800"
                  role="alert"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
                  <p>{errorMessage}</p>
                </div>
              )}

              <button
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />}
                {isSubmitting ? 'Entrando…' : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <Link
                className="text-sm font-semibold text-brand-700 underline-offset-4 hover:text-brand-700 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                to="/"
              >
                Voltar à página inicial
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
