import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useTickets } from '../hooks/useTickets'
import { useServiceQueue } from '../hooks/useServiceQueue'
import { useCentralAtendimentoAccess } from '../hooks/useCentralAtendimentoAccess'
import { TicketStats } from '../components/TicketStats'
import { TicketFilters } from '../components/TicketFilters'
import { TicketCard } from '../components/TicketCard'
import { TicketStatusBadge, TicketPriorityBadge } from '../components/TicketStatusBadge'
import { TicketsViewTabs } from '../components/TicketsViewTabs'
import { ServiceQueueStats } from '../components/ServiceQueueStats'
import { ServiceQueueFilters } from '../components/ServiceQueueFilters'
import { ServiceQueue } from '../components/ServiceQueue'
import { Button } from '../../../shared/components/FormField'
import { LoadingScreen } from '../../../shared/components/LoadingScreen'
import { usePermissions } from '../../permissions/contexts/PermissionsContext'
import { PERMISSIONS } from '../../permissions/constants/permissions'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

/**
 * "Minhas solicitações" — exclusivamente os chamados que o próprio usuário
 * abriu como solicitante (RLS de ti_chamados, ramo view_own — filtra por
 * solicitante_profile_id = ti_perfil_ativo_id()). NUNCA mostra um chamado
 * só porque foi atribuído ao usuário como técnico — essa é a Central de
 * Atendimento, uma visão totalmente separada.
 */
function SolicitacoesView() {
  const navigate = useNavigate()
  const {
    tickets, stats, loading, error,
    filter, setFilter, search, setSearch, sort, setSort,
  } = useTickets()

  return (
    <>
      <style>{`
        .ti-table-wrap { display: block; overflow-x: auto; }
        .ti-cards-wrap { display: none; }
        .ti-fab { display: none; }
        @media (max-width: 720px) {
          .ti-table-wrap { display: none; }
          .ti-cards-wrap { display: flex; flex-direction: column; gap: 10px; }
          .ti-fab { display: flex; }
          .ti-header-button { display: none; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div className="ti-header-button">
          <Button onClick={() => navigate('/ti/novo')}>
            <Plus size={16} /> Novo Chamado
          </Button>
        </div>
      </div>

      <TicketStats stats={stats} />

      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '24px 0 12px' }}>Minhas solicitações</h2>

      <TicketFilters
        filter={filter} onFilterChange={setFilter}
        search={search} onSearchChange={setSearch}
        sort={sort} onSortChange={setSort}
      />

      {loading && <p style={{ color: '#94a3b8' }}>Carregando...</p>}
      {error && <p style={{ color: '#ef4444' }}>Erro ao carregar chamados: {error}</p>}

      {!loading && !error && tickets.length === 0 && (
        <p style={{ color: '#94a3b8' }}>Nenhum chamado encontrado.</p>
      )}

      {!loading && !error && tickets.length > 0 && (
        <>
          <div className="ti-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  {['Número', 'Título', 'Categoria', 'Status', 'Prioridade', 'Data', 'Última atualização'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/ti/${t.id}?from=solicitacoes`)}
                    style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#1B3A6B' }}>{t.codigo_chamado}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#0f172a' }}>{t.titulo}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748b' }}>{t.ti_categorias?.nome || '—'}</td>
                    <td style={{ padding: '10px 14px' }}><TicketStatusBadge status={t.status} /></td>
                    <td style={{ padding: '10px 14px' }}><TicketPriorityBadge prioridade={t.prioridade} /></td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748b' }}>{formatDate(t.created_at)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748b' }}>{formatDate(t.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ti-cards-wrap">
            {tickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
          </div>
        </>
      )}

      <button
        className="ti-fab"
        onClick={() => navigate('/ti/novo')}
        style={{
          position: 'fixed', right: 16, bottom: 16,
          width: 56, height: 56, borderRadius: 28,
          background: '#1B3A6B', color: '#fff', border: 'none',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(27,58,107,0.35)', cursor: 'pointer', zIndex: 10,
        }}
        aria-label="Novo Chamado"
      >
        <Plus size={24} />
      </button>
    </>
  )
}

/**
 * Central de Atendimento — fila operacional via ti_fila_atendimento.
 * Sempre monta do zero ao voltar de /ti/:id (troca de rota desmonta/
 * remonta este componente), então triagem/atribuição/mudança de status
 * feitas no detalhe já aparecem atualizadas aqui sem precisar de um
 * mecanismo de refresh manual.
 */
function CentralAtendimentoView() {
  const navigate = useNavigate()
  const { items, loading, error, filters, setFilters, page, setPage, hasMore } = useServiceQueue()

  // "?from=central" permite ao detalhe (TicketDetails.jsx) voltar pra
  // Central de Atendimento em vez de cair sempre na view padrão de /ti.
  const handleOpen = (id) => navigate(`/ti/${id}?from=central`)

  return (
    <>
      <ServiceQueueStats />
      <ServiceQueueFilters filters={filters} onChange={setFilters} />
      <ServiceQueue
        items={items} loading={loading} error={error}
        page={page} setPage={setPage} hasMore={hasMore}
        onOpen={handleOpen}
      />
    </>
  )
}

export function TicketsDashboard() {
  const { canAny, loading: permsLoading } = usePermissions()
  const centralAccess = useCentralAtendimentoAccess()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState(null)

  const showSolicitacoes = !permsLoading && canAny([PERMISSIONS.TICKETS_VIEW_OWN, PERMISSIONS.TICKETS_CREATE])
  const showCentral = !centralAccess.loading && centralAccess.hasAccess

  // Só decide a view depois que TUDO relevante carregar — permissões,
  // perfil (usado por useCentralAtendimentoAccess) e a checagem de vínculo
  // de equipe — evita renderizar qualquer uma das duas visões (e disparar
  // suas queries) antes de confirmar a que o usuário tem direito, e evita
  // "piscar" pra visão errada por um instante.
  //
  // Prioridade do padrão: quem tem acesso à Central (agente de TI/admin
  // autorizado) sempre abre nela — é a tela principal de quem trabalha na
  // TI, mesmo que também possa abrir chamados como solicitante. Quem não
  // tem acesso à Central cai em "Minhas solicitações", o único lugar que
  // pode ver. Lê "?view=" da URL (moduleRegistry.js e os links "Voltar" já
  // usam o parâmetro certo), mas nunca confia cegamente nele: "central" só
  // é aceito se showCentral for verdadeiro, senão cai pra "solicitacoes" —
  // corrige a própria URL via replace, sem loop de redirecionamento e sem
  // tela branca.
  const loading = permsLoading || centralAccess.loading

  useEffect(() => {
    if (loading) return
    const requested = searchParams.get('view')
    const resolved = requested === 'central' && showCentral
      ? 'central'
      : requested === 'solicitacoes' && showSolicitacoes
        ? 'solicitacoes'
        : (showCentral ? 'central' : 'solicitacoes')

    if (resolved !== view) setView(resolved)
    if (requested !== resolved) {
      const next = new URLSearchParams(searchParams)
      next.set('view', resolved)
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, showSolicitacoes, showCentral, searchParams.get('view')])

  const handleViewChange = (nextView) => {
    setView(nextView)
    const next = new URLSearchParams(searchParams)
    next.set('view', nextView)
    setSearchParams(next)
  }

  if (loading || view === null) return <LoadingScreen />

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px 96px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Chamados TI</h1>

      <TicketsViewTabs view={view} onChange={handleViewChange} showSolicitacoes={showSolicitacoes} showCentral={showCentral} />

      {view === 'central' && showCentral ? <CentralAtendimentoView /> : <SolicitacoesView />}
    </div>
  )
}
