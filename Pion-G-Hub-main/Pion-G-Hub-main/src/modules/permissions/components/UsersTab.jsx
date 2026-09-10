import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { permissionAdminService } from '../services/permissionAdminService'
import { invalidatePermissionsCache } from '../services/permissionService'
import { usePermissions } from '../contexts/PermissionsContext'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { Input, Button } from '../../../shared/components/FormField'
import { Badge } from '../../../shared/components/Badge'
import { useToast } from '../../../shared/components/Toast'
import { ROLE_LABELS, PROTECTED_PERMISSION_CODES } from '../constants/adminUi'
import { PermissionCheckbox, ProtectedBadge, InlineLoading, InlineError, InlineEmpty } from './RolesTab'

const ORIGIN_STYLE = {
  herdada:  { label: 'Herdada',  color: '#3730a3', bg: '#e0e7ff' },
  concedida: { label: 'Concedida', color: '#065f46', bg: '#d1fae5' },
  revogada: { label: 'Revogada', color: '#991b1b', bg: '#fee2e2' },
}

const OVERRIDE_OPTIONS = [
  { key: 'inherit', label: 'Herdar', color: '#3730a3', bg: '#e0e7ff' },
  { key: 'grant', label: 'Conceder', color: '#065f46', bg: '#d1fae5' },
  { key: 'revoke', label: 'Revogar', color: '#991b1b', bg: '#fee2e2' },
]

/**
 * Etapa 6.2: busca usuário ativo, mostra o papel atual, as permissões
 * herdadas do papel, e permite escolher — por permissão — Herdar/Conceder/
 * Revogar. A escolha só existe localmente (`pendingOverrides`) até
 * confirmar Salvar, que chama uma RPC por permissão alterada, em
 * SEQUÊNCIA: `clear_user_permission_override` (Herdar),
 * `set_user_permission_grant` (Conceder) ou `set_user_permission_revoke`
 * (Revogar). Quem não tem `permissions.manage` só visualiza.
 */
export function UsersTab() {
  const { can, refresh: refreshOwnPermissions } = usePermissions()
  const { profile } = useProfileContext()
  const canManage = can('permissions.manage')
  const { show: showToast, ToastEl } = useToast()

  const [users, setUsers] = useState([])
  const [catalog, setCatalog] = useState([])
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [loadingBase, setLoadingBase] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [detailError, setDetailError] = useState(null)
  const [roleCodes, setRoleCodes] = useState(new Set())
  const [overrides, setOverrides] = useState({ grants: [], revokes: [] })
  const [pendingOverrides, setPendingOverrides] = useState(new Map())

  useEffect(() => {
    let cancelled = false
    setLoadingBase(true)
    setError(null)
    Promise.all([permissionAdminService.getActiveUsers(), permissionAdminService.getPermissionsCatalog()])
      .then(([usersData, catalogData]) => {
        if (cancelled) return
        setUsers(usersData)
        setCatalog(catalogData)
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoadingBase(false) })
    return () => { cancelled = true }
  }, [])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter((u) =>
      u.nome?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
    )
  }, [users, search])

  const selectedUser = users.find((u) => u.id === selectedUserId) || null

  // Estado ORIGINAL (do banco) de cada permissão, pro usuário selecionado:
  // 'grant' | 'revoke' | 'inherit'. `pendingOverrides` parte daqui e diverge
  // conforme o admin mexe nos seletores.
  const originalOverrideByCode = useMemo(() => {
    const map = new Map()
    overrides.grants.forEach((g) => map.set(g.code, 'grant'))
    overrides.revokes.forEach((r) => map.set(r.code, 'revoke'))
    return map
  }, [overrides])

  const loadUserDetail = (user) => {
    setLoadingDetail(true)
    setDetailError(null)
    return Promise.all([
      permissionAdminService.getRolePermissionCodes(user.role),
      permissionAdminService.getUserOverrides(user.id),
    ])
      .then(([codes, ov]) => {
        setRoleCodes(codes)
        setOverrides(ov)
        const map = new Map()
        ov.grants.forEach((g) => map.set(g.code, 'grant'))
        ov.revokes.forEach((r) => map.set(r.code, 'revoke'))
        setPendingOverrides(map) // reseta o rascunho pro estado oficial
      })
      .catch((err) => setDetailError(err.message))
      .finally(() => setLoadingDetail(false))
  }

  useEffect(() => {
    if (!selectedUser) return
    loadUserDetail(selectedUser)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id])

  const setOverride = (code, value) => {
    if (!canManage || saving) return
    setPendingOverrides((prev) => {
      const next = new Map(prev)
      if (value === 'inherit') next.delete(code) // "herdar" = sem override, mesma representação do estado original sem entrada
      else next.set(code, value)
      return next
    })
  }

  const changes = useMemo(() => {
    const allCodes = new Set([...originalOverrideByCode.keys(), ...pendingOverrides.keys()])
    const result = []
    for (const code of allCodes) {
      const before = originalOverrideByCode.get(code) || 'inherit'
      const after = pendingOverrides.get(code) || 'inherit'
      if (before !== after) result.push({ code, before, after })
    }
    return result
  }, [originalOverrideByCode, pendingOverrides])
  const dirty = changes.length > 0

  const handleCancel = () => setPendingOverrides(new Map(originalOverrideByCode))

  const handleSave = async () => {
    if (!dirty || saving || !selectedUser) return

    const labelOf = (state) => OVERRIDE_OPTIONS.find((o) => o.key === state)?.label || state
    const summary = changes.map((c) => `${c.code}: ${labelOf(c.before)} → ${labelOf(c.after)}`).join('\n')
    const confirmed = window.confirm(
      `Confirma estas alterações para ${selectedUser.nome || selectedUser.email}?\n\n${summary}`
    )
    if (!confirmed) return

    setSaving(true)
    let appliedCount = 0
    let failure = null
    for (const change of changes) {
      try {
        if (change.after === 'inherit') {
          await permissionAdminService.clearUserPermissionOverride(selectedUser.id, change.code)
        } else if (change.after === 'grant') {
          await permissionAdminService.setUserPermissionGrant(selectedUser.id, change.code)
        } else if (change.after === 'revoke') {
          await permissionAdminService.setUserPermissionRevoke(selectedUser.id, change.code)
        }
        appliedCount += 1
      } catch (err) {
        failure = { change, err }
        break
      }
    }

    await loadUserDetail(selectedUser) // sempre recarrega o estado oficial, sucesso ou falha

    if (failure) {
      showToast(
        `Falha ao salvar "${failure.change.code}" (${appliedCount} de ${changes.length} alterações aplicadas antes da falha): ${failure.err.message}`,
        'error'
      )
    } else {
      showToast('Alterações do usuário salvas com sucesso.')
    }

    // Invalidação de cache direcionada — sabemos exatamente qual usuário
    // (profileId + role) foi afetado.
    invalidatePermissionsCache(selectedUser.id, selectedUser.role)
    // Se o usuário alterado é o próprio admin logado, atualiza a sessão
    // dele imediatamente.
    if (selectedUser.id === profile?.id) {
      refreshOwnPermissions()
    }

    setSaving(false)
  }

  if (loadingBase) return <InlineLoading label="Carregando usuários…" />
  if (error) return <InlineError message={error} />

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {ToastEl}

      {/* ── Lista de usuários ─────────────────────────────────────────── */}
      <div style={{ width: 300, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 26, top: 26, color: '#94a3b8' }} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            style={{ paddingLeft: 34 }}
          />
        </div>

        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {filteredUsers.length === 0 ? (
            <InlineEmpty message="Nenhum usuário encontrado." />
          ) : (
            filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  if (dirty && !window.confirm('Descartar alterações não salvas deste usuário?')) return
                  setSelectedUserId(u.id)
                }}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                  borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                  background: selectedUserId === u.id ? '#eef2ff' : 'transparent',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.nome || '(sem nome)'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{u.email}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Detalhe do usuário selecionado ────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selectedUser ? (
          <InlineEmpty message="Selecione um usuário à esquerda para ver as permissões efetivas." />
        ) : loadingDetail ? (
          <InlineLoading label="Carregando permissões do usuário…" />
        ) : detailError ? (
          <InlineError message={detailError} />
        ) : (
          <UserDetail
            user={selectedUser}
            catalog={catalog}
            roleCodes={roleCodes}
            pendingOverrides={pendingOverrides}
            changes={changes}
            editable={canManage && !saving}
            saving={saving}
            dirty={dirty}
            canManage={canManage}
            onSetOverride={setOverride}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  )
}

function UserDetail({
  user, catalog, roleCodes, pendingOverrides, changes, editable, saving, dirty, canManage, onSetOverride, onSave, onCancel,
}) {
  const changedCodes = new Set(changes.map((c) => c.code))

  const rows = catalog.flatMap((g) => g.permissions).map((perm) => {
    const inRole = roleCodes.has(perm.code)
    const overrideState = pendingOverrides.get(perm.code) || 'inherit'
    const effective = overrideState === 'revoke' ? false : overrideState === 'grant' ? true : inRole
    const origin = overrideState === 'revoke' ? 'revogada' : overrideState === 'grant' ? 'concedida' : inRole ? 'herdada' : null
    return { ...perm, inRole, overrideState, effective, origin, pending: changedCodes.has(perm.code) }
  })

  const counts = {
    herdada: rows.filter((r) => r.origin === 'herdada').length,
    concedida: rows.filter((r) => r.origin === 'concedida').length,
    revogada: rows.filter((r) => r.origin === 'revogada').length,
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{user.nome || '(sem nome)'}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{user.email}</div>
        </div>
        <Badge color="#1e3a8a" bg="#dbeafe">{ROLE_LABELS[user.role] || user.role}</Badge>

        {!canManage && (
          <span style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: 8 }}>
            Somente leitura — falta permissions.manage
          </span>
        )}

        {canManage && dirty && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={onSave} loading={saving}>
              Salvar ({changes.length})
            </Button>
          </div>
        )}
      </div>

      {/* ── Resumo ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <SummaryCard label="Herdadas" count={counts.herdada} color="#3730a3" bg="#e0e7ff" />
        <SummaryCard label="Concedidas" count={counts.concedida} color="#065f46" bg="#d1fae5" />
        <SummaryCard label="Revogadas" count={counts.revogada} color="#991b1b" bg="#fee2e2" />
      </div>

      {/* ── Catálogo com Herdar/Conceder/Revogar por permissão ───────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {catalog.map((group) => (
          <div key={group.resource} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {group.label}
              </span>
            </div>
            <div>
              {group.permissions.map((perm) => {
                const row = rows.find((r) => r.code === perm.code)
                const protectedPerm = PROTECTED_PERMISSION_CODES.includes(perm.code)
                const style = row.origin ? ORIGIN_STYLE[row.origin] : null
                return (
                  <div key={perm.code} style={{
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    padding: '10px 18px', borderBottom: '1px solid #f8fafc',
                    background: row.pending ? '#fffbeb' : 'transparent',
                  }}>
                    <PermissionCheckbox checked={row.effective} />
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{perm.code}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {perm.description || '—'}
                        <span style={{ color: '#94a3b8' }}> · Papel {row.inRole ? 'concede' : 'não concede'}</span>
                      </div>
                    </div>

                    {editable ? (
                      <OverrideSelector value={row.overrideState} onChange={(v) => onSetOverride(perm.code, v)} />
                    ) : (
                      style && <Badge color={style.color} bg={style.bg}>{style.label}</Badge>
                    )}

                    {row.pending && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309' }}>pendente</span>
                    )}
                    {protectedPerm && <ProtectedBadge />}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OverrideSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {OVERRIDE_OPTIONS.map((opt) => {
        const active = value === opt.key
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: active ? 'none' : '1px solid #e2e8f0',
              background: active ? opt.bg : '#fff',
              color: active ? opt.color : '#64748b',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function SummaryCard({ label, count, color, bg }) {
  return (
    <div style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: bg }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'Space Grotesk, sans-serif' }}>{count}</div>
      <div style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</div>
    </div>
  )
}
