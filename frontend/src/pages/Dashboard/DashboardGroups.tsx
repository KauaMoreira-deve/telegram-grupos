import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Star } from 'lucide-react';

export default function DashboardGroups() {
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/admin/groups');
        const data = await response.json();
        setGroups(data);
      } catch (error) {
        console.error("Erro ao buscar grupos:", error);
      }
    };
    fetchGroups();
  }, []);

  const filteredGroups = groups.filter(group => 
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    group.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-groups">
      <div className="page-actions-header">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou categoria..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Link to="/admin/grupos/novo" className="btn-primary">
          <Plus size={18} />
          <span>Novo grupo</span>
        </Link>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Status</th>
              <th>Destaque</th>
              <th>Data de Cadastro</th>
              <th className="actions-column">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.length > 0 ? (
              filteredGroups.map(group => (
                <tr key={group.id}>
                  <td><strong>{group.name}</strong></td>
                  <td><span className="badge-category">{group.category}</span></td>
                  <td>
                    <span className={`badge-status ${group.status.toLowerCase()}`}>
                      {group.status}
                    </span>
                  </td>
                  <td>
                    {group.featured ? (
                      <span className="badge-featured"><Star size={14} /> Sim</span>
                    ) : (
                      <span className="text-muted">Não</span>
                    )}
                  </td>
                  <td>{group.date}</td>
                  <td className="actions-cell">
                    <button className="btn-icon" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon danger" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty-state">
                  Nenhum grupo encontrado com "{searchTerm}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
