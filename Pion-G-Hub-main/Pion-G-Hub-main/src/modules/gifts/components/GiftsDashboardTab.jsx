import React from 'react'
import { StockSummaryCards } from './StockSummaryCards'
import { RecentKitDeliveries } from './RecentKitDeliveries'
import { RecentGiftMovements } from './RecentGiftMovements'

/**
 * Liga/desliga blocos do Dashboard. Cada bloco busca seus próprios dados de
 * forma independente (nenhum estado compartilhado entre eles), então
 * desativar um aqui não afeta os demais. Vira preferência configurável pelo
 * usuário em uma sprint futura — nenhuma tabela nova para isso ainda.
 */
const DASHBOARD_SECTIONS = {
  summary: true,
  recentKitDeliveries: true,
  recentMovements: true,
}

export function GiftsDashboardTab() {
  return (
    <div>
      {DASHBOARD_SECTIONS.summary && <StockSummaryCards />}
      {DASHBOARD_SECTIONS.recentKitDeliveries && <RecentKitDeliveries />}
      {DASHBOARD_SECTIONS.recentMovements && <RecentGiftMovements />}
    </div>
  )
}
