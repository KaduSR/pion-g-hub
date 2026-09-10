import { supabase } from '../../../lib/supabase'

const TABLE = 'brinde_entregas'

function gerarCodigoComprovante() {
  const aleatorio = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`)
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase()
  return `BR-${aleatorio}`
}

export const giftDeliveriesService = {
  async getAll({ status, feiraId } = {}) {
    let query = supabase
      .from(TABLE)
      // brinde_entrega_itens (Sprint 3.7): entregas antigas (formato de
      // brinde_id único na própria linha) voltam com array vazio aqui —
      // o front usa isso pra decidir qual formato renderizar.
      // entregue_por: alias explícito porque brinde_entregas tem duas FKs
      // pra user_profiles (entregue_por_profile_id e created_by) — sem o
      // hint `!entregue_por_profile_id`, o embed fica ambíguo pro PostgREST.
      .select('*, brindes(nome), brinde_kits(nome), feiras(nome), leads_feira(nome, empresa), brinde_entrega_itens(brinde_id, quantidade, brindes(nome)), entregue_por:user_profiles!entregue_por_profile_id(nome)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (feiraId) query = query.eq('feira_id', feiraId)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  /**
   * Registra a liberação de uma entrega (kit ou item avulso). Não altera
   * estoque — a baixa só acontece em `confirm`, quando a entrega vira
   * "entregue".
   */
  async create(payload) {
    const {
      tipoEntrega, kitId, brindeId, quantidade, feiraId, leadId,
      destinatarioNome, destinatarioEmpresa, destinatarioContato,
      contextoTipo, contextoDescricao, createdBy, observacoes,
    } = payload

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        tipo_entrega: tipoEntrega,
        kit_id: tipoEntrega === 'kit' ? kitId : null,
        brinde_id: tipoEntrega === 'item_avulso' ? brindeId : null,
        quantidade: tipoEntrega === 'item_avulso' ? quantidade : null,
        feira_id: feiraId || null,
        lead_id: leadId || null,
        destinatario_nome: destinatarioNome || null,
        destinatario_empresa: destinatarioEmpresa || null,
        destinatario_contato: destinatarioContato || null,
        contexto_tipo: contextoTipo || null,
        contexto_descricao: contextoDescricao || null,
        codigo_comprovante: gerarCodigoComprovante(),
        created_by: createdBy || null,
        observacoes: observacoes || null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Confirma a entrega e dispara a baixa de estoque (via função no banco).
   * Se algum item não tiver estoque suficiente, a função inteira falha e
   * nenhuma baixa parcial é aplicada — a mensagem de erro do banco já é
   * clara o suficiente para exibir diretamente ao usuário.
   */
  async confirm(entregaId, entreguePorProfileId) {
    const { data, error } = await supabase.rpc('confirmar_entrega_brinde', {
      p_entrega_id: entregaId,
      p_entregue_por_profile_id: entreguePorProfileId || null,
    })
    if (error) throw new Error(error.message)
    return data
  },

  /**
   * Cancela uma entrega ainda não confirmada. O filtro `.eq('status', 'liberado')`
   * garante que uma entrega já entregue/cancelada não seja sobrescrita.
   */
  async cancel(entregaId) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ status: 'cancelado' })
      .eq('id', entregaId)
      .eq('status', 'liberado')
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Esta entrega não pode mais ser cancelada.')
    return data
  },

  /**
   * Sprint 3.7 — entrega vinculada a uma feira: sempre exige feira + lead,
   * já registra como "entregue" (sem etapa de confirmação separada, porque
   * no estande a entrega é um ato único) e debita o saldo local da feira
   * via RPC `registrar_entrega_brinde_feira` (SECURITY DEFINER). O usuário
   * que liberou é resolvido no servidor a partir do usuário autenticado —
   * nunca enviado pelo cliente.
   *
   * `itens`: obrigatório para tipoEntrega 'item_avulso', formato
   * [{ brindeId, quantidade }, ...]. Ignorado para 'kit'.
   *
   * `tipoDestinatario` (Autoatendimento): 'lead' (default, exige leadId) ou
   * 'cliente_existente' (exige destinatarioNome/destinatarioEmpresa, sem
   * leadId). Para 'cliente_existente', o banco faz uma checagem "soft" de
   * possível duplicidade e pode retornar `{ possivel_duplicata: true, ... }`
   * em vez de gravar — nesse caso, chamar de novo com
   * `confirmarDuplicidade: true` para efetivar a entrega mesmo assim.
   */
  async deliverAtFair({
    feiraId, leadId, tipoEntrega, kitId, itens, observacoes, origem,
    tipoDestinatario, destinatarioNome, destinatarioEmpresa, destinatarioContato,
    confirmarDuplicidade, quantidadeKits,
  }) {
    const { data, error } = await supabase.rpc('registrar_entrega_brinde_feira', {
      p_feira_id: feiraId,
      p_lead_id: tipoDestinatario === 'cliente_existente' ? null : (leadId || null),
      p_tipo_entrega: tipoEntrega,
      p_kit_id: tipoEntrega === 'kit' ? kitId : null,
      p_itens: tipoEntrega === 'item_avulso'
        ? (itens || []).map((i) => ({ brinde_id: i.brindeId, quantidade: i.quantidade }))
        : null,
      p_observacoes: observacoes || null,
      p_origem: origem || 'interno',
      p_tipo_destinatario: tipoDestinatario || 'lead',
      p_destinatario_nome: tipoDestinatario === 'cliente_existente' ? (destinatarioNome || null) : null,
      p_destinatario_empresa: tipoDestinatario === 'cliente_existente' ? (destinatarioEmpresa || null) : null,
      p_destinatario_contato: tipoDestinatario === 'cliente_existente' ? (destinatarioContato || null) : null,
      p_confirmar_duplicidade: !!confirmarDuplicidade,
      p_quantidade_kits: tipoEntrega === 'kit' ? (Number(quantidadeKits) || 1) : 1,
    })
    if (error) throw new Error(error.message)
    return data
  },
}
