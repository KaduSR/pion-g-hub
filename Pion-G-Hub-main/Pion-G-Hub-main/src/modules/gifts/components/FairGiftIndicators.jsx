import React, { useState, useEffect } from 'react'
import { Package, Truck, Gift, ShoppingBag } from 'lucide-react'
import { fairGiftStockService } from '../services/fairGiftStockService'
import { Button } from '../../../shared/components/FormField'

const PERIOD = { HOJE: 'hoje', EVENTO: 'evento' }

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

// entregue_em ausente/inválido nunca conta como Hoje (não classificar
// silenciosamente) — mas segue incluído em "Evento inteiro" pelo simples
// fato de já estar no array de eventos da feira.
function isToday(entregueEm, startOfToday, now) {
  if (!entregueEm) return false
  const deliveredAt = new Date(entregueEm)
  if (Number.isNaN(deliveredAt.getTime())) return false
  return deliveredAt >= startOfToday && deliveredAt <= now
}

function IndicatorCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '16px 18px',
      border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: bg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

/**
 * P1.3 — indicadores operacionais da feira (Unidades entregues, Entregas
 * realizadas, Kits entregues, Entregas avulsas), com alternância Hoje x
 * Evento inteiro. Não mistura estado com a tabela de carga (P1.1) nem com
 * a decomposição de origem (P1.2) — só lê brinde_entregas, isolado.
 */
export function FairGiftIndicators({ feiraId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState(PERIOD.HOJE)

  useEffect(() => {
    setPeriod(PERIOD.HOJE)
    setEvents([])
    setError(false)
    if (!feiraId) return
    setLoading(true)
    fairGiftStockService.getDeliveryEventsByFair(feiraId)
      .then(setEvents)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [feiraId])

  if (!feiraId) return null

  const now = new Date()
  const startOfToday = startOfLocalDay(now)
  const filteredEvents = period === PERIOD.HOJE
    ? events.filter((e) => isToday(e.entregue_em, startOfToday, now))
    : events

  let unidades = 0
  let entregas = 0
  let kits = 0
  let avulsas = 0

  for (const evento of filteredEvents) {
    entregas += 1
    unidades += (evento.brinde_entrega_itens || []).reduce((sum, item) => sum + (item.quantidade || 0), 0)

    if (evento.tipo_entrega === 'kit') {
      // Histórico anterior ao suporte a p_quantidade_kits sempre representava
      // exatamente 1 kit por evento — quantidade NULL nesse caso é fallback 1,
      // não "kit não identificado" (diferente do fallback de origem no P1.2).
      kits += evento.quantidade == null ? 1 : evento.quantidade
    } else if (evento.tipo_entrega === 'item_avulso') {
      avulsas += 1
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Button
          size="sm"
          variant={period === PERIOD.HOJE ? 'primary' : 'secondary'}
          onClick={() => setPeriod(PERIOD.HOJE)}
        >
          Hoje
        </Button>
        <Button
          size="sm"
          variant={period === PERIOD.EVENTO ? 'primary' : 'secondary'}
          onClick={() => setPeriod(PERIOD.EVENTO)}
        >
          Evento inteiro
        </Button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Carregando indicadores...</p>
      ) : error ? (
        <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>Não foi possível carregar os indicadores.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <IndicatorCard icon={Package} label="Unidades entregues" value={unidades} color="#4f46e5" bg="#eef2ff" />
          <IndicatorCard icon={Truck} label="Entregas realizadas" value={entregas} color="#0ea5e9" bg="#eff6ff" />
          <IndicatorCard icon={Gift} label="Kits entregues" value={kits} color="#059669" bg="#ecfdf5" />
          <IndicatorCard icon={ShoppingBag} label="Entregas avulsas" value={avulsas} color="#d97706" bg="#fffbeb" />
        </div>
      )}
    </div>
  )
}
