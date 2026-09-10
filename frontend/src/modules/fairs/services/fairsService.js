import { supabase } from '../../../lib/supabase'

const TABLE = 'feiras'

export const fairsService = {
  async getAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('data_inicio', { ascending: false })
    if (error) throw error
    return data
  },

  async getActive() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, nome, status, cidade, estado, data_inicio, data_fim, responsavel, feira_equipe(profile_id, user_profiles(id, nome))')
      .in('status', ['Planejada', 'Em andamento'])
      .order('data_inicio', { ascending: true })
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single()
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

  async getAvailableTeamMembers() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, nome, email, role, setor')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) throw error
    return data.map((item) => ({
      id: item.id,
      name: item.nome,
      email: item.email,
      role: item.role,
      department: item.setor,
    }))
  },

  async getFairTeam(feiraId) {
    const { data, error } = await supabase
      .from('feira_equipe')
      .select('profile_id')
      .eq('feira_id', feiraId)
    if (error) throw error
    return data.map((row) => row.profile_id)
  },

  async saveFairTeam(feiraId, profileIds) {
    const { error: deleteError } = await supabase
      .from('feira_equipe')
      .delete()
      .eq('feira_id', feiraId)
    
    if (deleteError) throw deleteError

    if (!profileIds || profileIds.length === 0) return

    const records = profileIds.map((profileId) => ({
      feira_id: feiraId,
      profile_id: profileId,
    }))

    const { error: insertError } = await supabase
      .from('feira_equipe')
      .insert(records)
      
    if (insertError) throw insertError
  },
}
