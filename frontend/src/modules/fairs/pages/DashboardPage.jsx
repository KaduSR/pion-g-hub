import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Users, Flame, Thermometer, Snowflake } from 'lucide-react'
import { leadsService } from '../services/leadsService'
import { useFairsContext } from '../contexts/FairsContext'
import { useAuth } from '../../auth/hooks/useAuth'
// Etapa 5, Bloco 1: migrado do mapa estático para o contexto central
// (PermissionsProvider em App.jsx) — mesma API (can), import diferente.
// Regra de escopo preservada integralmente: isViewOwn abaixo continua a
// única distinção usada (visão geral/equipe tratadas de forma idêntica,
// como já era antes da migração — não é regressão, é o comportamento
// pré-existente).
import { usePermissions } from '../../permissions/contexts/PermissionsContext'
import { PERMISSIONS } from '../../permissions/constants/permissions'
import { Select } from '../../../shared/components/FormField'
import { groupBy } from '../../../shared/utils/helpers'
import { satisfactionService } from '../../satisfaction/services/satisfactionService'
import { SatisfactionSummaryCards } from '../../satisfaction/components/SatisfactionSummaryCards'

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

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
          fontSize: 28, fontWeight: 700, color: '#0f172a',
          fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1,
        }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: 24,
      border: '1px solid #f1f5f9',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <h3 style={{
        margin: '0 0 20px', fontSize: 15, fontWeight: 700,
        color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif',
      }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Empty() {
  return (
    <div style={{
      height: 240, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#94a3b8', fontSize: 14,
    }}>
      Sem dados para exibir
    </div>
  )
}

export function DashboardPage() {
  const { allFairs }  = useFairsContext()
  const { user }      = useAuth()
  const { can }       = usePermissions()

  const [selectedFair, setSelectedFair] = useState('')
  const [rawData, setRawData]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [satisfactionSummary, setSatisfactionSummary] = useState(null)

  // Modo de visibilidade: vendedor vê apenas os próprios leads
  const isViewOwn = !can(PERMISSIONS.LEADS_VIEW_ALL) && !can(PERMISSIONS.LEADS_VIEW_TEAM)
                    && can(PERMISSIONS.LEADS_VIEW_OWN)

  // Título e subtítulo dinâmicos
  const pageTitle    = isViewOwn ? 'Meu Dashboard' : 'Dashboard'
  const pageSubtitle = isViewOwn
    ? 'Métricas dos seus próprios leads'
    : 'Visão geral das feiras e captação de leads'

  useEffect(() => {
    setLoading(true)
    leadsService
      .getDashboardStats(
        selectedFair || null,
        isViewOwn ? user?.id : null,   // vendedor → filtra por created_by
      )
      .then(setRawData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedFair, isViewOwn, user?.id])

  // Bloco de satisfação respeita o mesmo filtro de feira já usado pelos
  // leads acima — não criamos um segundo seletor. Oculto para vendedor
  // (isViewOwn), já que não é vinculado a um vendedor específico.
  useEffect(() => {
    if (isViewOwn) return
    satisfactionService
      .getSatisfactionDashboardSummary({ feiraId: selectedFair || null })
      .then(setSatisfactionSummary)
      .catch(console.error)
  }, [selectedFair, isViewOwn])

  // ── Métricas ──────────────────────────────────────────────────────────────
  const total  = rawData.length
  const quente = rawData.filter((l) => l.temperatura === 'Quente').length
  const morno  = rawData.filter((l) => l.temperatura === 'Morno').length
  const frio   = rawData.filter((l) => l.temperatura === 'Frio').length

  const tempData = [
    { name: 'Quente', value: quente, color: '#ef4444' },
    { name: 'Morno',  value: morno,  color: '#f59e0b' },
    { name: 'Frio',   value: frio,   color: '#60a5fa' },
  ].filter((d) => d.value > 0)

  // ── Dados de gráfico (apenas para roles com visão ampla) ──────────────────
  const vendedorData = Object.entries(groupBy(rawData, 'vendedor'))
    .map(([name, value]) => ({ name: name.split(' ')[0] || name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const segmentoData = Object.entries(groupBy(rawData, 'segmento'))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const feiraData = Object.entries(
    rawData.reduce((acc, l) => {
      const k = l.feiras?.nome || 'Não informado'
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Cabeçalho ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 700,
            color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif',
          }}>
            {pageTitle}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            {pageSubtitle}
          </p>
        </div>

        {/* Filtro de feira: oculto para vendedor (feiras não fazem parte do seu escopo) */}
        {!isViewOwn && (
          <div style={{ minWidth: 220 }}>
            <Select value={selectedFair} onChange={(e) => setSelectedFair(e.target.value)}>
              <option value="">Todas as feiras</option>
              {allFairs.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </Select>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p>Carregando dados…</p>
        </div>
      ) : (
        <>
          {/* ── Cards de métricas ──────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16, marginBottom: 24,
          }}>
            <StatCard icon={Users}       label="Total de Leads"  value={total}  color="#4f46e5" bg="#eef2ff" />
            <StatCard icon={Flame}       label="Leads Quentes"   value={quente} color="#ef4444" bg="#fef2f2" />
            <StatCard icon={Thermometer} label="Leads Mornos"    value={morno}  color="#f59e0b" bg="#fffbeb" />
            <StatCard icon={Snowflake}   label="Leads Frios"     value={frio}   color="#60a5fa" bg="#eff6ff" />
          </div>

          {/* ── Satisfação dos Visitantes — oculto para vendedor ────── */}
          {!isViewOwn && satisfactionSummary && (
            <div style={{ marginBottom: 24 }}>
              <SatisfactionSummaryCards summary={satisfactionSummary} title="Satisfação dos Visitantes" />
            </div>
          )}

          {/* ── Gráficos por vendedor — oculto para vendedor ───────── */}
          {!isViewOwn && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <ChartCard title="Leads por Vendedor">
                {vendedorData.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={vendedorData} margin={{ left: -20, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="value" name="Leads" radius={[6, 6, 0, 0]}>
                        {vendedorData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Temperatura dos Leads">
                {tempData.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={tempData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                        paddingAngle={3}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {tempData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}

          {/* ── Temperatura (visão do vendedor: único gráfico útil) ── */}
          {isViewOwn && (
            <div style={{ marginBottom: 16 }}>
              <ChartCard title="Temperatura dos meus leads">
                {tempData.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={tempData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                        paddingAngle={3}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {tempData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}

          {/* ── Segmento e Feira ───────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ChartCard title={isViewOwn ? 'Meus leads por segmento' : 'Leads por Segmento'}>
              {segmentoData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={segmentoData} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={110} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="value" name="Leads" radius={[0, 6, 6, 0]}>
                      {segmentoData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title={isViewOwn ? 'Meus leads por feira' : 'Leads por Feira'}>
              {feiraData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={feiraData} margin={{ left: -20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="value" name="Leads" radius={[6, 6, 0, 0]}>
                      {feiraData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>
      )}

      <style>{`
        .spinner {
          width: 28px; height: 28px;
          border: 3px solid #e2e8f0;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
