import { supabase } from '../../../lib/supabase'

/**
 * Fluxo público (sem login) do tablet de autoatendimento no estande.
 * Nunca lê/escreve public.feiras ou public.leads_feira diretamente — tudo
 * passa pelas RPCs SECURITY DEFINER criadas na Sprint 3.6, que validam
 * tudo no servidor e não expõem nada além do estritamente necessário.
 */
export const kioskService = {
  async getActiveFairs() {
    const { data, error } = await supabase.rpc('get_public_kiosk_fairs')
    if (error) throw new Error(error.message)
    return data || []
  },

  async getFair(feiraId) {
    const { data, error } = await supabase.rpc('get_public_kiosk_fair', { p_feira_id: feiraId })
    if (error) throw new Error(error.message)
    return data
  },

  async getActiveSurveyToken(feiraId) {
    const { data, error } = await supabase.rpc('get_active_survey_token_for_fair', { p_feira_id: feiraId })
    if (error) throw new Error(error.message)
    return data || null
  },

  /**
   * `honeypot` deve vir sempre vazio de um visitante real — um bot que
   * preenche todos os campos de um form tende a preencher esse também.
   * Se vier preenchido, o servidor responde "sucesso" sem gravar nada.
   */
  async registerLead({ feiraId, nome, email, telefone, empresa, honeypot }) {
    const { data, error } = await supabase.rpc('register_kiosk_lead', {
      p_feira_id: feiraId,
      p_nome: nome,
      p_email: email,
      p_telefone: telefone,
      p_empresa: empresa,
      p_honeypot: honeypot || '',
    })
    if (error) throw new Error(error.message)
    return data
  },
}
