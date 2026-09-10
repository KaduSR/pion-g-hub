import React, { useState, useEffect } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { FormField, Input, Textarea, Select, Button } from '../../../shared/components/FormField'

export function CreateSurveyModal({ isOpen, onClose, fairs, defaultFeiraId, onSave }) {
  const [form, setForm] = useState({ feiraId: '', titulo: '', descricao: '', useTemplate: true })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm({ feiraId: defaultFeiraId || '', titulo: '', descricao: '', useTemplate: true })
      setError('')
    }
  }, [isOpen, defaultFeiraId])

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    if (!form.feiraId) {
      setError('Selecione uma feira.')
      return
    }
    if (!form.titulo.trim()) {
      setError('Título é obrigatório.')
      return
    }

    setError('')
    setSaving(true)
    try {
      await onSave({
        feiraId: form.feiraId,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        useTemplate: form.useTemplate,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao criar pesquisa.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nova Pesquisa de Satisfação" width={560}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c',
            padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <FormField label="Feira" required>
          <Select value={form.feiraId} onChange={handleChange('feiraId')}>
            <option value="">Selecione uma feira</option>
            {fairs.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </Select>
        </FormField>

        <FormField label="Título" required>
          <Input value={form.titulo} onChange={handleChange('titulo')} placeholder="Ex: Pesquisa de Satisfação — Expo Hospital" />
        </FormField>

        <FormField label="Descrição">
          <Textarea value={form.descricao} onChange={handleChange('descricao')} placeholder="Texto de apoio exibido para o visitante" />
        </FormField>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', marginBottom: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.useTemplate} onChange={handleChange('useTemplate')} />
          Criar usando o modelo padrão Pion G Plus (15 perguntas prontas — dá para editar depois)
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            Criar pesquisa
          </Button>
        </div>
      </form>
    </Modal>
  )
}
