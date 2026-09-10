import React, { useState, useEffect } from 'react'
import { Trash2, ChevronUp, ChevronDown, Plus, X } from 'lucide-react'
import { FormField, Input, Select, Button } from '../../../shared/components/FormField'
import { QUESTION_TYPES } from '../constants/satisfactionDefaults'

const emptyForm = { titulo: '', descricao: '', tipo: 'short_text', obrigatoria: true, opcoes: [''] }

function toForm(question) {
  return {
    titulo: question.titulo,
    descricao: question.descricao || '',
    tipo: question.tipo,
    obrigatoria: question.obrigatoria,
    opcoes: question.opcoes?.length ? question.opcoes : [''],
  }
}

/**
 * Editor de uma pergunta. `isNew` (sem `question`) vira um mini-formulário
 * de "adicionar pergunta"; com `question`, edita uma pergunta existente.
 * `locked` (pesquisa já tem respostas) deixa tudo somente leitura, exceto
 * ativar/desativar — que fica fora deste componente, na listagem.
 */
export function SatisfactionQuestionEditor({
  question, isNew, locked, isFirst, isLast,
  onSave, onDelete, onMoveUp, onMoveDown,
}) {
  const [form, setForm] = useState(() => (question ? toForm(question) : emptyForm))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (question) setForm(toForm(question))
  }, [question])

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateOption = (index, value) => {
    setForm((prev) => ({ ...prev, opcoes: prev.opcoes.map((o, i) => (i === index ? value : o)) }))
  }
  const addOption = () => setForm((prev) => ({ ...prev, opcoes: [...prev.opcoes, ''] }))
  const removeOption = (index) => setForm((prev) => ({ ...prev, opcoes: prev.opcoes.filter((_, i) => i !== index) }))

  const readOnly = locked && !isNew

  const handleSubmit = async () => {
    if (readOnly || saving) return

    if (!form.titulo.trim()) {
      setError('Título da pergunta é obrigatório.')
      return
    }
    if (form.tipo === 'single_choice' && form.opcoes.filter((o) => o.trim()).length < 2) {
      setError('Escolha única precisa de ao menos 2 opções preenchidas.')
      return
    }

    setError('')
    setSaving(true)
    try {
      await onSave({
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        tipo: form.tipo,
        obrigatoria: form.obrigatoria,
        opcoes: form.tipo === 'single_choice' ? form.opcoes.map((o) => o.trim()).filter(Boolean) : null,
      })
      if (isNew) setForm(emptyForm)
    } catch (err) {
      setError(err.message || 'Erro ao salvar pergunta.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: isNew ? '#f8fafc' : '#fff',
      border: isNew ? '1.5px dashed #cbd5e1' : '1px solid #e2e8f0',
      borderRadius: 12, padding: 16,
      opacity: readOnly ? 0.7 : 1,
    }}>
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c',
          padding: 8, borderRadius: 6, fontSize: 12, marginBottom: 10, fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 12px' }}>
        <FormField label="Título da pergunta">
          <Input value={form.titulo} onChange={handleChange('titulo')} disabled={readOnly} placeholder="Ex: Como você avalia..." />
        </FormField>

        <FormField label="Tipo">
          <Select value={form.tipo} onChange={handleChange('tipo')} disabled={readOnly}>
            {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </FormField>
      </div>

      <FormField label="Descrição (opcional)">
        <Input value={form.descricao} onChange={handleChange('descricao')} disabled={readOnly} placeholder="Texto de apoio abaixo do título" />
      </FormField>

      {form.tipo === 'single_choice' && (
        <FormField label="Opções">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {form.opcoes.map((opt, index) => (
              <div key={index} style={{ display: 'flex', gap: 6 }}>
                <Input value={opt} onChange={(e) => updateOption(index, e.target.value)} disabled={readOnly} placeholder={`Opção ${index + 1}`} />
                {!readOnly && form.opcoes.length > 1 && (
                  <button type="button" onClick={() => removeOption(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <Button type="button" variant="secondary" size="sm" onClick={addOption} style={{ alignSelf: 'flex-start' }}>
                <Plus size={14} /> Adicionar opção
              </Button>
            )}
          </div>
        </FormField>
      )}

      <label style={{
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569',
        margin: '8px 0 12px', cursor: readOnly ? 'default' : 'pointer',
      }}>
        <input type="checkbox" checked={form.obrigatoria} onChange={handleChange('obrigatoria')} disabled={readOnly} />
        Obrigatória
      </label>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {!isNew && !locked && (
            <>
              <button type="button" onClick={onMoveUp} disabled={isFirst} title="Mover para cima" style={{ background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer', color: isFirst ? '#cbd5e1' : '#64748b', padding: 4 }}>
                <ChevronUp size={16} />
              </button>
              <button type="button" onClick={onMoveDown} disabled={isLast} title="Mover para baixo" style={{ background: 'none', border: 'none', cursor: isLast ? 'default' : 'pointer', color: isLast ? '#cbd5e1' : '#64748b', padding: 4 }}>
                <ChevronDown size={16} />
              </button>
              <button type="button" onClick={onDelete} title="Excluir pergunta" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}>
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>

        {!readOnly && (
          <Button type="button" size="sm" loading={saving} disabled={saving} onClick={handleSubmit}>
            {isNew ? 'Adicionar pergunta' : 'Salvar alterações'}
          </Button>
        )}
      </div>
    </div>
  )
}
