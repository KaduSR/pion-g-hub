import React from 'react'

export function Badge({ children, color = '#64748b', bg = '#f1f5f9', style = {} }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color,
        background: bg,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
