import React, { useState } from 'react'
import { FormField, Input, Textarea } from '../../../shared/components/FormField'
import { SatisfactionRatingInput } from './SatisfactionRatingInput'
import { SatisfactionNpsInput } from './SatisfactionNpsInput'
import { satisfactionService } from '../services/satisfactionService'
import { RESPONDENT_METRIC_KEYS } from '../constants/satisfactionDefaults'

function isAnswerEmpty(answer) {
  return !answer || (!answer.valor_texto?.trim() && answer.valor_numero == null && !answer.valor_opcao)
}

function renderInput(question, answer, onChange) {
  switch (question.tipo) {
    case 'rating_1_5':
      return (
        <SatisfactionRatingInput
          value={answer?.valor_numero ?? null}
          onChange={(n) => onChange({ valor_numero: n })}
        />
      )
    case 'nps_0_10':
      return (
        <SatisfactionNpsInput
          value={answer?.valor_numero ?? null}
          onChange={(n) => onChange({ valor_numero: n })}
        />
      )
    case 'single_choice':
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(question.opcoes || []).map((opt) => {
            const selected = answer?.valor_opcao === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ valor_opcao: opt })}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  border: selected ? '2px solid #1B3A6B' : '1.5px solid #e2e8f0',
                  background: selected ? '#1B3A6B' : '#fff',
                  color: selected ? '#fff' : '#334155',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )
    case 'long_text':
      return (
        <Textarea
          value={answer?.valor_texto || ''}
          onChange={(e) => onChange({ valor_texto: e.target.value })}
          placeholder="Sua resposta"
          style={{ minHeight: 100 }}
        />
      )
    case 'short_text':
    default:
      return (
        <Input
          value={answer?.valor_texto || ''}
          onChange={(e) => onChange({ valor_texto: e.target.value })}
          placeholder="Sua resposta"
        />
      )
  }
}

function buildRespondent(perguntas, answers) {
  const byMetricKey = {}
  for (const q of perguntas) {
    if (!q.metric_key) continue
    const a = answers[q.id]
    if (a?.valor_texto) byMetricKey[q.metric_key] = a.valor_texto
  }
  return {
    nome: byMetricKey[RESPONDENT_METRIC_KEYS.NOME] || null,
    empresa: byMetricKey[RESPONDENT_METRIC_KEYS.EMPRESA] || null,
    cargo: byMetricKey[RESPONDENT_METRIC_KEYS.CARGO] || null,
    telefone: byMetricKey[RESPONDENT_METRIC_KEYS.TELEFONE] || null,
    email: byMetricKey[RESPONDENT_METRIC_KEYS.EMAIL] || null,
  }
}

/**
 * Renderiza as perguntas dinamicamente e envia via RPC. A validação aqui é
 * só UX — a validação que realmente conta (obrigatórias, faixas de
 * rating/nps, opções válidas) acontece dentro de submit_satisfaction_survey_response.
 */
export function SatisfactionPublicForm({ survey, publicToken, onSuccess }) {
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const setAnswer = (perguntaId, value) => {
    setAnswers((prev) => ({ ...prev, [perguntaId]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const missing = survey.perguntas.some((q) => q.obrigatoria && isAnswerEmpty(answers[q.id]))
    if (missing) {
      setError('Por favor, responda todas as perguntas obrigatórias.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      const respondent = buildRespondent(survey.perguntas, answers)
      const answerList = survey.perguntas
        .filter((q) => !isAnswerEmpty(answers[q.id]))
        .map((q) => ({ pergunta_id: q.id, ...answers[q.id] }))

      await satisfactionService.submitResponse(publicToken, respondent, answerList)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Erro ao enviar sua avaliação. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c',
          padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 20, fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      {survey.perguntas.map((q) => (
        <FormField key={q.id} label={q.titulo} required={q.obrigatoria}>
          {q.descricao && (
            <p style={{ margin: '-4px 0 8px', fontSize: 12, color: '#94a3b8' }}>{q.descricao}</p>
          )}
          {renderInput(q, answers[q.id], (value) => setAnswer(q.id, value))}
        </FormField>
      ))}

      <button
        type="submit"
        disabled={submitting}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
          background: '#1B3A6B', color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 8,
        }}
      >
        {submitting ? 'Enviando...' : 'Enviar avaliação'}
      </button>
    </form>
  )
}
