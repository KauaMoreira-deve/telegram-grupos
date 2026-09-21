import { useState } from 'react';
import { adminFetch as fetch, getAccessToken, getAdminSession, saveAdminSession } from '../../auth';
import { apiUrl } from '../../config/api';

export default function DashboardSettings() {
  const admin = getAdminSession();
  const [name, setName] = useState(admin?.nome ?? 'Administrador');
  const [email, setEmail] = useState(admin?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!admin) { setMessage('Sua sessão não foi encontrada. Entre novamente para continuar.'); return; }
    if (password && password !== confirmation) { setMessage('A confirmação de senha não confere.'); return; }
    setIsSaving(true); setMessage('');
    try {
      const response = await fetch(apiUrl('/api/admin/profile'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome_usuario: name, email_usuario: email, senha_usuario: password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Não foi possível salvar as configurações.');
      const token = getAccessToken();
      if (token) saveAdminSession({ ...admin, nome: name, email }, token);
      setPassword(''); setConfirmation(''); setMessage(data.mensagem);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro de conexão ao salvar configurações.'); }
    finally { setIsSaving(false); }
  }

  return <div className="dashboard-settings"><div className="form-container" style={{ maxWidth: '600px' }}><h2>Configurações do administrador</h2>{message && <p className="form-message">{message}</p>}<form onSubmit={(event) => void handleSubmit(event)}><div className="form-section"><div className="form-group"><label htmlFor="adminName">Nome</label><input id="adminName" onChange={(event) => setName(event.target.value)} required value={name} /></div><div className="form-group"><label htmlFor="adminEmail">E-mail</label><input id="adminEmail" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></div><div className="form-group"><label htmlFor="adminPassword">Nova senha</label><input id="adminPassword" minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="Deixe em branco para não alterar" type="password" value={password} /></div><div className="form-group"><label htmlFor="adminPasswordConfirm">Confirmar nova senha</label><input id="adminPasswordConfirm" minLength={8} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirme a nova senha" type="password" value={confirmation} /></div></div><div className="form-actions"><button className="btn-primary" disabled={isSaving} type="submit">{isSaving ? 'Salvando…' : 'Salvar alterações'}</button></div></form></div></div>;
}
