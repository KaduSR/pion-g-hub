/**
 * Registro central das ÁREAS DEPARTAMENTAIS (Sprint 5.1 — Etapa 1).
 *
 * Este arquivo é SOMENTE uma tabela de organização e associação — não é
 * uma segunda fonte de verdade. `moduleRegistry.js` continua sendo o
 * único lugar que define nome, ícone, path, status e permissões de cada
 * módulo/item; aqui só se registra A QUAL ÁREA cada um pertence.
 *
 * Nenhuma lógica React, hook, chamada ao Supabase, PBAC ou decisão de
 * visibilidade vive neste arquivo — isso é responsabilidade de quem
 * consumir este registro (fora do escopo desta Etapa).
 *
 * Formato de cada entrada em `items`:
 *   - { moduleId }         → toda a unidade (o módulo inteiro, com todos
 *                            os seus itens de navigation) pertence a esta
 *                            área. Só usado quando o módulo NÃO está
 *                            dividido entre áreas diferentes.
 *   - { moduleId, path }   → só o item de `navigation` com este `path`
 *                            (dentro do módulo `moduleId`) pertence a
 *                            esta área — usado quando um mesmo macro
 *                            módulo tem itens espalhados em áreas
 *                            diferentes (ex.: Feiras & Leads, Chamados de
 *                            TI, Administração).
 *
 * `path`, quando presente, é copiado literalmente do `navigation` de
 * moduleRegistry.js (incluindo query string, ex.: "/ti?view=central") —
 * nunca reescrito ou normalizado aqui.
 *
 * Áreas futuras (Manutenção, Financeiro, Estratégia & Governança,
 * Compras, Recursos Humanos) ficam documentadas em
 * docs/architecture/engineering/07-central-corporativa-servicos.md e no
 * roadmap — deliberadamente NÃO entram neste registro ativo ainda.
 */
export const AREAS = [
  {
    id: 'corporativo',
    name: 'Início / Corporativo',
    description: 'Visão geral, acesso rápido e acompanhamento corporativo de solicitações.',
    icon: 'Home',
    order: 1,
    items: [
      // Chamados de TI dividido: só as pontas do solicitante ficam no
      // Corporativo (Central de Atendimento pertence à área de TI).
      { moduleId: 'it-tickets', path: '/ti?view=solicitacoes' },
      { moduleId: 'it-tickets', path: '/ti/novo' },
      // Administração dividida: só "Meu Perfil" (pessoal/global) fica
      // aqui — Usuários/Permissões/Configurações ficam em Administração.
      { moduleId: 'administration', path: '/meu-perfil' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Feiras, captação, gestão de leads e brindes promocionais.',
    icon: 'Megaphone',
    order: 2,
    items: [
      // Dashboard Geral pertence ao Marketing (decisão de negócio): seu
      // conteúdo real é exclusivamente leads/feiras/satisfação de
      // visitantes — nenhum indicador corporativo cross-departamental.
      // Não está dividido — módulo inteiro pertence aqui.
      { moduleId: 'general-dashboard' },
      // Pesquisa/Respostas pertencem ao Marketing (decisão de negócio):
      // hoje, na Pion G, são processos ligados à experiência nas feiras e
      // executados pelo próprio Marketing — não há área Customer Success
      // ativa com processos próprios nesta fase.
      { moduleId: 'fairs-and-leads', path: '/feiras' },
      { moduleId: 'fairs-and-leads', path: '/captacao' },
      { moduleId: 'fairs-and-leads', path: '/atendimento' },
      { moduleId: 'fairs-and-leads', path: '/leads' },
      { moduleId: 'fairs-and-leads', path: '/pesquisas' },
      { moduleId: 'fairs-and-leads', path: '/pesquisas/respostas' },
      // Gestão de Brindes não está dividida — módulo inteiro pertence aqui.
      { moduleId: 'gifts-management' },
    ],
  },
  {
    id: 'ti',
    name: 'Departamento de TI',
    description: 'Central de Atendimento e operação técnica dos chamados de TI.',
    icon: 'LifeBuoy',
    order: 4,
    items: [
      { moduleId: 'it-tickets', path: '/ti?view=central' },
    ],
  },
  {
    id: 'administracao',
    name: 'Administração',
    description: 'Usuários, permissões e configurações do Hub.',
    icon: 'Settings',
    order: 5,
    items: [
      { moduleId: 'administration', path: '/admin/usuarios' },
      { moduleId: 'administration', path: '/admin/permissoes' },
      { moduleId: 'administration', path: '/configuracoes' },
    ],
  },
]
