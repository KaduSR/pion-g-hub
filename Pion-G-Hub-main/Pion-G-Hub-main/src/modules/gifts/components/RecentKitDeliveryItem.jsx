import React, { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { GiftThumbnail } from './GiftThumbnail'
import { formatDateTime, formatCurrency } from '../../../shared/utils/helpers'

/**
 * Linha colapsável de uma entrega de kit. `details`/`loadingDetails` vêm do
 * pai (RecentKitDeliveries), que mantém o cache `deliveryDetails[entregaId]`
 * — expandir/recolher aqui é só estado visual, nunca dispara nova busca por
 * si só (isso é feito pelo `onExpand`, que o pai ignora se já tiver cache).
 */
export function RecentKitDeliveryItem({ summary, details, loadingDetails, onExpand }) {
  const [expanded, setExpanded] = useState(false)

  const handleToggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next) onExpand()
  }

  const isLead = !!summary.leads_feira?.nome
  const destinatarioTipo = isLead ? 'Lead' : 'Destinatário'
  const destinatarioValor = isLead ? summary.leads_feira.nome : (summary.destinatario_nome || 'Não informado')
  const empresaValor = (isLead ? summary.leads_feira?.empresa : summary.destinatario_empresa) || 'Não informada'

  return (
    <div style={{ border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={handleToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', background: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {expanded ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#64748b" />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            {summary.brinde_kits?.nome || 'Kit removido'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Entrega confirmada — {formatDateTime(summary.entregue_em)}
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 16px 40px', borderTop: '1px solid #f8fafc' }}>
          {loadingDetails ? (
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 12 }}>Carregando detalhes...</p>
          ) : details ? (
            <div style={{ fontSize: 13, color: '#475569', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><strong>Responsável:</strong> {details.entrega.responsavel?.nome || 'Não informado'}</div>
              <div><strong>{destinatarioTipo}:</strong> {destinatarioValor}</div>
              <div><strong>Empresa:</strong> {empresaValor}</div>

              <div>
                <strong>Itens:</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {details.itens.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <GiftThumbnail src={item.brindes?.imagem_url} size={32} />
                      <span>{item.brindes?.nome || 'Brinde removido'} x{item.quantidade}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div><strong>Valor estimado do kit:</strong> {formatCurrency(details.valorEstimado)}</div>
              <div><strong>Data:</strong> {formatDateTime(details.entrega.entregue_em)}</div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#dc2626', marginTop: 12 }}>Erro ao carregar detalhes.</p>
          )}
        </div>
      )}
    </div>
  )
}
