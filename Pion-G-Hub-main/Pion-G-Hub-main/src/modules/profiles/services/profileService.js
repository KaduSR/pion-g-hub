import { supabase } from '../../../lib/supabase'

const TABLE  = 'user_profiles'
const BUCKET = 'assets'

// Retorna o path fixo do avatar de um usuário, sem extensão.
// Exemplo: "avatars/abc-123/avatar"
const avatarFolder = (userId) => `avatars/${userId}`
const avatarPath   = (userId, ext) => `${avatarFolder(userId)}/avatar.${ext}`

export const profileService = {
  // ─── Perfil ────────────────────────────────────────────────────────────────

  /** Busca o perfil pelo user_id. Retorna null no primeiro login. */
  async getByUserId(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  },

  /**
   * Cria perfil padrão no primeiro login.
   * role = 'vendedor' (menor privilégio por padrão).
   */
  async createDefault(userId, email) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{
        user_id: userId,
        email,
        nome:  email.split('@')[0],
        role:  'vendedor',
        ativo: true,
      }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Atualiza campos editáveis pelo próprio usuário.
   * Whitelist explícita: role, email e gestor_id nunca são tocados aqui.
   */
  async update(userId, payload) {
    const { nome, telefone, cargo, setor } = payload
    const { data, error } = await supabase
      .from(TABLE)
      .update({ nome, telefone, cargo, setor, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // ─── Avatar ────────────────────────────────────────────────────────────────

  /**
   * Faz upload do avatar com path fixo por usuário:
   *   assets/avatars/{userId}/avatar.{ext}
   *
   * Antes do upload, lista e remove qualquer arquivo existente na pasta
   * do usuário para evitar órfãos quando a extensão mudar (ex: .jpg → .png).
   * Usa upsert:true como segunda camada de proteção para mesma extensão.
   *
   * Persiste a URL pública no perfil e retorna o perfil atualizado.
   */
  async uploadAvatar(userId, file) {
    const ext  = file.name.split('.').pop().toLowerCase()
    const path = avatarPath(userId, ext)

    // Remove arquivos existentes na pasta do usuário (cobre troca de extensão)
    await profileService._clearAvatarFolder(userId)

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) throw upErr

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    // Persiste URL no perfil
    const { data, error } = await supabase
      .from(TABLE)
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Remove avatar do Storage e limpa avatar_url no perfil.
   * Retorna o perfil atualizado.
   */
  async deleteAvatar(userId) {
    // Remove todos os arquivos da pasta do usuário
    await profileService._clearAvatarFolder(userId)

    const { data, error } = await supabase
      .from(TABLE)
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // ─── Interno ───────────────────────────────────────────────────────────────

  /**
   * Lista e remove todos os arquivos em avatars/{userId}/.
   * Não lança erro se a pasta estiver vazia ou não existir.
   */
  async _clearAvatarFolder(userId) {
    try {
      const { data: files } = await supabase.storage
        .from(BUCKET)
        .list(avatarFolder(userId))

      if (files?.length) {
        const paths = files.map((f) => `${avatarFolder(userId)}/${f.name}`)
        await supabase.storage.from(BUCKET).remove(paths)
      }
    } catch (_) {
      // Não crítico — o upload prossegue mesmo se a limpeza falhar
    }
  },
}
