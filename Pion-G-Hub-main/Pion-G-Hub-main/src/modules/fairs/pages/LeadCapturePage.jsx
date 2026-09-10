import React, { useState, useRef, useEffect } from 'react'
import { Thermometer, User, Building2, Phone, Mail, MapPin, Tag, MessageSquare, Users, Info, X } from 'lucide-react'
import { useFairsContext } from '../contexts/FairsContext'
import { leadsService } from '../services/leadsService'
import { useAuth } from '../../auth/hooks/useAuth'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { FormField, Input, Select, Textarea, Button } from '../../../shared/components/FormField'
import { AttendanceSuccess } from '../../selfservice/components/AttendanceSuccess'
import { FairGiftDeliveryModal } from '../../gifts/components/FairGiftDeliveryModal'
import { useLeadDraft } from '../../selfservice/hooks/useLeadDraft'
import {
  SEGMENTOS, TEMPERATURAS, ESTADOS_BR, TEMPERATURA_CONFIG,
} from '../../../shared/utils/constants'
import { formatPhone } from '../../../shared/utils/helpers'

const EMPTY_FORM = {
  feira_id: '', nome: '', empresa: '', telefone: '', email: '',
  cidade: '', estado: '', segmento: '',
  observacoes: '', temperatura: 'Morno', vendedor: '', status: 'Novo',
}

// Feira selecionada em /captacao, persistida em sessionStorage (não
// localStorage — mesma lógica de privacidade do draft: não deve sobreviver
// ao fechamento da aba num tablet compartilhado do estande). Validada
// contra a lista de feiras ativas antes de ser aceita de volta.
const CAPTACAO_FEIRA_KEY = 'pion_g_captacao_feira_id'

function readSavedFeiraId() {
  try {
    return sessionStorage.getItem(CAPTACAO_FEIRA_KEY) || ''
  } catch (_) {
    return ''
  }
}

export function LeadCapturePage() {
  const { activeFairs, loadingFairs } = useFairsContext()
  const { user }    = useAuth()
  const { profile } = useProfileContext()

  const filteredFairs = activeFairs.filter((f) => {
    if (!profile || ['admin', 'gestor', 'marketing'].includes(profile.role)) return true
    return f.feira_equipe?.some((e) => e.profile_id === profile.id)
  })

  const [form, setForm]           = useState(() => ({ ...EMPTY_FORM, feira_id: readSavedFeiraId() }))
  const [errors, setErrors]       = useState({})
  const [saving, setSaving]       = useState(false)
  const [successCount, setSuccessCount] = useState(0)
  // Hotfix (produção): substitui o antigo encerramento automático (2s) por
  // uma tela de sucesso com ações reais — "Liberar brinde" (mesmo fluxo do
  // Autoatendimento, reutilizado via FairGiftDeliveryModal) e "Cadastrar
  // novo lead" (limpa o formulário sem perder a feira/vendedor atuais).
  const [createdLead, setCreatedLead] = useState(null)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [giftResult, setGiftResult] = useState(null)
  const firstRef = useRef(null)

  // A feira é escolhida dentro do próprio formulário aqui (diferente do
  // Autoatendimento, que já recebe feiraId pronto) — a chave do draft só
  // existe depois que uma feira é selecionada, e muda a cada troca.
  const draftKey = form.feira_id ? `pion_g_lead_draft_captacao_${form.feira_id}` : null
  const { restoreDraft, saveDraft, discardDraft, restoredNotice, dismissRestoredNotice } = useLeadDraft(draftKey, EMPTY_FORM)

  // Pré-popula o campo vendedor com o nome do perfil ao carregar
  useEffect(() => {
    if (profile?.nome) {
      setForm((f) => ({ ...f, vendedor: f.vendedor || profile.nome }))
    }
  }, [profile?.nome])

  // Se a feira salva da sessão anterior não existir mais entre as ativas
  // (encerrada, id inválido, etc.), limpa a seleção sem quebrar a tela —
  // mesmo critério de segurança do useSelectedFair.js do Autoatendimento.
  useEffect(() => {
    if (loadingFairs || !form.feira_id) return
    const stillValid = filteredFairs.some((f) => f.id === form.feira_id)
    if (!stillValid) {
      setForm({ ...EMPTY_FORM })
      try { sessionStorage.removeItem(CAPTACAO_FEIRA_KEY) } catch (_) { /* ignora */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFairs, loadingFairs])

  // Persiste a feira selecionada para sobreviver a reload — restaurada
  // automaticamente no próximo carregamento via readSavedFeiraId().
  useEffect(() => {
    try {
      if (form.feira_id) sessionStorage.setItem(CAPTACAO_FEIRA_KEY, form.feira_id)
      else sessionStorage.removeItem(CAPTACAO_FEIRA_KEY)
    } catch (_) { /* ignora */ }
  }, [form.feira_id])

  // Ao selecionar/trocar de feira: restaura o rascunho daquela feira, se
  // existir; senão, limpa os campos do visitante (mantendo feira/vendedor)
  // e já preenche Cidade/UF com o padrão da feira — nunca deixa dados
  // digitados (ou de cidade) de outra feira aparecerem aqui.
  useEffect(() => {
    if (!form.feira_id) return
    const draft = restoreDraft()
    if (draft) {
      setForm(draft)
    } else {
      const feira = filteredFairs.find((f) => f.id === form.feira_id)
      setForm((f) => ({
        ...EMPTY_FORM, feira_id: f.feira_id, vendedor: f.vendedor,
        cidade: feira?.cidade || '', estado: feira?.estado || '',
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.feira_id])

  useEffect(() => { saveDraft(form) }, [form, saveDraft])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const setPhone = (e) => setForm((f) => ({ ...f, telefone: formatPhone(e.target.value) }))

  // Membros da equipe da feira selecionada, para seleção rápida (chips) do
  // responsável — nunca permite escolher alguém fora da equipe, porque a
  // lista só existe a partir de feira_equipe daquela feira.
  const currentFeira = filteredFairs.find((f) => f.id === form.feira_id)
  const teamMembers = (currentFeira?.feira_equipe || [])
    .map((e) => e.user_profiles)
    .filter(Boolean)

  const validate = () => {
    const e = {}
    if (!form.nome.trim())    e.nome    = 'Nome é obrigatório'
    if (!form.empresa.trim()) e.empresa = 'Empresa é obrigatória'
    if (!form.feira_id)       e.feira_id = 'Selecione a feira'
    if (!form.telefone.trim() && !form.email.trim())
      e.contato = 'Informe pelo menos telefone ou e-mail'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    if (!validate()) return
    setSaving(true)
    try {
      const lead = await leadsService.create({
        ...form,
        telefone:   form.telefone || null,
        email:      form.email    || null,
        created_by: user?.id      || null,
      })
      setSuccessCount((c) => c + 1)
      setCreatedLead(lead)
      discardDraft()
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setSaving(false)
    }
  }

  // "Cadastrar novo lead": some a tela de sucesso, limpa integralmente os
  // dados pessoais do lead anterior e as mensagens de validação, preserva
  // só o que pertence à feira/ao vendedor (feira_id e vendedor — mesma
  // regra que já existia antes deste hotfix), e devolve o foco pro
  // primeiro campo, pronta pro próximo cadastro imediatamente.
  const resetForNewLead = () => {
    setForm((f) => {
      const feira = filteredFairs.find((ff) => ff.id === f.feira_id)
      return {
        ...EMPTY_FORM, feira_id: f.feira_id, vendedor: f.vendedor,
        cidade: feira?.cidade || '', estado: feira?.estado || '',
      }
    })
    setErrors({})
    setCreatedLead(null)
    setGiftResult(null)
    setShowGiftModal(false)
    firstRef.current?.focus()
  }

  if (createdLead && giftResult) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: 32,
      }}>
        <div style={{ background: '#fff', borderRadius: 24, maxWidth: 420, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
          <AttendanceSuccess
            title="Brinde liberado com sucesso!"
            details={[
              { label: 'Lead', value: createdLead.nome },
              { label: 'Empresa', value: createdLead.empresa },
              ...(giftResult.itens || []).map((item) => ({ label: item.nome, value: `${item.quantidade}x` })),
            ]}
            primaryAction={{ label: 'Concluir', onClick: resetForNewLead }}
          />
        </div>
      </div>
    )
  }

  if (createdLead) {
    return (
      <>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: 32,
        }}>
          <div style={{ background: '#fff', borderRadius: 24, maxWidth: 420, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
            <AttendanceSuccess
              title="Lead cadastrado com sucesso"
              details={[
                { label: 'Nome', value: createdLead.nome },
                { label: 'Empresa', value: createdLead.empresa },
              ]}
              secondaryAction={{ label: 'Cadastrar novo lead', onClick: resetForNewLead }}
              primaryAction={{ label: 'Liberar brinde', onClick: () => setShowGiftModal(true) }}
            />
            {successCount > 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, margin: '0 0 20px' }}>
                {successCount} lead{successCount !== 1 ? 's' : ''} captado{successCount !== 1 ? 's' : ''} hoje
              </p>
            )}
          </div>
        </div>

        <FairGiftDeliveryModal
          isOpen={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          onDelivered={(result) => { setShowGiftModal(false); setGiftResult(result) }}
          initialFeiraId={form.feira_id}
          initialLeadId={createdLead.id}
          fromKiosk={false}
        />
      </>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      padding: '24px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 680, width: '100%', marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{
          color: '#fff', margin: 0, fontSize: 28, fontWeight: 700,
          fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.02em',
        }}>
          Captar Lead
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 15, margin: '6px 0 0' }}>
          Preencha os dados do contato
        </p>
        {successCount > 0 && (
          <div style={{
            display: 'inline-block', marginTop: 10,
            background: 'rgba(99,102,241,0.2)',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: 20, padding: '4px 16px',
            color: '#a5b4fc', fontSize: 13, fontWeight: 600,
          }}>
            {successCount} lead{successCount !== 1 ? 's' : ''} captado{successCount !== 1 ? 's' : ''} hoje
          </div>
        )}
      </div>

      {/* Card */}
      <form onSubmit={handleSubmit} style={{ maxWidth: 680, width: '100%' }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: 28,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}>

          {restoredNotice && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 14px', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1e3a8a', fontSize: 13, fontWeight: 600 }}>
                <Info size={16} /> Rascunho recuperado. Continue de onde parou.
              </div>
              <button
                type="button"
                onClick={dismissRestoredNotice}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e3a8a', padding: 4 }}
                aria-label="Fechar aviso"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Feira & Vendedor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 4 }}>
            <FormField label="Feira" required error={errors.feira_id} style={{ gridColumn: '1 / -1' }}>
              <Select
                large
                value={form.feira_id}
                onChange={set('feira_id')}
                error={errors.feira_id}
                disabled={loadingFairs}
              >
                <option value="">{loadingFairs ? 'Carregando feiras…' : 'Selecione a feira'}</option>
                {filteredFairs.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Vendedor responsável" style={{ gridColumn: '1 / -1' }}>
              {teamMembers.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {teamMembers.map((m) => {
                    const active = form.vendedor === m.nome
                    return (
                      <button
                        key={m.id} type="button"
                        onClick={() => setForm((f) => ({ ...f, vendedor: m.nome }))}
                        style={{
                          padding: '10px 16px', borderRadius: 999,
                          border: active ? '2px solid #4338ca' : '1px solid #cbd5e1',
                          background: active ? '#eef2ff' : '#fff',
                          color: active ? '#4338ca' : '#334155',
                          fontWeight: active ? 700 : 500, fontSize: 14, cursor: 'pointer',
                        }}
                      >
                        {m.nome}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <Users size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <Input
                    large value={form.vendedor} onChange={set('vendedor')}
                    placeholder="Seu nome"
                    style={{ paddingLeft: 44 }}
                  />
                </div>
              )}
            </FormField>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '8px 0 16px' }} />

          {/* Nome & Empresa */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <FormField label="Nome do Contato" required error={errors.nome}>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <Input
                  large ref={firstRef} value={form.nome} onChange={set('nome')}
                  placeholder="Nome completo" error={errors.nome}
                  style={{ paddingLeft: 44 }}
                />
              </div>
            </FormField>

            <FormField label="Empresa" required error={errors.empresa}>
              <div style={{ position: 'relative' }}>
                <Building2 size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <Input
                  large value={form.empresa} onChange={set('empresa')}
                  placeholder="Nome da empresa" error={errors.empresa}
                  style={{ paddingLeft: 44 }}
                />
              </div>
            </FormField>

            {/* Contato */}
            <FormField label="Telefone" error={errors.contato}>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <Input
                  large type="tel" value={form.telefone} onChange={setPhone}
                  placeholder="(00) 00000-0000" error={errors.contato}
                  style={{ paddingLeft: 44 }}
                />
              </div>
            </FormField>

            <FormField label="E-mail" error={errors.contato}>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <Input
                  large type="email" value={form.email} onChange={set('email')}
                  placeholder="email@empresa.com.br" error={errors.contato}
                  style={{ paddingLeft: 44 }}
                />
              </div>
            </FormField>

            {errors.contato && (
              <p style={{ gridColumn: '1 / -1', color: '#ef4444', fontSize: 13, margin: '-8px 0 8px' }}>
                {errors.contato}
              </p>
            )}

            {/* Localização */}
            <FormField label="Cidade">
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <Input large value={form.cidade} onChange={set('cidade')} placeholder="Cidade" style={{ paddingLeft: 44 }} />
              </div>
            </FormField>

            <FormField label="Estado">
              <Select large value={form.estado} onChange={set('estado')}>
                <option value="">UF</option>
                {ESTADOS_BR.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>

            {/* Segmento — Produto de Interesse desativado temporariamente
                nesta janela operacional (feedback de campo: atrapalhava a
                captação). Não é obrigatório no frontend nem no banco
                (coluna nullable) e não é lido por nenhum outro módulo —
                só deixa de ser preenchido daqui em diante. */}
            <FormField label="Segmento" style={{ gridColumn: '1 / -1' }}>
              <div style={{ position: 'relative' }}>
                <Tag size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <Select large value={form.segmento} onChange={set('segmento')} style={{ paddingLeft: 44 }}>
                  <option value="">Selecione</option>
                  {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
            </FormField>
          </div>

          {/* Temperatura */}
          <FormField label="Temperatura do Lead">
            <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
              {TEMPERATURAS.map((t) => {
                const cfg = TEMPERATURA_CONFIG[t]
                const active = form.temperatura === t
                return (
                  <button
                    key={t} type="button"
                    onClick={() => setForm((f) => ({ ...f, temperatura: t }))}
                    style={{
                      flex: 1, padding: '14px 8px',
                      borderRadius: 12,
                      border: active ? `2px solid ${cfg.color}` : '2px solid #e2e8f0',
                      background: active ? cfg.bg : '#f8fafc',
                      color: active ? cfg.color : '#94a3b8',
                      fontWeight: active ? 700 : 500,
                      fontSize: 15, cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Thermometer size={20} />
                    {t}
                  </button>
                )
              })}
            </div>
          </FormField>

          {/* Observações */}
          <FormField label="Observações" style={{ gridColumn: '1 / -1' }}>
            <div style={{ position: 'relative' }}>
              <MessageSquare size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#94a3b8' }} />
              <Textarea
                large value={form.observacoes} onChange={set('observacoes')}
                placeholder="Anotações livres, necessidades específicas, próximos passos…"
                rows={3}
                style={{ paddingLeft: 44 }}
              />
            </div>
          </FormField>

          {errors.submit && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, color: '#dc2626', fontSize: 14, marginBottom: 16 }}>
              Erro ao salvar: {errors.submit}
            </div>
          )}

          <Button type="submit" fullWidth size="xl" loading={saving} disabled={saving} style={{ marginTop: 4 }}>
            {saving ? 'Salvando…' : 'Registrar Lead'}
          </Button>
        </div>
      </form>
    </div>
  )
}
