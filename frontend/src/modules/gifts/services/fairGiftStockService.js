import { supabase } from '../../../lib/supabase'

const TABLE = 'brinde_feira_estoque'

/**
 * Livro-razão local de brindes por feira (Sprint 3.7). Saldo disponível =
 * quantidade_enviada - quantidade_entregue - quantidade_perda + quantidade_retorno.
 * Retorno/perda ainda não têm fluxo de UI (fica pro fechamento de feira,
 * sprint futura) — o cálculo já contempla os campos pra não exigir migração.
 */
export function computeSaldo(row) {
  return (
    (row?.quantidade_enviada || 0)
    - (row?.quantidade_entregue || 0)
    - (row?.quantidade_perda || 0)
    + (row?.quantidade_retorno || 0)
  )
}

/**
 * P1.2 — decompõe, por produto, a origem das unidades já contabilizadas em
 * quantidade_entregue (P1.1): quanto veio de cada kit x quanto veio avulso.
 * Nunca somar com quantidade_entregue — é o mesmo total, só detalhado.
 *
 * Agrupa por brinde_id + origem, somando SEMPRE brinde_entrega_itens.quantidade
 * (já vem pré-multiplicada por p_quantidade_kits quando aplicável) — nunca
 * brinde_entregas.quantidade, que é só informativo/nº de kits da entrega.
 * Ordenação: kits por quantidade decrescente, depois "Origem não
 * identificada" (fallback defensivo), depois "Avulso" por último.
 */
function classifyOrigin(entrega) {
  if (entrega?.tipo_entrega === 'kit') return entrega.brinde_kits?.nome || 'Kit não identificado'
  if (entrega?.tipo_entrega === 'item_avulso') return 'Avulso'
  // Fallback puramente defensivo — não deveria ocorrer, já que
  // brinde_entregas.tipo_entrega é NOT NULL + CHECK IN ('kit','item_avulso')
  // desde a criação da tabela. Nunca inferir "Avulso" por omissão.
  return 'Origem não identificada'
}

export function aggregateDeliveryOrigins(rows) {
  const porBrinde = {}

  for (const row of rows) {
    const origem = classifyOrigin(row.brinde_entregas)

    if (!porBrinde[row.brinde_id]) porBrinde[row.brinde_id] = {}
    porBrinde[row.brinde_id][origem] = (porBrinde[row.brinde_id][origem] || 0) + (row.quantidade || 0)
  }

  const resultado = {}
  for (const [brindeId, porOrigem] of Object.entries(porBrinde)) {
    const entradas = Object.entries(porOrigem).map(([origem, quantidade]) => ({ origem, quantidade }))
    entradas.sort((a, b) => {
      const rank = (o) => (o === 'Avulso' ? 2 : o === 'Origem não identificada' ? 1 : 0)
      const rankDiff = rank(a.origem) - rank(b.origem)
      if (rankDiff !== 0) return rankDiff
      return rank(a.origem) === 0 ? b.quantidade - a.quantidade : 0
    })
    resultado[brindeId] = entradas
  }
  return resultado
}

export const fairGiftStockService = {
  async getByFair(feiraId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, brindes(nome, imagem_url, estoque_atual)')
      .eq('feira_id', feiraId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  /**
   * Uma única consulta para toda a feira — nunca por produto/linha (evita
   * N+1). NÃO filtra por status: quantidade_entregue (P1.1) é append-only,
   * então a decomposição precisa somar tudo que já foi gravado em
   * brinde_entrega_itens para continuar batendo com o agregado canônico.
   */
  async getDeliveryOriginsByFair(feiraId) {
    const { data, error } = await supabase
      .from('brinde_entrega_itens')
      .select('brinde_id, quantidade, brinde_entregas!inner(tipo_entrega, kit_id, feira_id, brinde_kits(nome))')
      .eq('brinde_entregas.feira_id', feiraId)
    if (error) throw error
    return aggregateDeliveryOrigins(data)
  },

  /**
   * P1.3 — eventos de entrega da feira (não agregado, não decomposto por
   * produto): 1 objeto por entrega, com seus itens físicos embutidos. Raiz
   * é brinde_entregas (não brinde_entrega_itens) porque os indicadores
   * "Entregas realizadas"/"Kits entregues"/"Entregas avulsas" contam
   * EVENTOS, não itens — partir de brinde_entrega_itens duplicaria a
   * contagem de entregas com mais de 1 componente físico.
   *
   * Uma única consulta por feira. NÃO filtra por status nem por período —
   * o filtro Hoje/Evento inteiro é aplicado inteiramente client-side em
   * cima deste mesmo array, sem nova requisição ao trocar de período.
   */
  async getDeliveryEventsByFair(feiraId) {
    const { data, error } = await supabase
      .from('brinde_entregas')
      .select('id, tipo_entrega, quantidade, entregue_em, feira_id, brinde_entrega_itens(brinde_id, quantidade)')
      .eq('feira_id', feiraId)
    if (error) throw error
    return data
  },

  /**
   * Baixa o estoque central (via registrar_movimentacao_brinde, dentro da
   * RPC) e soma a quantidade enviada no livro-razão da feira, de forma
   * atômica. Restrito a is_gifts_manager() no banco — vendedor não ajusta carga.
   */
  async addStock({ feiraId, brindeId, quantidade, observacoes, createdBy }) {
    const { data, error } = await supabase.rpc('registrar_carga_feira', {
      p_feira_id: feiraId,
      p_brinde_id: brindeId,
      p_quantidade: quantidade,
      p_observacoes: observacoes || null,
      p_created_by: createdBy || null,
    })
    if (error) throw new Error(error.message)
    return data
  },
}
