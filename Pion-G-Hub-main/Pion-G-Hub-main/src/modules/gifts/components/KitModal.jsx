import React, { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { FormField, Input, Textarea, Select, Button } from '../../../shared/components/FormField'
import { giftsService } from '../services/giftsService'
import { GiftThumbnail } from './GiftThumbnail'

const initialForm = { nome: '', descricao: '', contexto_sugerido: '' }

export function KitModal({ isOpen, onClose, kit, onSave }) {
  const [form, setForm] = useState(initialForm)
  const [items, setItems] = useState([])
  const [availableGifts, setAvailableGifts] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isEditing = !!kit

  useEffect(() => {
    if (isOpen) {
      setError('')
      giftsService.getActive().then(setAvailableGifts).catch(() => setAvailableGifts([]))

      if (kit) {
        setForm({
          nome: kit.nome || '',
          descricao: kit.descricao || '',
          contexto_sugerido: kit.contexto_sugerido || '',
        })
        setItems(
          (kit.brinde_kit_itens || []).map((it) => ({
            brinde_id: it.brinde_id,
            quantidade: it.quantidade,
          }))
        )
      } else {
        setForm(initialForm)
        setItems([])
      }
    }
  }, [kit, isOpen])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const addItem = () => {
    setItems((prev) => [...prev, { brinde_id: '', quantidade: 1 }])
  }

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    if (!form.nome.trim()) {
      setError('Nome é obrigatório.')
      return
    }

    const validItems = items.filter((it) => it.brinde_id && Number(it.quantidade) > 0)
    if (validItems.length === 0) {
      setError('Adicione ao menos um item ao kit.')
      return
    }

    setError('')
    setSaving(true)
    try {
      await onSave(
        {
          nome: form.nome.trim(),
          descricao: form.descricao.trim(),
          contexto_sugerido: form.contexto_sugerido.trim(),
        },
        validItems.map((it) => ({ brinde_id: it.brinde_id, quantidade: Number(it.quantidade) })),
        kit?.id
      )
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar kit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditing ? 'Editar Kit' : 'Novo Kit'} width={640}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c',
            padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <FormField label="Nome" required>
          <Input value={form.nome} onChange={handleChange('nome')} placeholder="Ex: Kit Feira Hospitalar" />
        </FormField>

        <FormField label="Contexto sugerido">
          <Input value={form.contexto_sugerido} onChange={handleChange('contexto_sugerido')} placeholder="Ex: Feiras de saúde" />
        </FormField>

        <FormField label="Descrição">
          <Textarea value={form.descricao} onChange={handleChange('descricao')} placeholder="Descrição do kit" />
        </FormField>

        <FormField label="Itens do Kit" required>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <GiftThumbnail
                  src={availableGifts.find((g) => g.id === item.brinde_id)?.imagem_url}
                  size={40}
                />
                <Select
                  value={item.brinde_id}
                  onChange={(e) => updateItem(index, 'brinde_id', e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Selecione um brinde</option>
                  {availableGifts.map((g) => (
                    <option key={g.id} value={g.id}>{g.nome} (estoque central: {g.estoque_atual})</option>
                  ))}
                </Select>
                <Input
                  type="number" min="1" step="1"
                  value={item.quantidade}
                  onChange={(e) => updateItem(index, 'quantidade', e.target.value)}
                  style={{ width: 90 }}
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 6 }}
                  title="Remover item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <Button type="button" variant="secondary" size="sm" onClick={addItem} style={{ alignSelf: 'flex-start' }}>
              <Plus size={14} /> Adicionar item
            </Button>
          </div>
        </FormField>

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
