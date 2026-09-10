import { useMemo } from 'react'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { getPermissionsForRole } from '../constants/permissions'

/**
 * Hook central de permissões do frontend.
 *
 * Lê profile.role do ProfileContext e resolve a lista de permissões
 * via o mapa centralizado em constants/permissions.js.
 *
 * Role desconhecido/nulo (perfil ainda carregando, ou linha corrompida)
 * resulta em permissions = [] — fail-closed, nunca libera por padrão.
 *
 * @returns {{
 *   role: string|null,
 *   permissions: string[],
 *   loading: boolean,
 *   can: (permission: string) => boolean,
 *   canAny: (permissions: string[]) => boolean,
 *   canAll: (permissions: string[]) => boolean,
 * }}
 */
export function usePermissions() {
  const { profile, loading } = useProfileContext()

  const role = profile?.role ?? null

  const permissions = useMemo(
    () => getPermissionsForRole(role),
    [role]
  )

  const can = (permission) => permissions.includes(permission)

  const canAny = (permissionList = []) =>
    permissionList.some((p) => permissions.includes(p))

  const canAll = (permissionList = []) =>
    permissionList.every((p) => permissions.includes(p))

  return { role, permissions, loading, can, canAny, canAll }
}
