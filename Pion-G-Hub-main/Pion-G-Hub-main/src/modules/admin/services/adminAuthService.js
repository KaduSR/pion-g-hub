import { supabase } from '../../../lib/supabase'
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js'

// Mensagens amigáveis por status HTTP, usadas quando a resposta da
// Edge Function não trouxer um corpo JSON com `error` legível.
const STATUS_FALLBACK_MESSAGES = {
  401: 'Sua sessão expirou. Faça login novamente.',
  403: 'Você não tem permissão para executar esta ação.',
  404: 'Registro não encontrado.',
  409: 'Já existe um usuário cadastrado com este e-mail.',
}

/**
 * Converte o erro retornado por `supabase.functions.invoke` em um Error
 * com mensagem amigável. Em `FunctionsHttpError`/`FunctionsRelayError`,
 * `error.context` é o `Response` bruto — o corpo JSON `{ error }` enviado
 * pela Edge Function precisa ser lido separadamente, senão só temos o texto
 * genérico "Edge Function returned a non-2xx status code".
 */
async function resolveInvokeError(error) {
  if (error instanceof FunctionsHttpError || error instanceof FunctionsRelayError) {
    const response = error.context
    let body = null
    try {
      body = await response.clone().json()
    } catch {
      body = null
    }

    if (body?.error) {
      return new Error(body.error)
    }

    return new Error(STATUS_FALLBACK_MESSAGES[response?.status] || 'Erro inesperado ao processar a solicitação.')
  }

  if (error instanceof FunctionsFetchError) {
    // FunctionsFetchError cobre QUALQUER falha a nível de fetch — inclusive
    // preflight de CORS bloqueado e Edge Function ausente/indisponível no
    // ambiente, casos em que "verifique sua internet" é enganoso (a conexão
    // do usuário está ok; o serviço é que não responde ali). O browser não
    // expõe a causa exata de um bloqueio de CORS por segurança, então não
    // dá pra distinguir isso de uma queda de rede real — a mensagem
    // genérica abaixo evita culpar a internet do usuário sem necessidade.
    return new Error('O serviço de administração de usuários não está disponível neste ambiente. Contate a TI.')
  }

  return new Error(error?.message || 'Erro inesperado ao processar a solicitação.')
}

async function invokeAdminAuth(body) {
  const { data, error } = await supabase.functions.invoke('admin-auth', { body })

  if (error) {
    throw await resolveInvokeError(error)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

export const adminAuthService = {
  /**
   * Redefine a senha de um usuário via Edge Function admin-auth.
   * @param {string} userId - UUID do usuário alvo
   * @param {string} newPassword - Nova senha (mínimo 8 caracteres)
   */
  async resetPassword(userId, newPassword) {
    return invokeAdminAuth({ action: 'reset_password', userId, newPassword })
  },

  /**
   * Ativa ou desativa um usuário via Edge Function admin-auth.
   * @param {string} profileId - UUID do perfil do usuário na tabela user_profiles (id)
   * @param {boolean} active - Status desejado para o usuário
   */
  async toggleUserActive(profileId, active) {
    return invokeAdminAuth({ action: 'toggle_active', profileId, active })
  },

  /**
   * Cadastra um novo usuário (Auth + user_profiles) via Edge Function admin-auth.
   * @param {{ email: string, password: string, nome: string, telefone?: string, cargo?: string, setor?: string, role: string }} userData
   */
  async createUser(userData) {
    return invokeAdminAuth({ action: 'create_user', ...userData })
  }
}
