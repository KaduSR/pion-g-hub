import React, { forwardRef } from 'react'

const baseInput = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1.5px solid #e2e8f0',
  fontSize: 14,
  fontFamily: 'Inter, sans-serif',
  color: '#0f172a',
  background: '#fff',
  outline: 'none',
  transition: 'all 0.15s ease',
  boxSizing: 'border-box',
}

const baseInputLarge = {
  ...baseInput,
  padding: '14px 18px',
  fontSize: 16,
  borderRadius: 10,
  minHeight: 50,
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
}

export function FormField({ label, required, error, children, style = {} }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && (
        <label style={labelStyle}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {error && (
        <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef(function Input(
  { large, error, style: customStyle = {}, ...props },
  ref
) {
  const style = large ? baseInputLarge : baseInput

  return (
    <input
      ref={ref}
      style={{
        ...style,
        borderColor: error ? '#ef4444' : '#e2e8f0',
        ...customStyle,
      }}
      onFocus={(e) => { e.target.style.borderColor = '#1B3A6B' }}
      onBlur={(e) => { e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0' }}
      {...props}
    />
  )
})

export function Select({ large, error, children, style: customStyle = {}, ...props }) {
  const style = large ? baseInputLarge : baseInput

  return (
    <select
      style={{
        ...style,
        borderColor: error ? '#ef4444' : '#e2e8f0',
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
        paddingRight: 36,
        ...customStyle,
      }}
      onFocus={(e) => { e.target.style.borderColor = '#1B3A6B' }}
      onBlur={(e) => { e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0' }}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ large, error, style: customStyle = {}, ...props }) {
  const style = large ? baseInputLarge : baseInput

  return (
    <textarea
      rows={3}
      style={{
        ...style,
        borderColor: error ? '#ef4444' : '#e2e8f0',
        resize: 'vertical',
        ...customStyle,
      }}
      onFocus={(e) => { e.target.style.borderColor = '#1B3A6B' }}
      onBlur={(e) => { e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0' }}
      {...props}
    />
  )
}

export function Button({
  children, variant = 'primary', size = 'md', fullWidth, loading, style = {}, ...props
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontWeight: 700,
    borderRadius: 12,
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'Inter, sans-serif',
    opacity: loading ? 0.7 : 1,
    width: fullWidth ? '100%' : 'auto',
  }

  const sizes = {
    sm: { padding: '7px 14px', fontSize: 13 },
    md: { padding: '10px 20px', fontSize: 14 },
    lg: { padding: '14px 28px', fontSize: 16 },
    xl: { padding: '18px 36px', fontSize: 18 },
  }

  const variants = {
    primary: { background: '#1B3A6B', color: '#fff' },
    secondary: { background: '#f1f5f9', color: '#475569' },
    danger: { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' },
    ghost: { background: 'transparent', color: '#475569' },
    success: { background: '#ecfdf5', color: '#059669', border: '1.5px solid #a7f3d0' },
  }

  return (
    <button
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? 'Aguarde…' : children}
    </button>
  )
}