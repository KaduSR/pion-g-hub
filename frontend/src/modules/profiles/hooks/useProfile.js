import { useState, useEffect, useCallback } from 'react'
import { profileService } from '../services/profileService'

/**
 * Gerencia o estado do perfil do usuário autenticado.
 * @param {object|null} user - objeto auth.users vindo do AuthContext
 */
export function useProfile(user) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let data = await profileService.getByUserId(user.id)

      // Primeiro login: cria perfil padrão automaticamente
      if (!data) {
        data = await profileService.createDefault(user.id, user.email)
      }

      setProfile(data)
    } catch (e) {
      setError(e.message)
      // Não bloqueia o app — a UI usa fallbacks
    } finally {
      setLoading(false)
    }
 }, [user?.id, user?.email])

  useEffect(() => { load() }, [load])

  /**
   * Salva campos editáveis (nome, telefone, cargo, setor).
   * role, email e gestor_id são ignorados pelo service.
   */
  const saveProfile = async (values) => {
    if (!user?.id) throw new Error('Usuário não autenticado')
    const updated = await profileService.update(user.id, values)
    setProfile(updated)
    return updated
  }

  /**
   * Faz upload do avatar com path fixo, remove arquivos órfãos
   * e persiste a URL. Retorna o perfil atualizado.
   */
  const uploadAvatar = async (file) => {
    if (!user?.id) throw new Error('Usuário não autenticado')
    const updated = await profileService.uploadAvatar(user.id, file)
    setProfile(updated)
    return updated
  }

  /** Remove o avatar do Storage e limpa o perfil. */
  const removeAvatar = async () => {
    if (!user?.id) throw new Error('Usuário não autenticado')
    const updated = await profileService.deleteAvatar(user.id)
    setProfile(updated)
    return updated
  }

  return { profile, loading, error, reload: load, saveProfile, uploadAvatar, removeAvatar }
}
