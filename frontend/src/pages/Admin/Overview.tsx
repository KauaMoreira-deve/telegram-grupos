import { Link } from 'react-router-dom'
import { initialGroups } from '../../admin/data'
import { Icon } from '../../admin/icons'

const metrics = [
  { label: 'Total de grupos', value: '86', change: '+12,5%', description: 'desde o último mês', icon: 'groups' as const, tone: 'indigo' },
  { label: 'Grupos ativos', value: '74', change: '+8,2%', description: 'desde o último mês', icon: 'check' as const, tone: 'green' },
  { label: 'Total de categorias', value: '12', change: '+2 novas', description: 'este mês', icon: 'categories' as const, tone: 'orange' },
  { label: 'Total de acessos', value: '24.890', change: '+18,4%', description: 'desde o último mês', icon: 'eye' as const, tone: 'purple' },
]

export default function Overview() {
  return (
    <div className="admin-page admin-overview">
      <section className="admin-page-intro">
        <div>
          <h2>Olá, André <span aria-hidden="true">👋</span></h2>
          <p>Acompanhe os principais números da sua plataforma.</p>
        </div>
        <Link className="admin-button admin-button-primary" to="/admin/grupos/novo">
          <Icon name="plus" size={18} />
          Novo grupo
        </Link>
      </section>

      <section className="admin-metrics" aria-label="Métricas gerais">
        {metrics.map((metric) => (
          <article className="admin-metric-card" key={metric.label}>
            <div className={`admin-metric-icon ${metric.tone}`}><Icon name={metric.icon} size={21} /></div>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span className="admin-metric-change"><b>{metric.change}</b> {metric.description}</span>
          </article>
        ))}
      </section>

      <section className="admin-panel admin-recent-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Grupos adicionados recentemente</h2>
            <p>Últimos grupos cadastrados na plataforma.</p>
          </div>
          <Link className="admin-text-link" to="/admin/grupos">Ver todos <Icon name="arrow-left" size={16} /></Link>
        </div>

        <div className="admin-recent-list">
          {initialGroups.slice(0, 4).map((group) => (
            <article className="admin-recent-item" key={group.id}>
              <div className="admin-group-avatar" style={{ backgroundColor: group.color }}>{group.initials}</div>
              <div className="admin-recent-main">
                <strong>{group.name}</strong>
                <span>{group.category} · {group.members}</span>
              </div>
              <span className={`admin-status ${group.status === 'Ativo' ? 'active' : 'inactive'}`}><i />{group.status}</span>
              <time>{group.createdAt}</time>
              <button aria-label={`Opções para ${group.name}`} className="admin-icon-button" type="button"><Icon name="more" size={20} /></button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
