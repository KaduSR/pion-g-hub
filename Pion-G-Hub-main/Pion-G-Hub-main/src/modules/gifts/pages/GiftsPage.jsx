import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../../../shared/components/Toast'
// Etapa 5, Bloco 1: migrado do mapa estático para o contexto central
// (PermissionsProvider em App.jsx) — mesma API (canAny), import diferente.
import { usePermissions } from '../../permissions/contexts/PermissionsContext'
import { PERMISSIONS } from '../../permissions/constants/permissions'
import { GiftsDashboardTab } from '../components/GiftsDashboardTab'
import { GiftsListTab } from '../components/GiftsListTab'
import { KitsListTab } from '../components/KitsListTab'
import { MovementsListTab } from '../components/MovementsListTab'
import { DeliveriesListTab } from '../components/DeliveriesListTab'
import { FairGiftStockTab } from '../components/FairGiftStockTab'

// Sprint 3.7: "Entregas" passa a valer também pra quem só tem gifts.deliver
// (vendedor realizando entrega no estande) — as demais abas continuam
// exclusivas de gifts.manage.
const TABS = [
  { id: 'dashboard', label: 'Dashboard', permissions: [PERMISSIONS.GIFTS_MANAGE] },
  { id: 'brindes', label: 'Brindes', permissions: [PERMISSIONS.GIFTS_MANAGE] },
  { id: 'kits', label: 'Kits', permissions: [PERMISSIONS.GIFTS_MANAGE] },
  { id: 'feiras', label: 'Carga da Feira', permissions: [PERMISSIONS.GIFTS_MANAGE] },
  { id: 'movimentacoes', label: 'Movimentações', permissions: [PERMISSIONS.GIFTS_MANAGE] },
  { id: 'entregas', label: 'Entregas', permissions: [PERMISSIONS.GIFTS_MANAGE, PERMISSIONS.GIFTS_DELIVER] },
]

const VALID_TAB_IDS = TABS.map((t) => t.id)

export function GiftsPage() {
  const { canAny } = usePermissions()
  const visibleTabs = TABS.filter((tab) => canAny(tab.permissions))
  // Quem só tem gifts.deliver (vendedor) não vê Dashboard — a aba padrão
  // dele é Entregas, a única que efetivamente enxerga.
  const defaultTab = visibleTabs.some((t) => t.id === 'dashboard') ? 'dashboard' : 'entregas'

  // A URL (?tab=) é a única fonte de verdade da aba ativa (Sprint 3.4) —
  // isso permite deep link a partir da Sidebar (ex: /brindes?tab=kits) e
  // mantém a aba sincronizada se o usuário navegar por outro link enquanto
  // já está em /brindes (sem isso, um estado local não reagiria à troca de
  // query string sozinha). Query ausente, inválida ou sem permissão cai na
  // aba padrão do usuário.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const activeTab = (VALID_TAB_IDS.includes(tabFromUrl) && visibleTabs.some((t) => t.id === tabFromUrl))
    ? tabFromUrl
    : defaultTab

  const handleTabClick = (tabId) => {
    if (tabId === defaultTab) {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: tabId }, { replace: true })
    }
  }

  const { show: showToast, ToastEl } = useToast()

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      {ToastEl}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
          Central de Brindes
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Controle de estoque, kits e entregas de brindes promocionais.
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #e2e8f0',
        overflowX: 'auto',
      }}>
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #1B3A6B' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? '#1B3A6B' : '#64748b',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <GiftsDashboardTab />}
      {activeTab === 'brindes' && <GiftsListTab showToast={showToast} />}
      {activeTab === 'kits' && <KitsListTab showToast={showToast} />}
      {activeTab === 'feiras' && <FairGiftStockTab showToast={showToast} />}
      {activeTab === 'movimentacoes' && <MovementsListTab showToast={showToast} />}
      {activeTab === 'entregas' && <DeliveriesListTab showToast={showToast} />}
    </div>
  )
}
