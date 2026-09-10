import React from 'react'
import { Link } from 'react-router-dom'
import { Home, Megaphone, HeartHandshake, LifeBuoy, Settings, Package } from 'lucide-react'

// Ícones registrados em areaRegistry.js (Sprint 5.1, Etapa 1) — ícone
// desconhecido cai no fallback seguro (Package), mesmo padrão de
// ModuleCard.jsx/Sidebar.jsx.
const ICONS = { Home, Megaphone, HeartHandshake, LifeBuoy, Settings }

/**
 * Card de uma ÁREA já resolvida por useVisibleAreas() (Sprint 5.1, Etapa
 * 4) — só apresenta o que já veio pronto, sem consultar permissões,
 * Supabase ou filtrar `resolvedItems` de novo. `area.resolvedItems.length`
 * é chamado de "acesso(s) disponível/is", nunca "módulos", porque uma
 * associação pode ser só um item específico de um macro módulo (ex.:
 * Central de Atendimento dentro de "Chamados de TI").
 */
export function AreaCard({ area }) {
  const Icon = ICONS[area.icon] || Package
  const count = area.resolvedItems.length
  const countLabel = count === 1 ? 'acesso disponível' : 'acessos disponíveis'

  return (
    <Link
      to={`/areas/${area.id}`}
      style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        textDecoration: 'none', color: 'inherit',
      }}
    >
      <div style={{
        height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#eef2ff', borderBottom: '1px solid #f1f5f9',
      }}>
        <Icon size={40} color="#4f46e5" />
      </div>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
          {area.name}
        </h3>

        <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
          {area.description}
        </p>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>
          {count} {countLabel}
        </span>

        <span
          style={{
            padding: '10px 16px', borderRadius: 10,
            fontSize: 13, fontWeight: 700, textAlign: 'center',
            background: '#1B3A6B', color: '#fff',
          }}
        >
          Acessar área
        </span>
      </div>
    </Link>
  )
}
