import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ExternalLink, Inbox, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Tags, Users, X } from 'lucide-react';
import './Dashboard.css';
import { clearAdminSession, getAdminSession } from '../../auth';
import PageMeta from '../../components/PageMeta';

type NavItem = { name: string; description: string; path: string; icon: React.ReactNode };
type NavSection = { title: string; items: NavItem[] };

function isActivePath(pathname: string, path: string) {
  return pathname === path || (path !== '/admin' && pathname.startsWith(path));
}

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [admin] = useState(getAdminSession);

  useEffect(() => {
    function handleExpiredSession() {
      clearAdminSession();
      navigate('/dash', { replace: true });
    }

    window.addEventListener('admin-session-expired', handleExpiredSession);
    return () => window.removeEventListener('admin-session-expired', handleExpiredSession);
  }, [navigate]);

  // Fecha o menu lateral do celular ao apertar Esc.
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const navSections: NavSection[] = [
    {
      title: 'Visão geral',
      items: [{ name: 'Dashboard', description: 'Resumo do desempenho do site', path: '/admin', icon: <LayoutDashboard size={19} /> }],
    },
    {
      title: 'Conteúdo',
      items: [
        { name: 'Grupos', description: 'Cadastre, edite e destaque grupos', path: '/admin/grupos', icon: <Users size={19} /> },
        { name: 'Solicitações', description: 'Grupos enviados pelos visitantes', path: '/admin/solicitacoes', icon: <Inbox size={19} /> },
        { name: 'Categorias', description: 'Organização, headline e subheadline', path: '/admin/categorias', icon: <Tags size={19} /> },
      ],
    },
    {
      title: 'Sistema',
      items: [
        ...(admin?.role === 'superadmin' ? [{ name: 'Usuários', description: 'Acessos ao painel administrativo', path: '/admin/usuarios', icon: <ShieldCheck size={19} /> }] : []),
        { name: 'Configurações', description: 'Seu perfil e preferências do site', path: '/admin/configuracoes', icon: <Settings size={19} /> },
      ],
    },
  ];

  const currentItem = navSections.flatMap((section) => section.items).find((item) => isActivePath(location.pathname, item.path));
  const pageTitle = location.pathname.endsWith('/novo')
    ? 'Novo grupo'
    : location.pathname.endsWith('/editar')
      ? 'Editar grupo'
      : currentItem?.name || 'Dashboard';

  function logout() {
    clearAdminSession();
    navigate('/dash');
  }

  if (!admin) return null;

  const initials = admin.nome.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'A';

  return (
    <div className="dashboard-container">
      <PageMeta description="Área administrativa." noIndex title="Administração" />
      {menuOpen && <button aria-label="Fechar menu" className="dashboard-overlay" onClick={() => setMenuOpen(false)} type="button" />}

      <aside className={`dashboard-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <Link className="sidebar-brand" onClick={() => setMenuOpen(false)} to="/admin">
            <span aria-hidden="true" className="sidebar-brand-icon">
              <svg viewBox="0 0 24 24"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.27 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" /></svg>
            </span>
            <span className="sidebar-brand-text">
              <strong>Putaria no <span>Telegram</span></strong>
              <small>Painel administrativo</small>
            </span>
          </Link>
          <button aria-label="Fechar menu" className="sidebar-close" onClick={() => setMenuOpen(false)} type="button"><X size={20} /></button>
        </div>

        <nav aria-label="Menu do painel" className="sidebar-nav">
          {navSections.filter((section) => section.items.length).map((section) => (
            <div className="sidebar-section" key={section.title}>
              <span className="sidebar-section-title">{section.title}</span>
              <ul>
                {section.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      aria-current={isActivePath(location.pathname, item.path) ? 'page' : undefined}
                      className={`nav-link ${isActivePath(location.pathname, item.path) ? 'active' : ''}`}
                      onClick={() => setMenuOpen(false)}
                      to={item.path}
                    >
                      <span className="nav-link-icon">{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <div className="admin-avatar">{initials}</div>
            <div className="admin-details">
              <strong>{admin.nome}</strong>
              <span>{admin.role === 'superadmin' ? 'Superadministrador' : 'Editor'}</span>
            </div>
          </div>
          <button className="nav-link logout" onClick={logout} type="button">
            <span className="nav-link-icon"><LogOut size={19} /></span>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <button aria-label="Abrir menu" className="mobile-menu-button" onClick={() => setMenuOpen(true)} type="button"><Menu size={22} /></button>
            <div>
              <h1>{pageTitle}</h1>
              <p>{currentItem?.description || 'Painel administrativo'}</p>
            </div>
          </div>
          <div className="header-actions">
            <a className="header-site-link" href="/" rel="noreferrer" target="_blank">
              <ExternalLink size={16} />
              <span>Ver site</span>
            </a>
            <div className="header-admin-info">
              <div className="admin-avatar">{initials}</div>
              <div className="admin-details">
                <strong>{admin.nome}</strong>
                <span>{admin.email}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          <div className="dashboard-page" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
