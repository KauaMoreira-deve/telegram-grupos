import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function DashboardCategories() {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/admin/categories');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="dashboard-categories">
      <div className="page-actions-header justify-end">
        <button className="btn-primary">
          <Plus size={18} />
          <span>Criar Categoria</span>
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome da Categoria</th>
              <th>URL (Slug)</th>
              <th>Status</th>
              <th className="actions-column">Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category.id}>
                <td><strong>{category.name}</strong></td>
                <td><span className="text-muted">/{category.url}</span></td>
                <td>
                  <span className={`badge-status ${category.status.toLowerCase()}`}>
                    {category.status}
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
