import React, { useState, useEffect } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { satisfactionService } from '../services/satisfactionService'
import { formatDateTime } from '../../../shared/utils/helpers'

function formatAnswer(item) {
  switch (item.tipo) {
    case 'rating_1_5':
      return item.valor_numero != null ? `${item.valor_numero} / 5` : 'Não respondido'
    case 'nps_0_10':
      return item.valor_numero != null ? `${item.valor_numero} / 10` : 'Não respondido'
    case 'single_choice':
      return item.valor_opcao || 'Não respondido'
    case 'short_text':
    case 'long_text':
      return item.valor_texto?.trim() || 'Não respondido'
    default:
      return 'Não respondido'
  }
}

const sectionTitle = {
  margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

export function SatisfactionResponseDetailsModal({ responseId, isOpen, onClose, showToast }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && responseId) {
      setLoading(true)
      setDetails(null)
      satisfactionService.getResponseDetails(responseId)
        .then(setDetails)
        .catch(() => showToast?.('Erro ao carregar detalhes da resposta.', 'error'))
        .finally(() => setLoading(false))
    }
  }, [isOpen, responseId])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resposta da Pesquisa" width={640}>
      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Carregando...</p>
      ) : !details ? (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Nenhum dado encontrado.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              {details.pesquisa_titulo || 'Pesquisa removida'}
              {details.feira_nome ? ` — ${details.feira_nome}` : ''}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
              Respondido em {formatDateTime(details.created_at)}
            </p>
          </div>

          <div>
            <h3 style={sectionTitle}>Dados do respondente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: '#334155' }}>
              <div><strong>Nome:</strong> {details.respondente_nome || 'Não informado'}</div>
              <div><strong>Empresa:</strong> {details.respondente_empresa || 'Não informado'}</div>
              <div><strong>Cargo:</strong> {details.respondente_cargo || 'Não informado'}</div>
              <div><strong>Telefone:</strong> {details.respondente_telefone || 'Não informado'}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>E-mail:</strong> {details.respondente_email || 'Não informado'}</div>
            </div>
          </div>

          <div>
            <h3 style={sectionTitle}>Respostas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {details.itens.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94a3b8' }}>Esta pesquisa não tem perguntas cadastradas.</p>
              ) : (
                details.itens.map((item) => (
                  <div key={item.pergunta_id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.titulo}</div>
                    <div style={{ fontSize: 14, color: '#334155', marginTop: 4 }}>{formatAnswer(item)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
