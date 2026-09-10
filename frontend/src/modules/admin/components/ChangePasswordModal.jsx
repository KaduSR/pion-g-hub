import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Key } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { FormField, Input, Button } from '../../../shared/components/FormField'

export function ChangePasswordModal({ isOpen, onClose, user, onSave }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Limpa os campos quando o modal abre/fecha ou quando o usuário muda
  useEffect(() => {
    if (isOpen) {
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setError('')
    }
  }, [isOpen, user])

  if (!user) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setSaving(true)
    try {
      await onSave(user.user_id, newPassword)
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao redefinir a senha.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Redefinir Senha" width={480}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>
            Redefinindo a senha do usuário: <strong>{user.nome || user.email}</strong>
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#b91c1c',
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <FormField label="Nova Senha" required>
          <div style={{ position: 'relative' }}>
            <Key size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <Input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              style={{ paddingLeft: 36, paddingRight: 40 }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FormField>

        <FormField label="Confirmar Senha" required>
          <div style={{ position: 'relative' }}>
            <Key size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a senha novamente"
              style={{ paddingLeft: 36, paddingRight: 40 }}
              required
            />
          </div>
        </FormField>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={newPassword.length < 8 || newPassword !== confirmPassword}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
