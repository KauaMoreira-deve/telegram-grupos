import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Tags, Settings, LogOut } from 'lucide-react';
import './Dashboard.css';

export default function DashboardLayout() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Grupos', path: '/admin/grupos', icon: <Users size={20} /> },
    { name: 'Categorias', path: '/admin/categorias', icon: <Tags size={20} /> },
    { name: 'Usuários', path: '/admin/usuarios', icon: <Users size={20} /> },
    { name: 'Configurações', path: '/admin/configuracoes', icon: <Settings size={20} /> },
  ];

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
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
          <Link to="/dash" className="nav-link logout">
            <LogOut size={20} />
            <span>Sair</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-title">
            <h1>{navItems.find(item => location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/admin'))?.name || 'Dashboard'}</h1>
          </div>
          <div className="header-admin-info">
            <div className="admin-avatar">A</div>
            <div className="admin-details">
              <strong>Administrador</strong>
              <span>admin@plataforma.com</span>
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
