import { useState, useEffect } from 'react';
import { Users, UserCheck, Tags, MousePointerClick } from 'lucide-react';

export default function DashboardHome() {
  const [statsData, setStatsData] = useState({
    totalGroups: 0,
    activeGroups: 0,
    totalCategories: 0,
    totalAcessos: 0
  });
  
  const [recentGroups, setRecentGroups] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/admin/stats');
        const data = await response.json();
        if (data.stats) setStatsData(data.stats);
        if (data.recentGroups) setRecentGroups(data.recentGroups);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { label: 'Total de grupos', value: statsData.totalGroups, icon: <Users size={24} />, color: 'var(--primary-color)' },
    { label: 'Grupos ativos', value: statsData.activeGroups, icon: <UserCheck size={24} />, color: 'var(--success-color)' },
    { label: 'Total de categorias', value: statsData.totalCategories, icon: <Tags size={24} />, color: 'var(--warning-color)' },
    { label: 'Total de acessos', value: `${(statsData.totalAcessos / 1000).toFixed(1)}k`, icon: <MousePointerClick size={24} />, color: 'var(--info-color)' },
  ];

  return (
    <div className="dashboard-home">
      {/* Stats Cards */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div className="stat-card" key={index}>
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Groups Section */}
      <div className="recent-section">
        <div className="section-header">
          <h2>Grupos Adicionados Recentemente</h2>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome do Grupo</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {recentGroups.map(group => (
                <tr key={group.id}>
                  <td><strong>{group.name}</strong></td>
                  <td><span className="badge-category">{group.category}</span></td>
                  <td>
                    <span className={`badge-status ${group.status.toLowerCase()}`}>
                      {group.status}
                    </span>
                  </td>
                  <td>{group.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
