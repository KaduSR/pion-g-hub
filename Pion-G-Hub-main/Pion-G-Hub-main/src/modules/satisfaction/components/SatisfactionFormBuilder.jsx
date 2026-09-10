import React, { useState, useEffect } from 'react'
import { satisfactionService } from '../services/satisfactionService'
import { SatisfactionQuestionEditor } from './SatisfactionQuestionEditor'

/**
 * Lista + editor de perguntas de uma pesquisa. Bloqueia edição estrutural
 * (adicionar/remover/reordenar/mudar tipo ou obrigatoriedade) assim que a
 * pesquisa já tiver ao menos uma resposta — a trava real é no service
 * (assertNoResponses), aqui só refletimos visualmente.
 */
export function SatisfactionFormBuilder({ pesquisaId, showToast }) {
  const [questions, setQuestions] = useState([])
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [qs, hasResponses] = await Promise.all([
        satisfactionService.listQuestions(pesquisaId),
        satisfactionService.hasResponses(pesquisaId),
      ])
      setQuestions(qs)
      setLocked(hasResponses)
    } catch (err) {
      showToast('Erro ao carregar perguntas.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [pesquisaId])

  const handleAdd = async (payload) => {
    await satisfactionService.createQuestion(pesquisaId, { ...payload, ordem: questions.length })
    showToast('Pergunta adicionada!')
    load()
  }

  const handleUpdate = async (questionId, payload) => {
    await satisfactionService.updateQuestion(questionId, payload)
    showToast('Pergunta atualizada!')
    load()
  }

  const handleDelete = async (questionId) => {
    try {
      await satisfactionService.deleteQuestion(questionId)
      showToast('Pergunta removida.')
      load()
    } catch (err) {
      showToast(err.message || 'Erro ao remover pergunta.', 'error')
    }
  }

  const handleMove = async (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= questions.length) return
    const reordered = [...questions]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)
    setQuestions(reordered)
    try {
      await satisfactionService.reorderQuestions(pesquisaId, reordered.map((q) => q.id))
    } catch (err) {
      showToast(err.message || 'Erro ao reordenar perguntas.', 'error')
      load()
    }
  }

  if (loading) {
    return <p style={{ color: '#94a3b8', fontSize: 14 }}>Carregando perguntas...</p>
  }

  return (
    <div>
      {locked && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e',
          padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500,
        }}>
          Esta pesquisa já recebeu respostas. As perguntas ficam bloqueadas para edição estrutural —
          duplique a pesquisa (na listagem) para criar uma nova versão editável.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {questions.map((q, index) => (
          <SatisfactionQuestionEditor
            key={q.id}
            question={q}
            locked={locked}
            isFirst={index === 0}
            isLast={index === questions.length - 1}
            onSave={(payload) => handleUpdate(q.id, payload)}
            onDelete={() => handleDelete(q.id)}
            onMoveUp={() => handleMove(index, -1)}
            onMoveDown={() => handleMove(index, 1)}
          />
        ))}

        {questions.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Nenhuma pergunta cadastrada ainda.</p>
        )}
      </div>

      {!locked && (
        <SatisfactionQuestionEditor isNew onSave={handleAdd} />
      )}
    </div>
  )
}
