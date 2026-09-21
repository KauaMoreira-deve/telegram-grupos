import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, X } from 'lucide-react';
import { adminFetch as fetch } from '../../auth';
import { apiUrl } from '../../config/api';
import { safeTelegramUrl } from '../../config/site';

type Submission = {
  id: number;
  name: string;
  description: string;
  telegramLink: string;
  contactName: string;
  contactEmail: string;
  category: string;
  status: 'pendente' | 'aprovada' | 'recusada';
  createdAt: string;
};

export default function DashboardSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const loadSubmissions = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/api/admin/group-submissions'));
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Nao foi possivel carregar as solicitacoes.');
      setSubmissions(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel carregar as solicitacoes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSubmissions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSubmissions]);

  async function reviewSubmission(submission: Submission, action: 'approve' | 'reject') {
    const verb = action === 'approve' ? 'aprovar e publicar' : 'recusar';
    if (!window.confirm(`Deseja ${verb} o grupo "${submission.name}"?`)) return;
    setProcessingId(submission.id);
    setMessage('');
    try {
      const response = await fetch(apiUrl(`/api/admin/group-submissions/${submission.id}/${action}`), { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Nao foi possivel analisar a solicitacao.');
      setSubmissions((current) => current.map((item) => item.id === submission.id ? { ...item, status: action === 'approve' ? 'aprovada' : 'recusada' } : item));
      setMessage(data.mensagem);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel analisar a solicitacao.');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="dashboard-submissions">
      <div className="page-actions-header"><div><h2 className="dashboard-page-heading">Solicitacoes de grupos</h2><p className="dashboard-page-description">Aprove uma solicitacao para criar e publicar o grupo automaticamente.</p></div></div>
      {message && <p className="form-message">{message}</p>}
      <div className="table-container">
        <table className="data-table submissions-table">
          <thead><tr><th>Grupo</th><th>Categoria</th><th>Contato</th><th>Enviado em</th><th>Status</th><th className="actions-column">Acoes</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td className="empty-state" colSpan={6}>Carregando solicitacoes...</td></tr> : submissions.length ? submissions.map((submission) => (
              <tr key={submission.id}>
                <td><strong>{submission.name}</strong><span className="table-detail">{submission.description}</span>{safeTelegramUrl(submission.telegramLink) ? <a className="table-external-link" href={safeTelegramUrl(submission.telegramLink) || undefined} rel="noopener noreferrer" target="_blank">Abrir Telegram <ExternalLink size={13} /></a> : <span className="table-detail">Link do Telegram inválido</span>}</td>
                <td><span className="badge-category">{submission.category}</span></td>
                <td>{submission.contactName}<span className="table-detail">{submission.contactEmail}</span></td>
                <td>{submission.createdAt}</td>
                <td><span className={`badge-status ${submission.status}`}>{submission.status}</span></td>
                <td className="actions-cell">
                  {submission.status === 'pendente' && <><button aria-label={`Aprovar ${submission.name}`} className="btn-icon approve" disabled={processingId === submission.id} onClick={() => void reviewSubmission(submission, 'approve')} title="Aprovar e publicar" type="button"><Check size={17} /></button><button aria-label={`Recusar ${submission.name}`} className="btn-icon danger" disabled={processingId === submission.id} onClick={() => void reviewSubmission(submission, 'reject')} title="Recusar" type="button"><X size={17} /></button></>}
                </td>
              </tr>
            )) : <tr><td className="empty-state" colSpan={6}>Nenhuma solicitacao encontrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
