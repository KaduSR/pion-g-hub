import { supabase } from '../../../lib/supabase'

const TABLE = 'brinde_kits'

export const giftKitsService = {
  async getAll({ ativo } = {}) {
    let query = supabase
      .from(TABLE)
      .select('*, brinde_kit_itens(id, brinde_id, quantidade, brindes(nome, estoque_atual, imagem_url))')
      .order('nome', { ascending: true })

    if (typeof ativo === 'boolean') query = query.eq('ativo', ativo)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, brinde_kit_itens(id, brinde_id, quantidade, brindes(nome, estoque_atual, imagem_url))')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(payload) {
    const { nome, descricao, contexto_sugerido } = payload
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ nome, descricao: descricao || null, contexto_sugerido: contexto_sugerido || null })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { nome, descricao, contexto_sugerido, ativo } = payload
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        nome,
        descricao: descricao || null,
        contexto_sugerido: contexto_sugerido || null,
        ativo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async toggleActive(id, ativo) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ativo, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Substitui por completo os itens do kit (delete + insert), mesmo padrão
   * usado por fairsService.saveFairTeam para feira_equipe.
   */
  async saveItems(kitId, items) {
    const { error: deleteError } = await supabase
      .from('brinde_kit_itens')
      .delete()
      .eq('kit_id', kitId)
    if (deleteError) throw deleteError

    const validItems = (items || []).filter((it) => it.brinde_id && it.quantidade > 0)
    if (validItems.length === 0) return

    const records = validItems.map((it) => ({
      kit_id: kitId,
      brinde_id: it.brinde_id,
      quantidade: it.quantidade,
    }))

    const { error: insertError } = await supabase.from('brinde_kit_itens').insert(records)
    if (insertError) throw insertError
  },
}
