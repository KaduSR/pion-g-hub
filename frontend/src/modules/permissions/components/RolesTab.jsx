import { useState, useEffect, useMemo } from 'react'
import { Lock, Check } from 'lucide-react'
import { permissionAdminService } from '../services/permissionAdminService'
import { invalidatePermissionsCache } from '../services/permissionService'
import { usePermissions } from '../contexts/PermissionsContext'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { Select, Button } from '../../../shared/components/FormField'
import { useToast } from '../../../shared/components/Toast'
import { PROTECTED_PERMISSION_CODES, ROLE_LABELS } from '../constants/adminUi'

/**
 * Etapa 6.2: checkboxes editáveis só pra quem tem `permissions.manage`.
 * Marcar/desmarcar só muda o estado LOCAL (`pendingCodes`) — nada é salvo
 * até clicar em Salvar, que chama `set_role_permission` uma vez por
 * permissão alterada, EM SEQUÊNCIA (nunca em paralelo — ver nota em
 * `handleSave`). Quem não tem `permissions.manage` continua vendo a aba
 * (protegida por `permissions.view` na página), só não pode editar.
 */
export function RolesTab() {
  const { can, refresh: refreshOwnPermissions } = usePermissions()
  const { profile } = useProfileContext()
  const canManage = can('permissions.manage')
  const { show: showToast, ToastEl } = useToast()

  const [roles, setRoles] = useState([])
  const [catalog, setCatalog] = useState([])
  const [selectedRole, setSelectedRole] = useState('')
  const [grantedCodes, setGrantedCodes] = useState(new Set())
  const [pendingCodes, setPendingCodes] = useState(new Set())
  const [loadingBase, setLoadingBase] = useState(true)
  const [loadingRole, setLoadingRole] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoadingBase(true)
    setError(null)
    Promise.all([permissionAdminService.getRoles(), permissionAdminService.getPermissionsCatalog()])
      .then(([rolesData, catalogData]) => {
        if (cancelled) return
        setRoles(rolesData)
        setCatalog(catalogData)
        setSelectedRole((prev) => prev || rolesData[0]?.code || '')
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoadingBase(false) })
    return () => { cancelled = true }
  }, [])

  const loadRolePermissions = (roleCode) => {
    setLoadingRole(true)
    return permissionAdminService.getRolePermissionCodes(roleCode)
      .then((codes) => {
        setGrantedCodes(codes)
        setPendingCodes(new Set(codes)) // reseta o rascunho pro estado oficial
        return codes
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingRole(false))
  }

  useEffect(() => {
    if (!selectedRole) return
    loadRolePermissions(selectedRole)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole])

  const toggleCode = (code) => {
    if (!canManage || saving) return
    setPendingCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const { added, removed } = useMemo(() => {
    const added = [...pendingCodes].filter((c) => !grantedCodes.has(c))
    const removed = [...grantedCodes].filter((c) => !pendingCodes.has(c))
    return { added, removed }
  }, [pendingCodes, grantedCodes])
  const dirty = added.length > 0 || removed.length > 0

  const handleCancel = () => setPendingCodes(new Set(grantedCodes))

  const handleSave = async () => {
    if (!dirty || saving) return

    const parts = []
    if (added.length) parts.push(`Conceder: ${added.join(', ')}`)
    if (removed.length) parts.push(`Remover: ${removed.join(', ')}`)
    const roleLabel = ROLE_LABELS[selectedRole] || selectedRole
    const confirmed = window.confirm(
      `Confirma estas alterações no papel "${roleLabel}"?\n\n${parts.join('\n')}`
    )
    if (!confirmed) return

    setSaving(true)
    // As RPCs são unitárias — aplica uma alteração de cada vez, em
    // SEQUÊNCIA (nunca Promise.all). Se uma falhar, para imediatamente,
    // recarrega o estado REAL do banco (pode conter as alterações
    // anteriores que já foram aplicadas com sucesso) e avisa claramente —
    // nunca finge que tudo foi salvo.
    const changes = [
      ...added.map((code) => ({ code, granted: true })),
      ...removed.map((code) => ({ code, granted: false })),
    ]
    let appliedCount = 0
    let failure = null
    for (const change of changes) {
      try {
        await permissionAdminService.setRolePermission(selectedRole, change.code, change.granted)
        appliedCount += 1
      } catch (err) {
        failure = { change, err }
        break
      }
    }

    await loadRolePermissions(selectedRole) // sempre recarrega o estado oficial, sucesso ou falha

    if (failure) {
      showToast(
        `Falha ao salvar "${failure.change.code}" (${appliedCount} de ${changes.length} alterações aplicadas antes da falha): ${failure.err.message}`,
        'error'
      )
    } else {
      showToast('Alterações do papel salvas com sucesso.')
    }

    // Invalida o cache do PermissionService — uma mudança de papel afeta
    // TODOS os usuários daquele papel, e não temos a lista de profileIds
    // deles aqui, então limpa o cache inteiro (é só em memória, local
    // desta aba do navegador — outras sessões conectadas não são
    // alcançadas por isto; ver nota de cache no checkpoint).
    invalidatePermissionsCache()
    // Se o papel alterado é o do próprio admin logado, atualiza a sessão
    // dele imediatamente (Sidebar, rotas) sem precisar recarregar a página.
    if (selectedRole === profile?.role) {
      refreshOwnPermissions()
    }

    setSaving(false)
  }

  if (loadingBase) {
    return <InlineLoading label="Carregando papéis e catálogo de permissões…" />
  }

  if (error) {
    return <InlineError message={error} />
  }

  if (roles.length === 0) {
    return <InlineEmpty message="Nenhum papel cadastrado." />
  }

  return (
    <div>
      {ToastEl}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
          <Select
            value={selectedRole}
            onChange={(e) => { if (!dirty || window.confirm('Descartar alterações não salvas neste papel?')) setSelectedRole(e.target.value) }}
            disabled={saving}
          >
            {roles.map((role) => (
              <option key={role.code} value={role.code}>
                {ROLE_LABELS[role.code] || role.nome}
              </option>
            ))}
          </Select>
        </div>

        {!canManage && (
          <span style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: 8 }}>
            Somente leitura — falta permissions.manage
          </span>
        )}

        {canManage && dirty && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button variant="secondary" size="sm" onClick={handleCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              Salvar {added.length + removed.length > 0 && `(${added.length + removed.length})`}
            </Button>
          </div>
        )}
      </div>

      {loadingRole ? (
        <InlineLoading label="Carregando permissões do papel…" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {catalog.map((group) => (
            <ResourceGroup
              key={group.resource}
              group={group}
              grantedCodes={grantedCodes}
              pendingCodes={pendingCodes}
              editable={canManage && !saving}
              onToggle={toggleCode}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ResourceGroup({ group, grantedCodes, pendingCodes, editable, onToggle }) {
  const grantedCount = group.permissions.filter((p) => pendingCodes.has(p.code)).length

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
      <div style={{
        padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {group.label}
        </span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          {grantedCount} de {group.permissions.length}
        </span>
      </div>

      <div>
        {group.permissions.map((perm) => {
          const pending = pendingCodes.has(perm.code)
          const changed = pending !== grantedCodes.has(perm.code)
          const protectedPerm = PROTECTED_PERMISSION_CODES.includes(perm.code)
          return (
            <div
              key={perm.code}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 18px', borderBottom: '1px solid #f8fafc',
                background: changed ? '#fffbeb' : 'transparent',
              }}
            >
              <PermissionCheckbox
                checked={pending}
                onClick={editable ? () => onToggle(perm.code) : undefined}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>
                  {perm.code}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{perm.description || '—'}</div>
              </div>
              {changed && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309' }}>
                  {pending ? '+ pendente' : '− pendente'}
                </span>
              )}
              {protectedPerm && <ProtectedBadge />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Checkbox de permissão — clicável quando `onClick` é passado, só visual quando não. */
export function PermissionCheckbox({ checked, onClick }) {
  const clickable = typeof onClick === 'function'
  return (
    <div
      onClick={onClick}
      title={checked ? 'Concedida' : 'Não concedida'}
      style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? '#1B3A6B' : '#fff',
        border: checked ? 'none' : '1.5px solid #cbd5e1',
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      {checked && <Check size={13} color="#fff" strokeWidth={3} />}
    </div>
  )
}

export function ProtectedBadge() {
  return (
    <span
      title="Permissão essencial do Centro de Permissões — alterá-la incorretamente pode bloquear o próprio acesso administrativo."
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        color: '#92400e', background: '#fef3c7', flexShrink: 0,
      }}
    >
      <Lock size={11} /> Protegida
    </span>
  )
}

export function InlineLoading({ label = 'Carregando…' }) {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
      <div className="spinner" style={{
        width: 28, height: 28, margin: '0 auto 12px',
        border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <p style={{ margin: 0, fontSize: 14 }}>{label}</p>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  )
}

export function InlineError({ message }) {
  return (
    <div style={{
      padding: 20, borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca',
      color: '#dc2626', fontSize: 14,
    }}>
      Não foi possível carregar os dados: {message}
    </div>
  )
}

export function InlineEmpty({ message }) {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
      {message}
    </div>
  )
}
