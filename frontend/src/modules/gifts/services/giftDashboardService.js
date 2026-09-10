import { supabase } from '../../../lib/supabase'

/**
 * Queries pensadas para o Dashboard "resumo operacional": carregar rápido no
 * primeiro render (poucas colunas, sem N+1) e só buscar detalhe pesado
 * (itens do kit) quando o usuário expandir uma entrega específica.
 */
export const giftDashboardService = {
  /**
   * Resumo das últimas entregas de KIT já confirmadas — usado no bloco
   * "Histórico de Kits" do Dashboard. Duas queries no total, independente
   * de quantas entregas existam: uma para os resumos (join simples) e uma
   * agregada para o valor estimado de todas elas de uma vez (nunca uma
   * consulta por entrega).
   */
  async getRecentKitDeliveries(limit = 5) {
    const { data: entregas, error } = await supabase
      .from('brinde_entregas')
      .select(`
        id, entregue_em, created_at,
        destinatario_nome, destinatario_empresa,
        brinde_kits(nome),
        leads_feira(nome, empresa),
        responsavel:user_profiles!entregue_por_profile_id(nome)
      `)
      .eq('tipo_entrega', 'kit')
      .eq('status', 'entregue')
      .order('entregue_em', { ascending: false })
      .limit(limit)

    if (error) throw error
    if (!entregas || entregas.length === 0) return []

    const ids = entregas.map((e) => e.id)
    const { data: movimentos, error: movError } = await supabase
      .from('brinde_movimentacoes')
      .select('entrega_id, quantidade, valor_unitario_snapshot')
      .in('entrega_id', ids)

    if (movError) throw movError

    const valorPorEntrega = {}
    for (const mov of movimentos || []) {
      const valor = Number(mov.quantidade || 0) * Number(mov.valor_unitario_snapshot || 0)
      valorPorEntrega[mov.entrega_id] = (valorPorEntrega[mov.entrega_id] || 0) + valor
    }

    return entregas.map((e) => ({ ...e, valorEstimado: valorPorEntrega[e.id] || 0 }))
  },

  /**
   * Detalhe completo de uma entrega, buscado somente quando o usuário
   * expande o item no Dashboard. Os itens vêm das movimentações reais
   * daquela entrega (entrega_id), não da definição atual do kit — assim
   * refletem o que foi realmente entregue, mesmo que o kit tenha sido
   * editado depois. Duas queries (entrega + suas movimentações).
   */
  async getDeliveryDetails(deliveryId) {
    const { data: entrega, error: entregaError } = await supabase
      .from('brinde_entregas')
      .select(`
        id, entregue_em, created_at,
        destinatario_nome, destinatario_empresa, destinatario_contato,
        contexto_tipo, contexto_descricao,
        brinde_kits(nome),
        feiras(nome),
        leads_feira(nome, empresa),
        responsavel:user_profiles!entregue_por_profile_id(nome)
      `)
      .eq('id', deliveryId)
      .single()

    if (entregaError) throw entregaError

    const { data: itens, error: itensError } = await supabase
      .from('brinde_movimentacoes')
      .select('id, quantidade, valor_unitario_snapshot, brindes(nome, imagem_url, valor_unitario)')
      .eq('entrega_id', deliveryId)
      .eq('tipo', 'saida')

    if (itensError) throw itensError

    // Valor por item usa o snapshot registrado na movimentação (preço não
    // muda retroativamente); só cai para o valor atual do brinde se, por
    // algum motivo, o snapshot antigo não existir.
    const itensComValor = (itens || []).map((item) => {
      const valorUnitario = item.valor_unitario_snapshot ?? item.brindes?.valor_unitario ?? 0
      return { ...item, valorTotal: Number(item.quantidade || 0) * Number(valorUnitario) }
    })

    const valorEstimado = itensComValor.reduce((acc, item) => acc + item.valorTotal, 0)

    return { entrega, itens: itensComValor, valorEstimado }
  },

  /**
   * Movimentações avulsas recentes (entrada, saída, ajuste, perda, devolução
   * que não pertencem a uma entrega de kit) para o Dashboard. Movimentações
   * de entrega de kit ficam de fora daqui — elas já aparecem agrupadas no
   * bloco de "Histórico de Kits", não devem ser listadas duas vezes.
   * Uma única consulta; o filtro por tipo de entrega é feito em memória
   * sobre um lote pequeno (sem N+1).
   */
  async getRecentGiftMovements(limit = 5) {
    const { data, error } = await supabase
      .from('brinde_movimentacoes')
      .select('id, tipo, quantidade, created_at, contexto_tipo, brindes(nome, imagem_url), feiras(nome), brinde_entregas(tipo_entrega)')
      .order('created_at', { ascending: false })
      .limit(limit * 4)

    if (error) throw error

    return (data || [])
      .filter((mov) => mov.brinde_entregas?.tipo_entrega !== 'kit')
      .slice(0, limit)
  },
}
