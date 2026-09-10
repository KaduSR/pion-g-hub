import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Gift, BarChart3, Plug, Settings, Package, LifeBuoy } from 'lucide-react'

const ICONS = { LayoutDashboard, CalendarDays, Gift, BarChart3, Plug, Settings, LifeBuoy }

const STATUS_LABEL = {
  active: 'Ativo',
  planned: 'Em breve',
  disabled: 'Desativado',
}

export function ModuleCard({ module: mod }) {
  const navigate = useNavigate()
  const Icon = ICONS[mod.icon] || Package
  const isActive = mod.status === 'active'
  const isDisabled = mod.status === 'disabled'

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      opacity: isDisabled ? 0.6 : 1,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      {/* Área visual do módulo — hoje sempre um ícone grande. `visualType`/
          `imageUrl` já deixam a estrutura pronta para trocar por uma
          imagem/ilustração numa sprint futura, sem mexer no restante do card. */}
      <div style={{
        height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isActive ? '#eef2ff' : '#f8fafc',
        borderBottom: '1px solid #f1f5f9',
      }}>
        {mod.visualType === 'image' && mod.imageUrl ? (
          <img
            src={mod.imageUrl}
            alt={mod.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Icon size={40} color={isActive ? '#4f46e5' : '#94a3b8'} />
        )}
      </div>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
          {mod.name}
        </h3>

        <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
          {mod.description}
        </p>

        {mod.children?.length > 0 && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
            }}>
              Subáreas
            </div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              {mod.children.join(' • ')}
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#059669' : '#94a3b8' }}>
          Status: {STATUS_LABEL[mod.status] || mod.status}
        </span>

        <button
          onClick={() => isActive && navigate(mod.path)}
          disabled={!isActive}
          style={{
            padding: '10px 16px', borderRadius: 10, border: 'none',
            fontSize: 13, fontWeight: 700,
            cursor: isActive ? 'pointer' : 'not-allowed',
            background: isActive ? '#1B3A6B' : '#f1f5f9',
            color: isActive ? '#fff' : '#94a3b8',
          }}
        >
          {isActive ? 'Abrir módulo' : 'Planejado'}
        </button>
      </div>
    </div>
  )
}
