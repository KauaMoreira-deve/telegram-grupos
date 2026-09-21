import './Login.css'
import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { saveAdminSession } from '../../auth'
import { apiUrl } from '../../config/api'
import PageMeta from '../../components/PageMeta'

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

 
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsLoading(true)

    const form = event.currentTarget

    const email = form.email.value
    const password = form.password.value

 

    try {
      const resposta = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
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
        }

    } catch (erro) {
      console.error('Erro ao conectar com a API:', erro)
      setErrorMessage('Não foi possível conectar ao servidor.')
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


          <button
            className="login-submit"
            disabled={isLoading}
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
