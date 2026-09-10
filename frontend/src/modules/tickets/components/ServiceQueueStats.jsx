import React, { useState, useEffect } from 'react'
import { ticketsService } from '../services/ticketsService'

// Só os status REALMENTE alcançáveis nesta sprint — "Sem responsável" usa
// o filtro p_sem_responsavel em vez de status, pois hoje ele coincide na
// prática com "em_triagem" (atribuido sempre tem responsavel_profile_id
// preenchido), mas é mais explícito assim. "Em atendimento" passou a ser
// alcançável na revisão de fluxo operacional (Atribuído → Em atendimento
// via "Iniciar atendimento", sem depender do cronômetro da Sprint 4.4).
//
// "Resolvidos" e "Fechados" são indicadores SEPARADOS de propósito (não
// somar): Resolvido ainda pode ser reaberto ou fechado — ciclo em aberto,
// só sem trabalho pendente; Fechado é terminal (RLS/RPC não permitem mais
// nenhuma transição de saída). Contam status exato (`status = 'resolvido'`
// / `status = 'fechado'`), sem sobreposição. Ver STATUS_BUCKETS em
// ticketsService.js — "Minhas solicitações" usa um agrupamento
// simplificado (soma os dois em "Concluídos"), mas os dois agrupamentos
// continuam matematicamente coerentes entre si: Resolvidos(Central) +
// Fechados(Central) = Concluídos(Minhas solicitações), pro mesmo conjunto
// de chamados.
const BUCKETS = [
  { key: 'aberto', label: 'Novos', filter: { status: 'aberto' }, color: '#2563eb', bg: '#eff6ff' },
  { key: 'em_triagem', label: 'Em triagem', filter: { status: 'em_triagem' }, color: '#d97706', bg: '#fffbeb' },
  { key: 'sem_responsavel', label: 'Sem responsável', filter: { semResponsavel: true }, color: '#dc2626', bg: '#fef2f2' },
  { key: 'atribuido', label: 'Atribuídos', filter: { status: 'atribuido' }, color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'em_atendimento', label: 'Em atendimento', filter: { status: 'em_atendimento' }, color: '#0ea5e9', bg: '#f0f9ff' },
  { key: 'resolvido', label: 'Resolvidos', filter: { status: 'resolvido' }, color: '#059669', bg: '#ecfdf5' },
  { key: 'fechado', label: 'Fechados', filter: { status: 'fechado' }, color: '#475569', bg: '#f1f5f9' },
]

/**
 * Indicadores da Central de Atendimento — cada um é uma chamada limitada
 * (limit: 200) a ti_fila_atendimento, nunca uma contagem sem teto. Acima
 * de 200 mostra "200+" em vez de um número exato (RPC não expõe COUNT(*),
 * só as linhas paginadas). `refreshKey` força recontagem após triagem/
 * atribuição/mudança de status.
 */
export function ServiceQueueStats({ refreshKey }) {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all(
      BUCKETS.map(({ key, filter }) =>
        ticketsService.getServiceQueue({ ...filter, limit: 200 })
          .then((r) => [key, r.hasMore ? '200+' : String(r.items.length)])
          .catch(() => [key, '—'])
      )
    ).then((entries) => {
      if (cancelled) return
      setCounts(Object.fromEntries(entries))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [refreshKey])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
      {BUCKETS.map(({ key, label, color, bg }) => (
        <div key={key} style={{ background: bg, borderRadius: 12, padding: '14px 16px', border: `1.5px solid ${color}22` }}>
          <div style={{ fontSize: 24, fontWeight: 700, color }}>{loading ? '—' : counts[key]}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginTop: 2 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}
