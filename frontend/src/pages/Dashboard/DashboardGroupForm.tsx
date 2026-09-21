import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminFetch as fetch } from '../../auth';
import { apiUrl } from '../../config/api';
import { safeTelegramUrl } from '../../config/site';

type Category = { id: number; name: string; status: string };
type GroupFormData = {
  nome_grupo: string;
  id_categoria: string;
  url_grupo: string;
  descricao_grupo: string;
  link_telegram: string;
  quantidade_membros: string;
  hashtags: string;
  status_grupo: string;
  destaque_grupo: string;
};

const emptyForm: GroupFormData = {
  nome_grupo: '',
  id_categoria: '',
  url_grupo: '',
  descricao_grupo: '',
  link_telegram: '',
  quantidade_membros: '',
  hashtags: '',
  status_grupo: 'ativo',
  destaque_grupo: 'nao',
};

const MAX_HASHTAGS = 3;

function countHashtags(value: string) {
  return new Set(
    value
      .split(/[\n,]/)
      .map((hashtag) => hashtag.trim().replace(/^#+/, '').toLocaleLowerCase('pt-BR'))
      .filter(Boolean),
  ).size;
}

export default function DashboardGroupForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<GroupFormData>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const hashtagCount = countHashtags(formData.hashtags);
  const hasTooManyHashtags = hashtagCount > MAX_HASHTAGS;

  useEffect(() => {
    async function loadForm() {
      try {
        const categoryResponse = await fetch(apiUrl('/api/admin/categories'));
        const categoryData = await categoryResponse.json();
        if (!categoryResponse.ok) throw new Error(categoryData.erro || 'Não foi possível carregar as categorias.');
        setCategories(categoryData.filter((category: Category) => category.status === 'Ativo'));

        if (id) {
          const groupResponse = await fetch(apiUrl(`/api/admin/groups/${id}`));
          const group = await groupResponse.json();
          if (!groupResponse.ok) throw new Error(group.erro || 'Não foi possível carregar o grupo.');
          setFormData({
            nome_grupo: group.nome_grupo,
            id_categoria: String(group.id_categoria),
            url_grupo: group.url_grupo,
            descricao_grupo: group.descricao_grupo,
            link_telegram: group.link_telegram,
            quantidade_membros: group.quantidade_membros === null ? '' : String(group.quantidade_membros),
            hashtags: (group.hashtags || []).join(', '),
            status_grupo: group.status_grupo,
            destaque_grupo: group.destaque_grupo ? 'sim' : 'nao',
          });
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Ocorreu um erro ao carregar o formulário.');
      } finally {
        setIsLoading(false);
      }
    }
    void loadForm();
  }, [id]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { id: field, value } = event.target;
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasTooManyHashtags) {
      setMessage(`Use no máximo ${MAX_HASHTAGS} hashtags por grupo.`);
      return;
    }
    const telegramLink = safeTelegramUrl(formData.link_telegram);
    if (!telegramLink) {
      setMessage('Informe um link HTTPS válido do Telegram (t.me).');
      return;
    }
    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch(apiUrl(`/api/admin/groups${id ? `/${id}` : ''}`), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, link_telegram: telegramLink }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Não foi possível salvar o grupo.');
      navigate('/admin/grupos', { state: { feedback: data.mensagem } });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro de conexão ao salvar o grupo.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="loading-state">Carregando formulário…</div>;

  return (
    <div className="dashboard-form-page">
      <div className="form-container">
        <h2>{isEditing ? 'Editar grupo' : 'Cadastrar novo grupo'}</h2>
        {message && <p className="form-message error">{message}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Informações do grupo</h3>
            <div className="form-group"><label htmlFor="nome_grupo">Nome do grupo</label><input id="nome_grupo" onChange={handleChange} placeholder="Ex.: Desenvolvedores React" required value={formData.nome_grupo} /></div>
            <div className="form-row">
              <div className="form-group"><label htmlFor="id_categoria">Categoria</label><select id="id_categoria" onChange={handleChange} required value={formData.id_categoria}><option value="">Selecione uma categoria…</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
              <div className="form-group"><label htmlFor="url_grupo">URL do grupo (slug)</label><input id="url_grupo" onChange={handleChange} placeholder="ex.: desenvolvedores-react" required value={formData.url_grupo} /></div>
            </div>
            <div className="form-group"><label htmlFor="descricao_grupo">Descrição</label><textarea id="descricao_grupo" onChange={handleChange} placeholder="Descreva sobre o que é este grupo…" required rows={4} value={formData.descricao_grupo} /></div>
            <div className="form-row">
              <div className="form-group"><label htmlFor="link_telegram">Link do Telegram</label><input id="link_telegram" inputMode="url" onChange={handleChange} placeholder="https://t.me/seugrupo" required title="Use um link HTTPS do Telegram, como https://t.me/seugrupo" type="url" value={formData.link_telegram} /></div>
              <div className="form-group"><label htmlFor="quantidade_membros">Quantidade de membros</label><input id="quantidade_membros" min="0" onChange={handleChange} placeholder="Ex.: 1250" type="number" value={formData.quantidade_membros} /><small className="form-helper">Opcional. Use quando o Telegram não informar o total automaticamente.</small></div>
            </div>
            <div className="form-group"><label htmlFor="hashtags">Hashtags</label><input aria-describedby="hashtags-helper" aria-invalid={hasTooManyHashtags} id="hashtags" onChange={handleChange} placeholder="Ex.: tecnologia, react, vagas" value={formData.hashtags} /><small className="form-helper" id="hashtags-helper">Separe por vírgula e use no máximo {MAX_HASHTAGS} hashtags ({hashtagCount}/{MAX_HASHTAGS}). Use apenas letras, números, hífen ou _.</small></div>
          </div>
          <div className="form-section">
            <h3>Configurações</h3>
            <div className="form-row">
              <div className="form-group"><label htmlFor="status_grupo">Status</label><select id="status_grupo" onChange={handleChange} value={formData.status_grupo}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
              <div className="form-group"><label htmlFor="destaque_grupo">Destaque</label><select id="destaque_grupo" onChange={handleChange} value={formData.destaque_grupo}><option value="nao">Não</option><option value="sim">Sim</option></select></div>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-secondary" disabled={isSaving} onClick={() => navigate('/admin/grupos')} type="button">Cancelar</button>
            <button className="btn-primary" disabled={isSaving || hasTooManyHashtags} type="submit">{isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar grupo'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
