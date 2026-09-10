import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Copy as CopyIcon, ChevronRight, ChevronDown, ListFilter } from 'lucide-react'
import { useFairsContext } from '../../fairs/contexts/FairsContext'
import { useAuth } from '../../auth/hooks/useAuth'
import { satisfactionService } from '../services/satisfactionService'
import { CreateSurveyModal } from '../components/CreateSurveyModal'
import { SatisfactionLinkBox } from '../components/SatisfactionLinkBox'
import { SatisfactionSummaryCards } from '../components/SatisfactionSummaryCards'
import { SatisfactionResponsesTable } from '../components/SatisfactionResponsesTable'
import { SatisfactionFormBuilder } from '../components/SatisfactionFormBuilder'
import { Button, Select } from '../../../shared/components/FormField'
import { Badge } from '../../../shared/components/Badge'
import { useToast } from '../../../shared/components/Toast'

// Só um resumo enxuto aqui — a consulta/auditoria completa de respostas
// (filtros, busca, paginação) vive em /pesquisas/respostas, senão esta
// página vira gigante conforme o volume de respostas cresce.
const RECENT_RESPONSES_LIMIT = 5

function SurveyDetail({ survey, onChanged, showToast }) {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, r] = await Promise.all([
        satisfactionService.getSurveySummary(survey.id),
        satisfactionService.getResponses(survey.id, { limit: RECENT_RESPONSES_LIMIT }),
      ])
      setSummary(s)
      setResponses(r)
    } catch (err) {
      showToast('Erro ao carregar dados da pesquisa.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [survey.id])

  const handleDuplicate = async () => {
    try {
      await satisfactionService.duplicate(survey.id)
      showToast('Pesquisa duplicada! Uma nova versão editável foi criada.')
      onChanged()
    } catch (err) {
      showToast(err.message || 'Erro ao duplicar pesquisa.', 'error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SatisfactionLinkBox publicToken={survey.public_token} />

      {!loading && <SatisfactionSummaryCards summary={summary} />}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            Perguntas
          </h3>
          <Button variant="secondary" size="sm" onClick={handleDuplicate}>
            <CopyIcon size={14} /> Duplicar pesquisa
          </Button>
        </div>
        <SatisfactionFormBuilder pesquisaId={survey.id} showToast={showToast} />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            Respostas recentes
          </h3>
          <Button
            variant="secondary" size="sm"
            onClick={() => navigate(`/pesquisas/respostas?feiraId=${survey.feira_id}&pesquisaId=${survey.id}`)}
          >
            <ListFilter size={14} /> Ver todas as respostas
          </Button>
        </div>
        <SatisfactionResponsesTable responses={responses} loading={loading} />
      </div>
    </div>
  )
}

export function SatisfactionPage() {
  const { allFairs } = useFairsContext()
  const { user } = useAuth()
  const { show: showToast, ToastEl } = useToast()

  const [selectedFeiraId, setSelectedFeiraId] = useState('')
  const [surveys, setSurveys] = useState([])
  const [loadingSurveys, setLoadingSurveys] = useState(false)
  const [selectedSurveyId, setSelectedSurveyId] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const loadSurveys = async (feiraId) => {
    if (!feiraId) {
      setSurveys([])
      return
    }
    setLoadingSurveys(true)
    try {
      const data = await satisfactionService.getByFeira(feiraId)
      setSurveys(data)
    } catch (err) {
      showToast('Erro ao carregar pesquisas da feira.', 'error')
    } finally {
      setLoadingSurveys(false)
    }
  }

  useEffect(() => {
    setSelectedSurveyId(null)
    loadSurveys(selectedFeiraId)
  }, [selectedFeiraId])

  const handleCreateSurvey = async (payload) => {
    const created = await satisfactionService.create({ ...payload, createdBy: user?.id })
    showToast('Pesquisa criada com sucesso!')
    setSelectedFeiraId(payload.feiraId)
    await loadSurveys(payload.feiraId)
    setSelectedSurveyId(created.id)
  }

  const handleToggleActive = async (survey) => {
    try {
      await satisfactionService.toggleActive(survey.id, !survey.ativa)
      showToast(`Pesquisa ${!survey.ativa ? 'ativada' : 'desativada'} com sucesso!`)
      loadSurveys(selectedFeiraId)
    } catch (err) {
      showToast(err.message || 'Erro ao alterar status.', 'error')
    }
  }

  const selectedSurvey = surveys.find((s) => s.id === selectedSurveyId) || null

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      {ToastEl}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            Pesquisa de Satisfação
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Crie e acompanhe pesquisas de satisfação vinculadas a cada feira.
          </p>
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={16} /> Criar pesquisa
        </Button>
      </div>

      <div style={{
        background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0',
        marginBottom: 24, maxWidth: 360,
      }}>
        <Select value={selectedFeiraId} onChange={(e) => setSelectedFeiraId(e.target.value)}>
          <option value="">Selecione uma feira</option>
          {allFairs.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </Select>
      </div>

      {!selectedFeiraId ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          Selecione uma feira para ver ou criar pesquisas de satisfação.
        </div>
      ) : loadingSurveys ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Carregando pesquisas...</div>
      ) : surveys.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          Nenhuma pesquisa cadastrada para esta feira ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {surveys.map((survey) => {
            const expanded = selectedSurveyId === survey.id
            return (
              <div key={survey.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <button
                  onClick={() => setSelectedSurveyId(expanded ? null : survey.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {expanded ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#64748b" />}
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{survey.titulo}</div>
                      {survey.descricao && (
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{survey.descricao}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={(e) => e.stopPropagation()}>
                    <Badge color={survey.ativa ? '#059669' : '#dc2626'} bg={survey.ativa ? '#ecfdf5' : '#fef2f2'}>
                      {survey.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                    <Button variant="secondary" size="sm" onClick={() => handleToggleActive(survey)}>
                      {survey.ativa ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </button>

                {expanded && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ paddingTop: 20 }}>
                      <SurveyDetail survey={survey} onChanged={() => loadSurveys(selectedFeiraId)} showToast={showToast} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <CreateSurveyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        fairs={allFairs}
        defaultFeiraId={selectedFeiraId}
        onSave={handleCreateSurvey}
      />
    </div>
  )
}
