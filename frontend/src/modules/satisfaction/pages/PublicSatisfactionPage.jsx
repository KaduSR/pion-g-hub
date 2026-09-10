import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { satisfactionService } from '../services/satisfactionService'
import { SatisfactionPublicForm } from '../components/SatisfactionPublicForm'

/**
 * Página pública (sem login, sem Sidebar/AppLayout). Layout próprio,
 * pensado pra celular — é assim que o visitante vai acessar na prática,
 * pelo link/QR Code no estande.
 */
export function PublicSatisfactionPage() {
  const { publicToken } = useParams()
  const [survey, setSurvey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setLoading(true)
    satisfactionService.getPublicSurvey(publicToken)
      .then(setSurvey)
      .catch((err) => setError(err.message || 'Não foi possível carregar esta pesquisa.'))
      .finally(() => setLoading(false))
  }, [publicToken])

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      display: 'flex', justifyContent: 'center', padding: '32px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: '#1B3A6B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontWeight: 800, fontSize: 20, color: '#fff',
            fontFamily: 'Space Grotesk, sans-serif',
          }}>
            P
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Pion G Plus
          </div>
        </div>

        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)', padding: 28,
        }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: '40px 0' }}>
              Carregando pesquisa...
            </p>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: '#dc2626', fontSize: 15, fontWeight: 600, margin: 0 }}>{error}</p>
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
                Verifique se o link está correto ou entre em contato com a equipe Pion G Plus.
              </p>
            </div>
          ) : submitted ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircle2 size={48} color="#059669" style={{ marginBottom: 12 }} />
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
                Obrigado pela sua avaliação!
              </h2>
              <p style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>
                Sua opinião é muito importante para a Pion G Plus.
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
                {survey.titulo}
              </h1>
              {survey.feira_nome && (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>{survey.feira_nome}</p>
              )}
              {survey.descricao && (
                <p style={{ margin: '12px 0 0', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>{survey.descricao}</p>
              )}

              <div style={{ marginTop: 24 }}>
                <SatisfactionPublicForm
                  survey={survey}
                  publicToken={publicToken}
                  onSuccess={() => setSubmitted(true)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
