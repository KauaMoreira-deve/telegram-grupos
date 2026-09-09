import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { initialGroups } from '../../admin/data'
import type { Group } from '../../admin/data'
import { useAdminFeedback } from '../../admin/feedback'
import { Icon } from '../../admin/icons'

export default function Groups() {
  const [groups, setGroups] = useState(initialGroups)
  const [search, setSearch] = useState('')
  const { showFeedback } = useAdminFeedback()
  const navigate = useNavigate()
  const filteredGroups = useMemo(() => groups.filter((group) =>
    `${group.name} ${group.category}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')),
  ), [groups, search])

  function deleteGroup(group: Group) {
    setGroups((current) => current.filter(({ id }) => id !== group.id))
    showFeedback(`“${group.name}” foi excluído da lista.`)
  }

  return (
    <div className="admin-page">
      <section className="admin-page-intro">
        <div>
          <h2>Gerencie seus grupos</h2>
          <p>Cadastre, edite e acompanhe os grupos divulgados na plataforma.</p>
        </div>
        <Link className="admin-button admin-button-primary" to="/admin/grupos/novo"><Icon name="plus" size={18} />Novo grupo</Link>
      </section>

      <section className="admin-panel admin-table-panel">
        <div className="admin-list-toolbar">
          <div className="admin-search-field">
            <Icon name="search" size={19} />
            <input aria-label="Pesquisar grupos" onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por nome ou categoria..." type="search" value={search} />
          </div>
          <p>{filteredGroups.length} {filteredGroups.length === 1 ? 'grupo encontrado' : 'grupos encontrados'}</p>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Grupo</th><th>Categoria</th><th>Status</th><th>Destaque</th><th>Data de cadastro</th><th aria-label="Ações" /></tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => (
                <tr key={group.id}>
                  <td data-label="Grupo"><div className="admin-table-group"><span className="admin-group-avatar" style={{ backgroundColor: group.color }}>{group.initials}</span><div><strong>{group.name}</strong><small>{group.members}</small></div></div></td>
                  <td data-label="Categoria"><span className="admin-category-label">{group.category}</span></td>
                  <td data-label="Status"><span className={`admin-status ${group.status === 'Ativo' ? 'active' : 'inactive'}`}><i />{group.status}</span></td>
                  <td data-label="Destaque">{group.featured ? <span className="admin-featured"><Icon name="sparkle" size={15} />Em destaque</span> : <span className="admin-muted">—</span>}</td>
                  <td data-label="Data de cadastro" className="admin-date">{group.createdAt}</td>
                  <td className="admin-actions"><button aria-label={`Editar ${group.name}`} className="admin-action-button" onClick={() => navigate('/admin/grupos/novo', { state: { group } })} type="button"><Icon name="edit" size={17} /></button><button aria-label={`Excluir ${group.name}`} className="admin-action-button danger" onClick={() => deleteGroup(group)} type="button"><Icon name="trash" size={17} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredGroups.length === 0 && <div className="admin-empty-state"><Icon name="search" size={26} /><strong>Nenhum grupo encontrado</strong><span>Tente pesquisar por outro termo.</span></div>}
        </div>

        <footer className="admin-table-footer"><span>Mostrando {filteredGroups.length} de {groups.length} grupos</span><div className="admin-pagination"><button disabled type="button">Anterior</button><button className="current" type="button">1</button><button disabled type="button">Próximo</button></div></footer>
      </section>
    </div>
  )
}
