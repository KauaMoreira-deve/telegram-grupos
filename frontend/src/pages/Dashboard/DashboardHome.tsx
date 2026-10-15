import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Inbox, MousePointerClick, Plus, Tags, UserCheck, Users } from 'lucide-react';
import { adminFetch as fetch, getAdminSession } from '../../auth';
import { apiUrl } from '../../config/api';

const formatCount = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

type RecentGroup = {
  id: number;
  name: string;
  category: string;
  status: string;
  date: string;
};

type DailyAccess = { day: string; count: number };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatDay(day: string, options: Intl.DateTimeFormatOptions) {
  const [year, month, date] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', options).format(new Date(year, month - 1, date));
}

// Gráfico de barras simples (série única) com os acessos dos últimos 7 dias.
function AccessesChart({ data }: { data: DailyAccess[] }) {
  const max = Math.max(...data.map((item) => item.count), 1);
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="dashboard-card chart-card" aria-labelledby="accesses-chart-title">
      <div className="card-heading">
        <div>
          <h2 id="accesses-chart-title">Acessos aos grupos</h2>
          <p>Cliques em “Entrar no grupo” nos últimos 7 dias</p>
        </div>
        <strong className="chart-total">{formatCount(total)}</strong>
      </div>
      <div className="bar-chart" role="img" aria-label={`Acessos por dia: ${data.map((item) => `${formatDay(item.day, { weekday: 'long' })} ${item.count}`).join(', ')}`}>
        {data.map((item) => (
          <div className="bar-chart-column" key={item.day}>
            <div className="bar-chart-track">
              <span className="bar-chart-tooltip">{formatCount(item.count)} {item.count === 1 ? 'acesso' : 'acessos'}<small>{formatDay(item.day, { day: '2-digit', month: 'short' })}</small></span>
              <div className={`bar-chart-bar ${item.count === 0 ? 'is-empty' : ''}`} style={{ height: `${Math.max((item.count / max) * 100, item.count ? 4 : 0)}%` }} />
            </div>
            <span className="bar-chart-label">{formatDay(item.day, { weekday: 'short' }).replace('.', '')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DashboardHome() {
  const admin = getAdminSession();
  const [statsData, setStatsData] = useState({
    totalGroups: 0,
    activeGroups: 0,
    totalCategories: 0,
    totalAcessos: 0,
    pendingSubmissions: 0,
  });
  const [recentGroups, setRecentGroups] = useState<RecentGroup[]>([]);
  const [dailyAccesses, setDailyAccesses] = useState<DailyAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(apiUrl('/api/admin/stats'));
        const data = await response.json();
        if (data.stats) setStatsData((current) => ({ ...current, ...data.stats }));
        if (data.recentGroups) setRecentGroups(data.recentGroups);
        if (Array.isArray(data.accessesLast7Days)) setDailyAccesses(data.accessesLast7Days);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchData();
  }, []);

  const inactiveGroups = Math.max(statsData.totalGroups - statsData.activeGroups, 0);
  const stats = [
    { label: 'Total de grupos', value: formatCount(statsData.totalGroups), hint: `${formatCount(inactiveGroups)} inativos`, icon: <Users size={22} />, tone: 'purple' },
    { label: 'Grupos ativos', value: formatCount(statsData.activeGroups), hint: 'Visíveis no site', icon: <UserCheck size={22} />, tone: 'green' },
    { label: 'Categorias', value: formatCount(statsData.totalCategories), hint: 'Organizando o catálogo', icon: <Tags size={22} />, tone: 'amber' },
    { label: 'Total de acessos', value: formatCount(statsData.totalAcessos), hint: 'Desde o lançamento', icon: <MousePointerClick size={22} />, tone: 'blue' },
  ];

  return (
    <div className="dashboard-home">
      <section className="welcome-banner">
        <div>
          <span className="welcome-eyebrow">{greeting()}, {admin?.nome.split(' ')[0] || 'administrador'} 👋</span>
          <h2>Tudo pronto para gerenciar o catálogo</h2>
          <p>
            {statsData.pendingSubmissions > 0
              ? `Você tem ${formatCount(statsData.pendingSubmissions)} ${statsData.pendingSubmissions === 1 ? 'solicitação aguardando' : 'solicitações aguardando'} análise.`
              : 'Nenhuma solicitação pendente no momento.'}
          </p>
        </div>
        <div className="welcome-actions">
          <Link className="btn-primary" to="/admin/grupos/novo"><Plus size={18} />Novo grupo</Link>
          <Link className="btn-secondary" to="/admin/solicitacoes">
            <Inbox size={18} />Solicitações
            {statsData.pendingSubmissions > 0 && <span className="count-pill">{statsData.pendingSubmissions}</span>}
          </Link>
        </div>
      </section>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className={`stat-card tone-${stat.tone}`} key={stat.label}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-info">
              <p>{stat.label}</p>
              <h3>{isLoading ? <span className="skeleton" /> : stat.value}</h3>
              <small>{stat.hint}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="home-grid">
        {dailyAccesses.length > 0 ? <AccessesChart data={dailyAccesses} /> : (
          <section className="dashboard-card chart-card"><div className="card-heading"><div><h2>Acessos aos grupos</h2><p>Últimos 7 dias</p></div></div><p className="loading-state">{isLoading ? 'Carregando…' : 'Sem dados de acesso.'}</p></section>
        )}

        <section className="dashboard-card" aria-labelledby="recent-groups-title">
          <div className="card-heading">
            <div>
              <h2 id="recent-groups-title">Grupos recentes</h2>
              <p>Últimos cadastros no catálogo</p>
            </div>
            <Link className="card-link" to="/admin/grupos">Ver todos <ArrowRight size={15} /></Link>
          </div>
          <ul className="recent-list">
            {isLoading && <li className="recent-empty">Carregando…</li>}
            {!isLoading && recentGroups.length === 0 && <li className="recent-empty">Nenhum grupo cadastrado ainda.</li>}
            {recentGroups.map((group) => (
              <li key={group.id}>
                <Link className="recent-item" to={`/admin/grupos/${group.id}/editar`}>
                  <span className="recent-avatar" aria-hidden="true">{group.name.trim().charAt(0).toUpperCase() || '#'}</span>
                  <span className="recent-info">
                    <strong>{group.name}</strong>
                    <small>{group.category} · {group.date}</small>
                  </span>
                  <span className={`badge-status ${group.status.toLowerCase()}`}>{group.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
