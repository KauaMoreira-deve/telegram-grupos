import './Login.css'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { saveAdminSession } from '../../auth'
import { apiUrl } from '../../config/api'
import PageMeta from '../../components/PageMeta'

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [captcha, setCaptcha] = useState<{ token: string; image: string } | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false)

  // Cada imagem de captcha vale para uma única tentativa de login.
  const loadCaptcha = useCallback(async () => {
    setIsCaptchaLoading(true)
    setCaptchaAnswer('')
    try {
      const resposta = await fetch(apiUrl('/api/login/captcha'), { cache: 'no-store' })
      const dados = await resposta.json()
      if (!resposta.ok || !dados.token || !dados.image) throw new Error(dados.erro || 'Não foi possível carregar o captcha.')
      setCaptcha({ token: dados.token, image: dados.image })
    } catch (erro) {
      setCaptcha(null)
      setErrorMessage(erro instanceof Error ? erro.message : 'Não foi possível carregar o captcha.')
    } finally {
      setIsCaptchaLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCaptcha(), 0)
    return () => window.clearTimeout(timer)
  }, [loadCaptcha])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsLoading(true)

    const form = event.currentTarget

    const email = form.email.value
    const password = form.password.value

    if (!captcha) {
      setErrorMessage('Aguarde o captcha carregar e tente novamente.')
      setIsLoading(false)
      return
    }

    try {
      const resposta = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          captchaToken: captcha.token,
          captchaAnswer,
        }),
      })

      const dados = await resposta.json()

        if (resposta.ok && dados.token && dados.usuario) {
          saveAdminSession(dados.usuario, dados.token)
          const requestedLocation = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from
          const requestedPath = requestedLocation?.pathname?.startsWith('/admin')
            ? `${requestedLocation.pathname}${requestedLocation.search || ''}${requestedLocation.hash || ''}`
            : '/admin'
          navigate(requestedPath, { replace: true })
        } else {
          setErrorMessage(dados.erro || 'Não foi possível entrar.')
          void loadCaptcha()
        }

    } catch (erro) {
      console.error('Erro ao conectar com a API:', erro)
      setErrorMessage('Não foi possível conectar ao servidor.')
      void loadCaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-page">
      <PageMeta description="Acesso restrito à administração." noIndex path="/dash" title="Entrar" />
      <section className="login-card" aria-labelledby="login-title">

        <div className="login-brand" aria-hidden="true">
          T
        </div>

        <div className="login-heading">
          <h1 id="login-title">Entrar</h1>
          <p>Informe seus dados para acessar sua conta.</p>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}

          <div className="login-field">
            <label htmlFor="email">
              E-mail
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="voce@exemplo.com"
              autoComplete="email"
              required
            />
          </div>


          <div className="login-field">
            <label htmlFor="password">
              Senha
            </label>

            <input
              id="password"
              name="password"
              type="password"
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
            />
          </div>


          <div className="login-field">
            <label htmlFor="captcha">
              Verificação
            </label>

            <div className="login-captcha">
              {captcha
                ? <img alt="Imagem com os caracteres de verificação" height={64} src={captcha.image} width={200} />
                : <span className="login-captcha-placeholder">{isCaptchaLoading ? 'Carregando…' : 'Captcha indisponível'}</span>}
              <button
                aria-label="Gerar outra imagem"
                className="login-captcha-refresh"
                disabled={isCaptchaLoading}
                onClick={() => void loadCaptcha()}
                title="Gerar outra imagem"
                type="button"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            <input
              id="captcha"
              name="captcha"
              type="text"
              placeholder="Digite os caracteres da imagem"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={8}
              onChange={(event) => setCaptchaAnswer(event.target.value.toUpperCase())}
              value={captchaAnswer}
              required
            />
          </div>

          <button
            className="login-submit"
            disabled={isLoading || !captcha}
            type="submit"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>

        </form>

      </section>
    </main>
  )
}

export default Login
