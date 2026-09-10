import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Mail, Lock, LogIn } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.email.trim() || !form.password.trim()) {
      setError('Preencha todos os campos')
      return
    }

    setLoading(true)
    try {
      await login(form.email, form.password)
      // Sprint 3.7: se o usuário foi redirecionado pro login a partir de uma
      // rota protegida (ex: botão "Liberar Brinde" do autoatendimento com o
      // usuário deslogado), volta pra ela em vez de sempre cair em "/".
      const destination = location.state?.from
      navigate(destination || '/', { replace: true })
    } catch (err) {
      setError(err.message || 'Email ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: 32,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '48px 40px',
        maxWidth: 420,
        width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: '#1B3A6B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <LogIn size={32} color="#fff" />
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: '#0f172a',
            fontFamily: 'Space Grotesk, sans-serif',
            letterSpacing: '-0.02em',
          }}>
            Pion G Marketing Hub
          </h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
            Faça login para continuar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }} />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="seu@email.com"
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 44px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none',
                  transition: 'all 0.15s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#1B3A6B'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
            }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }} />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 44px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none',
                  transition: 'all 0.15s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#1B3A6B'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              color: '#dc2626',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: loading ? '#94a3b8' : '#1B3A6B',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = '#0f2744'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.background = '#1B3A6B'
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
