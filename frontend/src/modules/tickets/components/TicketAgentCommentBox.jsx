import React, { useState } from 'react'
import { MessageSquare, Lock } from 'lucide-react'
import { Textarea, Button } from '../../../shared/components/FormField'

/**
 * Caixa de comentário da Central de Atendimento — DUAS modalidades bem
 * distintas (nunca uma caixa ambígua com um checkbox discreto): "Responder
 * ao solicitante" (p_interno=false, vai pra timeline pública) e
 * "Adicionar nota interna" (p_interno=true, nunca chega no Portal do
 * Solicitante). O modo escolhido fica visualmente evidente antes do envio.
 *
 * `isSolicitante`: o usuário atual (mesmo sendo TI-staff, ex.: agente que
 * abriu chamado pra si mesmo) é o SOLICITANTE deste chamado específico. A
 * RPC ti_comentar_chamado já força interno=false nesse caso (regra de
 * negócio no banco, mantida como defesa em profundidade) — mas fazia isso
 * silenciosamente, sem avisar quem clicou em "Adicionar nota interna" e
 * viu a mensagem virar pública sem explicação. Aqui a opção some antes de
 * chegar a essa situação: some o botão, força o modo público e explica o
 * motivo, em vez de deixar o banco corrigir por trás sem aviso.
 */
export function TicketAgentCommentBox({ onSubmitPublic, onSubmitInternal, isSolicitante = false }) {
  const [mode, setMode] = useState('publico') // 'publico' | 'interno'
  const [mensagem, setMensagem] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Defesa em profundidade no frontend: mesmo que `mode` tenha ficado
  // 'interno' de uma renderização anterior (ex.: ticket trocado sem
  // desmontar o componente), sendo solicitante o envio nunca é interno.
  const isInternal = mode === 'interno' && !isSolicitante

  const handleSubmit = async (e) => {
    e.preventDefault()
    const texto = mensagem.trim()
    if (!texto) {
      setError('Escreva algo antes de enviar.')
      return
    }
    setError('')
    setSaving(true)
    try {
      if (isInternal) await onSubmitInternal(texto)
      else await onSubmitPublic(texto)
      setMensagem('')
    } catch (err) {
      setError(err.message || 'Erro ao enviar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setMode('publico')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            border: mode === 'publico' ? '1.5px solid #1B3A6B' : '1.5px solid #e2e8f0',
            background: mode === 'publico' ? '#eff6ff' : '#fff',
            color: mode === 'publico' ? '#1B3A6B' : '#64748b',
          }}
        >
          <MessageSquare size={14} /> Responder ao solicitante
        </button>
        {!isSolicitante && (
          <button
            type="button"
            onClick={() => setMode('interno')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: mode === 'interno' ? '1.5px solid #d97706' : '1.5px solid #e2e8f0',
              background: mode === 'interno' ? '#fffbeb' : '#fff',
              color: mode === 'interno' ? '#92400e' : '#64748b',
            }}
          >
            <Lock size={14} /> Adicionar nota interna
          </button>
        )}
      </div>

      {isSolicitante && (
        <p style={{
          fontSize: 12, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0',
          borderRadius: 8, padding: '8px 12px', margin: '0 0 10px',
        }}>
          Você é o solicitante deste chamado. Suas mensagens serão visíveis no histórico público.
        </p>
      )}

      <Textarea
        placeholder={isInternal ? 'Nota visível só para a equipe de TI...' : 'Mensagem visível para o solicitante...'}
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        error={error}
        rows={3}
        style={isInternal ? { background: '#fffbeb', borderColor: '#fde68a' } : {}}
      />
      {error && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <Button type="submit" loading={saving} variant={isInternal ? 'secondary' : 'primary'}>
          {isInternal ? 'Salvar nota interna' : 'Enviar resposta'}
        </Button>
      </div>
    </form>
  )
}
