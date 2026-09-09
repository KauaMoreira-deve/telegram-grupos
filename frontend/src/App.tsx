import './App.css'
import Cards from './components/Cards'
import Button from './components/btn'
import grupoTecnologia from './assets/grupo-tecnologia.png'

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login/Login'

import DashboardLayout from './pages/Dashboard/DashboardLayout'
import DashboardHome from './pages/Dashboard/DashboardHome'
import DashboardGroups from './pages/Dashboard/DashboardGroups'
import DashboardGroupForm from './pages/Dashboard/DashboardGroupForm'
import DashboardCategories from './pages/Dashboard/DashboardCategories'
import DashboardUsers from './pages/Dashboard/DashboardUsers'
import DashboardSettings from './pages/Dashboard/DashboardSettings'


function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* LANDING PAGE */}
        <Route
          path="/"
          element={
            <>
              <header className="topo">
                <h1>Telegram</h1>

                <nav>
                  <ul className="topo-cont">
                    <li>
                      <a href="#home">Home</a>
                    </li>

                    <li>
                      <a href="#features">Features</a>
                    </li>

                    <li>
                      <a href="#pricing">Pricing</a>
                    </li>

                    <li>
                      <Button>+ Enviar grupo</Button>
                    </li>
                  </ul>
                </nav>
              </header>


              <main>

                <section className="hero" id="home">

                  <div className="hero-content">

                    <h2>
                      Grupos do telegram verificados
                    </h2>

                    <p>
                      Entre para a nossa comunidade no Telegram,
                      compartilhe ideias, tire dúvidas e conecte-se
                      com pessoas que também estão interessadas em
                      tecnologia e inovação.
                    </p>


                    <div className="btn-container">

                      <Button>
                        + Enviar grupo
                      </Button>

                      <Button>
                        + Enviar grupo
                      </Button>

                    </div>


                    <div className="cards-container">

                      <Cards
                        numero={56}
                        descricao="Membros"
                      />

                      <Cards
                        numero={30}
                        descricao="Grupos ativos"
                      />

                      <Cards
                        numero={56}
                        descricao="Acessos"
                      />

                      <Cards
                        numero={7}
                        descricao="Categorias"
                      />

                    </div>

                  </div>

                </section>


                <section
                  className="groups-section"
                  id="features"
                >

                  <div className="groups-content">

                    <h2>
                      Todos os nossos grupos
                    </h2>

                    <p>
                      Explore comunidades selecionadas para aprender,
                      trocar experiências e se conectar com pessoas
                      que compartilham seus interesses.
                    </p>


                    <div className="filter-container">

                      <button
                        className="filter-button"
                        type="button"
                      >
                        Todos
                      </button>

                    </div>


                    <div className="groups-grid">

                      <article className="group-card">

                        <img
                          className="group-image"
                          src={grupoTecnologia}
                          alt="Ilustração do grupo Tecnologia & Inovação"
                        />


                        <div className="group-card-content">

                          <h3>
                            Tecnologia &amp; Inovação
                          </h3>

                          <p>
                            Um grupo para compartilhar novidades,
                            ideias e conversas sobre o futuro da
                            tecnologia.
                          </p>


                          <div className="group-tags">

                            <span>
                              #tecnologia
                            </span>

                            <span>
                              #inovação
                            </span>

                            <span>
                              #comunidade
                            </span>

                          </div>


                          <strong className="group-members">
                            👥 1.240 membros
                          </strong>

                        </div>

                      </article>

                    </div>

                  </div>

                </section>

              </main>
            </>
          }
        />


        {/* LOGIN DO ADMINISTRADOR */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* DASHBOARD ADMINISTRATIVO */}
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="grupos" element={<DashboardGroups />} />
          <Route path="grupos/novo" element={<DashboardGroupForm />} />
          <Route path="categorias" element={<DashboardCategories />} />
          <Route path="usuarios" element={<DashboardUsers />} />
          <Route path="configuracoes" element={<DashboardSettings />} />
        </Route>

      </Routes>

    </BrowserRouter>
  )
}

export default App
