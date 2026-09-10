import { createContext, useContext } from 'react'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { usePermissionService } from '../hooks/usePermissionService'

const PermissionsContext = createContext(null)

/**
 * Sprint 3.8, Etapa 5 — integração central: chama `usePermissionService()`
 * UMA ÚNICA VEZ no topo da árvore (App.jsx) e distribui o resultado via
 * contexto. Se cada tela chamasse o hook por conta própria, cada uma teria
 * seu próprio ciclo de loading/fetch — o cache por chave em
 * `permissionService.js` evitaria requisições duplicadas ao banco, mas
 * ainda assim cada componente teria seu próprio estado de loading
 * assíncrono, gerando piscadas independentes. Uma única instância aqui
 * elimina isso.
 *
 * Mesmo formato de API de `usePermissions()` (o hook antigo, mapa estático)
 * — `role/permissions/loading/can/canAny/canAll` — para que cada tela migre
 * trocando SÓ o import, uma de cada vez (ver inventário do checkpoint da
 * Etapa 5). `usePermissions()` (mapa estático) continua existindo e
 * funcionando normalmente para quem ainda não migrou.
 */
export function PermissionsProvider({ children }) {
  const { profile } = useProfileContext()
  const service = usePermissionService()

  const value = {
    role: profile?.role ?? null,
    permissions: service.permissions,
    loading: service.loading,
    can: service.can,
    canAny: service.canAny,
    canAll: service.canAll,
    // Campos extras (não existem no usePermissions() antigo) — quem migrar
    // pode usá-los pra sinalizar degradação na UI; quem não usar, ignora.
    source: service.source,
    degraded: service.degraded,
    stale: service.stale,
    refresh: service.refresh,
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext)
  if (!ctx) {
    throw new Error('usePermissions() (contexto) precisa estar dentro de <PermissionsProvider>')
  }
  return ctx
}
