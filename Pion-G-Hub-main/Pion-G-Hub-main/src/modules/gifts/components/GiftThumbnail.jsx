import React from 'react'
import { Gift } from 'lucide-react'

/**
 * Miniatura leve para uso em listas/cards (tabela de brindes, itens de kit,
 * histórico do dashboard). Tamanho sempre fixo — nunca renderiza a imagem
 * em resolução original — e placeholder consistente quando não há imagem.
 */
export function GiftThumbnail({ src, alt, size = 48, radius = 8, lazy = true }) {
  const boxStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  }

  if (!src) {
    return (
      <div style={boxStyle} title="Sem imagem">
        <Gift size={Math.max(12, Math.round(size * 0.45))} color="#94a3b8" />
      </div>
    )
  }

  return (
    <div style={boxStyle}>
      <img
        src={src}
        alt={alt || 'Brinde'}
        loading={lazy ? 'lazy' : undefined}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  )
}
