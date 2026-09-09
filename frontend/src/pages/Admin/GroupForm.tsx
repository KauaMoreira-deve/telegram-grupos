import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Group } from '../../admin/data'
import { useAdminFeedback } from '../../admin/feedback'
import { Icon } from '../../admin/icons'

type GroupFormLocation = { group?: Group }

export default function GroupForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showFeedback } = useAdminFeedback()
  const group = (location.state as GroupFormLocation | null)?.group
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>(group?.status ?? 'Ativo')
  const [featured, setFeatured] = useState(group?.featured ?? false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    window.setTimeout(() => {
      setIsSaving(false)
      showFeedback(group ? 'Alterações do grupo salvas com sucesso.' : 'Grupo criado com sucesso.')
      navigate('/admin/grupos')
    }, 650)
  }

  return (
    <div className="admin-page admin-form-page">
      <button className="admin-back-link" onClick={() => navigate('/admin/grupos')} type="button"><Icon name="arrow-left" size={18} />Voltar para grupos</button>
      <section className="admin-form-heading"><h2>{group ? 'Editar grupo' : 'Cadastrar novo grupo'}</h2><p>Preencha os dados abaixo para {group ? 'atualizar' : 'adicionar'} um grupo à plataforma.</p></section>

      <form className="admin-form-card" onSubmit={handleSubmit}>
        <div className="admin-form-section-heading"><span className="admin-section-icon"><Icon name="groups" size={19} /></span><div><h3>Informações do grupo</h3><p>Dados que serão exibidos para os visitantes.</p></div></div>
        <div className="admin-form-grid">
          <label className="admin-field full"><span>Nome do grupo <b>*</b></span><input defaultValue={group?.name} name="name" placeholder="Ex.: Dev Brasil" required /></label>
          <label className="admin-field"><span>Categoria <b>*</b></span><select defaultValue={group?.category ?? ''} name="category" required><option disabled value="">Selecione uma categoria</option><option>Tecnologia</option><option>Negócios</option><option>Carreira</option><option>Educação</option><option>Marketing</option><option>Finanças</option></select></label>
          <label className="admin-field"><span>URL do grupo <b>*</b></span><input defaultValue={group ? group.name.toLocaleLowerCase('pt-BR').replaceAll(' ', '-') : ''} name="slug" placeholder="ex.: dev-brasil" required /></label>
          <label className="admin-field full"><span>Descrição <b>*</b></span><textarea defaultValue={group ? `Comunidade ${group.name} para troca de experiências e conexões.` : ''} name="description" placeholder="Conte um pouco sobre o grupo, seus objetivos e para quem ele é indicado..." required rows={5} /></label>
          <label className="admin-field"><span>Link do Telegram <b>*</b></span><div className="admin-input-icon"><Icon name="link" size={17} /><input defaultValue={group ? `https://t.me/${group.name.toLocaleLowerCase('pt-BR').replaceAll(' ', '')}` : ''} name="telegramLink" placeholder="https://t.me/nomedogrupo" required type="url" /></div></label>
          <label className="admin-field"><span>URL da imagem</span><div className="admin-input-icon"><Icon name="image" size={17} /><input name="imageUrl" placeholder="https://exemplo.com/imagem.jpg" type="url" /></div><small>Recomendado: imagem quadrada de pelo menos 400 × 400 px.</small></label>
        </div>

        <div className="admin-form-divider" />
        <div className="admin-form-section-heading"><span className="admin-section-icon purple"><Icon name="settings" size={19} /></span><div><h3>Configurações</h3><p>Controle como o grupo aparece na plataforma.</p></div></div>
        <div className="admin-settings-grid">
          <div className="admin-choice-card"><div><strong>Status do grupo</strong><span>Grupos inativos não são exibidos publicamente.</span></div><div className="admin-segmented" aria-label="Status do grupo"><button className={status === 'Ativo' ? 'selected' : ''} onClick={() => setStatus('Ativo')} type="button">Ativo</button><button className={status === 'Inativo' ? 'selected' : ''} onClick={() => setStatus('Inativo')} type="button">Inativo</button></div></div>
          <div className="admin-choice-card"><div><strong>Grupo em destaque</strong><span>Exiba este grupo em áreas de maior visibilidade.</span></div><button aria-checked={featured} aria-label="Alternar destaque" className={`admin-switch ${featured ? 'on' : ''}`} onClick={() => setFeatured((current) => !current)} role="switch" type="button"><span /></button></div>
        </div>

        <div className="admin-form-actions"><button className="admin-button admin-button-secondary" onClick={() => navigate('/admin/grupos')} type="button">Cancelar</button><button className="admin-button admin-button-primary" disabled={isSaving} type="submit">{isSaving ? 'Salvando...' : group ? 'Salvar alterações' : 'Criar grupo'}{!isSaving && <Icon name="check" size={18} />}</button></div>
      </form>
    </div>
  )
}
