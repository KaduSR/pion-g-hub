import React, { useState, useEffect } from 'react'
import { ticketsService } from '../services/ticketsService'
import { Select, Button } from '../../../shared/components/FormField'

/**
 * Painel de atribuição — só é renderizado por TicketOperationalDetails
 * quando responsavel_profile_id ainda está vazio (regra explícita desta
 * sprint: sem troca de responsável já definido). Cobre os dois cenários
 * pedidos: "Assumir chamado" (o próprio agente) e "Atribuir" a um colega
 * (escolhido em ti_listar_membros_equipe — nunca uma lista arbitrária de
 * usuários do Hub).
 */
export function TicketAssignmentPanel({ ticket, ownProfileId, onSuccess, showToast }) {
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ticket.equipe_id) return
    setMembersLoading(true)
    ticketsService.getTeamMembers(ticket.equipe_id)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false))
  }, [ticket.equipe_id])

  // "Assumir chamado" só faz sentido oferecer se o próprio agente está na
  // lista de membros ativos da equipe do chamado — do contrário a RPC
  // recusaria certeza (22023, "Responsável precisa ser membro ativo da
  // equipe"). Não afrouxamos a validação do backend: só evitamos mostrar
  // um botão que sempre falharia.
  const canTakeTicket = members.some((m) => m.profile_id === ownProfileId)

  const runAssignment = async (responsavelProfileId) => {
    setError('')
    setSaving(true)
    try {
      // A RPC já é idempotente: {changed:false} (reenvio pro mesmo
      // responsável) conta como sucesso, não como erro.
      await ticketsService.assignTicket({ chamadoId: ticket.id, responsavelProfileId })
      showToast('Chamado atribuído.')
      await onSuccess()
    } catch (err) {
      // Mensagem da RPC é exibida como veio — só o caso de corrida
      // (outra pessoa assumiu entre o carregamento da tela e o clique,
      // RPC bloqueia com 23514 igual bloquearia uma troca manual) ganha
      // uma frase mais amigável; todo o resto mostra err.message direto.
      const message = /reatribuição/i.test(err.message || '')
        ? 'Este chamado acabou de ser atribuído a outra pessoa. Atualizando a fila...'
        : (err.message || 'Erro ao atribuir o chamado.')
      setError(message)
      showToast(message, 'error')
      await onSuccess()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Atribuir responsável</h3>

      {!membersLoading && (
        <div style={{ marginBottom: 12 }}>
          {canTakeTicket ? (
            <Button variant="primary" size="sm" loading={saving} onClick={() => runAssignment(ownProfileId)}>
              Assumir chamado
            </Button>
          ) : (
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Você não pertence à equipe responsável por este chamado.
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ width: 'auto', minWidth: 200 }}>
          <option value="">Selecione um colega da equipe...</option>
          {members.map((m) => (
            <option key={m.profile_id} value={m.profile_id}>{m.nome}{m.coordenador ? ' (coordenador)' : ''}</option>
          ))}
        </Select>
        <Button
          variant="secondary"
          size="sm"
          loading={saving}
          disabled={!selectedId}
          onClick={() => runAssignment(selectedId)}
        >
          Atribuir
        </Button>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: 12, margin: '10px 0 0' }}>{error}</p>}
    </div>
  )
}
