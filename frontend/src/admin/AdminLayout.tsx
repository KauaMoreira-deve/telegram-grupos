import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './icons'
import type { FeedbackType } from './feedback'
import './admin.css'

type Feedback = { message: string; type: FeedbackType } | null

const navigation = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard' as const },
  { label: 'Grupos', to: '/admin/grupos', icon: 'groups' as const },
  { label: 'Categorias', to: '/admin/categorias', icon: 'categories' as const },
  { label: 'Configurações', to: '/admin/configuracoes', icon: 'settings' as const },
]

const pageTitles: Record<string, string> = {
  '/admin/dashboard': 'Visão geral',
  '/admin/grupos': 'Grupos',
  '/admin/grupos/novo': 'Novo grupo',
  '/admin/categorias': 'Categorias',
  '/admin/configuracoes': 'Configurações',
}

export default function AdminLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const title = pageTitles[location.pathname] ?? 'Administração'

  function showFeedback(message: string, type: FeedbackType = 'success') {
    setFeedback({ message, type })
  }

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 4200)
    return () => window.clearTimeout(timer)
  }, [feedback])

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${isMenuOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <span className="admin-brand-mark">T</span>
          <span>Telegrupos</span>
        </div>

        <nav className="admin-nav" aria-label="Navegação principal">
          <p className="admin-nav-label">Menu principal</p>
          {navigation.map((item) => (
            <NavLink className="admin-nav-link" key={item.to} to={item.to}>
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-help-card">
            <span className="admin-help-icon"><Icon name="sparkle" size={17} /></span>
            <strong>Precisa de ajuda?</strong>
            <p>Consulte o guia para administradores.</p>
            <button type="button">Acessar central</button>
          </div>
          <button className="admin-logout" onClick={() => navigate('/dash')} type="button">
            <Icon name="logout" size={19} />
            Sair
          </button>
        </div>
      </aside>

      {isMenuOpen && <button aria-label="Fechar menu" className="admin-backdrop" onClick={() => setIsMenuOpen(false)} type="button" />}

      <div className="admin-content">
        <header className="admin-header">
          <div className="admin-header-title">
            <button aria-label="Abrir menu" className="admin-menu-button" onClick={() => setIsMenuOpen(true)} type="button">
              <Icon name="bars" size={22} />
            </button>
            <div>
              <p>Administração</p>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="admin-account">
            <button aria-label="Notificações" className="admin-notification" type="button">
              <Icon name="bell" size={20} />
              <span />
            </button>
            <div className="admin-user-avatar">AM</div>
            <div className="admin-user-info">
              <strong>André Martins</strong>
              <span>Administrador</span>
            </div>
            <Icon name="chevron-down" size={16} />
          </div>
        </header>

        <main className="admin-main">
          <Outlet context={{ showFeedback }} />
        </main>
      </div>

      {feedback && (
        <div className={`admin-toast ${feedback.type}`} role="status">
          <span className="admin-toast-icon"><Icon name={feedback.type === 'success' ? 'check' : 'close'} size={16} /></span>
          {feedback.message}
          <button aria-label="Fechar aviso" onClick={() => setFeedback(null)} type="button"><Icon name="close" size={16} /></button>
        </div>
      )}
    </div>
  )
}
