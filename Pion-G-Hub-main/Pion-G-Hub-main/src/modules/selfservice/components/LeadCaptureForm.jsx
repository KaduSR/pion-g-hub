import React, { useState, useEffect } from 'react'
import { User, Building2, Phone, Mail, MapPin, MessageSquare, ArrowLeft, Gift, Info, X } from 'lucide-react'
import { FormField, Input, Select, Textarea, Button } from '../../../shared/components/FormField'
import { leadsService } from '../../fairs/services/leadsService'
import { leadDuplicateService } from '../services/leadDuplicateService'
import { formatPhone } from '../../../shared/utils/helpers'
import { ESTADOS_BR } from '../../../shared/utils/constants'
import { AttendanceSuccess } from './AttendanceSuccess'
import { FairGiftDeliveryModal } from '../../gifts/components/FairGiftDeliveryModal'
import { useLeadDraft } from '../hooks/useLeadDraft'

const EMPTY_FORM = { nome: '', empresa: '', telefone: '', email: '', cidade: '', estado: '', observacoes: '' }

/**
 * Versão compacta do formulário de /captacao, pensada pra toque em tablet
 * durante a feira: só os campos essenciais (nome, empresa, um contato,
 * cidade/UF pré-preenchidos pela feira, observação livre) — segmento/
 * produto/temperatura ficam de fora aqui (continuam disponíveis na tela
 * completa /captacao pra quem quiser preencher com calma depois). feira_id
 * vem fixo da feira já selecionada no hub, não é reeditável dentro do
 * formulário.
 */
export function LeadCaptureForm({ feiraId, feira, profile, user, onDone }) {
  const draftKey = feiraId ? `pion_g_lead_draft_atendimento_${feiraId}` : null
  const { restoreDraft, saveDraft, discardDraft, restoredNotice, dismissRestoredNotice } = useLeadDraft(draftKey, EMPTY_FORM)

  // Sem rascunho: cidade/UF já vêm da feira selecionada (reaproveitada do
  // Autoatendimento, nenhuma consulta nova) — com rascunho, o rascunho
  // vence integralmente, inclusive se o usuário já tinha alterado cidade/UF
  // manualmente antes do F5.
  const [form, setForm] = useState(() => restoreDraft() || { ...EMPTY_FORM, cidade: feira?.cidade || '', estado: feira?.estado || '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [duplicate, setDuplicate] = useState(null) // lead existente encontrado, aguardando confirmação
  const [createdLead, setCreatedLead] = useState(null)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [giftResult, setGiftResult] = useState(null) // resultado da RPC após entregar o brinde do lead

  useEffect(() => { saveDraft(form) }, [form, saveDraft])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const setPhone = (e) => setForm((f) => ({ ...f, telefone: formatPhone(e.target.value) }))

  const validate = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (!form.empresa.trim()) e.empresa = 'Empresa é obrigatória'
    if (!form.telefone.trim() && !form.email.trim()) e.contato = 'Informe telefone ou e-mail'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const doCreate = async () => {
    setSaving(true)
    try {
      const lead = await leadsService.create({
        feira_id: feiraId,
        nome: form.nome.trim(),
        empresa: form.empresa.trim(),
        telefone: form.telefone || null,
        email: form.email || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        observacoes: form.observacoes || null,
        vendedor: profile?.nome || null,
        temperatura: 'Morno',
        status: 'Novo',
        created_by: user?.id || null,
      })
      setCreatedLead(lead)
      setDuplicate(null)
      discardDraft()
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving || !validate()) return
    setErrors({})
    setSaving(true)
    try {
      const possibleDup = await leadDuplicateService.findPossibleDuplicate({
        feiraId, nome: form.nome, empresa: form.empresa, telefone: form.telefone, email: form.email,
      })
      setSaving(false)
      if (possibleDup) {
        setDuplicate(possibleDup)
        return
      }
      await doCreate()
    } catch (err) {
      setSaving(false)
      setErrors({ submit: err.message })
    }
  }

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, cidade: feira?.cidade || '', estado: feira?.estado || '' })
    setErrors({})
    setDuplicate(null)
    setCreatedLead(null)
    setGiftResult(null)
  }

  if (createdLead && giftResult) {
    return (
      <AttendanceSuccess
        title="Brinde entregue com sucesso!"
        details={[
          { label: 'Lead', value: createdLead.nome },
          { label: 'Empresa', value: createdLead.empresa },
          ...(giftResult.itens || []).map((item) => ({ label: item.nome, value: `${item.quantidade}x` })),
        ]}
        primaryAction={{ label: 'Ok', onClick: () => { resetForm(); onDone() } }}
      />
    )
  }

  if (createdLead) {
    return (
      <>
        <AttendanceSuccess
          title="Lead cadastrado com sucesso."
          details={[
            { label: 'Nome', value: createdLead.nome },
            { label: 'Empresa', value: createdLead.empresa },
          ]}
          secondaryAction={{ label: 'Finalizar atendimento', onClick: () => { resetForm(); onDone() } }}
          primaryAction={{ label: 'Entregar brinde', onClick: () => setShowGiftModal(true) }}
        />
        <FairGiftDeliveryModal
          isOpen={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          onDelivered={(result) => { setShowGiftModal(false); setGiftResult(result) }}
          initialFeiraId={feiraId}
          initialLeadId={createdLead.id}
          fromKiosk={false}
        />
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
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

      {duplicate && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#92400e', fontSize: 14 }}>
            Encontramos um possível cadastro semelhante nesta feira.
          </p>
          <p style={{ margin: '0 0 4px', fontSize: 14, color: '#78350f' }}>Nome: {duplicate.nome}</p>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#78350f' }}>Empresa: {duplicate.empresa}</p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#92400e' }}>Deseja continuar mesmo assim?</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="button" variant="secondary" size="md" onClick={() => setDuplicate(null)}>
              <ArrowLeft size={14} /> Voltar e revisar
            </Button>
            <Button type="button" size="md" loading={saving} onClick={doCreate}>
              Cadastrar mesmo assim
            </Button>
          </div>
        </div>
      )}

      {!duplicate && (
        <>
          <FormField label="Nome do contato" required error={errors.nome}>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <Input large autoFocus value={form.nome} onChange={set('nome')} placeholder="Nome completo" error={errors.nome} style={{ paddingLeft: 44 }} />
            </div>
          </FormField>

          <FormField label="Empresa" required error={errors.empresa}>
            <div style={{ position: 'relative' }}>
              <Building2 size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <Input large value={form.empresa} onChange={set('empresa')} placeholder="Nome da empresa" error={errors.empresa} style={{ paddingLeft: 44 }} />
            </div>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <FormField label="Telefone" error={errors.contato}>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <Input large type="tel" value={form.telefone} onChange={setPhone} placeholder="(00) 00000-0000" error={errors.contato} style={{ paddingLeft: 44 }} />
              </div>
            </FormField>
            <FormField label="E-mail" error={errors.contato}>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <Input large type="email" value={form.email} onChange={set('email')} placeholder="email@empresa.com.br" error={errors.contato} style={{ paddingLeft: 44 }} />
              </div>
            </FormField>
          </div>
          {errors.contato && <p style={{ color: '#ef4444', fontSize: 13, margin: '-8px 0 12px' }}>{errors.contato}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 16px' }}>
            <FormField label="Cidade (opcional)">
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <Input large value={form.cidade} onChange={set('cidade')} placeholder="Cidade" style={{ paddingLeft: 44 }} />
              </div>
            </FormField>
            <FormField label="UF">
              <Select large value={form.estado} onChange={set('estado')}>
                <option value="">UF</option>
                {ESTADOS_BR.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>

          <FormField label="Observação (opcional)">
            <div style={{ position: 'relative' }}>
              <MessageSquare size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#94a3b8' }} />
              <Textarea large value={form.observacoes} onChange={set('observacoes')} rows={2} placeholder="Anotação rápida" style={{ paddingLeft: 44 }} />
            </div>
          </FormField>

          {errors.submit && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, color: '#dc2626', fontSize: 14, marginBottom: 16 }}>
              {errors.submit}
            </div>
          )}

          <Button type="submit" fullWidth size="xl" loading={saving} disabled={saving}>
            <Gift size={18} /> Registrar lead
          </Button>
        </>
      )}
    </form>
  )
}
