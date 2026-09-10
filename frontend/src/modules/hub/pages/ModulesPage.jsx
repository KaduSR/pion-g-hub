import React from 'react'
import { MODULES } from '../moduleRegistry'
import { ModuleCard } from '../components/ModuleCard'
// Etapa 5, Bloco 1: migrado do mapa estático para o contexto central
// (PermissionsProvider em App.jsx) — mesma API (canAny), import diferente.
import { usePermissions } from '../../permissions/contexts/PermissionsContext'

/**
 * Tela inicial após login. Só renderiza metadados locais de moduleRegistry —
 * nenhuma estatística/contagem é buscada aqui (isso fica para dentro de
 * cada macro módulo, não para esta tela).
 */
export function ModulesPage() {
  const { canAny } = usePermissions()

  const visibleModules = MODULES.filter((mod) => {
    // Módulos "planned" aparecem como visão de roadmap para qualquer
    // usuário autenticado. Só os "active" respeitam permissão real —
    // basta ter QUALQUER UMA das permissões listadas em mod.permissions.
    if (mod.status !== 'active') return true
    return mod.permissions?.length ? canAny(mod.permissions) : true
  })

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 700, color: '#4f46e5',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Pion G Hub
        </p>
        <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
          Central de Módulos
        </h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, maxWidth: 640 }}>
          Organize operações de marketing, eventos, brindes, leads e integrações em um só lugar. Escolha uma área para começar.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 20,
      }}>
        {visibleModules.map((mod) => <ModuleCard key={mod.id} module={mod} />)}
      </div>
    </div>
  )
}
