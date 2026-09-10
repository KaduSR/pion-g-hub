import React, { useState, useEffect } from 'react'
import { giftDashboardService } from '../services/giftDashboardService'
import { RecentKitDeliveryItem } from './RecentKitDeliveryItem'

export function RecentKitDeliveries() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  // Cache em memória: uma vez buscado, o detalhe de uma entrega não é
  // buscado de novo enquanto este componente permanecer montado — fechar e
  // reabrir a mesma entrega na mesma sessão não repete a consulta.
  const [deliveryDetails, setDeliveryDetails] = useState({})
  const [loadingId, setLoadingId] = useState(null)

  useEffect(() => {
    giftDashboardService.getRecentKitDeliveries(5)
      .then(setDeliveries)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleExpand = async (deliveryId) => {
    if (deliveryDetails[deliveryId]) return // já em cache, não repete a busca

    setLoadingId(deliveryId)
    try {
      const details = await giftDashboardService.getDeliveryDetails(deliveryId)
      setDeliveryDetails((prev) => ({ ...prev, [deliveryId]: details }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24,
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
        Últimas entregas de kits
      </h3>

      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Carregando...</p>
      ) : deliveries.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Nenhuma entrega de kit confirmada ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {deliveries.map((d) => (
            <RecentKitDeliveryItem
              key={d.id}
              summary={d}
              details={deliveryDetails[d.id]}
              loadingDetails={loadingId === d.id}
              onExpand={() => handleExpand(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
