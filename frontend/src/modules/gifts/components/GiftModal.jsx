import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { FormField, Input, Textarea, Button } from '../../../shared/components/FormField'
import { GiftImageUploader } from './GiftImageUploader'

const initialForm = {
  nome: '',
  descricao: '',
  categoria: '',
  fornecedor: '',
  valor_unitario: '',
  estoque_minimo: '',
  estoque_inicial: '',
  observacoes: '',
  imagem_url: null,
}

export function GiftModal({ isOpen, onClose, gift, onSave }) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const tempIdRef = useRef(null)

  const isEditing = !!gift

  useEffect(() => {
    if (isOpen) {
      setError('')
      if (gift) {
        setForm({
          nome: gift.nome || '',
          descricao: gift.descricao || '',
          categoria: gift.categoria || '',
          fornecedor: gift.fornecedor || '',
          valor_unitario: gift.valor_unitario ?? '',
          estoque_minimo: gift.estoque_minimo ?? '',
          estoque_inicial: '',
          observacoes: gift.observacoes || '',
          imagem_url: gift.imagem_url || null,
        })
      } else {
        setForm(initialForm)
        // brinde ainda não existe: usa um id temporário só para nomear o
        // arquivo no storage; o registro real é criado só no submit.
        tempIdRef.current = crypto.randomUUID()
      }
    }
  }, [gift, isOpen])

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

    if (!form.nome.trim()) {
      setError('Nome é obrigatório.')
      return
    }

    setError('')
    setSaving(true)
    try {
      await onSave({
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        categoria: form.categoria.trim(),
        fornecedor: form.fornecedor.trim(),
        valor_unitario: form.valor_unitario === '' ? 0 : Number(form.valor_unitario),
        estoque_minimo: form.estoque_minimo === '' ? 0 : Number(form.estoque_minimo),
        estoque_inicial: form.estoque_inicial === '' ? 0 : Number(form.estoque_inicial),
        observacoes: form.observacoes.trim(),
        imagem_url: form.imagem_url,
      }, gift?.id)
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar brinde.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditing ? 'Editar Brinde' : 'Novo Brinde'} width={640}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c',
            padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <FormField label="Imagem do brinde">
          <GiftImageUploader
            value={form.imagem_url}
            onChange={(url) => setForm((prev) => ({ ...prev, imagem_url: url }))}
            entityId={gift?.id || tempIdRef.current}
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormField label="Nome" required style={{ gridColumn: '1 / -1' }}>
            <Input value={form.nome} onChange={handleChange('nome')} placeholder="Ex: Caneca personalizada" />
          </FormField>

          <FormField label="Categoria">
            <Input value={form.categoria} onChange={handleChange('categoria')} placeholder="Ex: Brinde institucional" />
          </FormField>

          <FormField label="Fornecedor">
            <Input value={form.fornecedor} onChange={handleChange('fornecedor')} placeholder="Ex: Gráfica ABC" />
          </FormField>

          <FormField label="Valor Unitário (R$)">
            <Input type="number" min="0" step="0.01" value={form.valor_unitario} onChange={handleChange('valor_unitario')} placeholder="0,00" />
          </FormField>

          <FormField label="Estoque Mínimo">
            <Input type="number" min="0" step="1" value={form.estoque_minimo} onChange={handleChange('estoque_minimo')} placeholder="0" />
          </FormField>

          {!isEditing && (
            <FormField label="Estoque Inicial" style={{ gridColumn: '1 / -1' }}>
              <Input type="number" min="0" step="1" value={form.estoque_inicial} onChange={handleChange('estoque_inicial')} placeholder="0" />
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
                Se informado, gera automaticamente uma movimentação de entrada.
              </p>
            </FormField>
          )}

          <FormField label="Descrição" style={{ gridColumn: '1 / -1' }}>
            <Textarea value={form.descricao} onChange={handleChange('descricao')} placeholder="Descrição do brinde" />
          </FormField>

          <FormField label="Observações" style={{ gridColumn: '1 / -1' }}>
            <Textarea value={form.observacoes} onChange={handleChange('observacoes')} placeholder="Observações internas" />
          </FormField>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
