import React from 'react'
import { Users, Star, TrendingUp, Smile, ThumbsUp, Meh, Frown } from 'lucide-react'

function classificationIcon(classificacao) {
  switch (classificacao) {
    case 'Excelente': return { Icon: Smile, color: '#059669' }
    case 'Muito bom': return { Icon: ThumbsUp, color: '#0ea5e9' }
    case 'Regular': return { Icon: Meh, color: '#d97706' }
    case 'Precisa melhorar': return { Icon: Frown, color: '#dc2626' }
    default: return { Icon: Meh, color: '#94a3b8' }
  }
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 20px',
      border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 20, fontWeight: 700, color: '#0f172a',
          fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

/**
 * Reaproveitado tanto na página /pesquisas (resumo de UMA pesquisa) quanto
 * no bloco "Satisfação dos Visitantes" do Dashboard Geral (resumo por
 * feira) — o shape de `summary` é sempre o mesmo, vindo de
 * satisfactionService.getSurveySummary / getSatisfactionDashboardSummary.
 */
export function SatisfactionSummaryCards({ summary, title }) {
  if (!summary) return null
  const { Icon, color } = classificationIcon(summary.classificacao)

  return (
    <div>
      {title && (
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
          {title}
        </h3>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        <StatCard icon={Users} label="Total de respostas" value={summary.totalRespostas} color="#4f46e5" bg="#eef2ff" />
        <StatCard
          icon={Star}
          label="Média das avaliações (1-5)"
          value={summary.mediaRating != null ? summary.mediaRating.toFixed(1) : '—'}
          color="#d97706" bg="#fffbeb"
        />
        <StatCard
          icon={TrendingUp}
          label="NPS médio (0-10)"
          value={summary.npsMedio != null ? summary.npsMedio.toFixed(1) : '—'}
          color="#0ea5e9" bg="#eff6ff"
        />
        <StatCard icon={Icon} label="Classificação" value={summary.classificacao} color={color} bg="#f8fafc" />
      </div>
    </div>
  )
}
