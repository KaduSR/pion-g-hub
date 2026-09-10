import { Navigate } from 'react-router-dom'
// Etapa 5: migrado do mapa estático (usePermissions em hooks/) para o
// contexto central (PermissionsProvider em App.jsx) — cobre a proteção de
// TODAS as rotas privadas de uma vez, já que RequirePermission é o único
// mecanismo de proteção usado por PrivatePage em AppRoutes.jsx.
import { usePermissions } from '../contexts/PermissionsContext'
import { getDefaultRouteForRole } from '../constants/permissions'
import { LoadingScreen } from '../../../shared/components/LoadingScreen'
import { Button } from '../../../shared/components/FormField'

export function RequirePermission({ permission, anyOf, children, fallback = null }) {
  const { role, can, canAny, loading, source, refresh } = usePermissions()

  if (loading) {
    return <LoadingScreen />
  }

  const allowed = permission
    ? can(permission)
    : anyOf
      ? canAny(anyOf)
      : false

  if (!allowed) {
    // Fail closed (Etapa 6.2): banco indisponível e sem cache válido —
    // isto NÃO é "usuário sem permissão", é "não foi possível validar".
    // Nunca redireciona silenciosamente pra rota padrão do papel (pareceria
    // uma negação legítima, enganando o usuário) — mostra aviso claro e
    // deixa tentar de novo via refresh().
    if (source === 'denied') {
      return <AccessValidationError onRetry={refresh} />
    }
    if (fallback) return fallback
    return <Navigate to={getDefaultRouteForRole(role)} replace />
  }

  return children
}

function AccessValidationError({ onRetry }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32,
      textAlign: 'center', background: '#f8fafc',
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', maxWidth: 420, fontFamily: 'Space Grotesk, sans-serif' }}>
        Não foi possível validar seus acessos agora
      </div>
      <p style={{ fontSize: 14, color: '#64748b', maxWidth: 420, margin: 0 }}>
        Isso costuma ser temporário — tente novamente em alguns instantes.
      </p>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </div>
  )
}