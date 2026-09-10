import { supabase } from '../../../lib/supabase'

/**
 * Serviço ADMINISTRATIVO do Centro de Permissões. Deliberadamente separado
 * de `permissionService.js` (usado pelo app pra resolver "minhas
 * permissões", com cache/geração/fallback estático): este serviço faz
 * consultas amplas (todos os papéis, catálogo inteiro, todos os usuários
 * ativos, overrides de QUALQUER usuário, histórico completo) — formato de
 * dado e uso completamente diferentes. Sem cache, sem fallback: se o banco
 * falhar, a função rejeita e a tela mostra erro — nunca finge saber os
 * dados de um módulo administrativo sensível.
 *
 * Leitura: RLS aceita `is_permissions_admin()` OU `permissions.view`/
 * `permissions.manage`/`permissions.audit_view` efetivos (Etapa 6.2).
 *
 * Gravação (Etapa 6.2): SEMPRE via RPC — nunca INSERT/UPDATE/DELETE direto
 * (a RLS de escrita foi removida de propósito; só as RPCs, SECURITY
 * DEFINER, escrevem). Cada RPC já garante sozinha: autorização
 * (permissions.manage), ator resolvido corretamente, guard de lockout, e
 * o registro em permission_change_log — tudo na mesma transação atômica
 * no banco. Este serviço só encaminha a chamada e propaga erro.
 */

const RESOURCE_LABELS = {
  dashboard: 'Dashboard',
  fairs: 'Feiras',
  gifts: 'Brindes',
  leads: 'Leads',
  permissions: 'Permissões',
  profile: 'Perfil',
  reports: 'Relatórios',
  satisfaction: 'Pesquisa de Satisfação',
  selfservice: 'Autoatendimento',
  settings: 'Configurações',
  users: 'Usuários',
}

// Ordem de exibição fixa (mais privilegiado primeiro) — roles.nome sozinho
// não garante essa ordem (é alfabética por padrão do banco).
const ROLE_ORDER = ['admin', 'marketing', 'gestor', 'vendedor']

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000'

export const permissionAdminService = {
  resourceLabel(resource) {
    return RESOURCE_LABELS[resource] || resource
  },

  /** Os 4 papéis do sistema, em ordem fixa. */
  async getRoles() {
    const { data, error } = await supabase.from('roles').select('*')
    if (error) throw error
    return (data || [])
      .slice()
      .sort((a, b) => ROLE_ORDER.indexOf(a.code) - ROLE_ORDER.indexOf(b.code))
  },

  /** Catálogo completo de permissões (47 hoje), agrupado por resource. */
  async getPermissionsCatalog() {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('code', { ascending: true })
    if (error) throw error

    const groups = new Map()
    for (const perm of data || []) {
      if (!groups.has(perm.resource)) groups.set(perm.resource, [])
      groups.get(perm.resource).push(perm)
    }
    return Array.from(groups.entries()).map(([resource, permissions]) => ({
      resource,
      label: RESOURCE_LABELS[resource] || resource,
      permissions,
    }))
  },

  /** Códigos de permissão concedidos a um papel, via role_permissions. */
  async getRolePermissionCodes(roleCode) {
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('code', roleCode)
      .maybeSingle()
    if (roleError) throw roleError
    if (!role) return new Set()

    const { data, error } = await supabase
      .from('role_permissions')
      .select('permissions(code)')
      .eq('role_id', role.id)
    if (error) throw error

    return new Set((data || []).map((row) => row.permissions?.code).filter(Boolean))
  },

  /** Usuários ativos, com busca opcional por nome/e-mail. */
  async getActiveUsers({ search = '' } = {}) {
    let query = supabase
      .from('user_profiles')
      .select('id, user_id, nome, email, role, cargo, setor, ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (search.trim()) {
      const term = search.trim().replace(/[%,]/g, '')
      query = query.or(`nome.ilike.%${term}%,email.ilike.%${term}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /** Sobrescritas individuais (grants + revokes) de um usuário. */
  async getUserOverrides(profileId) {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('effect, created_at, permissions(code, resource, description)')
      .eq('profile_id', profileId)
    if (error) throw error

    const grants = []
    const revokes = []
    for (const row of data || []) {
      const code = row.permissions?.code
      if (!code) continue
      const entry = {
        code,
        resource: row.permissions.resource,
        description: row.permissions.description,
        created_at: row.created_at,
      }
      if (row.effect === 'grant') grants.push(entry)
      else if (row.effect === 'revoke') revokes.push(entry)
    }
    return { grants, revokes }
  },

  /**
   * Histórico de alterações (permission_change_log). `target_id` é
   * polimórfico (aponta pra roles.id OU user_profiles.id, conforme
   * `target_type`) — não é uma FK única, então o PostgREST não embeda
   * automaticamente; resolve os alvos numa segunda leva de consultas e
   * junta aqui.
   *
   * Filtros aceitos (só os que os campos reais permitem — nada inventado):
   * `profileId` (usuário-alvo), `roleCode` (papel-alvo), `from`/`to`
   * (período, sobre created_at).
   */
  async getChangeLog({ profileId, roleCode, from, to } = {}) {
    let query = supabase
      .from('permission_change_log')
      .select('id, target_type, target_id, action, created_at, permissions(code, resource, description), actor:actor_profile_id(nome, email)')
      .order('created_at', { ascending: false })

    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)
    if (profileId) query = query.match({ target_type: 'user', target_id: profileId })

    if (roleCode) {
      const { data: role, error: roleError } = await supabase
        .from('roles').select('id').eq('code', roleCode).maybeSingle()
      if (roleError) throw roleError
      query = query.match({ target_type: 'role', target_id: role?.id ?? EMPTY_UUID })
    }

    const { data: rows, error } = await query
    if (error) throw error
    if (!rows?.length) return []

    const userTargetIds = [...new Set(rows.filter((r) => r.target_type === 'user').map((r) => r.target_id))]
    const roleTargetIds = [...new Set(rows.filter((r) => r.target_type === 'role').map((r) => r.target_id))]

    const [usersMap, rolesMap] = await Promise.all([
      userTargetIds.length
        ? supabase.from('user_profiles').select('id, nome, email').in('id', userTargetIds)
            .then(({ data }) => new Map((data || []).map((u) => [u.id, u])))
        : Promise.resolve(new Map()),
      roleTargetIds.length
        ? supabase.from('roles').select('id, nome').in('id', roleTargetIds)
            .then(({ data }) => new Map((data || []).map((r) => [r.id, r])))
        : Promise.resolve(new Map()),
    ])

    return rows.map((row) => {
      const target = row.target_type === 'user' ? usersMap.get(row.target_id) : rolesMap.get(row.target_id)
      const targetLabel = row.target_type === 'user'
        ? (target ? (target.nome || target.email) : 'Usuário removido')
        : (target ? target.nome : 'Papel removido')
      return { ...row, targetLabel }
    })
  },

  // ── Gravação (Etapa 6.2) — sempre via RPC, nunca INSERT/UPDATE/DELETE ──

  /** Concede (granted=true) ou remove (granted=false) uma permissão de um PAPEL. */
  async setRolePermission(roleCode, permissionCode, granted) {
    const { data, error } = await supabase.rpc('set_role_permission', {
      p_role_code: roleCode,
      p_permission_code: permissionCode,
      p_granted: granted,
    })
    if (error) throw error
    return data // { changed: boolean }
  },

  /** Override individual: concede uma permissão a um usuário, sobrescrevendo o papel. */
  async setUserPermissionGrant(profileId, permissionCode) {
    const { data, error } = await supabase.rpc('set_user_permission_grant', {
      p_profile_id: profileId,
      p_permission_code: permissionCode,
    })
    if (error) throw error
    return data
  },

  /** Override individual: revoga uma permissão de um usuário, sobrescrevendo o papel. */
  async setUserPermissionRevoke(profileId, permissionCode) {
    const { data, error } = await supabase.rpc('set_user_permission_revoke', {
      p_profile_id: profileId,
      p_permission_code: permissionCode,
    })
    if (error) throw error
    return data
  },

  /** Remove o override individual (grant ou revoke) — volta a herdar do papel. */
  async clearUserPermissionOverride(profileId, permissionCode) {
    const { data, error } = await supabase.rpc('clear_user_permission_override', {
      p_profile_id: profileId,
      p_permission_code: permissionCode,
    })
    if (error) throw error
    return data
  },
}
