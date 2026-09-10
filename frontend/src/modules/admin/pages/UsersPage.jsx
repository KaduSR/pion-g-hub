import React, { useState, useEffect, useMemo } from 'react'
import { Search, Edit2, CheckCircle, XCircle, UserPlus } from 'lucide-react'
import { adminService } from '../services/adminService'
import { adminAuthService } from '../services/adminAuthService'
import { UserModal } from '../components/UserModal'
import { ChangePasswordModal } from '../components/ChangePasswordModal'
import { CreateUserModal } from '../components/CreateUserModal'
import { useProfileContext } from '../../../modules/profiles/contexts/ProfileContext'
import { Button, Input } from '../../../shared/components/FormField'
import { useToast } from '../../../shared/components/Toast'
import { Badge } from '../../../shared/components/Badge'

export function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('todos')
  
  const [editingUser, setEditingUser] = useState(null)
  const [changingPasswordUser, setChangingPasswordUser] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { show: showToast, ToastEl } = useToast()
  const { profile } = useProfileContext()

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await adminService.getAllUsers()
      setUsers(data)
    } catch (err) {
      showToast('Erro ao carregar usuários.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSaveUser = async (updatedData) => {
    try {
      await adminService.updateUser(updatedData.id, updatedData)
      showToast('Usuário atualizado com sucesso!')
      loadUsers()
    } catch (err) {
      showToast('Erro ao atualizar usuário.', 'error')
    }
  }

  const handleToggleStatus = async (user) => {
    try {
      await adminAuthService.toggleUserActive(user.id, !user.ativo)
      showToast(`Usuário ${!user.ativo ? 'ativado' : 'desativado'} com sucesso!`)
      loadUsers()
    } catch (err) {
      showToast(err.message || 'Erro ao alterar status.', 'error')
    }
  }

  const handleResetPassword = async (userId, newPassword) => {
    try {
      await adminAuthService.resetPassword(userId, newPassword)
      showToast('Senha redefinida com sucesso!')
    } catch (err) {
      showToast(err.message || 'Erro ao redefinir senha.', 'error')
    }
  }

  const handleCreateUser = async (userData) => {
    await adminAuthService.createUser(userData)
    showToast('Usuário cadastrado com sucesso!')
    loadUsers()
  }

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Filtro de role / inativos
      if (filterRole === 'inativos' && u.ativo) return false
      if (filterRole !== 'todos' && filterRole !== 'inativos') {
        if (filterRole === 'administradores' && u.role !== 'admin') return false
        if (filterRole === 'gestores' && u.role !== 'gestor') return false
        if (filterRole === 'marketing' && u.role !== 'marketing') return false
        if (filterRole === 'vendedores' && u.role !== 'vendedor') return false
      }
      
      // Busca (nome ou email)
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchName = u.nome?.toLowerCase().includes(term)
        const matchEmail = u.email?.toLowerCase().includes(term)
        if (!matchName && !matchEmail) return false
      }

      return true
    })
  }, [users, filterRole, searchTerm])

  const formatRole = (role) => {
    switch (role) {
      case 'admin': return 'Administrador'
      case 'marketing': return 'Marketing'
      case 'gestor': return 'Gestor'
      case 'vendedor': return 'Vendedor'
      default: return role
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'purple'
      case 'marketing': return 'blue'
      case 'gestor': return 'orange'
      case 'vendedor': return 'green'
      default: return 'gray'
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      {ToastEl}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            Administração de Usuários
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Gerencie os acessos, perfis e permissões dos usuários do sistema.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus size={16} /> Novo usuário
        </Button>
      </div>

      {/* Filtros e Busca */}
      <div style={{ 
        display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap',
        background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0'
      }}>
        <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <Input 
            placeholder="Buscar por nome ou e-mail..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'administradores', label: 'Administradores' },
            { id: 'gestores', label: 'Gestores' },
            { id: 'marketing', label: 'Marketing' },
            { id: 'vendedores', label: 'Vendedores' },
            { id: 'inativos', label: 'Inativos' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterRole(f.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: filterRole === f.id ? 'none' : '1px solid #e2e8f0',
                background: filterRole === f.id ? '#1e293b' : '#fff',
                color: filterRole === f.id ? '#fff' : '#475569',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Nome</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>E-mail</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Cargo / Setor</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Perfil</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                    Carregando usuários...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#0f172a' }}>
                      {u.nome || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>
                      {u.cargo || '-'} <span style={{ color: '#94a3b8' }}>|</span> {u.setor || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={getRoleColor(u.role)}>
                        {formatRole(u.role)}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.ativo ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 13, fontWeight: 500 }}>
                          <CheckCircle size={14} /> Ativo
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontSize: 13, fontWeight: 500 }}>
                          <XCircle size={14} /> Inativo
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="secondary" size="sm" onClick={() => setEditingUser(u)} title="Editar">
                          <Edit2 size={14} /> Editar
                        </Button>
                        {profile?.user_id !== u.user_id && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setChangingPasswordUser(u)}
                            title="Redefinir senha"
                          >
                            Redefinir senha
                          </Button>
                        )}
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleToggleStatus(u)}
                          title={u.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                        >
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal 
        isOpen={!!editingUser} 
        onClose={() => setEditingUser(null)} 
        user={editingUser} 
        onSave={handleSaveUser} 
      />

      <ChangePasswordModal
        isOpen={!!changingPasswordUser}
        onClose={() => setChangingPasswordUser(null)}
        user={changingPasswordUser}
        onSave={handleResetPassword}
      />

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateUser}
      />

    </div>
  )
}
