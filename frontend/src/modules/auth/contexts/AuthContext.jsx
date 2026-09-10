import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'
import { LoadingScreen } from '../../../shared/components/LoadingScreen'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.getCurrentSession()
      .then((session) => {
        setSession(session)
        setUser(session?.user ?? null)
      })
      .catch((error) => {
        console.error('[AuthContext] Erro ao carregar sessão:', error)
        setSession(null)
        setUser(null)
      })
      .finally(() => setLoading(false))

    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { session, user } = await authService.signIn(email, password)
    setSession(session)
    setUser(user)
    return { session, user }
  }

  const logout = async () => {
    await authService.signOut()
    setSession(null)
    setUser(null)
  }

  if (loading) return <LoadingScreen />

  return (
    <AuthContext.Provider value={{ user, session, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
