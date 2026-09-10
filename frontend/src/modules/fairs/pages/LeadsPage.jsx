import React, { useState, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, Trash2, Download } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useLeads } from '../hooks/useLeads'
import { useFairsContext } from '../contexts/FairsContext'
import { leadsService } from '../services/leadsService'
import { useAuth } from '../../auth/hooks/useAuth'
// Etapa 5, Bloco 2: migrado do mapa estático para o contexto central
// (PermissionsProvider em App.jsx) — mesma API (can), import diferente.
// Únicas permissões lidas nesta página: LEADS_VIEW_ALL/VIEW_TEAM/VIEW_OWN
// (ordem de precedência abaixo). LEADS_MANAGE_* não são checadas aqui —
// criar/editar/excluir não têm gate nenhum na UI, dependem só do RLS de
// leads_feira. Ver achado de RLS no checkpoint da Etapa 5, Bloco 2.
import { usePermissions } from '../../permissions/contexts/PermissionsContext'
import { PERMISSIONS } from '../../permissions/constants/permissions'
import { Badge } from '../../../shared/components/Badge'
import { Button, Input, Select } from '../../../shared/components/FormField'
import { Modal } from '../../../shared/components/Modal'
import { useToast } from '../../../shared/components/Toast'
import { formatDate, truncate } from '../../../shared/utils/helpers'
import { exportLeadsToXlsx } from '../../../shared/utils/exportLeadsToXlsx'
import {
  SEGMENTOS, TEMPERATURAS, TEMPERATURA_CONFIG, STATUS_LEAD_CONFIG,
} from '../../../shared/utils/constants'

const PAGE_SIZE = 20

export function LeadsPage() {
  const [searchParams] = useSearchParams()
  const { allFairs }   = useFairsContext()
  const { user }       = useAuth()
  const { can }        = usePermissions()
  const { show: showToast, ToastEl } = useToast()

  // Determina o modo de visibilidade do usuário atual.
  // Ordem de precedência: view_all → view_team → view_own
  const isViewAll  = can(PERMISSIONS.LEADS_VIEW_ALL)
  const isViewTeam = !isViewAll && can(PERMISSIONS.LEADS_VIEW_TEAM)
  const isViewOwn  = !isViewAll && !isViewTeam && can(PERMISSIONS.LEADS_VIEW_OWN)

  // Título e subtítulo da página variam conforme o modo de visibilidade
  const pageTitle    = isViewOwn ? 'Meus Leads' : 'Gestão de Leads'
  const pageSubtitle = isViewOwn
    ? 'Leads cadastrados por você'
    : isViewTeam
      ? 'Leads da sua equipe'   // gestor — sem filtro real nesta sprint
      : 'Todos os leads'

  const [filters, setFilters] = useState({
    fairId:      searchParams.get('feira') || '',
    segmento:    '',
    vendedor:    '',
    temperatura: '',
    search:      '',
    // Vendedor: filtra automaticamente pelos próprios leads via created_by
    // Gestor/Admin/Marketing: sem filtro por created_by
    createdBy:   isViewOwn ? user?.id : undefined,
    page:        1,
    pageSize:    PAGE_SIZE,
  })

  const { leads, loading, total, totalPages, reload, removeLead } = useLeads(filters)
  const [deleting, setDeleting] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [confirmingExport, setConfirmingExport] = useState(false)
  const selectedFairName = allFairs.find((f) => f.id === filters.fairId)?.nome || ''

  const setFilter = (key) => (e) =>
    setFilters((f) => ({ ...f, [key]: e.target.value, page: 1 }))

  const setPage = (p) => setFilters((f) => ({ ...f, page: p }))

  // Aplica filtro de feira vindo de query string (?feira=uuid)
  useEffect(() => {
    const feira = searchParams.get('feira')
    if (feira) setFilters((f) => ({ ...f, fairId: feira, page: 1 }))
  }, [])

  const handleDelete = async (lead) => {
    if (!confirm(`Excluir o lead "${lead.nome}"?`)) return
    setDeleting(lead.id)
    try {
      await removeLead(lead.id)
      showToast('Lead removido.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setDeleting(null)
    }
  }

  const handleStatusChange = async (lead, newStatus) => {
    try {
      await leadsService.update(lead.id, { status: newStatus })
      reload()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  // Exporta TODOS os leads da feira selecionada, respeitando a RLS da
  // sessão atual — não os filtros ativos da tela (busca/segmento/
  // temperatura/vendedor/página), nem o array paginado já em memória.
  // Reaproveitar `leads` (só a página atual) truncaria o arquivo em
  // feiras com mais de PAGE_SIZE registros. Chamada só a partir da
  // confirmação do modal (handleConfirmExport), nunca direto do clique
  // no botão "Exportar dados".
  const handleExport = async () => {
    if (!filters.fairId || exporting) return
    setExporting(true)
    try {
      const rows = await leadsService.getAllByFairForExport(filters.fairId)
      if (rows.length === 0) {
        showToast('Nenhum lead disponível para exportar nesta feira.', 'error')
        return
      }
      await exportLeadsToXlsx({ leads: rows, fairName: selectedFairName })
      showToast(`${rows.length} lead${rows.length !== 1 ? 's' : ''} exportado${rows.length !== 1 ? 's' : ''} com sucesso.`)
    } catch (e) {
      showToast(e.message || 'Erro ao exportar leads.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleConfirmExport = () => {
    setConfirmingExport(false)
    handleExport()
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      {ToastEl}

      {/* ── Cabeçalho ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin: 0, fontSize: 26, fontWeight: 700,
          color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif',
        }}>
          {pageTitle}
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          {total} lead{total !== 1 ? 's' : ''} {pageSubtitle.toLowerCase()}
        </p>
      </div>

      {/* ── Exportar ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button
          variant="secondary" size="sm"
          disabled={!filters.fairId || exporting}
          loading={exporting}
          onClick={() => setConfirmingExport(true)}
          title={filters.fairId ? 'Exportar todos os leads desta feira' : 'Selecione uma feira para exportar'}
        >
          <Download size={14} /> Exportar dados
        </Button>
      </div>

      <Modal isOpen={confirmingExport} onClose={() => setConfirmingExport(false)} title="Exportar leads?" width={420}>
        <p style={{ margin: '0 0 20px', color: '#374151', fontSize: 14, lineHeight: 1.5 }}>
          Deseja exportar todos os leads da feira "{selectedFairName}" que você tem permissão para visualizar?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={() => setConfirmingExport(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirmExport}>
            Sim, exportar
          </Button>
        </div>
      </Modal>

      {/* ── Filtros ────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: 20,
        border: '1px solid #f1f5f9', marginBottom: 20,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
      }}>
        <div style={{ position: 'relative', gridColumn: 'span 2' }}>
          <Search size={16} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: '#94a3b8',
          }} />
          <Input
            value={filters.search}
            onChange={setFilter('search')}
            placeholder="Pesquisar por nome, empresa, e-mail…"
            style={{ paddingLeft: 36 }}
          />
        </div>

        <Select value={filters.fairId} onChange={setFilter('fairId')}>
          <option value="">Todas as feiras</option>
          {allFairs.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </Select>

        <Select value={filters.segmento} onChange={setFilter('segmento')}>
          <option value="">Todos os segmentos</option>
          {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>

        <Select value={filters.temperatura} onChange={setFilter('temperatura')}>
          <option value="">Todas as temp.</option>
          {TEMPERATURAS.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>

        {/* Filtro por vendedor: oculto para vendedor (ele só vê os próprios) */}
        {!isViewOwn && (
          <Input
            value={filters.vendedor}
            onChange={setFilter('vendedor')}
            placeholder="Filtrar por vendedor…"
          />
        )}
      </div>

      {/* ── Tabela ─────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 14,
        border: '1px solid #f1f5f9', overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['Nome', 'Empresa', 'Telefone', 'E-mail', 'Feira', 'Vendedor', 'Temp.', 'Status', 'Data', ''].map((h) => (
                  <th key={h} style={{
                    padding: '12px 14px', textAlign: 'left', fontSize: 11,
                    fontWeight: 700, color: '#64748b', letterSpacing: '0.05em',
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    Carregando…
                  </td>
                </tr>
              )}

              {!loading && leads.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                    {isViewOwn
                      ? 'Você ainda não cadastrou nenhum lead.'
                      : 'Nenhum lead encontrado.'}
                  </td>
                </tr>
              )}

              {!loading && leads.map((lead, i) => {
                const tempCfg   = TEMPERATURA_CONFIG[lead.temperatura] ?? TEMPERATURA_CONFIG['Frio']
                const statusCfg = STATUS_LEAD_CONFIG[lead.status]      ?? STATUS_LEAD_CONFIG['Novo']
                return (
                  <tr
                    key={lead.id}
                    style={{
                      borderBottom: '1px solid #f8fafc',
                      background: i % 2 === 0 ? '#fff' : '#fafafa',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f9ff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa' }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                      {truncate(lead.nome, 24)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151' }}>
                      {truncate(lead.empresa, 22)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {lead.telefone || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {truncate(lead.email, 24)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151' }}>
                      {truncate(lead.feiras?.nome, 20)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {truncate(lead.vendedor, 18)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Badge color={tempCfg.color} bg={tempCfg.bg}>
                        {lead.temperatura}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead, e.target.value)}
                        style={{
                          padding: '3px 8px', borderRadius: 8, border: 'none',
                          background: statusCfg.bg, color: statusCfg.color,
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {Object.keys(STATUS_LEAD_CONFIG).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {formatDate(lead.created_at?.slice(0, 10))}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Button
                        variant="danger" size="sm"
                        loading={deleting === lead.id}
                        onClick={() => handleDelete(lead)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Paginação ──────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#64748b', fontSize: 13 }}>
              Página {filters.page} de {totalPages} — {total} resultados
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="secondary" size="sm"
                disabled={filters.page <= 1}
                onClick={() => setPage(filters.page - 1)}
              >
                <ChevronLeft size={15} />
              </Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return (
                  <Button
                    key={p} size="sm"
                    variant={p === filters.page ? 'primary' : 'secondary'}
                    onClick={() => setPage(p)}
                    style={{ minWidth: 36 }}
                  >
                    {p}
                  </Button>
                )
              })}
              <Button
                variant="secondary" size="sm"
                disabled={filters.page >= totalPages}
                onClick={() => setPage(filters.page + 1)}
              >
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spinner {
          width: 28px; height: 28px;
          border: 3px solid #e2e8f0;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
