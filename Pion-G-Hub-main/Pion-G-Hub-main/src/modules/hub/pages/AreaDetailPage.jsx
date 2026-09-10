import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Home, Megaphone, HeartHandshake, LifeBuoy, Settings, Package } from 'lucide-react'
import { useVisibleAreas } from '../hooks/useVisibleAreas'
import { AreaAccessCard } from '../components/AreaAccessCard'
import { LoadingScreen } from '../../../shared/components/LoadingScreen'

const ICONS = { Home, Megaphone, HeartHandshake, LifeBuoy, Settings }

/**
 * Detalhe de uma área (Sprint 5.1, Etapa 4) — /areas/:areaId. A área só é
 * procurada dentro de `visibleAreas` (nunca em AREAS bruto): se ela não
 * estiver lá, seja porque o id não existe, seja porque o usuário não tem
 * nenhum acesso resolvido nela, o resultado é o MESMO estado genérico —
 * esta página nunca distingue "área inexistente" de "área sem
 * autorização", pra não revelar nenhuma informação sobre áreas que o
 * usuário não pode ver.
 */
export function AreaDetailPage() {
  const { areaId } = useParams()
  const navigate = useNavigate()
  const { visibleAreas, isLoading } = useVisibleAreas()

  // Fail-closed: enquanto a verificação operacional ainda está em
  // andamento, nunca decide que a área está indisponível nem redireciona —
  // só mostra carregamento.
  if (isLoading) return <LoadingScreen />

  const area = visibleAreas.find((a) => a.id === areaId)

  if (!area) {
    return (
      <div style={{ padding: 32, maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '48px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 8px', fontFamily: 'Space Grotesk, sans-serif' }}>
            Área não disponível.
          </p>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
            Esta área não existe ou você não tem acesso a ela no momento.
          </p>
          <button
            type="button"
            onClick={() => navigate('/areas')}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: '#1B3A6B', color: '#fff',
            }}
          >
            Voltar para Central de Áreas
          </button>
        </div>
      </div>
    )
  }

  const Icon = ICONS[area.icon] || Package

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <button
        onClick={() => navigate('/areas')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}
      >
        <ArrowLeft size={16} /> Central de Áreas
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: '#eef2ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={26} color="#4f46e5" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            {area.name}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            {area.description}
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}>
        {area.resolvedItems.map((resolvedItem, idx) => (
          <AreaAccessCard
            key={`${resolvedItem.type}-${resolvedItem.item?.path || resolvedItem.module.id}-${idx}`}
            resolvedItem={resolvedItem}
          />
        ))}
      </div>
    </div>
  )
}
