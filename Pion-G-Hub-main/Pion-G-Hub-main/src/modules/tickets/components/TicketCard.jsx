import React from 'react'
import { useNavigate } from 'react-router-dom'
import { TicketStatusBadge, TicketPriorityBadge } from './TicketStatusBadge'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

/**
 * Card de um chamado — usado tanto em "Últimos chamados" (dashboard) quanto
 * como alternativa mobile da tabela de "Minha Lista" (item 12: tabela vira
 * cards no celular).
 */
export function TicketCard({ ticket }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/ti/${ticket.id}?from=solicitacoes`)}
      style={{
        background: '#fff',
        border: '1.5px solid #e2e8f0',
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{ticket.codigo_chamado}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{ticket.titulo}</div>
        </div>
        <TicketStatusBadge status={ticket.status} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>{ticket.ti_categorias?.nome || '—'}</span>
        <TicketPriorityBadge prioridade={ticket.prioridade} />
      </div>

      <div style={{ fontSize: 12, color: '#94a3b8' }}>{formatDate(ticket.created_at)}</div>
    </div>
  )
}
