import { useNavigate } from 'react-router-dom';

export default function DashboardGroupForm() {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate save
    navigate('/admin/grupos');
  };

  return (
    <div className="dashboard-form-page">
      <div className="form-container">
        <h2>Cadastrar Novo Grupo</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Informações do grupo</h3>
            
            <div className="form-group">
              <label htmlFor="name">Nome do grupo</label>
              <input type="text" id="name" placeholder="Ex: Desenvolvedores React" required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Categoria</label>
                <select id="category" required>
                  <option value="">Selecione uma categoria...</option>
                  <option value="tecnologia">Tecnologia</option>
                  <option value="financas">Finanças</option>
                  <option value="empregos">Empregos</option>
                  <option value="entretenimento">Entretenimento</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="url">URL do grupo (slug)</label>
                <input type="text" id="url" placeholder="Ex: desenvolvedores-react" required />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Descrição</label>
              <textarea id="description" rows={4} placeholder="Descreva sobre o que é este grupo..." required></textarea>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="telegramLink">Link do Telegram</label>
                <input type="url" id="telegramLink" placeholder="https://t.me/seugrupo" required />
              </div>

              <div className="form-group">
                <label htmlFor="imageUrl">URL da imagem (Logo)</label>
                <input type="url" id="imageUrl" placeholder="https://exemplo.com/imagem.png" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Configurações</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select id="status">
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="featured">Destaque</label>
                <select id="featured">
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/admin/grupos')}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Criar grupo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
