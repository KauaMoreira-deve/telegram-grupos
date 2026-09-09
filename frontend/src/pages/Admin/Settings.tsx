import { useState } from 'react'
import { useAdminFeedback } from '../../admin/feedback'
import { Icon } from '../../admin/icons'

export default function Settings() {
  const { showFeedback } = useAdminFeedback()
  const [isSaving, setIsSaving] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    window.setTimeout(() => {
      setIsSaving(false)
      showFeedback('Configurações atualizadas com sucesso.')
    }, 550)
  }

  return (
    <div className="admin-page admin-settings-page">
      <section className="admin-page-intro"><div><h2>Configurações da conta</h2><p>Gerencie suas informações de acesso ao painel administrativo.</p></div></section>
      <form className="admin-panel admin-settings-form" onSubmit={handleSubmit}>
        <div className="admin-settings-profile"><div className="admin-profile-avatar">AM</div><div><h2>Seu perfil</h2><p>Estas informações são utilizadas somente no ambiente administrativo.</p></div></div>
        <div className="admin-form-divider" />
        <div className="admin-form-grid"><label className="admin-field"><span>Nome <b>*</b></span><input defaultValue="André Martins" required /></label><label className="admin-field"><span>E-mail <b>*</b></span><input defaultValue="andre@telegrupos.com" required type="email" /></label></div>
        <div className="admin-form-divider" />
        <div className="admin-security-heading"><div className="admin-section-icon purple"><Icon name="settings" size={19} /></div><div><h3>Alterar senha</h3><p>Deixe os campos em branco se não quiser modificar sua senha.</p></div></div>
        <div className="admin-form-grid admin-password-fields"><label className="admin-field"><span>Senha atual</span><input placeholder="Digite sua senha atual" type="password" /></label><label className="admin-field"><span>Nova senha</span><input minLength={8} placeholder="Mínimo de 8 caracteres" type="password" /></label><label className="admin-field"><span>Confirmar nova senha</span><input minLength={8} placeholder="Repita a nova senha" type="password" /></label></div>
        <div className="admin-form-actions"><button className="admin-button admin-button-primary" disabled={isSaving} type="submit">{isSaving ? 'Salvando...' : 'Salvar alterações'}{!isSaving && <Icon name="check" size={18} />}</button></div>
      </form>
    </div>
  )
}
