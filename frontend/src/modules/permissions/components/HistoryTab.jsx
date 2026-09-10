import { useState, useEffect } from 'react'
import { permissionAdminService } from '../services/permissionAdminService'
import { Select, Input, Button } from '../../../shared/components/FormField'
import { Badge } from '../../../shared/components/Badge'
import { ROLE_LABELS } from '../constants/adminUi'
import { InlineLoading, InlineError, InlineEmpty } from './RolesTab'

const ACTION_STYLE = {
  grant: { label: 'Concedeu', color: '#065f46', bg: '#d1fae5' },
  revoke: { label: 'Revogou', color: '#991b1b', bg: '#fee2e2' },
  inherit: { label: 'Restaurou herança', color: '#3730a3', bg: '#e0e7ff' },
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Só leitura (o histórico em si nunca é editado, só consultado). Filtros
 * limitados aos campos reais de permission_change_log (target_type/
 * target_id, created_at) — não inventa nada além disso. Desde a Etapa 6.2,
 * as 4 RPCs de gravação (set_role_permission, set_user_permission_grant/
 * revoke, clear_user_permission_override) alimentam esta tabela na mesma
 * transação — "Filtrar" aqui é a forma de ver o registro mais recente
 * depois de salvar em Perfis de acesso ou Usuários (troca de aba já
 * recarrega sozinha, já que o componente é desmontado/remontado).
 */
export function HistoryTab() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [filters, setFilters] = useState({ profileId: '', roleCode: '', from: '', to: '' })
  const [entries, setEntries] = useState(null)
  const [loadingBase, setLoadingBase] = useState(true)
  const [loadingLog, setLoadingLog] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([permissionAdminService.getActiveUsers(), permissionAdminService.getRoles()])
      .then(([usersData, rolesData]) => {
        if (cancelled) return
        setUsers(usersData)
        setRoles(rolesData)
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoadingBase(false) })
    return () => { cancelled = true }
  }, [])

  const loadLog = () => {
    setLoadingLog(true)
    setError(null)
    permissionAdminService.getChangeLog({
      profileId: filters.profileId || undefined,
      roleCode: filters.roleCode || undefined,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to).toISOString() : undefined,
    })
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingLog(false))
  }

  useEffect(() => {
    if (!loadingBase) loadLog()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingBase])

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  if (loadingBase) return <InlineLoading label="Carregando filtros do histórico…" />

  return (
    <div>
      {/* ── Filtros ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
        background: '#fff', padding: 16, borderRadius: 14, border: '1px solid #f1f5f9', marginBottom: 20,
      }}>
        <Select value={filters.profileId} onChange={setFilter('profileId')}>
          <option value="">Todos os usuários</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.nome || u.email}</option>)}
        </Select>

        <Select value={filters.roleCode} onChange={setFilter('roleCode')}>
          <option value="">Todos os papéis</option>
          {roles.map((r) => <option key={r.code} value={r.code}>{ROLE_LABELS[r.code] || r.nome}</option>)}
        </Select>

        <Input type="date" value={filters.from} onChange={setFilter('from')} title="De" />
        <Input type="date" value={filters.to} onChange={setFilter('to')} title="Até" />

        <Button variant="secondary" onClick={loadLog} disabled={loadingLog}>
          {loadingLog ? 'Filtrando…' : 'Filtrar'}
        </Button>
      </div>

      {/* ── Nota: só um dos dois filtros (usuário/papel) tem efeito por  */}
      {/*    vez — target_type é 'user' OU 'role' em cada linha do log.  */}
      {filters.profileId && filters.roleCode && (
        <div style={{ marginBottom: 16, fontSize: 12, color: '#92400e', background: '#fef3c7', padding: '8px 14px', borderRadius: 8 }}>
          O histórico registra alterações de usuário OU de papel por vez — com os dois filtros ativos, nenhum resultado bate nos dois ao mesmo tempo.
        </div>
      )}

      {error ? (
        <InlineError message={error} />
      ) : loadingLog ? (
        <InlineLoading label="Carregando histórico…" />
      ) : !entries || entries.length === 0 ? (
        <InlineEmpty message="Nenhuma alteração registrada ainda. O histórico é preenchido a partir da Etapa 6.2 (gravação), quando concessões/revogações passarem a ser feitas por esta tela." />
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  {['Responsável', 'Alvo', 'Permissão', 'Ação', 'Data e hora'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const actionStyle = ACTION_STYLE[entry.action] || { label: entry.action, color: '#475569', bg: '#f1f5f9' }
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>
                        {entry.actor ? (entry.actor.nome || entry.actor.email) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>
                        {entry.targetLabel} <span style={{ color: '#94a3b8' }}>({entry.target_type === 'user' ? 'usuário' : 'papel'})</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#0f172a' }}>
                        {entry.permissions?.code || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge color={actionStyle.color} bg={actionStyle.bg}>{actionStyle.label}</Badge>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDateTime(entry.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
