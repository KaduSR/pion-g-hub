import React from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Gift, BarChart3, Plug, Settings, LifeBuoy, Package,
} from 'lucide-react'

// Mesmo conjunto de ícones de módulo já usado por ModuleCard.jsx/Sidebar.jsx
// (moduleRegistry.js só registra esses nomes) — ícone desconhecido cai no
// fallback seguro (Package).
const ICONS = { LayoutDashboard, CalendarDays, Gift, BarChart3, Plug, Settings, LifeBuoy }

const cardStyle = {
  display: 'block', background: '#fff', borderRadius: 14,
  border: '1px solid #e2e8f0', padding: 20, textDecoration: 'none', color: 'inherit',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
}

/**
 * Card de UM acesso já resolvido por useVisibleAreas() (Sprint 5.1, Etapa
 * 4) — recebe só o `resolvedItem` ({ type, module, item? }), nunca o
 * módulo/área bruta. Não conhece PBAC, Supabase nem a regra da Central de
 * Atendimento — só desenha o que já foi resolvido, exatamente como
 * ModuleCard/AreaCard fazem com seus próprios dados prontos.
 *
 * type === 'module': representa o módulo INTEIRO (associação sem path em
 * areaRegistry.js, ex.: Dashboard Geral, Gestão de Brindes) — nunca
 * desenha a navigation completa do módulo, só o card de entrada.
 *
 * type === 'item': representa só o item específico (ex.: "Central de
 * Atendimento" dentro de "Chamados de TI", ou "Respostas" dentro de
 * "Feiras & Leads") — por isso nunca lista os demais itens de
 * module.navigation, e é assim que Customer Success nunca mostra Feiras/
 * Captação/Leads, nem Corporativo mostra a Central de Atendimento: cada
 * área só recebe os resolvedItems que areaRegistry.js já delimitou.
 */
export function AreaAccessCard({ resolvedItem }) {
  const { type, module, item } = resolvedItem
  const Icon = ICONS[module.icon] || Package

  const title = type === 'module' ? module.name : item.label
  const context = type === 'item' ? module.name : null
  const description = type === 'module' ? module.description : (item.description || module.description)
  // Query string preservada exatamente como está em moduleRegistry.js —
  // nenhuma reescrita/normalização de path acontece aqui.
  const destino = type === 'module' ? module.path : item.path

  const body = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: '#eef2ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={20} color="#4f46e5" />
        </div>
        <div style={{ minWidth: 0 }}>
          {context && (
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {context}
            </div>
          )}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            {title}
          </div>
        </div>
      </div>

      {description && (
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
          {description}
        </p>
      )}
    </>
  )

  // Destino ausente (defensivo — hoje resolvedItems só referencia itens
  // ativos com path real) produz card desabilitado seguro, nunca um Link
  // quebrado.
  if (!destino) {
    return (
      <div style={{ ...cardStyle, opacity: 0.6, cursor: 'not-allowed' }}>
        {body}
      </div>
    )
  }

  return (
    <Link to={destino} style={cardStyle}>
      {body}
    </Link>
  )
}
