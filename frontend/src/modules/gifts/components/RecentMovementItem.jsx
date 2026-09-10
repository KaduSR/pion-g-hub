import React from 'react'
import { GiftThumbnail } from './GiftThumbnail'
import { formatDateTime } from '../../../shared/utils/helpers'
import { formatTipoMovimentacao } from '../constants/giftConstants'

export function RecentMovementItem({ movement }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13,
    }}>
      <GiftThumbnail src={movement.brindes?.imagem_url} size={32} />
      <div style={{ flex: 1 }}>
        <strong style={{ color: '#0f172a' }}>{movement.brindes?.nome || 'Brinde removido'}</strong>
        <span style={{ color: '#64748b' }}> — {formatTipoMovimentacao(movement.tipo)} de {movement.quantidade} unidade(s)</span>
      </div>
      <span style={{ color: '#94a3b8', fontSize: 12 }}>{formatDateTime(movement.created_at)}</span>
    </div>
  )
}
