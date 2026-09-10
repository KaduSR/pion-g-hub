import React, { useState, useEffect, useRef } from 'react'
import { Settings, Upload, Trash2, Palette, Type } from 'lucide-react'
import { useSettingsContext } from '../contexts/SettingsContext'
import { FormField, Input, Button } from '../../../shared/components/FormField'
import { useToast } from '../../../shared/components/Toast'

const PRESET_COLORS = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#0f172a',
]

export function SettingsPage() {
  const { settings, loading, saveSettings, removeLogo } = useSettingsContext()
  const { show: showToast, ToastEl } = useToast()

  const [form, setForm]         = useState({
    nome_sistema: '',
    subtitulo:    '',
    cor_primaria: '#1B3A6B',
  })
  const [logoFile, setLogoFile]     = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)
  const fileInputRef                = useRef(null)

  // Sync form when settings load
  useEffect(() => {
    if (!loading) {
      setForm({
        nome_sistema: settings.nome_sistema ?? '',
        subtitulo:    settings.subtitulo    ?? '',
        cor_primaria: settings.cor_primaria ?? '#1B3A6B',
      })
    }
  }, [loading, settings])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Selecione um arquivo de imagem (PNG, JPG, SVG…)', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Imagem deve ter no máximo 2 MB', 'error')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleRemoveLogo = async () => {
    if (!confirm('Remover o logo? O ícone padrão será exibido.')) return
    setRemovingLogo(true)
    try {
      await removeLogo()
      setLogoFile(null)
      setLogoPreview(null)
      showToast('Logo removido.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setRemovingLogo(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome_sistema.trim()) {
      showToast('O nome do sistema é obrigatório', 'error')
      return
    }
    setSaving(true)
    try {
      await saveSettings(form, logoFile)
      setLogoFile(null)
      showToast('Configurações salvas com sucesso!')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const currentLogo = logoPreview || settings.logo_url

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      {ToastEl}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings size={20} color="#1B3A6B" />
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            Configurações
          </h1>
        </div>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14, paddingLeft: 52 }}>
          Personalize o nome, identidade visual e cor do sistema.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: '#94a3b8' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Carregando configurações…
        </div>
      ) : (
        <form onSubmit={handleSubmit}>

          {/* Preview card */}
          <div style={{
            background: '#0f172a', borderRadius: 14, padding: '16px 20px',
            marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            {currentLogo ? (
              <img
                src={currentLogo}
                alt="logo"
                style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'contain', background: '#fff', padding: 2 }}
              />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: form.cor_primaria,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>
                {(form.nome_sistema || 'S')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: 'Space Grotesk, sans-serif' }}>
                {form.nome_sistema || 'Nome do sistema'}
              </div>
              <div style={{ color: '#64748b', fontSize: 10, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {form.subtitulo || 'Subtítulo'}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: '#334155' }}>Pré-visualização da sidebar</div>
          </div>

          {/* Section: Identity */}
          <SectionTitle icon={Type} label="Identidade do sistema" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <FormField label="Nome do sistema" required>
              <Input
                value={form.nome_sistema}
                onChange={set('nome_sistema')}
                placeholder="Ex: FairTrack, MedLeads…"
                maxLength={50}
              />
            </FormField>

            <FormField label="Subtítulo">
              <Input
                value={form.subtitulo}
                onChange={set('subtitulo')}
                placeholder="Ex: Leads & Feiras"
                maxLength={60}
              />
            </FormField>
          </div>

          {/* Section: Color */}
          <SectionTitle icon={Palette} label="Cor primária" />

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c} type="button"
                  onClick={() => setForm((f) => ({ ...f, cor_primaria: c }))}
                  style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: c, border: 'none', cursor: 'pointer',
                    outline: form.cor_primaria === c ? `3px solid ${c}` : 'none',
                    outlineOffset: 2,
                    boxShadow: form.cor_primaria === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                    transform: form.cor_primaria === c ? 'scale(1.12)' : 'scale(1)',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                  title={c}
                />
              ))}
              {/* Custom color input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={form.cor_primaria}
                  onChange={(e) => setForm((f) => ({ ...f, cor_primaria: e.target.value }))}
                  style={{ width: 36, height: 36, padding: 2, border: '1.5px solid #e2e8f0', borderRadius: 9, cursor: 'pointer' }}
                  title="Cor personalizada"
                />
                <Input
                  value={form.cor_primaria}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setForm((f) => ({ ...f, cor_primaria: v }))
                  }}
                  placeholder="#4f46e5"
                  style={{ width: 110, fontFamily: 'monospace', fontSize: 13 }}
                />
              </div>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8' }}>
              A cor primária é usada na barra de navegação ativa, botões e destaques.
            </p>
          </div>

          {/* Section: Logo */}
          <SectionTitle icon={Upload} label="Logo" />

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Current logo */}
              {currentLogo && (
                <div style={{
                  width: 80, height: 80, borderRadius: 12,
                  border: '1.5px solid #e2e8f0', background: '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0,
                }}>
                  <img src={currentLogo} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              )}

              <div style={{ flex: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={14} />
                    {currentLogo ? 'Trocar logo' : 'Carregar logo'}
                  </Button>
                  {(settings.logo_url || logoFile) && (
                    <Button
                      type="button" variant="danger" size="sm"
                      loading={removingLogo}
                      onClick={logoFile ? () => { setLogoFile(null); setLogoPreview(null) } : handleRemoveLogo}
                    >
                      <Trash2 size={14} />
                      {logoFile ? 'Cancelar' : 'Remover logo'}
                    </Button>
                  )}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  PNG, JPG ou SVG — máx. 2 MB. Recomendado: 80×80 px ou maior, fundo transparente.
                  {logoFile && <span style={{ color: '#10b981', marginLeft: 6 }}>✓ {logoFile.name} selecionado</span>}
                </p>
                {!currentLogo && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    Quando não houver logo, a inicial do nome do sistema será exibida com a cor primária.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 12,
            paddingTop: 20, borderTop: '1px solid #f1f5f9',
          }}>
            <Button type="submit" loading={saving}>
              Salvar configurações
            </Button>
          </div>
        </form>
      )}

      <style>{`
        .spinner {
          width: 28px; height: 28px; border: 3px solid #e2e8f0;
          border-top-color: #4f46e5; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 16, marginTop: 8,
      paddingBottom: 10, borderBottom: '1px solid #f1f5f9',
    }}>
      <Icon size={15} color="#6366f1" />
      <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}
