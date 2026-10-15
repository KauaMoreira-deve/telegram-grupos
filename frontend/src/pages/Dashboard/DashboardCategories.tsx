import { useCallback, useEffect, useState } from 'react';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { adminFetch as fetch } from '../../auth';
import { apiUrl } from '../../config/api';

type Category = { id: number; name: string; url: string; status: string; groupCount: number; headline: string | null; subheadline: string | null };
type CategoryForm = { nome_categoria: string; url_categoria: string; status_categoria: string; headline_categoria: string; subheadline_categoria: string };
const blankForm: CategoryForm = { nome_categoria: '', url_categoria: '', status_categoria: 'ativo', headline_categoria: '', subheadline_categoria: '' };

export default function DashboardCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(blankForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try { const response = await fetch(apiUrl('/api/admin/categories')); const data = await response.json(); if (!response.ok) throw new Error(data.erro || 'Não foi possível carregar as categorias.'); setCategories(data); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Erro de conexão ao buscar categorias.'); }
    finally { setIsLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadCategories(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCategories]);

  function openCreate() { setEditingId(null); setForm(blankForm); setIsOpen(true); }
  function openEdit(category: Category) { setEditingId(category.id); setForm({ nome_categoria: category.name, url_categoria: category.url, status_categoria: category.status.toLowerCase(), headline_categoria: category.headline || '', subheadline_categoria: category.subheadline || '' }); setIsOpen(true); }
  function closeModal() { if (!isSaving) { setIsOpen(false); setForm(blankForm); } }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSaving(true); setMessage('');
    try {
      const response = await fetch(apiUrl(`/api/admin/categories${editingId ? `/${editingId}` : ''}`), { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json(); if (!response.ok) throw new Error(data.erro || 'Não foi possível salvar a categoria.');
      setMessage(data.mensagem); closeModal(); await loadCategories();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro de conexão ao salvar categoria.'); }
    finally { setIsSaving(false); }
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`Excluir a categoria “${category.name}”?`)) return;
    try { const response = await fetch(apiUrl(`/api/admin/categories/${category.id}`), { method: 'DELETE' }); const data = await response.json(); if (!response.ok) throw new Error(data.erro || 'Não foi possível excluir a categoria.'); setMessage(data.mensagem); await loadCategories(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Erro de conexão ao excluir categoria.'); }
  }

  return <div className="dashboard-categories"><div className="page-actions-header justify-end"><button className="btn-primary" onClick={openCreate} type="button"><Plus size={18} />Criar categoria</button></div>{message && <p className="form-message">{message}</p>}<div className="table-container"><table className="data-table"><thead><tr><th>Nome da categoria</th><th>Headline</th><th>URL</th><th>Status</th><th>Grupos</th><th className="actions-column">Ações</th></tr></thead><tbody>{isLoading ? <tr><td className="empty-state" colSpan={6}>Carregando categorias…</td></tr> : categories.length ? categories.map((category) => <tr key={category.id}><td><strong>{category.name}</strong></td><td><span className="text-muted">{category.headline || 'Padrão automático'}</span></td><td><a className="text-muted" href={`/categorias/${category.url}`} rel="noreferrer" target="_blank">/categorias/{category.url}</a></td><td><span className={`badge-status ${category.status.toLowerCase()}`}>{category.status}</span></td><td>{category.groupCount}</td><td className="actions-cell"><button className="btn-icon" onClick={() => openEdit(category)} title="Editar" type="button"><Edit2 size={16} /></button><button className="btn-icon danger" onClick={() => void handleDelete(category)} title="Excluir" type="button"><Trash2 size={16} /></button></td></tr>) : <tr><td className="empty-state" colSpan={6}>Nenhuma categoria encontrada.</td></tr>}</tbody></table></div>{isOpen && <div className="modal-backdrop" role="presentation"><div aria-modal="true" className="modal-card" role="dialog"><div className="modal-heading"><h2>{editingId ? 'Editar categoria' : 'Criar categoria'}</h2><button aria-label="Fechar" className="btn-icon" onClick={closeModal} type="button"><X size={19} /></button></div><form onSubmit={(event) => void handleSubmit(event)}><div className="form-group"><label htmlFor="nome_categoria">Nome</label><input id="nome_categoria" onChange={(event) => setForm((current) => ({ ...current, nome_categoria: event.target.value }))} required value={form.nome_categoria} /></div><div className="form-group"><label htmlFor="url_categoria">URL (slug)</label><input id="url_categoria" onChange={(event) => setForm((current) => ({ ...current, url_categoria: event.target.value }))} placeholder="ex.: tecnologia" required value={form.url_categoria} /></div><div className="form-group"><label htmlFor="headline_categoria">Headline (título da página)</label><input id="headline_categoria" maxLength={160} onChange={(event) => setForm((current) => ({ ...current, headline_categoria: event.target.value }))} placeholder={`Padrão: Grupos de ${form.nome_categoria || 'Categoria'} no Telegram +18`} value={form.headline_categoria} /><small className="text-muted">Aparece como título principal e no Google. Até 160 caracteres.</small></div><div className="form-group"><label htmlFor="subheadline_categoria">Subheadline (texto de apoio)</label><textarea id="subheadline_categoria" maxLength={500} onChange={(event) => setForm((current) => ({ ...current, subheadline_categoria: event.target.value }))} placeholder="Texto exibido abaixo do título e usado como descrição no Google." rows={3} value={form.subheadline_categoria} /><small className="text-muted">{form.subheadline_categoria.length}/500 — os primeiros 160 caracteres viram a descrição no Google.</small></div><div className="form-group"><label htmlFor="status_categoria">Status</label><select id="status_categoria" onChange={(event) => setForm((current) => ({ ...current, status_categoria: event.target.value }))} value={form.status_categoria}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div><div className="form-actions"><button className="btn-secondary" disabled={isSaving} onClick={closeModal} type="button">Cancelar</button><button className="btn-primary" disabled={isSaving} type="submit">{isSaving ? 'Salvando…' : 'Salvar categoria'}</button></div></form></div></div>}</div>;
}
