import { supabase } from '../../../lib/supabase'

const TABLE = 'brinde_movimentacoes'

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

// P1.4 — limite inicial do período (server-side), em Date local do
// navegador. 'today' = meia-noite local até agora; '7d'/'30d' = hoje +
// N-1 dias-calendário anteriores; 'all' = sem limite (null).
function getPeriodStart(period) {
  const now = new Date()
  if (period === 'today') return startOfLocalDay(now)
  if (period === '7d') {
    const start = startOfLocalDay(now)
    start.setDate(start.getDate() - 6)
    return start
  }
  if (period === '30d') {
    const start = startOfLocalDay(now)
    start.setDate(start.getDate() - 29)
    return start
  }
  return null
}

export const giftMovementsService = {
  /**
   * Busca TODAS as movimentações do período em lotes (.range()), nunca uma
   * única chamada sem paginação — PostgREST/Supabase têm um limite de
   * linhas por resposta (tipicamente 1000, não garantido), então "Todo
   * período" (sem filtro de data) poderia truncar silenciosamente. Avança
   * o offset pela quantidade REALMENTE recebida em cada lote e só encerra
   * quando um lote vier vazio — nunca por `data.length < REQUEST_SIZE`.
   *
   * Período é aplicado server-side (`.gte('created_at', ...)`) — os demais
   * filtros (produto, direção, tipo, contexto, feira) são aplicados
   * client-side pelo componente sobre este mesmo array, sem nova consulta.
   */
  async getAll({ brindeId, tipo, period = 'all' } = {}) {
    const REQUEST_SIZE = 1000
    const periodStart = getPeriodStart(period)
    const all = []
    let from = 0

    while (true) {
      let query = supabase
        .from(TABLE)
        .select('*, brindes(nome), feiras(nome)')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + REQUEST_SIZE - 1)

      if (brindeId) query = query.eq('brinde_id', brindeId)
      if (tipo) query = query.eq('tipo', tipo)
      if (periodStart) query = query.gte('created_at', periodStart.toISOString())

      const { data, error } = await query
      if (error) throw error
      if (data.length === 0) break

      all.push(...data)
      from += data.length
    }

    return all
  },

  /**
   * Única porta de entrada para alterar estoque. Delega para a função
   * `registrar_movimentacao_brinde` no banco, que bloqueia estoque negativo
   * e grava a movimentação de forma atômica (nunca um UPDATE direto no
   * frontend em brindes.estoque_atual).
   */
  async create({
    brindeId, tipo, quantidade, motivo, contextoTipo, contextoDescricao,
    feiraId, leadId, responsavelProfileId, createdBy, observacoes,
  }) {
    const { data, error } = await supabase.rpc('registrar_movimentacao_brinde', {
      p_brinde_id: brindeId,
      p_tipo: tipo,
      p_quantidade: quantidade,
      p_motivo: motivo || null,
      p_contexto_tipo: contextoTipo || null,
      p_contexto_descricao: contextoDescricao || null,
      p_feira_id: feiraId || null,
      p_lead_id: leadId || null,
      p_responsavel_profile_id: responsavelProfileId || null,
      p_created_by: createdBy || null,
      p_observacoes: observacoes || null,
    })
    if (error) throw new Error(error.message)
    return data
  },
}
