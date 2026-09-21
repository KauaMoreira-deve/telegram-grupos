import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Tags, Settings, LogOut, Menu, Inbox } from 'lucide-react';
import './Dashboard.css';
import { clearAdminSession, getAdminSession } from '../../auth';
import PageMeta from '../../components/PageMeta';

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

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Grupos', path: '/admin/grupos', icon: <Users size={20} /> },
    { name: 'Solicita\u00e7\u00f5es', path: '/admin/solicitacoes', icon: <Inbox size={20} /> },
    { name: 'Categorias', path: '/admin/categorias', icon: <Tags size={20} /> },
    ...(admin?.role === 'superadmin' ? [{ name: 'Usuários', path: '/admin/usuarios', icon: <Users size={20} /> }] : []),
    { name: 'Configurações', path: '/admin/configuracoes', icon: <Settings size={20} /> },
  ];

  function logout() {
    clearAdminSession();
    navigate('/dash');
  }

  if (!admin) return null;

  return (
    <div className="dashboard-container">
      <PageMeta description="Área administrativa." noIndex title="Administração" />
      {/* Sidebar */}
      {menuOpen && <button aria-label="Fechar menu" className="dashboard-overlay" onClick={() => setMenuOpen(false)} type="button" />}
      <aside className={`dashboard-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`nav-link ${location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/admin') ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button className="nav-link logout" onClick={logout} type="button">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-title">
            <button aria-label="Abrir menu" className="mobile-menu-button" onClick={() => setMenuOpen(true)} type="button"><Menu size={22} /></button>
            <h1>{navItems.find(item => location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/admin'))?.name || 'Dashboard'}</h1>
          </div>
          <div className="header-admin-info">
            <div className="admin-avatar">A</div>
            <div className="admin-details">
              <strong>{admin.nome}</strong>
              <span>{admin.email}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
