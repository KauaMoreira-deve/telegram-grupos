import { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';

export default function DashboardUsers() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/admin/users');
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="dashboard-categories">
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Status</th>
              <th className="actions-column">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td><span className="text-muted">{user.email}</span></td>
                <td>
                  <span className={`badge-status ${user.status.toLowerCase()}`}>
                    {user.status}
                  </span>
                </td>
                <td className="actions-cell">
                  <button className="btn-icon" title="Editar">
                    <Edit2 size={16} />
                  </button>
                  <button className="btn-icon danger" title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
