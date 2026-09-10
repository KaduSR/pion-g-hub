import React, { useState } from 'react'
import { Textarea, Button } from '../../../shared/components/FormField'

/** Seção 6 — solicitante comenta no próprio chamado. */
export function TicketCommentBox({ onSubmit }) {
  const [mensagem, setMensagem] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      await onSubmit(texto)
      setMensagem('')
    } catch (err) {
      setError(err.message || 'Erro ao enviar comentário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
      <Textarea
        placeholder="Escreva um comentário..."
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        error={error}
        rows={3}
      />
      {error && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <Button type="submit" loading={saving}>Comentar</Button>
      </div>
    </form>
  )
}
