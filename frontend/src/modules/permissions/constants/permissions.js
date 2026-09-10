/**
 * Mapa centralizado de permissões por role.
 *
 * Esta é a ÚNICA fonte de verdade para "o que cada role pode fazer"
 * no frontend. Qualquer novo botão, menu ou rota que precise de controle
 * de acesso deve consultar este mapa via usePermissions(), nunca
 * verificar `profile.role` diretamente em componentes.
 *
 * IMPORTANTE: isto é controle de UX, não de segurança.
 * Não substitui RLS no Supabase. Ver docs/architecture/permissions.md.
 */

export const ROLES = {
  ADMIN: 'admin',
  MARKETING: 'marketing',
  GESTOR: 'gestor',
  VENDEDOR: 'vendedor',
}

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_VIEW_TEAM: 'dashboard.view_team',

  // Feiras
  FAIRS_VIEW: 'fairs.view',
  FAIRS_MANAGE: 'fairs.manage',

  // Leads
  LEADS_VIEW_ALL: 'leads.view_all',
  LEADS_VIEW_TEAM: 'leads.view_team',
  LEADS_VIEW_OWN: 'leads.view_own',
  LEADS_CAPTURE: 'leads.capture',
  LEADS_MANAGE_ALL: 'leads.manage_all',
  LEADS_MANAGE_TEAM: 'leads.manage_team',
  LEADS_MANAGE_OWN: 'leads.manage_own',

  // Configurações / Usuários
  SETTINGS_MANAGE: 'settings.manage',
  USERS_MANAGE: 'users.manage',

  // Brindes (Sprint 3.1 — MVP: acesso único para quem gerencia o módulo.)
  GIFTS_MANAGE: 'gifts.manage',
  // Brindes por feira (Sprint 3.7): vendedor pode REALIZAR entrega no
  // estande (aba Entregas), mas não gerencia estoque/kits/carga da feira —
  // isso continua exclusivo de GIFTS_MANAGE.
  GIFTS_DELIVER: 'gifts.deliver',

  // Relatórios
  REPORTS_EXPORT: 'reports.export',
  REPORTS_EXPORT_TEAM: 'reports.export_team',

  // Perfil
  PROFILE_VIEW: 'profile.view',

  // Centro de Permissões (Sprint 3.8/Etapa 6) — só existem no catálogo do
  // banco (permissions.js estático nunca foi expandido pro catálogo
  // granular completo). Hoje só `admin` tem essas 3 no banco. Ver
  // ATENÇÃO no fallback abaixo.
  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_MANAGE: 'permissions.manage',
  PERMISSIONS_AUDIT_VIEW: 'permissions.audit_view',

  // Chamados de TI (Sprint 4.1/4.2) — catálogo `tickets.*` só existe no
  // banco (seed da migration de fundação). Igual ao Centro de Permissões
  // acima, NÃO entram em ROLE_PERMISSIONS (fallback estático) — ver
  // ATENÇÃO abaixo. Sprint 4.2 usa só estas 5 (baseline de todos os
  // papéis); as operacionais (view_team, manage_team, triage, kb_manage
  // etc.) ficam pra quando a Central de Atendimento existir.
  TICKETS_CREATE: 'tickets.create',
  TICKETS_VIEW_OWN: 'tickets.view_own',
  TICKETS_COMMENT_OWN: 'tickets.comment_own',
  TICKETS_NOTIFICATIONS_VIEW: 'tickets.notifications_view',
  TICKETS_KB_VIEW: 'tickets.kb_view',

  // Central de Atendimento (Sprint 4.3) — permissões operacionais do
  // catálogo tickets.*, mesma observação de TICKETS_CREATE acima (só
  // banco, fora de ROLE_PERMISSIONS).
  TICKETS_VIEW_TEAM: 'tickets.view_team',
  TICKETS_MANAGE_TEAM: 'tickets.manage_team',
  TICKETS_TRIAGE: 'tickets.triage',
  TICKETS_VIEW_ALL: 'tickets.view_all',
  TICKETS_MANAGE_ALL: 'tickets.manage_all',
}

/**
 * Permissões concedidas a cada role.
 * Role inexistente ou nulo recebe array vazio (fail-closed).
 */
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FAIRS_VIEW,
    PERMISSIONS.FAIRS_MANAGE,
    PERMISSIONS.LEADS_VIEW_ALL,
    PERMISSIONS.LEADS_CAPTURE,
    PERMISSIONS.LEADS_MANAGE_ALL,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.GIFTS_MANAGE,
  ],

  [ROLES.MARKETING]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FAIRS_VIEW,
    PERMISSIONS.FAIRS_MANAGE,
    PERMISSIONS.LEADS_VIEW_ALL,
    PERMISSIONS.LEADS_CAPTURE,
    PERMISSIONS.LEADS_MANAGE_ALL,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.GIFTS_MANAGE,
  ],

  [ROLES.GESTOR]: [
    PERMISSIONS.DASHBOARD_VIEW_TEAM,
    PERMISSIONS.FAIRS_VIEW,
    PERMISSIONS.LEADS_VIEW_TEAM,
    PERMISSIONS.LEADS_CAPTURE,
    PERMISSIONS.LEADS_MANAGE_TEAM,
    PERMISSIONS.REPORTS_EXPORT_TEAM,
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.GIFTS_MANAGE,
  ],

  [ROLES.VENDEDOR]: [
    PERMISSIONS.LEADS_CAPTURE,
    PERMISSIONS.LEADS_VIEW_OWN,
    PERMISSIONS.LEADS_MANAGE_OWN,
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.GIFTS_DELIVER,
  ],
}

// ⚠️ ATENÇÃO: PERMISSIONS_VIEW/MANAGE/AUDIT_VIEW propositalmente NÃO entram
// em ROLE_PERMISSIONS acima — o mapa estático é o fallback usado quando o
// banco está fora do ar (ver permissionService.js). Se isso acontecer,
// NINGUÉM (nem admin) resolve essas 3 permissões pelo fallback, e a rota
// /admin/permissoes fica inacessível até o banco voltar. É uma lacuna
// conhecida, sinalizada no checkpoint da Etapa 6.1 — decidir se cobre
// antes de liberar a tela de gravação (Etapa 6.2) é uma escolha de
// produto, não algo pra resolver silenciosamente aqui.
//
// Mesma lacuna vale para TICKETS_*: se o banco cair, ninguém resolve
// tickets.create/view_own/etc. pelo fallback, e /ti fica inacessível até
// voltar — aceito pela mesma razão (permissão granular só existe no banco).

/**
 * Retorna a lista de permissões de um role.
 * Role desconhecido/nulo → [] (sem nenhuma permissão).
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? []
}

/**
 * Mapa de itens de menu da Sidebar e quais permissões habilitam cada um.
 * `anyOf`: o item aparece se o usuário tiver QUALQUER UMA dessas permissões.
 *
 * Sprint 2.4: leads.view_own foi adicionado aqui para que o vendedor passe
 * a ver o item "/leads" na Sidebar com o label "Meus Leads".
 * O label dinâmico é resolvido na Sidebar com base no role.
 */
export const MENU_PERMISSIONS = {
  dashboard: { anyOf: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.DASHBOARD_VIEW_TEAM] },
  fairs: { anyOf: [PERMISSIONS.FAIRS_VIEW] },
  captacao: { anyOf: [PERMISSIONS.LEADS_CAPTURE] },
  leads: { anyOf: [PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_TEAM, PERMISSIONS.LEADS_VIEW_OWN] },
  configuracoes: { anyOf: [PERMISSIONS.SETTINGS_MANAGE] },
  meuPerfil: { anyOf: [PERMISSIONS.PROFILE_VIEW] },
  admin: { anyOf: [PERMISSIONS.USERS_MANAGE] },
  brindes: { anyOf: [PERMISSIONS.GIFTS_MANAGE] },
  chamadosTi: {
    anyOf: [
      PERMISSIONS.TICKETS_CREATE, PERMISSIONS.TICKETS_VIEW_OWN,
      PERMISSIONS.TICKETS_VIEW_TEAM, PERMISSIONS.TICKETS_MANAGE_TEAM,
      PERMISSIONS.TICKETS_TRIAGE, PERMISSIONS.TICKETS_VIEW_ALL, PERMISSIONS.TICKETS_MANAGE_ALL,
    ],
  },
  // Central de Módulos (Sprint 3.3): qualquer usuário autenticado com perfil
  // carregado tem acesso — todo role possui profile.view, então isso
  // equivale a "qualquer autenticado", sem precisar de permissão nova.
  modulos: { anyOf: [PERMISSIONS.PROFILE_VIEW] },
}

/**
 * Permissões mínimas exigidas por cada rota protegida.
 * Usado pelo <RequirePermission> em AppRoutes.
 *
 * `/leads` aceita qualquer uma das três permissões de visualização —
 * inclusive leads.view_own — para que a rota não quebre caso um
 * vendedor a acesse diretamente pela URL, mesmo sem o item no menu.
 */
export const ROUTE_PERMISSIONS = {
  // '/' deixou de ser uma PrivatePage na Sprint 3.3 — agora é um redirect
  // simples para /modulos (a nova tela inicial), então não precisa de
  // entrada aqui. O Dashboard existente segue em '/dashboard'.
  '/dashboard': { anyOf: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.DASHBOARD_VIEW_TEAM] },
  '/modulos': { anyOf: [PERMISSIONS.PROFILE_VIEW] },
  // Central de Áreas (Sprint 5.1, Etapa 4) — mesma permissão básica de
  // "/modulos" (qualquer usuário autenticado com perfil carregado). A
  // autorização REAL de cada acesso já foi resolvida por useVisibleAreas()
  // antes de chegar aqui; esta entrada só garante que a rota em si exige
  // login + perfil, igual a /modulos. "/areas/:areaId" reaproveita esta
  // mesma entrada (mesmo padrão de "/ti/:id" reaproveitando "/ti").
  '/areas': { anyOf: [PERMISSIONS.PROFILE_VIEW] },
  '/feiras': { anyOf: [PERMISSIONS.FAIRS_VIEW] },
  // Sprint 3.5 / 3.5.1: reaproveita fairs.view — quem já vê Feiras acessa
  // Pesquisas e a Central de Respostas (mesma permissão nas duas rotas).
  '/pesquisas': { anyOf: [PERMISSIONS.FAIRS_VIEW] },
  '/pesquisas/respostas': { anyOf: [PERMISSIONS.FAIRS_VIEW] },
  '/captacao': { anyOf: [PERMISSIONS.LEADS_CAPTURE] },
  // Autoatendimento interno (staff, autenticado) — mesma permissão de
  // Captação: cobre os 4 papéis previstos (admin/marketing/gestor/vendedor)
  // sem precisar de uma permissão granular nova nesta sprint.
  '/atendimento': { anyOf: [PERMISSIONS.LEADS_CAPTURE] },
  '/leads': { anyOf: [PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_TEAM, PERMISSIONS.LEADS_VIEW_OWN] },
  '/configuracoes': { anyOf: [PERMISSIONS.SETTINGS_MANAGE] },
  '/meu-perfil': { anyOf: [PERMISSIONS.PROFILE_VIEW] },
  '/admin/usuarios': { anyOf: [PERMISSIONS.USERS_MANAGE] },
  '/admin/permissoes': { anyOf: [PERMISSIONS.PERMISSIONS_VIEW] },
  // Sprint 5.1.1: gifts.deliver passou a autorizar SOMENTE o Autoatendimento
  // (/atendimento) — a Gestão de Brindes completa (inclusive a aba Entregas
  // dentro de /brindes) exige gifts.manage. Vendedor mantém gifts.deliver e
  // continua liberando brindes, só que exclusivamente pelo Autoatendimento.
  '/brindes': { anyOf: [PERMISSIONS.GIFTS_MANAGE] },
  // Chamados de TI: view_own/create dão acesso ao Portal do Solicitante
  // (Sprint 4.2); view_team/manage_team/view_all/manage_all/triage dão
  // acesso à Central de Atendimento (Sprint 4.3) — a página decide
  // internamente quais abas mostrar, a rota só exige "pelo menos uma das
  // duas pontas". /ti/novo continua exigindo especificamente create.
  '/ti': {
    anyOf: [
      PERMISSIONS.TICKETS_VIEW_OWN, PERMISSIONS.TICKETS_CREATE,
      PERMISSIONS.TICKETS_VIEW_TEAM, PERMISSIONS.TICKETS_MANAGE_TEAM,
      PERMISSIONS.TICKETS_TRIAGE, PERMISSIONS.TICKETS_VIEW_ALL, PERMISSIONS.TICKETS_MANAGE_ALL,
    ],
  },
  '/ti/novo': { anyOf: [PERMISSIONS.TICKETS_CREATE] },
}

/**
 * Rota padrão para redirecionar cada role após login ou quando
 * uma rota acessada é negada. Evita loop de redirecionamento
 * (ex: vendedor não tem dashboard.view, então "/" não pode ser
 * o destino de fallback para ele).
 */
export function getDefaultRouteForRole(role) {
  if (role === ROLES.VENDEDOR) return '/captacao'
  return '/'
}
