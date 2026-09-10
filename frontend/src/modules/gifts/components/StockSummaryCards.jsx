import React, { useState, useEffect } from 'react'
import { Package, DollarSign, AlertTriangle, Truck } from 'lucide-react'
import { giftsService } from '../services/giftsService'
import { formatCurrency } from '../../../shared/utils/helpers'

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '20px 24px',
      border: '1px solid #f1f5f9',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{
          fontSize: 24, fontWeight: 700, color: '#0f172a',
          fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1,
        }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

export function StockSummaryCards() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    giftsService.getDashboardSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Carregando resumo...</div>
  }

  if (!summary) return null

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: 16, marginBottom: 24,
    }}>
      <StatCard icon={Package} label="Brindes cadastrados" value={summary.totalBrindes} color="#4f46e5" bg="#eef2ff" />
      <StatCard icon={DollarSign} label="Valor estimado em estoque" value={formatCurrency(summary.valorEmEstoque)} color="#059669" bg="#ecfdf5" />
      <StatCard icon={AlertTriangle} label="Itens abaixo do mínimo" value={summary.itensAbaixoDoMinimo} color="#d97706" bg="#fffbeb" />
      <StatCard icon={Truck} label="Entregas realizadas" value={summary.entregasRealizadas} color="#0ea5e9" bg="#eff6ff" />
    </div>
  )
}
