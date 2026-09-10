import React, { useState, useEffect } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { FormField, Input, Textarea, Select, Button } from '../../../shared/components/FormField'
import { giftsService } from '../services/giftsService'
import { fairsService } from '../../fairs/services/fairsService'
import { TIPOS_MOVIMENTACAO, CONTEXTOS } from '../constants/giftConstants'

const initialForm = {
  brinde_id: '',
  tipo: 'entrada',
  quantidade: '',
  sentido_ajuste: 'aumentar',
  motivo: '',
  contexto_tipo: '',
  contexto_descricao: '',
  feira_id: '',
  observacoes: '',
}

export function MovementModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState(initialForm)
  const [gifts, setGifts] = useState([])
  const [fairs, setFairs] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm)
      setError('')
      giftsService.getActive().then(setGifts).catch(() => setGifts([]))
      fairsService.getAll().then(setFairs).catch(() => setFairs([]))
    }
  }, [isOpen])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    if (!form.brinde_id) {
      setError('Selecione um brinde.')
      return
    }

    const quantidadeNum = Number(form.quantidade)
    if (!quantidadeNum || quantidadeNum <= 0) {
      setError('Informe uma quantidade maior que zero.')
      return
    }

    setError('')
    setSaving(true)
    try {
      const quantidadeFinal = form.tipo === 'ajuste' && form.sentido_ajuste === 'diminuir'
        ? -quantidadeNum
        : quantidadeNum

      await onSave({
        brindeId: form.brinde_id,
        tipo: form.tipo,
        quantidade: quantidadeFinal,
        motivo: form.motivo.trim(),
        contextoTipo: form.contexto_tipo,
        contextoDescricao: form.contexto_descricao.trim(),
        feiraId: form.feira_id || null,
        observacoes: form.observacoes.trim(),
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao registrar movimentação.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nova Movimentação" width={640}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c',
            padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormField label="Brinde" required style={{ gridColumn: '1 / -1' }}>
            <Select value={form.brinde_id} onChange={handleChange('brinde_id')}>
              <option value="">Selecione um brinde</option>
              {gifts.map((g) => (
                <option key={g.id} value={g.id}>{g.nome} (estoque: {g.estoque_atual})</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Tipo" required>
            <Select value={form.tipo} onChange={handleChange('tipo')}>
              {TIPOS_MOVIMENTACAO.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Quantidade" required>
            <Input type="number" min="1" step="1" value={form.quantidade} onChange={handleChange('quantidade')} placeholder="0" />
          </FormField>

          {form.tipo === 'ajuste' && (
            <FormField label="Sentido do ajuste" style={{ gridColumn: '1 / -1' }}>
              <Select value={form.sentido_ajuste} onChange={handleChange('sentido_ajuste')}>
                <option value="aumentar">Aumentar estoque</option>
                <option value="diminuir">Diminuir estoque</option>
              </Select>
            </FormField>
          )}

          <FormField label="Contexto">
            <Select value={form.contexto_tipo} onChange={handleChange('contexto_tipo')}>
              <option value="">Não informado</option>
              {CONTEXTOS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Feira (opcional)">
            <Select value={form.feira_id} onChange={handleChange('feira_id')}>
              <option value="">Nenhuma</option>
              {fairs.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Motivo" style={{ gridColumn: '1 / -1' }}>
            <Input value={form.motivo} onChange={handleChange('motivo')} placeholder="Ex: Compra de reposição, unidades danificadas..." />
          </FormField>

          <FormField label="Descrição do contexto" style={{ gridColumn: '1 / -1' }}>
            <Input value={form.contexto_descricao} onChange={handleChange('contexto_descricao')} placeholder="Ex: Treinamento comercial de julho" />
          </FormField>

          <FormField label="Observações" style={{ gridColumn: '1 / -1' }}>
            <Textarea value={form.observacoes} onChange={handleChange('observacoes')} placeholder="Observações adicionais" />
          </FormField>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
