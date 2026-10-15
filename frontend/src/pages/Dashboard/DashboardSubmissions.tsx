import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, Trash2, X } from 'lucide-react';
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
      if (!response.ok) throw new Error(data.erro || 'Não foi possível carregar as solicitações.');
      setSubmissions(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível carregar as solicitações.');
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
      if (!response.ok) throw new Error(data.erro || 'Não foi possível analisar a solicitação.');
      setSubmissions((current) => current.map((item) => item.id === submission.id ? { ...item, status: action === 'approve' ? 'aprovada' : 'recusada' } : item));
      setMessage(data.mensagem);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível analisar a solicitação.');
    } finally {
      setProcessingId(null);
    }
  }

  async function deleteSubmission(submission: Submission) {
    if (!window.confirm(`Excluir a solicitação "${submission.name}"? Esta ação não pode ser desfeita.`)) return;
    setProcessingId(submission.id);
    setMessage('');
    try {
      const response = await fetch(apiUrl(`/api/admin/group-submissions/${submission.id}`), { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Não foi possível excluir a solicitação.');
      setSubmissions((current) => current.filter((item) => item.id !== submission.id));
      setMessage(data.mensagem);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível excluir a solicitação.');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="dashboard-submissions">
      <div className="page-actions-header"><div><h2 className="dashboard-page-heading">Solicitações de grupos</h2><p className="dashboard-page-description">Aprove uma solicitação para criar e publicar o grupo automaticamente.</p></div></div>
      {message && <p className="form-message">{message}</p>}
      <div className="table-container">
        <table className="data-table submissions-table">
          <thead><tr><th>Grupo</th><th>Categoria</th><th>Contato</th><th>Enviado em</th><th>Status</th><th className="actions-column">Ações</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td className="empty-state" colSpan={6}>Carregando solicitações…</td></tr> : submissions.length ? submissions.map((submission) => (
              <tr key={submission.id}>
                <td><strong>{submission.name}</strong><span className="table-detail">{submission.description}</span>{safeTelegramUrl(submission.telegramLink) ? <a className="table-external-link" href={safeTelegramUrl(submission.telegramLink) || undefined} rel="noopener noreferrer" target="_blank">Abrir Telegram <ExternalLink size={13} /></a> : <span className="table-detail">Link do Telegram inválido</span>}</td>
                <td><span className="badge-category">{submission.category}</span></td>
                <td>{submission.contactName}<span className="table-detail">{submission.contactEmail}</span></td>
                <td>{submission.createdAt}</td>
                <td><span className={`badge-status ${submission.status}`}>{submission.status}</span></td>
                <td className="actions-cell">
                  {submission.status === 'pendente' && <><button aria-label={`Aprovar ${submission.name}`} className="btn-icon approve" disabled={processingId === submission.id} onClick={() => void reviewSubmission(submission, 'approve')} title="Aprovar e publicar" type="button"><Check size={17} /></button><button aria-label={`Recusar ${submission.name}`} className="btn-icon danger" disabled={processingId === submission.id} onClick={() => void reviewSubmission(submission, 'reject')} title="Recusar" type="button"><X size={17} /></button></>}
                  <button aria-label={`Excluir solicitação ${submission.name}`} className="btn-icon danger" disabled={processingId === submission.id} onClick={() => void deleteSubmission(submission)} title="Excluir solicitação" type="button"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : <tr><td className="empty-state" colSpan={6}>Nenhuma solicitação encontrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
