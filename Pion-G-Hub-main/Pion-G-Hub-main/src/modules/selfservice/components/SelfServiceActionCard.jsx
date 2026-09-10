import React from 'react'

/**
 * Botão grande em formato de card, pensado pra toque em tablet (mín. 44px
 * de alvo já garantido pelo padding generoso). Usado tanto na página
 * inicial do Autoatendimento quanto — potencialmente — em outros hubs
 * futuros, por isso não depende de nada específico do domínio.
 */
export function SelfServiceActionCard({ icon: Icon, title, subtitle, onClick, disabled, badge }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        width: '100%', textAlign: 'left',
        background: disabled ? '#f1f5f9' : '#fff',
        border: '1.5px solid #e2e8f0',
        borderRadius: 18,
        padding: '24px 22px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        minHeight: 96,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.boxShadow = '0 10px 28px rgba(27,58,107,0.15)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)' }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 14, flexShrink: 0,
        background: disabled ? '#e2e8f0' : '#eef2ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={28} color={disabled ? '#94a3b8' : '#1B3A6B'} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            {title}
          </span>
          {badge && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7',
              padding: '2px 8px', borderRadius: 20,
            }}>
              {badge}
            </span>
          )}
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>{subtitle}</p>
      </div>
    </button>
  )
}
