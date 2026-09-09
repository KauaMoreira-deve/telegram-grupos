import { useState } from 'react'
import { initialCategories } from '../../admin/data'
import type { Category, GroupStatus } from '../../admin/data'
import { useAdminFeedback } from '../../admin/feedback'
import { Icon } from '../../admin/icons'

const blankCategory = { name: '', slug: '', status: 'Ativo' as GroupStatus }

export default function Categories() {
  const [categories, setCategories] = useState(initialCategories)
  const [form, setForm] = useState(blankCategory)
  const [editingId, setEditingId] = useState<number | null>(null)
  const { showFeedback } = useAdminFeedback()

  function openForm(category?: Category) {
    if (category) {
      setEditingId(category.id)
      setForm({ name: category.name, slug: category.slug, status: category.status })
    } else {
      setEditingId(null)
      setForm(blankCategory)
    }
  }

  function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.slug.trim()) return
    if (editingId) {
      setCategories((current) => current.map((category) => category.id === editingId ? { ...category, ...form } : category))
      showFeedback('Categoria atualizada com sucesso.')
    } else {
      setCategories((current) => [...current, { ...form, id: Date.now(), groupCount: 0 }])
      showFeedback('Nova categoria criada com sucesso.')
    }
    setEditingId(null)
    setForm(blankCategory)
  }

  function deleteCategory(category: Category) {
    setCategories((current) => current.filter(({ id }) => id !== category.id))
    showFeedback(`Categoria “${category.name}” excluída.`)
  }

  return (
    <div className="admin-page">
      <section className="admin-page-intro">
        <div><h2>Categorias</h2><p>Organize os grupos para facilitar a descoberta na plataforma.</p></div>
        <button className="admin-button admin-button-primary" onClick={() => openForm()} type="button"><Icon name="plus" size={18} />Nova categoria</button>
      </section>

      <section className="admin-categories-layout">
        <div className="admin-panel admin-table-panel">
          <div className="admin-panel-heading compact"><div><h2>Categorias cadastradas</h2><p>{categories.length} categorias disponíveis.</p></div></div>
          <div className="admin-table-wrap"><table className="admin-table admin-category-table"><thead><tr><th>Nome</th><th>URL</th><th>Status</th><th>Grupos</th><th aria-label="Ações" /></tr></thead><tbody>{categories.map((category) => <tr key={category.id}><td data-label="Nome"><strong>{category.name}</strong></td><td data-label="URL"><span className="admin-url-prefix">/categoria/{category.slug}</span></td><td data-label="Status"><span className={`admin-status ${category.status === 'Ativo' ? 'active' : 'inactive'}`}><i />{category.status}</span></td><td data-label="Grupos">{category.groupCount} grupos</td><td className="admin-actions"><button aria-label={`Editar ${category.name}`} className="admin-action-button" onClick={() => openForm(category)} type="button"><Icon name="edit" size={17} /></button><button aria-label={`Excluir ${category.name}`} className="admin-action-button danger" onClick={() => deleteCategory(category)} type="button"><Icon name="trash" size={17} /></button></td></tr>)}</tbody></table></div>
        </div>

        <aside className="admin-panel admin-category-form">
          <div className="admin-panel-heading compact"><div><h2>{editingId ? 'Editar categoria' : 'Nova categoria'}</h2><p>{editingId ? 'Atualize os dados da categoria.' : 'Adicione uma nova forma de classificação.'}</p></div></div>
          <form onSubmit={saveCategory}><label className="admin-field"><span>Nome da categoria <b>*</b></span><input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Tecnologia" required value={form.name} /></label><label className="admin-field"><span>URL <b>*</b></span><div className="admin-url-input"><span>/categoria/</span><input onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="tecnologia" required value={form.slug} /></div></label><label className="admin-field"><span>Status</span><select onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as GroupStatus }))} value={form.status}><option>Ativo</option><option>Inativo</option></select></label><div className="admin-inline-form-actions">{editingId && <button className="admin-button admin-button-secondary" onClick={() => openForm()} type="button">Cancelar</button>}<button className="admin-button admin-button-primary" type="submit"><Icon name="check" size={17} />{editingId ? 'Salvar' : 'Criar categoria'}</button></div></form>
        </aside>
      </section>
    </div>
  )
}
