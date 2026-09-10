import React from 'react'
import { InternalNoteBadge } from './InternalNoteBadge'

function formatDateTime(iso) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * Seção 5 (timeline). Recebe `entries` já montadas e ordenadas
 * cronologicamente pelo chamador (TicketDetails.jsx) — este componente só
 * desenha.
 *
 * Pro Portal do Solicitante (Sprint 4.2), a timeline continua sem eventos
 * operacionais como "atendimento iniciado" — essa informação vive em
 * ti_chamado_historico, tabela que o solicitante não tem acesso (RLS).
 * Pra quem tem permissão de TI, TicketDetails.jsx já busca esse histórico
 * e monta entradas equivalentes (triagem concluída, atribuído, atendimento
 * iniciado, resolvido, fechado, reaberto) — este componente só desenha o
 * que recebeu, sem saber a origem de cada entrada.
 *
 * Sprint 4.3: entradas com `entry.interno = true` (notas internas da
 * Central de Atendimento) ganham fundo âmbar + InternalNoteBadge — só
 * chegam aqui pra quem a RLS de ti_chamado_comentarios já autorizou a ver;
 * o solicitante nunca recebe uma entrada com interno=true nesta lista
 * (RLS filtra a linha antes mesmo do JOIN), então este componente não
 * precisa saber "quem" está olhando, só desenhar o que recebeu.
 */
export function TicketTimeline({ entries }) {
  if (!entries || entries.length === 0) {
    return <p style={{ color: '#94a3b8', fontSize: 14 }}>Nenhuma atualização ainda.</p>
  }

  return (
    <div>
      {entries.map((entry, idx) => (
        <div key={`${entry.type}-${entry.id ?? idx}`}>
          <div
            style={{
              display: 'flex', gap: 12, padding: '10px 0',
              ...(entry.interno
                ? { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10 }
                : {}),
            }}
          >
            <div
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: entry.color || '#1B3A6B',
                marginTop: 5, flexShrink: 0,
              }}
            />
            <div>
              {entry.interno ? (
                <>
                  <div style={{ marginBottom: 2 }}><InternalNoteBadge /></div>
                  <div style={{ fontSize: 12, color: '#78350f' }}>
                    Adicionada por <strong>{entry.autorNome}</strong> • {formatDateTime(entry.date)}
                  </div>
                  <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>
                    Visível somente para a equipe de TI
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatDateTime(entry.date)}</span>
                </div>
              )}
              {!entry.interno && (
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{entry.title}</div>
              )}
              {entry.description && (
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2, whiteSpace: 'pre-wrap' }}>
                  {entry.description}
                </div>
              )}
            </div>
          </div>
          {idx < entries.length - 1 && (
            <div style={{ borderLeft: '2px solid #e2e8f0', height: 12, marginLeft: 4 }} />
          )}
        </div>
      ))}
    </div>
  )
}
