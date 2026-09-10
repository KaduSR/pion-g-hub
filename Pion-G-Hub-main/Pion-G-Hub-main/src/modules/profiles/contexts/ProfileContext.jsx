import { createContext, useContext } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { useProfile } from '../hooks/useProfile'

const ProfileContext = createContext(null)

/**
 * Deve ser montado DENTRO de <AuthProvider> para ter acesso ao `user`.
 * Fornece o perfil do usuário logado para toda a árvore abaixo.
 */
export function ProfileProvider({ children }) {
  // Lê o usuário autenticado do AuthContext
  const { user } = useAuth()

  // O hook cuida do load, auto-criação e mutações
  const profileState = useProfile(user)

  return (
    <ProfileContext.Provider value={profileState}>
      {children}
    </ProfileContext.Provider>
  )
}

/**
 * Hook de acesso ao contexto de perfil.
 * Retorna { profile, loading, error, saveProfile, uploadAvatar, removeAvatar, reload }
 */
export function useProfileContext() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfileContext must be used within ProfileProvider')
  return ctx
}
