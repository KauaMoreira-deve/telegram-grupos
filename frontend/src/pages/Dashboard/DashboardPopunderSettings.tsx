import { useEffect, useState } from 'react';
import { adminFetch as fetch } from '../../auth';
import { apiUrl } from '../../config/api';

type PopunderMode = 'sequencial' | 'aleatorio';
type PopunderSettings = { enabled: boolean; mode: PopunderMode; links: string[] };

// Configuração do link aberto no primeiro clique em "Entrar no grupo" (pop under).
export default function DashboardPopunderSettings() {
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<PopunderMode>('sequencial');
  const [links, setLinks] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  function applySettings(settings: PopunderSettings) {
    setEnabled(settings.enabled);
    setMode(settings.mode);
    setLinks(settings.links.join('\n'));
  }

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch(apiUrl('/api/admin/site-settings'));
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Não foi possível carregar o pop under.');
        applySettings(data.popunder);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Erro de conexão ao carregar o pop under.');
      } finally {
        setIsLoading(false);
      }
    }
    void loadSettings();
  }, []);

  const linkList = links.split(/\r?\n/).map((link) => link.trim()).filter(Boolean);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch(apiUrl('/api/admin/site-settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ popunder: { enabled, mode, links: linkList } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Não foi possível salvar o pop under.');
      applySettings(data.popunder);
      setMessage(data.mensagem);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro de conexão ao salvar o pop under.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="form-container" style={{ maxWidth: '600px', marginTop: '24px' }}>
      <h2>Pop under</h2>
      <p className="text-muted">Link aberto no primeiro clique em “Entrar no grupo” de cada sessão. No clique seguinte o visitante vai para o grupo. Com mais de um link, eles entram em rodízio.</p>
      {message && <p className="form-message">{message}</p>}
      {isLoading ? <p className="text-muted">Carregando…</p> : (
        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="popunderEnabled" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input checked={enabled} id="popunderEnabled" onChange={(event) => setEnabled(event.target.checked)} style={{ width: 'auto' }} type="checkbox" />
                Pop under ativo
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="popunderLinks">Links (um por linha)</label>
              <textarea id="popunderLinks" onChange={(event) => setLinks(event.target.value)} placeholder={'https://t.me/addlist/...\nhttps://exemplo.com/oferta'} rows={5} value={links} />
              <small className="text-muted">{linkList.length} {linkList.length === 1 ? 'link' : 'links'} — use apenas endereços HTTPS (máximo 20).</small>
            </div>
            <div className="form-group">
              <label htmlFor="popunderMode">Rotatividade</label>
              <select id="popunderMode" onChange={(event) => setMode(event.target.value as PopunderMode)} value={mode}>
                <option value="sequencial">Sequencial (um de cada vez, em ordem)</option>
                <option value="aleatorio">Aleatória</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-primary" disabled={isSaving} type="submit">{isSaving ? 'Salvando…' : 'Salvar pop under'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
