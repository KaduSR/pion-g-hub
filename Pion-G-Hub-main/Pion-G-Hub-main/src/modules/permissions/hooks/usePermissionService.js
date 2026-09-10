import { useState, useEffect, useCallback, useRef } from 'react'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { loadPermissions } from '../services/permissionService'

const EMPTY_STATE = { permissions: new Set(), source: null, error: null, degraded: false, stale: false }

/**
 * Sprint 3.8, Etapa 4 — versão do hook de permissões que resolve a partir
 * do banco (via permissionService), com o mesmo formato de API de
 * `usePermissions()` (can/canAny/canAll).
 *
 * Etapa 5: chamado uma única vez por `PermissionsProvider`
 * (contexts/PermissionsContext.jsx), montado em App.jsx, que distribui o
 * resultado via contexto pra quem migrou (RequirePermission, Sidebar).
 * Quem ainda não migrou continua em `usePermissions()` (hooks/), o mapa
 * estático — ver inventário/ordem de migração do checkpoint da Etapa 5.
 */
export function usePermissionService() {
  const { profile, loading: profileLoading } = useProfileContext()
  const [state, setState] = useState(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  // Descarta respostas de uma busca anterior se o perfil mudar no meio do
  // caminho (troca de usuário/papel) — evita que a resposta de um
  // profileId+role antigo sobrescreva o estado do atual.
  const requestId = useRef(0)
  // Descarta qualquer atualização de estado se o componente já desmontou
  // antes da busca (em andamento no momento da desmontagem) terminar.
  const isMountedRef = useRef(true)
  // `profileId:role` do último carregamento — usado só pra saber se a
  // identidade mudou (e por isso o estado exibido precisa ser limpo antes
  // de buscar de novo), sem forçar isso numa chamada manual de refresh()
  // pro MESMO perfil.
  const lastKeyRef = useRef(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchPermissions = useCallback(async (forceRefresh = false) => {
    if (!profile?.id || !profile?.role) {
      lastKeyRef.current = null
      requestId.current += 1 // invalida qualquer busca anterior ainda em voo
      if (isMountedRef.current) {
        setState(EMPTY_STATE)
        setLoading(false)
      }
      return
    }

    const key = `${profile.id}:${profile.role}`
    const isNewIdentity = key !== lastKeyRef.current
    lastKeyRef.current = key

    const currentRequest = ++requestId.current
    if (isMountedRef.current) {
      // Só limpa o estado exibido quando o PERFIL muda de verdade — uma
      // chamada manual de refresh() pro mesmo perfil não precisa piscar
      // pra vazio, só uma troca de identidade precisa.
      if (isNewIdentity) setState(EMPTY_STATE)
      setLoading(true)
    }

    const result = await loadPermissions({ profileId: profile.id, role: profile.role, forceRefresh })

    if (!isMountedRef.current) return                // desmontou enquanto a busca rodava
    if (currentRequest !== requestId.current) return  // resposta obsoleta — profile.id/role já mudou de novo

    setState(result)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.role])

  // Assim que o ProfileContext entra em carregamento (troca de usuário, por
  // exemplo), invalida imediatamente qualquer busca em andamento e limpa o
  // estado exibido — nunca deixa a permissão de um perfil que já não é mais
  // o atual visível durante a transição.
  useEffect(() => {
    if (profileLoading) {
      requestId.current += 1
      lastKeyRef.current = null
      setState(EMPTY_STATE)
      setLoading(true)
      return
    }
    fetchPermissions()
  }, [profileLoading, fetchPermissions])

  const refresh = useCallback(() => fetchPermissions(true), [fetchPermissions])

  const can = useCallback((permission) => state.permissions.has(permission), [state.permissions])
  const canAny = useCallback((list = []) => list.some((p) => state.permissions.has(p)), [state.permissions])
  const canAll = useCallback((list = []) => list.every((p) => state.permissions.has(p)), [state.permissions])

  return {
    permissions: state.permissions, // Set<string>
    source: state.source,           // 'database' | 'cache' | 'denied' | 'none' | null (ainda não carregou)
    error: state.error,             // Error | null — preenchido quando source === 'cache' (recuperação de falha) ou 'denied'
    degraded: state.degraded,       // true quando o banco falhou nesta busca (mesmo tendo recuperado via cache antigo)
    stale: state.stale,             // true só quando o dado exibido é cache vencido reaproveitado após falha — 'denied' nunca é stale (não há dado nenhum, é ausência)
    loading: loading || profileLoading,
    can,
    canAny,
    canAll,
    refresh,
  }
}
