export default function DashboardSettings() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Configurações salvas com sucesso!');
  };

  return (
    <div className="dashboard-settings">
      <div className="form-container" style={{ maxWidth: '600px' }}>
        <h2>Configurações do Administrador</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="adminName">Nome</label>
              <input type="text" id="adminName" defaultValue="Administrador" required />
            </div>

            <div className="form-group">
              <label htmlFor="adminEmail">E-mail</label>
              <input type="email" id="adminEmail" defaultValue="admin@plataforma.com" required />
            </div>

            <div className="form-group">
              <label htmlFor="adminPassword">Nova Senha</label>
              <input type="password" id="adminPassword" placeholder="Deixe em branco para não alterar" />
            </div>
            
            <div className="form-group">
              <label htmlFor="adminPasswordConfirm">Confirmar Nova Senha</label>
              <input type="password" id="adminPasswordConfirm" placeholder="Confirme a nova senha" />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
