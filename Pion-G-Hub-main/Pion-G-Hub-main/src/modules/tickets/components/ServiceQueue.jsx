import React from 'react'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { TicketStatusBadge, TicketPriorityBadge } from './TicketStatusBadge'
import { Button } from '../../../shared/components/FormField'

const INTERNAL_NOTE_TOOLTIP = 'Este chamado possui notas internas da equipe de TI'

function InternalNoteIndicator() {
  return (
    <Lock
      size={13}
      color="#d97706"
      aria-label={INTERNAL_NOTE_TOOLTIP}
      title={INTERNAL_NOTE_TOOLTIP}
      style={{ flexShrink: 0 }}
    />
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

/**
 * Fila operacional — tabela no desktop, cards no mobile (mesmo padrão CSS
 * de TicketsDashboard.jsx). Paginação simples (Anterior/Próxima) em vez de
 * scroll infinito — casa com useServiceQueue, que já pede p_limit/p_offset
 * e nunca a tabela inteira.
 */
export function ServiceQueue({ items, loading, error, page, setPage, hasMore, onOpen }) {
  if (loading) return <p style={{ color: '#94a3b8' }}>Carregando fila...</p>
  if (error) return <p style={{ color: '#ef4444' }}>Erro ao carregar a fila: {error}</p>
  if (items.length === 0) return <p style={{ color: '#94a3b8' }}>Nenhum chamado encontrado com estes filtros.</p>

  return (
    <>
      <style>{`
        .sq-table-wrap { display: block; overflow-x: auto; }
        .sq-cards-wrap { display: none; }
        @media (max-width: 860px) {
          .sq-table-wrap { display: none; }
          .sq-cards-wrap { display: flex; flex-direction: column; gap: 10px; }
        }
      `}</style>

      <div className="sq-table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              {['Número', 'Título', 'Solicitante', 'Categoria', 'Equipe', 'Status', 'Prioridade', 'Responsável', 'Abertura', 'Atualização'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} onClick={() => onOpen(t.id)} style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#1B3A6B', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {t.codigo_chamado}
                    {t.hasInternalNote && <InternalNoteIndicator />}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#0f172a', maxWidth: 220 }}>{t.titulo}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748b' }}>{t.solicitante_nome || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748b' }}>{t.categoria_nome || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748b' }}>{t.equipe_nome || '—'}</td>
                <td style={{ padding: '10px 14px' }}><TicketStatusBadge status={t.status} variant="operacional" /></td>
                <td style={{ padding: '10px 14px' }}><TicketPriorityBadge prioridade={t.prioridade} /></td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748b' }}>{t.responsavel_nome || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(t.created_at)}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(t.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sq-cards-wrap">
        {items.map((t) => (
          <div
            key={t.id}
            onClick={() => onOpen(t.id)}
            style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {t.codigo_chamado}
                  {t.hasInternalNote && <InternalNoteIndicator />}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{t.titulo}</div>
              </div>
              <TicketStatusBadge status={t.status} variant="operacional" />
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Solicitante: {t.solicitante_nome || '—'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>{t.equipe_nome || 'Sem equipe'} · {t.categoria_nome || '—'}</span>
              <TicketPriorityBadge prioridade={t.prioridade} />
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Responsável: {t.responsavel_nome || 'Sem responsável'}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Aberto em {formatDate(t.created_at)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
          <ChevronLeft size={14} /> Anterior
        </Button>
        <span style={{ fontSize: 13, color: '#64748b' }}>Página {page + 1}</span>
        <Button variant="secondary" size="sm" disabled={!hasMore} onClick={() => setPage(page + 1)}>
          Próxima <ChevronRight size={14} />
        </Button>
      </div>
    </>
  )
}
