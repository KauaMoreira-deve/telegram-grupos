import './Login.css'
import { useNavigate } from 'react-router-dom'

function Login() {
  const navigate = useNavigate();

 
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget

    const email = form.email.value
    const password = form.password.value

 

    try {
      const resposta = await fetch('http://localhost:3000/api/login', {
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

        if (resposta.ok) {
          console.log('Login realizado!')
        } else {
          console.log(dados.erro)
        }

    } catch (erro) {
      console.error('Erro ao conectar com a API:', erro)
    }
  }

  return (
    <main className="login-page">
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
            type="submit"
          >
            Entrar
          </button>

        </form>

      </section>
    </main>
  )
}

export default Login
