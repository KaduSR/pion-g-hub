import React from 'react'

// Rótulos simplificados pro solicitante (revisão de navegação/arquitetura
// visual) — mesmas chaves de sempre (STATUS_BUCKETS em ticketsService.js),
// só o texto exibido muda. "aberto" soma aberto+em_triagem+atribuido(+
// reaberto, já incluído ali) — nunca mistura com o que a Central usa.
const CARDS = [
  { key: 'aberto',     label: 'Aguardando atendimento', color: '#2563eb', bg: '#eff6ff' },
  { key: 'andamento',  label: 'Em atendimento',         color: '#d97706', bg: '#fffbeb' },
  { key: 'concluido',  label: 'Concluídos',              color: '#059669', bg: '#ecfdf5' },
]

/** Seção 1 da especificação — os 3 contadores no topo do dashboard. */
export function TicketStats({ stats }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}
    >
      {CARDS.map(({ key, label, color, bg }) => (
        <div
          key={key}
          style={{
            background: bg,
            borderRadius: 12,
            padding: '16px 18px',
            border: `1.5px solid ${color}22`,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color }}>{stats[key] ?? 0}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 2 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}
