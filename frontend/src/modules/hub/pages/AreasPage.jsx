import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useVisibleAreas } from '../hooks/useVisibleAreas'
import { AreaCard } from '../components/AreaCard'
import { LoadingScreen } from '../../../shared/components/LoadingScreen'

/**
 * Central de Áreas (Sprint 5.1, Etapa 4) — primeira experiência visual das
 * áreas departamentais, isolada em /areas. Não substitui /modulos nesta
 * etapa; só consome useVisibleAreas() (que já aplica toda a resolução de
 * PBAC + regra da Central de Atendimento) e desenha o resultado — nenhuma
 * lógica de permissão, filtro ou reconstrução de área acontece aqui.
 */
export function AreasPage() {
  const navigate = useNavigate()
  const { visibleAreas, isLoading } = useVisibleAreas()

  // Enquanto a verificação operacional da Central de Atendimento ainda
  // está em andamento, nunca renderiza uma lista parcial/incompleta — só
  // depois de isLoading=false o conjunto final de áreas é estável.
  if (isLoading) return <LoadingScreen />

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
          Central de Áreas
        </h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, maxWidth: 640 }}>
          Acesse os espaços e serviços disponíveis para o seu perfil.
        </p>
      </div>

      {visibleAreas.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '48px 24px', textAlign: 'center', maxWidth: 420, margin: '0 auto',
        }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 8px', fontFamily: 'Space Grotesk, sans-serif' }}>
            Nenhuma área disponível no momento.
          </p>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
            Fale com um administrador se você acredita que deveria ter acesso a algum espaço do Hub.
          </p>
          <button
            type="button"
            onClick={() => navigate('/meu-perfil')}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: '#1B3A6B', color: '#fff',
            }}
          >
            Ir para Meu Perfil
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20,
        }}>
          {visibleAreas.map((area) => <AreaCard key={area.id} area={area} />)}
        </div>
      )}
    </div>
  )
}
