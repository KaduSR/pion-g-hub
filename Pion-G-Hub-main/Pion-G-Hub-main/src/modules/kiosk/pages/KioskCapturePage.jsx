import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User, Building2, Phone, Mail, CheckCircle, MapPin, Star, RotateCcw, Gift } from 'lucide-react'
import { kioskService } from '../services/kioskService'
import { FormField, Input, Button } from '../../../shared/components/FormField'
import { formatPhone } from '../../../shared/utils/helpers'

const EMPTY_FORM = { nome: '', empresa: '', telefone: '', email: '' }

// Tempo mínimo em tela antes de aceitar o submit — um humano lendo e
// preenchendo 4 campos sempre leva mais que isso; um bot que auto-envia o
// form assim que ele existe no DOM, não. Nada é mostrado ao usuário sobre
// isso (não tem por quê), só o botão não reage antes da hora.
const MIN_FILL_TIME_MS = 1500

// Tempo até o formulário limpar sozinho depois de um cadastro, pronto pro
// próximo visitante — importante num tablet fixo sem atendente por perto.
const AUTO_RESET_MS = 15000

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function KioskCapturePage() {
  const { feiraId: feiraIdFromUrl } = useParams()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('loading') // loading | select-fair | form | success | error
  const [loadError, setLoadError] = useState('')
  const [fairs, setFairs] = useState([])
  const [selectedFair, setSelectedFair] = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [surveyToken, setSurveyToken] = useState(null)
  const [lastName, setLastName] = useState('')
  const [lastLeadId, setLastLeadId] = useState(null)

  const mountedAtRef = useRef(Date.now())
  const firstFieldRef = useRef(null)
  const resetTimerRef = useRef(null)

  // Carrega a feira (se veio pré-definida no link) ou a lista de feiras
  // abertas pra escolher.
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        if (feiraIdFromUrl) {
          const fair = await kioskService.getFair(feiraIdFromUrl)
          if (cancelled) return
          setSelectedFair(fair)
          setPhase('form')
        } else {
          const list = await kioskService.getActiveFairs()
          if (cancelled) return
          setFairs(list)
          setPhase(list.length === 1 ? 'form' : 'select-fair')
          if (list.length === 1) setSelectedFair(list[0])
        }
      } catch (err) {
        if (cancelled) return
        setLoadError(err.message || 'Não foi possível carregar as feiras disponíveis.')
        setPhase('error')
      }
    }

    load()
    return () => { cancelled = true }
  }, [feiraIdFromUrl])

  useEffect(() => {
    if (phase === 'form') {
      mountedAtRef.current = Date.now()
      firstFieldRef.current?.focus()
    }
  }, [phase])

  useEffect(() => () => clearTimeout(resetTimerRef.current), [])

  const handleSelectFair = (fair) => {
    setSelectedFair(fair)
    setPhase('form')
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const setPhone = (e) => setForm((f) => ({ ...f, telefone: formatPhone(e.target.value) }))

  const validate = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (!form.empresa.trim()) e.empresa = 'Empresa é obrigatória'
    if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório'
    if (!form.email.trim()) e.email = 'E-mail é obrigatório'
    else if (!isValidEmail(form.email.trim())) e.email = 'E-mail inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const resetForNextVisitor = useCallback(() => {
    clearTimeout(resetTimerRef.current)
    setForm(EMPTY_FORM)
    setHoneypot('')
    setErrors({})
    setSurveyToken(null)
    setLastName('')
    setLastLeadId(null)
    setPhase(feiraIdFromUrl ? 'form' : (fairs.length === 1 ? 'form' : 'select-fair'))
  }, [feiraIdFromUrl, fairs.length])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    if (Date.now() - mountedAtRef.current < MIN_FILL_TIME_MS) return // provável bot — ignora silenciosamente
    if (!validate()) return

    setSaving(true)
    try {
      const result = await kioskService.registerLead({
        feiraId: selectedFair.id,
        nome: form.nome.trim(),
        empresa: form.empresa.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        honeypot,
      })

      setLastName(result?.nome || form.nome.trim())
      setLastLeadId(result?.lead_id || null)

      const token = await kioskService.getActiveSurveyToken(selectedFair.id).catch(() => null)
      setSurveyToken(token)

      setPhase('success')
      resetTimerRef.current = setTimeout(resetForNextVisitor, AUTO_RESET_MS)
    } catch (err) {
      setErrors({ submit: err.message || 'Erro ao registrar cadastro. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  const openSurvey = () => {
    if (!surveyToken) return
    window.open(`${window.location.origin}/pesquisa/${surveyToken}`, '_blank', 'noopener')
  }

  // A rota pública /autoatendimento NUNCA libera brinde — este botão só
  // abre a rota interna autenticada (/brindes), pré-preenchida com o lead
  // e a feira. Se o atendente não estiver logado, o ProtectedRoute manda
  // pro login e devolve pra cá depois (ver AppRoutes.jsx/LoginPage.jsx). A
  // liberação em si só acontece lá dentro, com usuário autenticado.
  const handleReleaseGift = () => {
    if (!lastLeadId || !selectedFair) return
    navigate(`/brindes?tab=entregas&leadId=${lastLeadId}&feiraId=${selectedFair.id}&source=kiosk`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      padding: '24px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ maxWidth: 560, width: '100%', marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{
          color: '#fff', margin: 0, fontSize: 30, fontWeight: 700,
          fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.02em',
        }}>
          Pion G Plus
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 16, margin: '6px 0 0' }}>
          {phase === 'select-fair' ? 'Selecione o evento' : 'Cadastre-se e fique por dentro das novidades'}
        </p>
      </div>

      <div style={{ maxWidth: 560, width: '100%' }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: 32,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}>
          {phase === 'loading' && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 16, padding: '32px 0' }}>
              Carregando...
            </p>
          )}

          {phase === 'error' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: '#dc2626', fontSize: 17, fontWeight: 600, margin: 0 }}>{loadError}</p>
              <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>
                Chame um de nossos colaboradores para te ajudar.
              </p>
            </div>
          )}

          {phase === 'select-fair' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {fairs.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 15 }}>
                  Nenhum evento disponível para cadastro no momento.
                </p>
              ) : (
                fairs.map((fair) => (
                  <button
                    key={fair.id}
                    type="button"
                    onClick={() => handleSelectFair(fair)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '18px 20px', borderRadius: 14,
                      border: '2px solid #e2e8f0', background: '#f8fafc',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = '#1B3A6B'; ev.currentTarget.style.background = '#eef2ff' }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = '#e2e8f0'; ev.currentTarget.style.background = '#f8fafc' }}
                  >
                    <MapPin size={22} color="#1B3A6B" />
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{fair.nome}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{fair.cidade} — {fair.estado}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {phase === 'form' && selectedFair && (
            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
                color: '#64748b', fontSize: 14, fontWeight: 600,
              }}>
                <MapPin size={16} />
                {selectedFair.nome}
              </div>

              {/* Honeypot: invisível e inacessível a um usuário real (fora da tela,
                  sem tab, sem leitor de tela) — só um bot preencheria isso. */}
              <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
                <label htmlFor="website">Não preencher</label>
                <input
                  id="website" name="website" type="text" tabIndex={-1} autoComplete="off"
                  value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <FormField label="Nome" required error={errors.nome}>
                <div style={{ position: 'relative' }}>
                  <User size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <Input
                    large ref={firstFieldRef} value={form.nome} onChange={set('nome')}
                    placeholder="Seu nome completo" error={errors.nome}
                    style={{ paddingLeft: 48, fontSize: 18 }}
                  />
                </div>
              </FormField>

              <FormField label="Empresa" required error={errors.empresa}>
                <div style={{ position: 'relative' }}>
                  <Building2 size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <Input
                    large value={form.empresa} onChange={set('empresa')}
                    placeholder="Nome da empresa" error={errors.empresa}
                    style={{ paddingLeft: 48, fontSize: 18 }}
                  />
                </div>
              </FormField>

              <FormField label="Telefone" required error={errors.telefone}>
                <div style={{ position: 'relative' }}>
                  <Phone size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <Input
                    large type="tel" value={form.telefone} onChange={setPhone}
                    placeholder="(00) 00000-0000" error={errors.telefone}
                    style={{ paddingLeft: 48, fontSize: 18 }}
                  />
                </div>
              </FormField>

              <FormField label="E-mail" required error={errors.email}>
                <div style={{ position: 'relative' }}>
                  <Mail size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <Input
                    large type="email" value={form.email} onChange={set('email')}
                    placeholder="seuemail@empresa.com" error={errors.email}
                    style={{ paddingLeft: 48, fontSize: 18 }}
                  />
                </div>
              </FormField>

              {errors.submit && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, color: '#dc2626', fontSize: 14, marginBottom: 16 }}>
                  {errors.submit}
                </div>
              )}

              <Button type="submit" fullWidth size="xl" loading={saving} style={{ marginTop: 8 }}>
                {saving ? 'Enviando…' : 'Concluir cadastro'}
              </Button>

              {!feiraIdFromUrl && fairs.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPhase('select-fair')}
                  style={{ display: 'block', margin: '14px auto 0', background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}
                >
                  Trocar evento
                </button>
              )}
            </form>
          )}

          {phase === 'success' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: 76, height: 76, background: '#ecfdf5', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
              }}>
                <CheckCircle size={40} color="#10b981" />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
                Obrigado{lastName ? `, ${lastName.split(' ')[0]}` : ''}!
              </h2>
              <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 24px' }}>
                Seu cadastro foi realizado com sucesso.
              </p>

              {surveyToken && (
                <Button fullWidth size="lg" variant="secondary" onClick={openSurvey} style={{ marginBottom: 12 }}>
                  <Star size={18} /> Responder pesquisa de satisfação
                </Button>
              )}

              {lastLeadId && (
                <Button fullWidth size="lg" variant="secondary" onClick={handleReleaseGift} style={{ marginBottom: 12 }}>
                  <Gift size={18} /> Liberar Brinde
                </Button>
              )}

              <Button fullWidth size="lg" onClick={resetForNextVisitor}>
                <RotateCcw size={16} /> Novo cadastro
              </Button>

              <p style={{ color: '#cbd5e1', fontSize: 12, marginTop: 16 }}>
                Esta tela será liberada automaticamente em instantes…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
