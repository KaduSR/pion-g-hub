import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { UserPlus, Gift, QrCode, ArrowLeft, RefreshCw, SearchX } from 'lucide-react'
import { useFairsContext } from '../../fairs/contexts/FairsContext'
import { useAuth } from '../../auth/hooks/useAuth'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { useSelectedFair } from '../hooks/useSelectedFair'
import { FEATURES } from '../../../shared/config/features'
import { Button } from '../../../shared/components/FormField'
import { FairSelector } from '../components/FairSelector'
import { SelfServiceActionCard } from '../components/SelfServiceActionCard'
import { LeadCaptureForm } from '../components/LeadCaptureForm'
import { ExistingClientGiftForm } from '../components/ExistingClientGiftForm'
import { CredentialScanner } from '../components/CredentialScanner'

const VALID_TABS = ['hub', 'novo-lead', 'cliente']

/**
 * Hub interno e autenticado do Autoatendimento nas feiras — distinto da
 * rota pública /autoatendimento (kiosk, sem login, só cadastra o lead). O
 * nome da rota (/atendimento) foi escolhido justamente pra não colidir com
 * a pública, mantendo o padrão de sub-telas por `?tab=` já usado em
 * /brindes?tab=entregas, em vez de criar uma rota nova por fluxo.
 */
export function AutoServicePage() {
  const { activeFairs, loadingFairs } = useFairsContext()
  const { user } = useAuth()
  const { profile } = useProfileContext()
  const { selectedFairId, selectedFair, selectFair } = useSelectedFair(activeFairs)
  const [searchParams, setSearchParams] = useSearchParams()
  const [showScanner, setShowScanner] = useState(false)
  const { feiraId } = useParams()
  const navigate = useNavigate()

  const rawTab = searchParams.get('tab') || 'hub'
  const tab = VALID_TABS.includes(rawTab) ? rawTab : 'hub'

  const goTo = (nextTab) => setSearchParams(nextTab === 'hub' ? {} : { tab: nextTab })

  // Link copiado no card da feira (/atendimento/:feiraId — FairsPage): assim
  // que as feiras ativas carregarem, seleciona automaticamente a feira do
  // parâmetro da URL, sem exigir escolha manual. Só age quando a feira do
  // parâmetro realmente existe entre as ativas e ainda não é a selecionada
  // — evita chamar selectFair em loop a cada render.
  useEffect(() => {
    if (!feiraId || loadingFairs || activeFairs.length === 0) return

    const fairExists = activeFairs.some((fair) => fair.id === feiraId)

    if (fairExists && selectedFairId !== feiraId) {
      selectFair(feiraId)
    }
  }, [feiraId, loadingFairs, activeFairs, selectedFairId, selectFair])

  const handleChangeFair = () => {
    if (!confirm('Trocar de feira agora? Certifique-se de que não há um atendimento em andamento.')) return
    selectFair('')
    // Remove o :feiraId da URL (se houver) e qualquer ?tab= — troca de rota
    // já deixa a tela de seleção de feiras aparecer, sem precisar de goTo('hub').
    navigate('/atendimento', { replace: true })
  }

  if (!selectedFairId || !selectedFair) {
    // Feira do link não existe entre as ativas (feira encerrada, id errado,
    // ou sem acesso) — nunca cai silenciosamente em outra feira: avisa e
    // deixa o usuário escolher explicitamente.
    if (feiraId && !loadingFairs && !activeFairs.some((fair) => fair.id === feiraId)) {
      return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <SearchX size={40} color="#94a3b8" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px', fontFamily: 'Space Grotesk, sans-serif' }}>
              Feira não encontrada ou sem acesso.
            </p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
              O link usado aponta para uma feira que não está disponível para o seu usuário no momento.
            </p>
            <Button onClick={() => navigate('/atendimento', { replace: true })}>Selecionar outra feira</Button>
          </div>
        </div>
      )
    }

    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <FairSelector fairs={activeFairs} loading={loadingFairs} profile={profile} onSelect={selectFair} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Cabeçalho: feira selecionada sempre visível */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#1B3A6B', borderRadius: 16, padding: '16px 20px', marginBottom: 20, color: '#fff',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Feira selecionada
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif' }}>
              {selectedFair.nome}
            </p>
          </div>
          <button
            onClick={handleChangeFair}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)',
              border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Trocar feira
          </button>
        </div>

        {tab === 'hub' && (
          <>
            <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
              Autoatendimento
            </h1>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>
              {user?.email ? `Logado como ${user.email}` : ''}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SelfServiceActionCard
                icon={UserPlus}
                title="Cadastrar novo lead"
                subtitle="Registrar um novo visitante"
                onClick={() => goTo('novo-lead')}
              />
              <SelfServiceActionCard
                icon={Gift}
                title="Brinde para cliente"
                subtitle="Cliente já cadastrado"
                onClick={() => goTo('cliente')}
              />
              <SelfServiceActionCard
                icon={QrCode}
                title="Ler credencial"
                subtitle="Leitura por QR Code"
                disabled={!FEATURES.qrCredentialReader}
                badge={FEATURES.qrCredentialReader ? undefined : 'Em homologação'}
                onClick={() => setShowScanner(true)}
              />
            </div>
          </>
        )}

        {tab !== 'hub' && (
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <button
              onClick={() => goTo('hub')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16,
              }}
            >
              <ArrowLeft size={16} /> Voltar
            </button>

            {tab === 'novo-lead' && (
              <LeadCaptureForm feiraId={selectedFairId} feira={selectedFair} profile={profile} user={user} onDone={() => goTo('hub')} />
            )}
            {tab === 'cliente' && (
              <ExistingClientGiftForm feiraId={selectedFairId} onDone={() => goTo('hub')} />
            )}
          </div>
        )}
      </div>

      {showScanner && (
        <CredentialScanner
          onClose={() => setShowScanner(false)}
          onUseData={() => {
            // FEATURES.qrCredentialAutoFill está desligado por padrão — este
            // callback só é chamado quando um formato real for homologado e
            // a flag for ligada. Preenche o fluxo de novo lead com o que o
            // parser reconheceu.
            setShowScanner(false)
            goTo('novo-lead')
          }}
        />
      )}
    </div>
  )
}
