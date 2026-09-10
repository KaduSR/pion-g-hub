import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ticketsService } from '../services/ticketsService'
import { TicketStatusBadge, TicketPriorityBadge } from '../components/TicketStatusBadge'
import { TicketTimeline } from '../components/TicketTimeline'
import { TicketCommentBox } from '../components/TicketCommentBox'
import { TicketAgentCommentBox } from '../components/TicketAgentCommentBox'
import { TicketOperationalDetails } from '../components/TicketOperationalDetails'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { usePermissions } from '../../permissions/contexts/PermissionsContext'
import { PERMISSIONS } from '../../permissions/constants/permissions'
import { useToast } from '../../../shared/components/Toast'
import { LoadingScreen } from '../../../shared/components/LoadingScreen'

const TI_STAFF_PERMISSIONS = [
  PERMISSIONS.TICKETS_VIEW_TEAM, PERMISSIONS.TICKETS_MANAGE_TEAM,
  PERMISSIONS.TICKETS_VIEW_ALL, PERMISSIONS.TICKETS_MANAGE_ALL, PERMISSIONS.TICKETS_TRIAGE,
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function commentTitle(c, ticket, ownProfileId) {
  if (c.autor_profile_id === ownProfileId) {
    return c.interno ? 'Você adicionou uma nota interna' : 'Você comentou'
  }
  if (c.interno) return 'Nota interna da equipe'
  return c.autor_profile_id === ticket.solicitante_profile_id ? 'Comentário do solicitante' : 'Comentário da equipe'
}

// Rótulos da timeline operacional pra cada status alcançado via evento
// 'status_alterado' de ti_chamado_historico (revisão de fluxo — Atribuído
// → Em atendimento → Resolvido → Fechado, com Reaberto voltando pra
// Atribuído). Só os eventos pedidos entram aqui — 'sla_recalculado' e
// 'tempo_trabalhado' continuam fora da timeline (auditoria técnica
// demais pro que se pediu mostrar aqui).
const STATUS_EVENT_LABELS = {
  em_atendimento: 'Atendimento iniciado',
  aguardando_solicitante: 'Aguardando o solicitante',
  resolvido: 'Chamado resolvido',
  fechado: 'Chamado fechado',
  reaberto: 'Chamado reaberto',
  cancelado: 'Chamado cancelado',
  atribuido: 'Atendimento retomado',
}

function historicoEntry(h) {
  if (h.evento === 'triagem') {
    return { type: 'historico', id: h.id, date: h.created_at, title: 'Triagem concluída', color: '#d97706' }
  }
  if (h.evento === 'atribuicao') {
    return { type: 'historico', id: h.id, date: h.created_at, title: 'Chamado atribuído', color: '#7c3aed' }
  }
  if (h.evento === 'status_alterado') {
    const title = STATUS_EVENT_LABELS[h.valor_novo?.status]
    if (!title) return null
    return { type: 'historico', id: h.id, date: h.created_at, title, color: '#059669' }
  }
  return null
}

/**
 * Monta a timeline. Pro solicitante, `comments` nunca traz uma linha com
 * interno=true (RLS de ti_chamado_comentarios já filtra antes de chegar
 * aqui) — então os ramos `c.interno` abaixo simplesmente nunca disparam
 * pra ele, sem precisar de nenhum `if (isTiStaff)` explícito nesta função.
 *
 * `historico` só é passado pra quem tem permissão de TI (ver load() mais
 * abaixo — RLS de ti_chamado_historico já devolveria vazio pro
 * solicitante mesmo que a gente tentasse). Quando presente, substitui os
 * eventos derivados de resolved_at/closed_at por uma linha do tempo
 * completa (triagem, atribuição, início de atendimento, resolução,
 * fechamento, reabertura) — pro solicitante, mantém exatamente o
 * comportamento da Sprint 4.2 (só resolved_at/closed_at).
 */
function buildTimeline({ ticket, comments, ownProfileId, historico, authorNames = new Map() }) {
  const entries = []

  entries.push({
    type: 'criado',
    date: ticket.created_at,
    title: 'Chamado criado',
    color: '#2563eb',
  })

  for (const c of comments) {
    entries.push({
      type: 'comentario',
      id: c.id,
      date: c.created_at,
      title: commentTitle(c, ticket, ownProfileId),
      description: c.mensagem,
      interno: c.interno,
      // Nome real do autor, só pra notas internas (pedido explícito da
      // revisão de UX) — nunca e-mail/ID. "um membro da equipe de TI" é o
      // fallback honesto quando o nome não pôde ser resolvido (ver
      // getProfileNamesById no service: RLS de user_profiles só libera a
      // própria linha, então nem todo autor_profile_id necessariamente
      // resolve pra um nome pelas fontes disponíveis sem RPC nova).
      autorNome: c.interno ? (authorNames.get(c.autor_profile_id) || 'um membro da equipe de TI') : undefined,
      color: c.interno ? '#d97706' : '#7c3aed',
    })
  }

  if (historico && historico.length > 0) {
    for (const h of historico) {
      const entry = historicoEntry(h)
      if (entry) entries.push(entry)
    }
  } else {
    if (ticket.resolved_at) {
      entries.push({ type: 'resolvido', date: ticket.resolved_at, title: 'Chamado resolvido', color: '#059669' })
    }
    if (ticket.closed_at) {
      entries.push({ type: 'fechado', date: ticket.closed_at, title: 'Chamado encerrado', color: '#059669' })
    }
  }

  return entries.sort((a, b) => new Date(a.date) - new Date(b.date))
}

export function TicketDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // "?from=central"/"?from=solicitacoes": CentralAtendimentoView e
  // SolicitacoesView (TicketsDashboard.jsx) já linkam pra cá com a origem
  // certa — "Voltar" restaura exatamente de onde o usuário veio, em vez de
  // cair sempre na view padrão de /ti (que pra um agente de TI seria a
  // Central, mesmo vindo de "Minhas solicitações").
  const from = searchParams.get('from')
  const backTo = from === 'central' ? '/ti?view=central' : from === 'solicitacoes' ? '/ti?view=solicitacoes' : '/ti'
  const { profile } = useProfileContext()
  const { can, canAny, loading: permsLoading } = usePermissions()
  const { show: showToast, ToastEl } = useToast()

  const [ticket, setTicket] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Enquanto as permissões ainda carregam, não decide qual fetch fazer —
  // evita buscar/exibir dados operacionais antes de confirmar que o
  // usuário realmente tem alguma permissão de TI.
  const isTiStaff = !permsLoading && canAny(TI_STAFF_PERMISSIONS)

  const load = useCallback(async () => {
    if (permsLoading) return
    setLoading(true)
    setError('')
    try {
      const [ticketData, comments, historico] = await Promise.all([
        isTiStaff ? ticketsService.getTicketOperational(id) : ticketsService.getTicket(id),
        ticketsService.getComments(id),
        isTiStaff ? ticketsService.getHistorico(id) : Promise.resolve(null),
      ])

      // Nomes de autores de NOTA INTERNA (nunca de comentário público —
      // fora do escopo pedido), em ordem de resolução: (1) o próprio
      // usuário logado; (2) solicitante/responsável já carregados
      // (getTicketOperational já resolveu isso via ti_fila_atendimento,
      // sem consulta extra); (3) membros ativos da equipe do chamado, via
      // ti_listar_membros_equipe — mesma RPC já usada pelo seletor de
      // "Atribuir responsável", reaproveitada aqui só pra rotular autoria,
      // uma única chamada por carregamento. Quem não resolver por nenhuma
      // das três (ex.: admin global que comentou sem nunca ter sido
      // membro da equipe atual, ou chamado ainda sem equipe) cai no
      // fallback genérico dentro de buildTimeline.
      let authorNames = new Map()
      if (isTiStaff) {
        authorNames = new Map([
          ...(profile?.id ? [[profile.id, profile.nome]] : []),
          ...(ticketData.solicitante_profile_id
            ? [[ticketData.solicitante_profile_id, ticketData.solicitante_nome]] : []),
          ...(ticketData.responsavel_profile_id
            ? [[ticketData.responsavel_profile_id, ticketData.responsavel_nome]] : []),
        ])

        // Fail-safe: equipe_id nulo (chamado ainda não triado) só pula a
        // chamada; falha da RPC nunca impede o detalhe de abrir — loga um
        // aviso genérico (sem dado sensível) e segue com o fallback.
        if (ticketData.equipe_id) {
          try {
            const membros = await ticketsService.getTeamMembers(ticketData.equipe_id)
            for (const m of membros) authorNames.set(m.profile_id, m.nome)
          } catch (err) {
            console.warn('Não foi possível carregar os membros da equipe para resolver nomes de notas internas.')
          }
        }
      }

      setTicket(ticketData)
      setTimeline(buildTimeline({ ticket: ticketData, comments, ownProfileId: profile?.id, historico, authorNames }))
    } catch (err) {
      setError(err.message || 'Erro ao carregar o chamado.')
    } finally {
      setLoading(false)
    }
  }, [id, profile?.id, isTiStaff, permsLoading])

  useEffect(() => { load() }, [load])

  const handleComment = async (mensagem) => {
    await ticketsService.addComment(id, mensagem)
    showToast('Resposta enviada.')
    await load()
  }

  const handleInternalComment = async (mensagem) => {
    await ticketsService.addInternalComment(id, mensagem)
    showToast('Nota interna registrada.')
    await load()
  }

  if (permsLoading || loading) return <LoadingScreen />
  if (error) return <div style={{ padding: 24, color: '#ef4444' }}>{error}</div>
  if (!ticket) return null

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 16px 48px' }}>
      {ToastEl}

      <button
        onClick={() => navigate(backTo)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', marginBottom: 12, padding: 0 }}
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{ticket.codigo_chamado}</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '2px 0 0' }}>{ticket.titulo}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <TicketStatusBadge
              status={ticket.status}
              variant={isTiStaff ? 'operacional' : 'solicitante'}
              overrideLabel={
                isTiStaff && ticket.status === 'em_triagem' && ticket.equipe_id && !ticket.responsavel_profile_id
                  ? 'Aguardando atribuição'
                  : undefined
              }
            />
            {!isTiStaff && <TicketPriorityBadge prioridade={ticket.prioridade} />}
          </div>
        </div>

        <p style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap', margin: '16px 0' }}>{ticket.descricao}</p>

        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
          <span><strong>Categoria:</strong> {ticket.ti_categorias?.nome || '—'}</span>
          <span><strong>Aberto em:</strong> {formatDate(ticket.created_at)}</span>
        </div>
      </div>

      {isTiStaff && (
        <TicketOperationalDetails
          ticket={ticket}
          ownProfileId={profile?.id}
          canTriage={can(PERMISSIONS.TICKETS_TRIAGE)}
          canManage={canAny([PERMISSIONS.TICKETS_MANAGE_ALL, PERMISSIONS.TICKETS_MANAGE_TEAM])}
          canManageAll={can(PERMISSIONS.TICKETS_MANAGE_ALL)}
          onReload={load}
          showToast={showToast}
        />
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 0 }}>Atualizações</h2>
        <TicketTimeline entries={timeline} />
        <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 12, paddingTop: 12 }}>
          {isTiStaff
            ? (
              <TicketAgentCommentBox
                onSubmitPublic={handleComment}
                onSubmitInternal={handleInternalComment}
                isSolicitante={profile?.id === ticket.solicitante_profile_id}
              />
            )
            : <TicketCommentBox onSubmit={handleComment} />}
        </div>
      </div>
    </div>
  )
}
