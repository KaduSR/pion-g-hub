import React, { useState, useEffect } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { FormField, Input, Textarea, Select, Button } from '../../../shared/components/FormField'
import { giftsService } from '../services/giftsService'
import { giftKitsService } from '../services/giftKitsService'
import { CONTEXTOS } from '../constants/giftConstants'

const initialForm = {
  tipo_entrega: 'kit',
  kit_id: '',
  brinde_id: '',
  quantidade: '',
  destinatario_nome: '',
  destinatario_empresa: '',
  destinatario_contato: '',
  contexto_tipo: '',
  contexto_descricao: '',
  observacoes: '',
}

export function DeliveryModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState(initialForm)
  const [kits, setKits] = useState([])
  const [gifts, setGifts] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm)
      setError('')
      giftKitsService.getAll({ ativo: true })
        .then((data) => setKits(data.filter((k) => (k.brinde_kit_itens || []).length > 0)))
        .catch(() => setKits([]))
      giftsService.getActive().then(setGifts).catch(() => setGifts([]))
    }
  }, [isOpen])

  const handleChange = (field) => (e) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    if (form.tipo_entrega === 'kit' && !form.kit_id) {
      setError('Selecione um kit.')
      return
    }

    if (form.tipo_entrega === 'item_avulso') {
      if (!form.brinde_id) {
        setError('Selecione um brinde.')
        return
      }
      if (!form.quantidade || Number(form.quantidade) <= 0) {
        setError('Informe uma quantidade maior que zero.')
        return
      }
    }

    setError('')
    setSaving(true)
    try {
      await onSave({
        tipoEntrega: form.tipo_entrega,
        kitId: form.kit_id || null,
        brindeId: form.brinde_id || null,
        quantidade: form.quantidade ? Number(form.quantidade) : null,
        destinatarioNome: form.destinatario_nome.trim(),
        destinatarioEmpresa: form.destinatario_empresa.trim(),
        destinatarioContato: form.destinatario_contato.trim(),
        contextoTipo: form.contexto_tipo,
        contextoDescricao: form.contexto_descricao.trim(),
        observacoes: form.observacoes.trim(),
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao registrar entrega.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nova Entrega" width={680}>
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
          <FormField label="Tipo de Entrega" required style={{ gridColumn: '1 / -1' }}>
            <Select value={form.tipo_entrega} onChange={handleChange('tipo_entrega')}>
              <option value="kit">Kit</option>
              <option value="item_avulso">Item avulso</option>
            </Select>
          </FormField>

          {form.tipo_entrega === 'kit' ? (
            <FormField label="Kit" required style={{ gridColumn: '1 / -1' }}>
              <Select value={form.kit_id} onChange={handleChange('kit_id')}>
                <option value="">Selecione um kit</option>
                {kits.map((k) => (
                  <option key={k.id} value={k.id}>{k.nome}</option>
                ))}
              </Select>
            </FormField>
          ) : (
            <>
              <FormField label="Brinde" required>
                <Select value={form.brinde_id} onChange={handleChange('brinde_id')}>
                  <option value="">Selecione um brinde</option>
                  {gifts.map((g) => (
                    <option key={g.id} value={g.id}>{g.nome} (estoque central: {g.estoque_atual})</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Quantidade" required>
                <Input type="number" min="1" step="1" value={form.quantidade} onChange={handleChange('quantidade')} placeholder="0" />
              </FormField>
            </>
          )}

          <FormField label="Contexto">
            <Select value={form.contexto_tipo} onChange={handleChange('contexto_tipo')}>
              <option value="">Não informado</option>
              {CONTEXTOS.filter((c) => c.value !== 'ajuste_estoque' && c.value !== 'perda').map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Descrição do contexto">
            <Input value={form.contexto_descricao} onChange={handleChange('contexto_descricao')} placeholder="Ex: Visita técnica" />
          </FormField>

          <FormField label="Nome do destinatário" style={{ gridColumn: '1 / -1' }}>
            <Input value={form.destinatario_nome} onChange={handleChange('destinatario_nome')} placeholder="Nome de quem vai receber" />
          </FormField>

          <FormField label="Empresa do destinatário">
            <Input value={form.destinatario_empresa} onChange={handleChange('destinatario_empresa')} placeholder="Ex: Hospital XPTO" />
          </FormField>

          <FormField label="Contato do destinatário">
            <Input value={form.destinatario_contato} onChange={handleChange('destinatario_contato')} placeholder="Telefone ou e-mail" />
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
            Liberar entrega
          </Button>
        </div>
      </form>
    </Modal>
  )
}
