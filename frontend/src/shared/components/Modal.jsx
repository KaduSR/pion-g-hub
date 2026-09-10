import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export function Modal({ isOpen, onClose, title, children, width = 560, closeOnEscape = true }) {
  // Marca se o mousedown que iniciou o gesto de clique começou de fato no
  // overlay (fundo escurecido), não em algum descendente do conteúdo. Sem
  // isso, "e.target === e.currentTarget" no onClick sozinho é enganoso:
  // quando mousedown e mouseup acontecem em elementos diferentes (ex.:
  // usuário clica um campo/select/ícone de senha e o cursor desliza um
  // pixel entre pressionar e soltar — comum com mouse/trackpad), o
  // navegador calcula o "click" resultante tendo como alvo o ANCESTRAL
  // COMUM dos dois pontos — que pode ser o próprio overlay — fechando o
  // modal mesmo que o usuário só tenha clicado dentro de um campo. Tab
  // nunca dispara mousedown/mouseup, por isso o bug só aparecia com mouse.
  const mouseDownOnOverlay = useRef(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeOnEscape, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,23,42,0.6)', padding: 16,
        backdropFilter: 'blur(4px)',
      }}
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownOnOverlay.current) onClose()
        mouseDownOnOverlay.current = false
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          animation: 'modalIn 0.2s ease',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: 8,
              padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={16} color="#64748b" />
          </button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
