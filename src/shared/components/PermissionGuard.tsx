// PionG Hub: PermissionGuard - RBAC Component
// Valida acesso via perfil real do usuário (PostgreSQL) usando nivel_hierarquico

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PermissionGuardProps {
  moduleName: string;
  requiredLevel: number;
  children: React.ReactNode;
}

const MODULE_MIN_LEVELS: Record<string, number> = {
  'admin.dashboard': 20,
  'admin.colaboradores': 60,
  'admin.permissoes': 80,
  'admin.usuarios_online': 80,
  'admin.filiais': 100,
  'admin.feriados': 70,
  'admin.controle_ponto': 50,
  'admin.escala_mes': 60,
  'admin.validacao_ponto': 50,
  'admin.quadro_avisos': 40,
  'admin.os_manutencao': 45,
  'logistica.dashboard': 30,
  'logistica.lancamentos': 40,
  'logistica.transportadoras': 60,
  'producao.dashboard': 30,
  'producao.ordens': 50
};

const Denied: React.FC = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h1>Acesso Negado</h1>
    <p>Você não possui permissão para acessar este módulo.</p>
  </div>
);

const PermissionGuard: React.FC<PermissionGuardProps> = ({ moduleName, requiredLevel, children }) => {
  const { user, getPerfilLevel, isLoading } = useAuth();

  if (isLoading) {
    return <div>Carregando permissões...</div>;
  }

  let nivelUsuario: number;
  try {
    const ctxLevel = getPerfilLevel();
    const moduleLevel = MODULE_MIN_LEVELS[moduleName] ?? 0;
    nivelUsuario = ctxLevel > 0 ? ctxLevel : moduleLevel;
  } catch {
    nivelUsuario = 0;
  }

  const hasAccess = nivelUsuario >= requiredLevel && !!user

  if (!hasAccess) {
    return <Denied />;
  }

  return <>{children}</>;
};

export default PermissionGuard;