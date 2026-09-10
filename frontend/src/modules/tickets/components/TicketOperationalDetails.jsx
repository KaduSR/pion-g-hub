import React, { useState } from 'react'
import { PlayCircle, CheckCircle2, XCircle, RotateCcw, CheckCheck, RefreshCcw, UserCheck } from 'lucide-react'
import { ticketsService, STATUS_ACTIONS } from '../services/ticketsService'
import { TicketPriorityBadge } from './TicketStatusBadge'
import { TicketTriagePanel } from './TicketTriagePanel'
import { TicketAssignmentPanel } from './TicketAssignmentPanel'
import { Button } from '../../../shared/components/FormField'

// Mesmos nomes usados em STATUS_ACTIONS (ticketsService.js) — mapeados aqui
// pra não importar lucide-react no service (camada sem JSX).
const ACTION_ICONS = { PlayCircle, CheckCircle2, XCircle, RotateCcw, CheckCheck, RefreshCcw }

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * Bloco operacional do detalhe do chamado — só renderizado quando o
 * usuário tem alguma permissão de TI (ver TicketDetails.jsx). Mostra os
 * dados que o solicitante nunca vê (equipe, responsável, prioridade
 * sugerida separada da oficial, SLA) e orquestra triagem/atribuição/
 * mudança de status — sempre via RPC, nunca UPDATE direto em ti_chamados.
 */
export function TicketOperationalDetails({ ticket, ownProfileId, canTriage, canManage, canManageAll, onReload, showToast }) {
  const [statusSaving, setStatusSaving] = useState(false)
  const [editingTriage, setEditingTriage] = useState(false)

  // Bloco de triagem só se aplica enquanto ti_triagem_chamado ainda aceita
  // o chamado (aberto/em_triagem — mesma checagem da RPC). Dentro dessa
  // janela: 'aberto' sempre mostra o formulário (ainda não há triagem
  // nenhuma pra resumir); 'em_triagem' mostra um resumo + "Editar triagem"
  // por padrão, e só reabre o formulário quando o usuário pede.
  const triageWindowOpen = canTriage && ['aberto', 'em_triagem'].includes(ticket.status)
  const showTriageForm = triageWindowOpen && (ticket.status === 'aberto' || editingTriage)
  const showTriageSummary = triageWindowOpen && ticket.status === 'em_triagem' && !editingTriage

  const handleTriageSaved = async () => {
    setEditingTriage(false)
    await onReload()
  }

  const showAssignment = (canManage || canManageAll) && ticket.equipe_id && !ticket.responsavel_profile_id

  const availableActions = (STATUS_ACTIONS[ticket.status] || []).filter((action) => (
    action.permission === 'manage_all' ? canManageAll : canManage
  ))

  const handleStatusChange = async (action) => {
    if (action.confirm && !window.confirm(`Confirma "${action.label}"? Esta ação não pode ser desfeita pela interface.`)) {
      return
    }
    setStatusSaving(true)
    try {
      await ticketsService.changeStatus({ chamadoId: ticket.id, novoStatus: action.target })
      showToast('Status atualizado.')
      await onReload()
    } catch (err) {
      showToast(err.message || 'Erro ao mudar o status.', 'error')
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 20,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Solicitante</div>
          <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{ticket.solicitante_nome || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Equipe</div>
          <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{ticket.ti_equipes?.nome || 'Ainda não triado'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Responsável</div>
          {ticket.responsavel_nome ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 2,
              background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 20,
              padding: '4px 10px 4px 6px', fontSize: 13, fontWeight: 700, color: '#065f46',
            }}>
              <UserCheck size={14} /> {ticket.responsavel_nome}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>Sem responsável</div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Solicitante sugeriu</div>
          <div>{ticket.prioridade_sugerida ? <TicketPriorityBadge prioridade={ticket.prioridade_sugerida} /> : '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Prioridade definida pela TI</div>
          <div><TicketPriorityBadge prioridade={ticket.prioridade} /></div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Prazo de resolução</div>
          <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{formatDateTime(ticket.prazo_resolucao_em)}</div>
        </div>
      </div>

      {showTriageForm && (
        <TicketTriagePanel ticket={ticket} onSuccess={handleTriageSaved} showToast={showToast} />
      )}

      {showTriageSummary && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
          background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Triagem concluída</div>
            <div style={{ fontSize: 13, color: '#78350f', marginTop: 2 }}>
              {ticket.ti_categorias?.nome || '—'} · {ticket.ti_equipes?.nome || '—'} · Prioridade {ticket.prioridade}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditingTriage(true)}>
            Editar triagem
          </Button>
        </div>
      )}

      {showAssignment && (
        <TicketAssignmentPanel ticket={ticket} ownProfileId={ownProfileId} onSuccess={onReload} showToast={showToast} />
      )}

      {availableActions.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {availableActions.map((action) => {
            const ActionIcon = ACTION_ICONS[action.icon]
            return (
              <Button
                key={action.target}
                variant={action.variant}
                size="sm"
                loading={statusSaving}
                onClick={() => handleStatusChange(action)}
              >
                {ActionIcon && <ActionIcon size={16} />} {action.label}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
