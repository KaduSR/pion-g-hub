import { PERMISSIONS } from '../permissions/constants/permissions'

/**
 * Registro central dos MACRO módulos exibidos na Central de Módulos.
 *
 * Sprint 3.3 revisada: a tela inicial representa grandes áreas do Hub
 * (Dashboard Geral, Feiras & Leads, Gestão de Brindes, Métricas &
 * Campanhas, Integrações, Administração), não funcionalidades soltas.
 * Funcionalidades individuais (Feiras, Captação, Leads, Usuários,
 * Configurações etc.) viram `children` (subáreas, só texto) e, quando
 * fizer sentido, `shortcuts` (atalhos de navegação reais) dentro do
 * macro módulo correspondente.
 *
 * `permissions`: lista "anyOf" — se o usuário tiver QUALQUER uma dessas
 * permissões, o card aparece. Só é checado para módulos "active"; card
 * "planned" aparece para qualquer usuário autenticado (visão de roadmap).
 *
 * `visualType`/`imageUrl`: preparam a estrutura para uma sprint futura de
 * personalização visual (trocar o ícone grande por uma imagem/ilustração
 * por módulo). Por ora todo módulo usa `visualType: 'icon'` e `imageUrl: null`.
 *
 * `navigation` (Sprint 3.4): submódulos usados pela Sidebar dinâmica —
 * cada item vira uma linha expandida sob o macro módulo. Não usado pela
 * Central de Módulos (que continua lendo `children`/`shortcuts`/`permissions`
 * como antes); é a mesma fonte (moduleRegistry) alimentando as duas telas
 * sem duplicar a estrutura de macro módulos em lugares diferentes.
 * `status: 'planned'` → sem `path`, aparece desabilitado ("Em breve").
 * `permissions` de um item ativo: mesma semântica "anyOf" já usada no resto
 * do arquivo — some deles pode ficar de fora se o usuário não tiver acesso,
 * mesmo com o macro módulo visível para outros submódulos.
 */
export const MODULES = [
  {
    id: 'general-dashboard',
    name: 'Dashboard Geral',
    description: 'Visão executiva dos principais indicadores do Pion G Hub.',
    path: '/dashboard',
    status: 'active',
    icon: 'LayoutDashboard',
    visualType: 'icon',
    imageUrl: null,
    permissions: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.DASHBOARD_VIEW_TEAM],
    children: [
      'Indicadores gerais',
      'Feiras em andamento',
      'Leads captados',
      'Brindes entregues',
    ],
    // Item único → a Sidebar renderiza como link direto, sem seta de expansão.
    navigation: [
      {
        label: 'Visão Geral',
        path: '/dashboard',
        status: 'active',
        permissions: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.DASHBOARD_VIEW_TEAM],
      },
    ],
  },
  {
    id: 'fairs-and-leads',
    name: 'Feiras & Leads',
    description: 'Gerencie feiras, captação, equipes, leads, credenciamento e pesquisas.',
    path: '/feiras',
    status: 'active',
    icon: 'CalendarDays',
    visualType: 'icon',
    imageUrl: null,
    permissions: [
      PERMISSIONS.FAIRS_VIEW,
      PERMISSIONS.LEADS_CAPTURE,
      PERMISSIONS.LEADS_VIEW_ALL,
      PERMISSIONS.LEADS_VIEW_TEAM,
      PERMISSIONS.LEADS_VIEW_OWN,
    ],
    children: [
      'Feiras',
      'Captação de Leads',
      'Autoatendimento (interno)',
      'Gestão de Leads',
      'Pesquisa de Satisfação',
      'Respostas',
      'Credenciamento (em breve)',
    ],
    shortcuts: [
      { label: 'Feiras', path: '/feiras' },
      { label: 'Captar Lead', path: '/captacao' },
      { label: 'Autoatendimento', path: '/atendimento' },
      { label: 'Gestão de Leads', path: '/leads' },
    ],
    navigation: [
      {
        label: 'Feiras', path: '/feiras', status: 'active', permissions: [PERMISSIONS.FAIRS_VIEW],
        description: 'Cadastre e acompanhe feiras, equipes e informações do evento.',
        icon: 'CalendarDays',
      },
      {
        label: 'Captação', path: '/captacao', status: 'active', permissions: [PERMISSIONS.LEADS_CAPTURE],
        description: 'Registre leads durante feiras e ações de captação.',
        icon: 'UserPlus',
      },
      // Autoatendimento interno (staff, autenticado) — distinto da rota
      // pública /autoatendimento (kiosk, sem login). Usa a mesma permissão
      // de Captação porque cobre exatamente os 4 papéis previstos
      // (admin/marketing/gestor/vendedor) sem precisar de permissão nova.
      {
        label: 'Autoatendimento', path: '/atendimento', status: 'active', permissions: [PERMISSIONS.LEADS_CAPTURE],
        description: 'Acesse o fluxo interno de autoatendimento para cadastro de leads.',
        icon: 'MonitorSmartphone',
      },
      {
        label: 'Gestão de Leads',
        path: '/leads',
        status: 'active',
        permissions: [PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_TEAM, PERMISSIONS.LEADS_VIEW_OWN],
        description: 'Consulte e acompanhe os leads captados.',
        icon: 'Users',
      },
      // Sprint 3.5 / 3.5.1: reaproveita fairs.view (quem já vê Feiras) —
      // nenhuma permissão nova criada para Pesquisa/Respostas. "Pesquisa"
      // é configuração/criação; "Respostas" é consulta/auditoria — telas
      // separadas pra /pesquisas não virar gigante com muitas respostas.
      {
        label: 'Pesquisa', path: '/pesquisas', status: 'active', permissions: [PERMISSIONS.FAIRS_VIEW],
        description: 'Crie e gerencie pesquisas de satisfação.',
        icon: 'ClipboardList',
      },
      {
        label: 'Respostas', path: '/pesquisas/respostas', status: 'active', permissions: [PERMISSIONS.FAIRS_VIEW],
        description: 'Consulte e analise as respostas das pesquisas.',
        icon: 'BarChart3',
      },
      { label: 'Credenciamento', path: null, status: 'planned' },
    ],
  },
  {
    id: 'gifts-management',
    name: 'Gestão de Brindes',
    description: 'Controle estoque promocional, kits, imagens, entregas e movimentações.',
    path: '/brindes',
    status: 'active',
    icon: 'Gift',
    visualType: 'icon',
    imageUrl: null,
    permissions: [PERMISSIONS.GIFTS_MANAGE],
    children: [
      'Estoque',
      'Kits',
      'Carga da Feira',
      'Entregas',
      'Movimentações',
      'Financeiro de Brindes (em breve)',
    ],
    // GiftsPage lê `?tab=` da URL (Sprint 3.4) e abre a aba correspondente;
    // sem query ou com valor inválido, cai na aba padrão (Dashboard, ou
    // Entregas para quem só tem gifts.deliver — ver GiftsPage.jsx).
    // Sprint 5.1.1: a rota /brindes inteira (inclusive a aba Entregas) agora
    // exige gifts.manage (ver ROUTE_PERMISSIONS em permissions.js) — quem só
    // tem gifts.deliver (vendedor) não acessa mais /brindes de forma alguma,
    // nem a aba Entregas; libera brindes exclusivamente pelo Autoatendimento
    // (/atendimento). Nenhum item de navigation aqui aceita mais
    // GIFTS_DELIVER isoladamente, então o módulo inteiro deixa de ser
    // resolvido por useVisibleModules()/useVisibleAreas() para o vendedor.
    navigation: [
      { label: 'Estoque', path: '/brindes?tab=brindes', status: 'active', permissions: [PERMISSIONS.GIFTS_MANAGE] },
      { label: 'Kits', path: '/brindes?tab=kits', status: 'active', permissions: [PERMISSIONS.GIFTS_MANAGE] },
      { label: 'Carga da Feira', path: '/brindes?tab=feiras', status: 'active', permissions: [PERMISSIONS.GIFTS_MANAGE] },
      {
        label: 'Entregas',
        path: '/brindes?tab=entregas',
        status: 'active',
        permissions: [PERMISSIONS.GIFTS_MANAGE],
      },
      { label: 'Movimentações', path: '/brindes?tab=movimentacoes', status: 'active', permissions: [PERMISSIONS.GIFTS_MANAGE] },
      { label: 'Financeiro de Brindes', path: null, status: 'planned' },
    ],
  },
  {
    // Sprint 4.2 (Portal do Solicitante — MVP). Macro módulo próprio, fora
    // de Administração — atende qualquer colaborador, não só quem
    // administra o Hub (doc: docs/architecture/engineering/sprint-4-chamados-ti.md, seção 12).
    id: 'it-tickets',
    name: 'Chamados de TI',
    description: 'Abra e acompanhe chamados de suporte técnico — e, para a equipe de TI, triagem e atendimento.',
    path: '/ti',
    status: 'active',
    icon: 'LifeBuoy',
    visualType: 'icon',
    imageUrl: null,
    permissions: [
      PERMISSIONS.TICKETS_CREATE, PERMISSIONS.TICKETS_VIEW_OWN,
      PERMISSIONS.TICKETS_VIEW_TEAM, PERMISSIONS.TICKETS_MANAGE_TEAM,
      PERMISSIONS.TICKETS_TRIAGE, PERMISSIONS.TICKETS_VIEW_ALL, PERMISSIONS.TICKETS_MANAGE_ALL,
    ],
    children: [
      'Minhas solicitações',
      'Novo Chamado',
      'Central de Atendimento',
      'Base de Conhecimento (em breve)',
    ],
    shortcuts: [
      { label: 'Minhas solicitações', path: '/ti?view=solicitacoes' },
      { label: 'Novo Chamado', path: '/ti/novo' },
    ],
    // "Minhas solicitações" e "Central de Atendimento" precisam de paths
    // ÚNICOS (?view=solicitacoes / ?view=central) — o Sidebar usa
    // item.path como key de lista E como critério de "item ativo"; com os
    // dois apontando pra "/ti" puro, o React acusava chave duplicada e os
    // dois ficavam "ativos" ao mesmo tempo. TicketsDashboard.jsx lê esse
    // mesmo parâmetro via useSearchParams().
    //
    // A visibilidade REAL do item "Central de Atendimento" não é decidida
    // só por este array `permissions` (que aqui serve só pro cálculo
    // grosseiro de "o macro-módulo aparece?", em isModuleVisible) — o
    // Sidebar aplica uma regra adicional (PBAC + vínculo ativo em
    // ti_equipe_membros) especificamente pra este item, via
    // useCentralAtendimentoAccess(). Ver Sidebar.jsx.
    navigation: [
      { label: 'Minhas solicitações', path: '/ti?view=solicitacoes', status: 'active', permissions: [PERMISSIONS.TICKETS_VIEW_OWN, PERMISSIONS.TICKETS_CREATE], icon: 'ClipboardList' },
      { label: 'Novo Chamado', path: '/ti/novo', status: 'active', permissions: [PERMISSIONS.TICKETS_CREATE], icon: 'MessageSquarePlus' },
      {
        label: 'Central de Atendimento', path: '/ti?view=central', status: 'active',
        icon: 'LifeBuoy',
        permissions: [
          PERMISSIONS.TICKETS_VIEW_TEAM, PERMISSIONS.TICKETS_MANAGE_TEAM,
          PERMISSIONS.TICKETS_TRIAGE, PERMISSIONS.TICKETS_VIEW_ALL, PERMISSIONS.TICKETS_MANAGE_ALL,
        ],
      },
      { label: 'Base de Conhecimento', path: null, status: 'planned' },
    ],
  },
  {
    id: 'metrics-and-campaigns',
    name: 'Métricas & Campanhas',
    description: 'Acompanhe indicadores, campanhas, custos, relatórios e performance.',
    path: null,
    status: 'planned',
    icon: 'BarChart3',
    visualType: 'icon',
    imageUrl: null,
    permissions: [],
    children: ['Métricas', 'Campanhas', 'Custos', 'Relatórios'],
    navigation: [
      { label: 'Métricas', path: null, status: 'planned' },
      { label: 'Campanhas', path: null, status: 'planned' },
      { label: 'Custos', path: null, status: 'planned' },
      { label: 'Relatórios', path: null, status: 'planned' },
    ],
  },
  {
    id: 'integrations',
    name: 'Integrações',
    description: 'Centralize integrações futuras com RD Station, NOMUS e outras APIs.',
    path: null,
    status: 'planned',
    icon: 'Plug',
    visualType: 'icon',
    imageUrl: null,
    permissions: [],
    children: ['RD Station', 'NOMUS', 'APIs externas'],
    navigation: [
      { label: 'RD Station', path: null, status: 'planned' },
      { label: 'NOMUS', path: null, status: 'planned' },
      { label: 'APIs externas', path: null, status: 'planned' },
    ],
  },
  {
    id: 'administration',
    name: 'Administração',
    description: 'Gerencie usuários, perfis, permissões, configurações e personalizações.',
    path: '/admin/usuarios',
    status: 'active',
    icon: 'Settings',
    visualType: 'icon',
    imageUrl: null,
    permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.SETTINGS_MANAGE],
    children: ['Usuários', 'Perfis', 'Permissões', 'Configurações'],
    shortcuts: [
      { label: 'Usuários', path: '/admin/usuarios' },
      { label: 'Configurações', path: '/configuracoes' },
    ],
    // "Meu Perfil" entra aqui como submódulo (Sprint 3.4 remove o item solto
    // da sidebar), mas usa PROFILE_VIEW — que todo role possui — para não
    // tirar de vendedor/marketing/gestor o acesso que já tinham à própria
    // página de perfil. Isso também faz o macro "Administração" continuar
    // visível pra eles (com Usuários/Configurações escondidos por falta de
    // permissão), em vez de sumir inteiro da sidebar.
    navigation: [
      { label: 'Usuários', path: '/admin/usuarios', status: 'active', permissions: [PERMISSIONS.USERS_MANAGE], icon: 'Users' },
      // Etapa 6.1: só admin tem permissions.view no banco hoje (o mapa
      // estático nunca ganhou os códigos granulares do Centro de
      // Permissões — ver ATENÇÃO em constants/permissions.js).
      { label: 'Permissões', path: '/admin/permissoes', status: 'active', permissions: [PERMISSIONS.PERMISSIONS_VIEW], icon: 'ShieldCheck' },
      { label: 'Configurações', path: '/configuracoes', status: 'active', permissions: [PERMISSIONS.SETTINGS_MANAGE], icon: 'Settings' },
      { label: 'Meu Perfil', path: '/meu-perfil', status: 'active', permissions: [PERMISSIONS.PROFILE_VIEW], icon: 'UserCircle' },
    ],
  },
]
