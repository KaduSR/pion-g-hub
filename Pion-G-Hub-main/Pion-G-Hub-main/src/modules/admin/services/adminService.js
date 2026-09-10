import { supabase } from '../../../lib/supabase'

const TABLE = 'user_profiles'

export const adminService = {
  /**
   * Busca todos os perfis de usuários cadastrados.
   */
  async getAllUsers() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('nome', { ascending: true })
    
    if (error) throw error
    return data
  },

  /**
   * Atualiza as permissões e dados administrativos de um usuário.
   */
  async updateUser(id, payload) {
    const { cargo, setor, role, ativo } = payload
    const { data, error } = await supabase
      .from(TABLE)
      .update({ 
        cargo, 
        setor, 
        role, 
        ativo, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    return data
  }
}
