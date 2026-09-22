import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Edit2, Plus, RefreshCw, Search, Star, Trash2 } from 'lucide-react';
import { adminFetch as fetch } from '../../auth';
import { apiUrl } from '../../config/api';

type Group = {
  id: number;
  name: string;
  category: string;
  status: string;
  featured: boolean;
  date: string;
  members: number | null;
  accesses: number;
  membersUpdatedAt: string | null;
};

const formatCount = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

export default function DashboardGroups() {
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingGroupId, setSyncingGroupId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const location = useLocation();

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/api/admin/groups'));
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Não foi possível carregar os grupos.');
      setGroups(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro de conexão ao buscar grupos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadGroups(), 0);
    return () => window.clearTimeout(timer);
  }, [loadGroups]);
  useEffect(() => {
    const feedback = (location.state as { feedback?: string } | null)?.feedback;
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => {
      setMessage(feedback);
      window.history.replaceState({}, '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.state]);

  const filteredGroups = groups
    .filter((group) => `${group.name} ${group.category}`.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((first, second) => Number(second.featured) - Number(first.featured) || second.id - first.id);

  async function handleDelete(group: Group) {
    if (!window.confirm(`Excluir o grupo “${group.name}”? Esta ação não pode ser desfeita.`)) return;
    try {
      const response = await fetch(apiUrl(`/api/admin/groups/${group.id}`), { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Não foi possível excluir o grupo.');
      setGroups((current) => current.filter(({ id }) => id !== group.id));
      setMessage(data.mensagem);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro de conexão ao excluir grupo.');
    }
  }

  async function handleSyncMembers(group: Group) {
    setSyncingGroupId(group.id);
    try {
      const response = await fetch(apiUrl(`/api/admin/groups/${group.id}/sync-members`), { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Não foi possível atualizar os membros.');
      setGroups((current) => current.map((item) => item.id === group.id ? { ...item, members: data.members } : item));
      setMessage(data.mensagem);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro de conexão ao atualizar os membros.');
    } finally {
      setSyncingGroupId(null);
    }
  }

  return (
    <div className="dashboard-groups">
      <div className="page-actions-header">
        <div className="search-box"><Search size={18} /><input onChange={(event) => setSearchTerm(event.target.value)} placeholder="Pesquisar por nome ou categoria…" value={searchTerm} /></div>
        <Link className="btn-primary" to="/admin/grupos/novo"><Plus size={18} />Novo grupo</Link>
      </div>
      {message && <p className="form-message">{message}</p>}
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Categoria</th><th>Status</th><th>Destaque</th><th>Cadastro</th><th>Membros</th><th>Acessos</th><th className="actions-column">Ações</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td className="empty-state" colSpan={8}>Carregando grupos…</td></tr> : filteredGroups.length ? filteredGroups.map((group) => (
              <tr key={group.id}>
                <td><strong>{group.name}</strong></td>
                <td><span className="badge-category">{group.category}</span></td>
                <td><span className={`badge-status ${group.status.toLowerCase()}`}>{group.status}</span></td>
                <td>{group.featured ? <span className="badge-featured"><Star size={14} />Sim</span> : <span className="text-muted">Não</span>}</td>
                <td>{group.date}</td>
                <td title={group.membersUpdatedAt ? `Atualizado em ${group.membersUpdatedAt}` : undefined}>{group.members === null ? 'Indisponível' : formatCount(group.members)}</td>
                <td>{formatCount(group.accesses)}</td>
                <td className="actions-cell">
                  <button aria-label={`Atualizar membros de ${group.name}`} className="btn-icon" disabled={syncingGroupId === group.id} onClick={() => void handleSyncMembers(group)} title="Atualizar membros pelo Telegram" type="button"><RefreshCw className={syncingGroupId === group.id ? 'is-spinning' : ''} size={16} /></button>
                  <Link aria-label={`Editar ${group.name}`} className="btn-icon" title="Editar" to={`/admin/grupos/${group.id}/editar`}><Edit2 size={16} /></Link>
                  <button aria-label={`Excluir ${group.name}`} className="btn-icon danger" onClick={() => void handleDelete(group)} title="Excluir" type="button"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : <tr><td className="empty-state" colSpan={8}>Nenhum grupo encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
