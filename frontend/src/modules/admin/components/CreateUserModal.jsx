import React, { useState } from 'react'
import { Eye, EyeOff, Key } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { FormField, Input, Select, Button } from '../../../shared/components/FormField'

const ROLES = ['admin', 'marketing', 'gestor', 'vendedor']
const SETORES = ['Comercial', 'Marketing', 'Operações', 'Administrativo', 'Tecnologia', 'Diretoria', 'Outro']

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const initialForm = {
  nome: '',
  email: '',
  telefone: '',
  cargo: '',
  setor: '',
  role: 'vendedor',
  password: '',
  confirmPassword: '',
}

export function CreateUserModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleClose = () => {
    if (saving) return
    setForm(initialForm)
    setShowPassword(false)
    setError('')
    onClose()
  }

  const validate = () => {
    if (!form.nome.trim()) return 'Nome é obrigatório.'
    if (!form.email.trim() || !EMAIL_REGEX.test(form.email.trim())) return 'Informe um e-mail válido.'
    if (!form.role) return 'Selecione um perfil de acesso.'
    if (form.password.length < 8) return 'A senha deve ter no mínimo 8 caracteres.'
    if (form.password !== form.confirmPassword) return 'As senhas não coincidem.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setSaving(true)
    try {
      await onSave({
        nome: form.nome.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim() || undefined,
        cargo: form.cargo.trim() || undefined,
        setor: form.setor || undefined,
        role: form.role,
        password: form.password,
      })
      setForm(initialForm)
      setShowPassword(false)
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao cadastrar usuário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo Usuário" width={640}>
      <form onSubmit={handleSubmit}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

          <FormField label="Nome" required style={{ gridColumn: '1 / -1' }}>
            <Input value={form.nome} onChange={handleChange('nome')} placeholder="Nome completo" />
          </FormField>

          <FormField label="E-mail" required>
            <Input type="email" value={form.email} onChange={handleChange('email')} placeholder="usuario@empresa.com" />
          </FormField>

          <FormField label="Telefone">
            <Input value={form.telefone} onChange={handleChange('telefone')} placeholder="(00) 00000-0000" />
          </FormField>

          <FormField label="Cargo">
            <Input value={form.cargo} onChange={handleChange('cargo')} placeholder="Ex: Diretor de Vendas" />
          </FormField>

          <FormField label="Setor">
            <Select value={form.setor} onChange={handleChange('setor')}>
              <option value="">Selecione</option>
              {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>

          <FormField label="Perfil (Role)" required style={{ gridColumn: '1 / -1' }}>
            <Select value={form.role} onChange={handleChange('role')}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
              Define as permissões de acesso ao sistema.
            </p>
          </FormField>

          <FormField label="Senha Inicial" required>
            <div style={{ position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Mínimo 8 caracteres"
                style={{ paddingLeft: 36, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
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
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                placeholder="Digite a senha novamente"
                style={{ paddingLeft: 36, paddingRight: 40 }}
              />
            </div>
          </FormField>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            Cadastrar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
