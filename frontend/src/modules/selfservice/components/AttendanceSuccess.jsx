import React from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '../../../shared/components/FormField'

/**
 * Tela de sucesso reutilizada pelos três fluxos (novo lead, cliente
 * existente, brinde do lead) — sempre com uma ação primária clara pra
 * seguir o atendimento sem sair procurando na interface.
 */
export function AttendanceSuccess({ title, details = [], primaryAction, secondaryAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{
        width: 72, height: 72, background: '#ecfdf5', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
      }}>
        <CheckCircle size={40} color="#10b981" />
      </div>
      <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
        {title}
      </h2>

      {details.length > 0 && (
        <div style={{
          background: '#f8fafc', borderRadius: 12, padding: 16, textAlign: 'left',
          maxWidth: 360, margin: '0 auto 24px', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {details.map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: '#64748b' }}>{d.label}</span>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>{d.value}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {secondaryAction && (
          <Button variant="secondary" size="lg" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button size="lg" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}
