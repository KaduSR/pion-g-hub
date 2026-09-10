import React, { useEffect } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

export function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [message, duration, onClose])

  if (!message) return null

  const isSuccess = type === 'success'
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 20px',
        borderRadius: 12,
        background: isSuccess ? '#0f172a' : '#fef2f2',
        color: isSuccess ? '#fff' : '#dc2626',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        minWidth: 280,
        maxWidth: 420,
        animation: 'slideInUp 0.25s ease',
        border: isSuccess ? 'none' : '1px solid #fecaca',
      }}
    >
      {isSuccess
        ? <CheckCircle size={20} color="#4ade80" />
        : <AlertCircle size={20} />
      }
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.7 }}
      >
        <X size={16} color={isSuccess ? '#fff' : '#dc2626'} />
      </button>
      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = React.useState({ message: '', type: 'success' })
  const show = (message, type = 'success') => setToast({ message, type })
  const hide = () => setToast({ message: '', type: 'success' })
  const ToastEl = <Toast message={toast.message} type={toast.type} onClose={hide} />
  return { show, ToastEl }
}
