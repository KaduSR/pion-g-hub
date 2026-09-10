import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ticketsService } from '../services/ticketsService'
import { FormField, Input, Select, Textarea, Button } from '../../../shared/components/FormField'
import { useToast } from '../../../shared/components/Toast'

// As 4 prioridades existentes no banco (CHECK de ti_chamados.prioridade_sugerida
// na migration da Sprint 4.1) — inclui 'urgente', que o mockup original da
// especificação tinha deixado de fora.
const PRIORIDADE_OPCOES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

const EMPTY_FORM = {
  categoriaId: '',
  equipamento: '',
  titulo: '',
  descricao: '',
  prioridadeSugerida: 'media',
}

/** Seção 2/3 — formulário de abertura de chamado. */
export function TicketCreate() {
  const navigate = useNavigate()
  const { show: showToast, ToastEl } = useToast()

  const [categorias, setCategorias] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ticketsService.getCategories()
      .then(setCategorias)
      .catch(() => showToast('Erro ao carregar categorias.', 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.categoriaId) e.categoriaId = 'Selecione uma categoria'
    if (!form.equipamento.trim()) e.equipamento = 'Equipamento é obrigatório'
    if (!form.titulo.trim()) e.titulo = 'Título é obrigatório'
    if (!form.descricao.trim()) e.descricao = 'Descrição é obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      await ticketsService.createTicket({
        categoriaId: form.categoriaId,
        equipamento: form.equipamento,
        titulo: form.titulo,
        descricao: form.descricao,
        prioridadeSugerida: form.prioridadeSugerida,
      })
      showToast('Chamado criado com sucesso.')
      navigate('/ti')
    } catch (err) {
      setErrors({ submit: err.message || 'Erro ao criar chamado.' })
      showToast(err.message || 'Erro ao criar chamado.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' }}>
      {ToastEl}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Novo Chamado</h1>

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: 20 }}>
        <FormField label="Categoria" required error={errors.categoriaId}>
          <Select value={form.categoriaId} onChange={set('categoriaId')}>
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Equipamento" required error={errors.equipamento}>
          <Input
            placeholder="Ex.: Notebook Dell, Impressora HP..."
            value={form.equipamento}
            onChange={set('equipamento')}
          />
        </FormField>

        <FormField label="Título" required error={errors.titulo}>
          <Input placeholder="Resuma o problema em poucas palavras" value={form.titulo} onChange={set('titulo')} />
        </FormField>

        <FormField label="Descrição" required error={errors.descricao}>
          <Textarea
            placeholder="Descreva o problema com detalhes"
            value={form.descricao}
            onChange={set('descricao')}
            rows={5}
          />
        </FormField>

        <FormField label="Prioridade">
          <div style={{ display: 'flex', gap: 16 }}>
            {PRIORIDADE_OPCOES.map((opt) => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#374151', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="prioridade"
                  value={opt.value}
                  checked={form.prioridadeSugerida === opt.value}
                  onChange={set('prioridadeSugerida')}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Anexos">
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Disponível em uma sprint futura.</p>
        </FormField>

        {errors.submit && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{errors.submit}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Button type="button" variant="secondary" onClick={() => navigate('/ti')}>Cancelar</Button>
          <Button type="submit" loading={saving}>Enviar</Button>
        </div>
      </form>
    </div>
  )
}
