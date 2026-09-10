/**
 * Constantes de apresentação compartilhadas pelas abas do Centro de
 * Permissões (PermissionsPage). Nada aqui é regra de negócio — só rótulos
 * e agrupamentos visuais.
 */

export const ROLE_LABELS = {
  admin: 'Administrador',
  marketing: 'Marketing',
  gestor: 'Gestor',
  vendedor: 'Vendedor',
}

// Permissões que controlam o próprio Centro de Permissões — concedê-las ou
// revogá-las incorretamente pode bloquear o acesso administrativo. Vêm
// identificadas com um selo "Protegida" onde quer que apareçam.
export const PROTECTED_PERMISSION_CODES = [
  'permissions.view',
  'permissions.manage',
  'permissions.audit_view',
]
