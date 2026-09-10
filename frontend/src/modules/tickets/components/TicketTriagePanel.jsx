import React, { useState, useEffect } from 'react'
import { ticketsService } from '../services/ticketsService'
import { FormField, Select, Button } from '../../../shared/components/FormField'

const PRIORIDADE_OPCOES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

/**
 * Painel de triagem — aparece em TicketOperationalDetails quando o status
 * admite ti_triagem_chamado (aberto/em_triagem) e o agente tem
 * tickets.triage. A equipe sugerida vem de ti_categorias.equipe_padrao_id
 * (não é hardcode no frontend — só é usada como valor inicial, sempre
 * editável) e só é reaplicada automaticamente enquanto o usuário não tiver
 * escolhido a equipe manualmente.
 */
export function TicketTriagePanel({ ticket, onSuccess, showToast }) {
  const isEditing = ticket.status === 'em_triagem'

  const [categories, setCategories] = useState([])
  const [teams, setTeams] = useState([])
  const [categoriaId, setCategoriaId] = useState(ticket.categoria_id)
  // Reabrindo pra editar uma triagem já feita: parte da equipe/prioridade
  // JÁ confirmadas (ticket.equipe_id/ticket.prioridade), não de um estado
  // em branco — e a sugestão automática por categoria não deve sobrescrever
  // uma equipe que o chamado já tem.
  const [equipeId, setEquipeId] = useState(ticket.equipe_id || '')
  const [prioridade, setPrioridade] = useState(ticket.prioridade || 'media')
  const [equipeTouched, setEquipeTouched] = useState(Boolean(ticket.equipe_id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ticketsService.getCategories().then(setCategories).catch(() => setCategories([]))
    ticketsService.getTeams().then(setTeams).catch(() => setTeams([]))
  }, [])

  // Sugestão automática de equipe a partir da categoria escolhida — só
  // enquanto o usuário não tiver trocado a equipe manualmente.
  useEffect(() => {
    if (equipeTouched || categories.length === 0) return
    const categoria = categories.find((c) => c.id === categoriaId)
    if (categoria?.equipe_padrao_id) setEquipeId(categoria.equipe_padrao_id)
  }, [categoriaId, categories, equipeTouched])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!equipeId) {
      setError('Escolha a equipe responsável.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await ticketsService.triageTicket({
        chamadoId: ticket.id,
        equipeId,
        prioridade,
        categoriaId,
      })
      showToast(isEditing ? 'Triagem atualizada.' : 'Triagem concluída.')
      await onSuccess()
    } catch (err) {
      const fallback = isEditing ? 'Erro ao atualizar a triagem.' : 'Erro ao concluir a triagem.'
      setError(err.message || fallback)
      showToast(err.message || fallback, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
        {isEditing ? 'Editar triagem' : 'Fazer triagem'}
      </h3>

      {ticket.prioridade_sugerida && (
        <p style={{ fontSize: 13, color: '#92400e', margin: '0 0 12px' }}>
          Prioridade sugerida pelo solicitante: <strong>{ticket.prioridade_sugerida}</strong> (apenas indicativa)
        </p>
      )}

      <FormField label="Categoria">
        <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
      </FormField>

      <FormField label="Equipe" required error={error}>
        <Select value={equipeId} onChange={(e) => { setEquipeId(e.target.value); setEquipeTouched(true) }}>
          <option value="">Selecione...</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </Select>
      </FormField>

      <FormField label="Prioridade oficial">
        <Select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
          {PRIORIDADE_OPCOES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </FormField>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" loading={saving}>{isEditing ? 'Salvar alterações' : 'Concluir triagem'}</Button>
      </div>
    </form>
  )
}
