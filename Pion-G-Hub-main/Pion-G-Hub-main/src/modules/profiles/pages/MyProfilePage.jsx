import React, { useState, useEffect, useRef } from 'react'
import {
  UserCircle, Upload, Trash2, Mail, Shield,
  Phone, Briefcase, Building2, User, Key
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useProfileContext } from '../contexts/ProfileContext'
import { FormField, Input, Select, Button } from '../../../shared/components/FormField'
import { useToast } from '../../../shared/components/Toast'

const SETORES = [
  'Comercial', 'Marketing', 'Operações',
  'Administrativo', 'Tecnologia', 'Diretoria', 'Outro',
]

const ROLE_LABELS = {
  admin: 'Administrador',
  marketing: 'Marketing',
  gestor: 'Gestor',
  vendedor: 'Vendedor',
}

const ROLE_COLORS = {
  admin: { color: '#7c3aed', bg: '#f5f3ff' },
  marketing: { color: '#0369a1', bg: '#e0f2fe' },
  gestor: { color: '#b45309', bg: '#fef3c7' },
  vendedor: { color: '#059669', bg: '#ecfdf5' },
}

export function MyProfilePage() {
  const { profile, loading, saveProfile, uploadAvatar, removeAvatar } = useProfileContext()
  const { show: showToast, ToastEl } = useToast()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({ nome: '', telefone: '', cargo: '', setor: '' })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [removingAvatar, setRemovingAvatar] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  // Sincroniza o form quando o perfil carrega ou é atualizado
  useEffect(() => {
    if (profile) {
      setForm({
        nome: profile.nome || '',
        telefone: profile.telefone || '',
        cargo: profile.cargo || '',
        setor: profile.setor || '',
      })
    }
  }, [profile])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Selecione um arquivo de imagem (PNG, JPG, WebP…)', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 2 MB', 'error')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    e.target.value = '' // permite reselecionar o mesmo arquivo
  }

  const handleRemoveAvatar = async () => {
    // Preview local ainda não salvo: cancela sem chamar o servidor
    if (avatarFile) {
      setAvatarFile(null)
      setAvatarPreview(null)
      return
    }
    if (!profile?.avatar_url) return
    if (!confirm('Remover foto de perfil?')) return

    setRemovingAvatar(true)
    try {
      await removeAvatar()
      showToast('Foto de perfil removida.')
    } catch (e) {
      showToast(`Erro ao remover foto: ${e.message}`, 'error')
    } finally {
      setRemovingAvatar(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      showToast('O nome é obrigatório', 'error')
      return
    }

    setSaving(true)
    try {
      // Avatar primeiro: se falhar, o perfil não é salvo com URL inválida
      if (avatarFile) {
        await uploadAvatar(avatarFile)
        setAvatarFile(null)
        setAvatarPreview(null)
      }
      await saveProfile(form)
      showToast('Perfil atualizado com sucesso!')
    } catch (err) {
      showToast(`Erro ao salvar: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres', 'error')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('As senhas não coincidem', 'error')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
      if (error) throw error
      showToast('Senha atualizada com sucesso!')
      setPasswordForm({ newPassword: '', confirmPassword: '' })
    } catch (err) {
      showToast(`Erro ao alterar senha: ${err.message}`, 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  // Iniciais para o avatar fallback (até 2 palavras)
  const initials = (form.nome || profile?.email || 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  const currentAvatar = avatarPreview || profile?.avatar_url
  const roleConfig = ROLE_COLORS[profile?.role] ?? ROLE_COLORS.vendedor

  return (
    <div style={{ padding: 32, maxWidth: 680, margin: '0 auto' }}>
      {ToastEl}

      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#eef2ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserCircle size={22} color="#4f46e5" />
          </div>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 700,
            color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif',
          }}>
            Meu Perfil
          </h1>
        </div>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14, paddingLeft: 52 }}>
          Atualize suas informações pessoais e foto de perfil.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: '#94a3b8' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Carregando perfil…
        </div>
      ) : (
        <form onSubmit={handleSubmit}>

          {/* ── Avatar ─────────────────────────────────────────────────────── */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: 24,
            border: '1px solid #f1f5f9', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
          }}>
            {/* Foto circular */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="Foto de perfil"
                  style={{
                    width: 88, height: 88,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #f1f5f9',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{
                  width: 88, height: 88,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 800, color: '#fff',
                  fontFamily: 'Space Grotesk, sans-serif',
                  border: '3px solid #f1f5f9',
                }}>
                  {initials}
                </div>
              )}

              {/* Badge de arquivo pendente */}
              {avatarFile && (
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#10b981', border: '2px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                </div>
              )}
            </div>

            {/* Ações do avatar */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{
                fontSize: 18, fontWeight: 700, color: '#0f172a',
                fontFamily: 'Space Grotesk, sans-serif', marginBottom: 2,
              }}>
                {form.nome || profile?.email?.split('@')[0] || 'Sem nome'}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                {profile?.email}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <Button
                  type="button" variant="secondary" size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  {currentAvatar ? 'Trocar foto' : 'Carregar foto'}
                </Button>

                {(profile?.avatar_url || avatarFile) && (
                  <Button
                    type="button" variant="danger" size="sm"
                    loading={removingAvatar}
                    onClick={handleRemoveAvatar}
                  >
                    <Trash2 size={14} />
                    {avatarFile ? 'Cancelar' : 'Remover'}
                  </Button>
                )}
              </div>

              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8' }}>
                PNG, JPG ou WebP — máx. 2 MB.
                {avatarFile && (
                  <span style={{ color: '#10b981', marginLeft: 6 }}>
                    ✓ {avatarFile.name} — será enviado ao salvar
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* ── Informações da conta (somente leitura) ───────────────────── */}
          <div style={{
            background: '#f8fafc', borderRadius: 14, padding: 20,
            border: '1px solid #f1f5f9', marginBottom: 20,
          }}>
            <SectionLabel>Informações da conta</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

              <FormField label="E-mail">
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: '#94a3b8',
                  }} />
                  <input
                    readOnly
                    value={profile?.email || ''}
                    style={{
                      width: '100%', padding: '10px 14px 10px 36px',
                      borderRadius: 8, border: '1.5px solid #e2e8f0',
                      fontSize: 14, color: '#64748b', background: '#f1f5f9',
                      fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  Para alterar o e-mail, contate um administrador.
                </p>
              </FormField>

              <FormField label="Perfil de acesso">
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', background: '#f1f5f9',
                  height: 42,
                }}>
                  <Shield size={16} color={roleConfig.color} />
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: roleConfig.color, background: roleConfig.bg,
                    padding: '2px 10px', borderRadius: 20,
                  }}>
                    {ROLE_LABELS[profile?.role] ?? profile?.role ?? 'vendedor'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  Perfil definido pelo administrador.
                </p>
              </FormField>

            </div>
          </div>

          {/* ── Informações pessoais (editáveis) ─────────────────────────── */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: 24,
            border: '1px solid #f1f5f9', marginBottom: 24,
          }}>
            <SectionLabel>Informações pessoais</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

              <FormField label="Nome completo" required style={{ gridColumn: '1 / -1' }}>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: '#94a3b8',
                  }} />
                  <Input
                    value={form.nome}
                    onChange={set('nome')}
                    placeholder="Seu nome completo"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </FormField>

              <FormField label="Telefone">
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: '#94a3b8',
                  }} />
                  <Input
                    value={form.telefone}
                    onChange={set('telefone')}
                    placeholder="(00) 00000-0000"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </FormField>

              <FormField label="Cargo">
                <div style={{ position: 'relative' }}>
                  <Briefcase size={16} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: '#94a3b8',
                  }} />
                  <Input
                    value={form.cargo}
                    onChange={set('cargo')}
                    placeholder="Ex: Representante Comercial"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </FormField>

              <FormField label="Setor">
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: '#94a3b8',
                  }} />
                  <Select value={form.setor} onChange={set('setor')} style={{ paddingLeft: 36 }}>
                    <option value="">Selecione</option>
                    {SETORES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
              </FormField>

            </div>
          </div>

          {/* ── Ações ────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={saving}>
              Salvar perfil
            </Button>
          </div>

        </form>
      )}

      {/* ── Alterar Senha ──────────────────────────────────────────────────────── */}
      {!loading && (
        <form onSubmit={handlePasswordSubmit} style={{
          background: '#fff', borderRadius: 14, padding: 24,
          border: '1px solid #f1f5f9', marginBottom: 24,
        }}>
          <SectionLabel>Segurança</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            
            <FormField label="Nova Senha">
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: '#94a3b8',
                }} />
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Mínimo de 6 caracteres"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </FormField>

            <FormField label="Confirmar Nova Senha">
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: '#94a3b8',
                }} />
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Repita a nova senha"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </FormField>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button type="submit" loading={changingPassword} disabled={!passwordForm.newPassword}>
              Alterar senha
            </Button>
          </div>
        </form>
      )}

      <style>{`
        .spinner {
          width: 28px; height: 28px;
          border: 3px solid #e2e8f0;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#94a3b8',
      letterSpacing: '0.06em', textTransform: 'uppercase',
      marginBottom: 16, paddingBottom: 10,
      borderBottom: '1px solid #f1f5f9',
    }}>
      {children}
    </div>
  )
}
