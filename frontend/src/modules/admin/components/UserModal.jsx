import React, { useState, useEffect } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { FormField, Input, Select, Button } from '../../../shared/components/FormField'

const ROLES = ['admin', 'marketing', 'gestor', 'vendedor']
const SETORES = ['Comercial', 'Marketing', 'Operações', 'Administrativo', 'Tecnologia', 'Diretoria', 'Outro']

export function UserModal({ isOpen, onClose, user, onSave }) {
  const [form, setForm] = useState({
    cargo: '',
    setor: '',
    role: 'vendedor',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user && isOpen) {
      setForm({
        cargo: user.cargo || '',
        setor: user.setor || '',
        role: user.role || 'vendedor',
      })
    }
  }, [user, isOpen])

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        id: user.id,
        user_id: user.user_id,
        cargo: form.cargo,
        setor: form.setor,
        role: form.role,
        ativo: user.ativo
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Usuário" width={600}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          
          <FormField label="ID do Usuário" style={{ gridColumn: '1 / -1' }}>
            <Input value={user.user_id} readOnly style={{ background: '#f8fafc', color: '#64748b' }} />
          </FormField>

          <FormField label="Nome">
            <Input value={user.nome || ''} readOnly style={{ background: '#f8fafc', color: '#64748b' }} />
          </FormField>

          <FormField label="E-mail">
            <Input value={user.email || ''} readOnly style={{ background: '#f8fafc', color: '#64748b' }} />
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

          <FormField label="Perfil (Role)">
            <Select value={form.role} onChange={handleChange('role')}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
              Define as permissões de acesso ao sistema.
            </p>
          </FormField>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
