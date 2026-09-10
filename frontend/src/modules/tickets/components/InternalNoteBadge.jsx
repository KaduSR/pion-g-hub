import React from 'react'
import { Lock } from 'lucide-react'

/**
 * Marca visual de nota interna — usada só na timeline operacional da
 * Central de Atendimento (nunca no Portal do Solicitante, que sequer
 * recebe comentários com interno=true por causa da RLS de
 * ti_chamado_comentarios).
 */
export function InternalNoteBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a',
    }}>
      <Lock size={10} /> Nota interna
    </span>
  )
}
