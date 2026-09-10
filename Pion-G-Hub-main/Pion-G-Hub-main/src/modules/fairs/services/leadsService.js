import { supabase } from '../../../lib/supabase'

const TABLE = 'leads_feira'

export const leadsService = {
  /**
   * Lista leads com filtros opcionais e paginação.
   *
   * @param {string}  [createdBy]  - UUID de auth.users: restringe aos leads
   *                                 cadastrados por esse usuário (usado para vendedor).
   *                                 Quando null/undefined, retorna todos os leads
   *                                 permitidos pelas demais condições.
   */
  async getAll({
    fairId, segmento, vendedor, temperatura, search,
    createdBy,
    page = 1, pageSize = 20,
  } = {}) {
    let query = supabase
      .from(TABLE)
      .select('*, feiras(nome)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (fairId)      query = query.eq('feira_id', fairId)
    if (segmento)    query = query.eq('segmento', segmento)
    if (vendedor)    query = query.ilike('vendedor', `%${vendedor}%`)
    if (temperatura) query = query.eq('temperatura', temperatura)
    if (createdBy)   query = query.eq('created_by', createdBy)

    if (search) {
      query = query.or(
        `nome.ilike.%${search}%,empresa.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    const from = (page - 1) * pageSize
    const to   = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return { data, count, page, pageSize, totalPages: Math.ceil(count / pageSize) }
  },

  async getByFair(fairId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('feira_id', fairId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  /**
   * Todos os leads de uma feira, para exportação — nunca usar getByFair()
   * pra isso: PostgREST tem um limite de linhas por resposta (tipicamente
   * 1000, mas não é uma garantia contratual), então uma única chamada sem
   * paginação pode truncar silenciosamente feiras grandes. Busca em lotes
   * com .range(), avançando pela quantidade REALMENTE recebida em cada
   * lote (não por um tamanho de lote presumido) e só encerrando quando um
   * lote vier vazio — funciona corretamente mesmo que o servidor decida
   * devolver menos linhas do que foram pedidas em alguma chamada. RLS de
   * leads_feira já filtra as linhas pela sessão atual (mesma policy da
   * tela), então o resultado nunca extrapola o que o usuário já pode ver
   * em /leads.
   */
  async getAllByFairForExport(fairId) {
    const REQUEST_SIZE = 1000
    const all = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from(TABLE)
        .select(`
          id, nome, empresa, telefone, email, cidade, estado, segmento,
          produto_interesse, observacoes, temperatura, vendedor, status,
          created_at, origem
        `)
        .eq('feira_id', fairId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + REQUEST_SIZE - 1)

      if (error) throw error
      if (data.length === 0) break

      all.push(...data)
      from += data.length
    }

    return all
  },

  /**
   * Retorna os dados brutos usados pelos cards e gráficos do Dashboard.
   *
   * @param {string|null} [fairId]     - filtra por feira específica.
   * @param {string|null} [createdBy]  - restringe aos leads do usuário
   *                                     (UUID de auth.users). Usado para
   *                                     exibir métricas próprias ao vendedor.
   */
  async getDashboardStats(fairId, createdBy) {
    let query = supabase
      .from(TABLE)
      .select('temperatura, vendedor, segmento, feira_id, feiras(nome)')

    if (fairId)    query = query.eq('feira_id', fairId)
    if (createdBy) query = query.eq('created_by', createdBy)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async create(payload) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([payload])
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },
}
