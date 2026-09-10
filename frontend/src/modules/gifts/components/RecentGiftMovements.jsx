import React, { useState, useEffect } from 'react'
import { giftDashboardService } from '../services/giftDashboardService'
import { RecentMovementItem } from './RecentMovementItem'

export function RecentGiftMovements() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    giftDashboardService.getRecentGiftMovements(5)
      .then(setMovements)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24,
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
        Movimentações avulsas recentes
      </h3>

      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Carregando...</p>
      ) : movements.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Nenhuma movimentação registrada ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {movements.map((mov) => <RecentMovementItem key={mov.id} movement={mov} />)}
        </div>
      )}
    </div>
  )
}
