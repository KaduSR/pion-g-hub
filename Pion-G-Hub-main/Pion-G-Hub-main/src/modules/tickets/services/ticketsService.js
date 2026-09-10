import { supabase } from '../../../lib/supabase'

const TABLE = 'ti_chamados'

// Sprint 4.2: o formulário pede um campo "Equipamento" que não existe como
// coluna em ti_chamados (decisão explícita: não criar migration nova nesta
// sprint) — embutido como as duas primeiras linhas da descrição.
function montarDescricao({ equipamento, descricao }) {
  const eq = (equipamento || '').trim()
  const desc = (descricao || '').trim()
  return eq ? `Equipamento: ${eq}\n\n${desc}` : desc
}

// Buckets de status usados pelos cards/filtros de "Minhas solicitações" —
// únicos 3 grupos que a UI do solicitante distingue (revisão de navegação):
// "Aguardando atendimento" (aberto/em_triagem/atribuido/reaberto — reabrir
// volta o chamado pra fila de espera do solicitante), "Em atendimento"
// (em_atendimento/aguardando_solicitante) e "Concluídos" (resolvido/
// fechado — só esses dois). "cancelado" NÃO entra em nenhum dos 3
// buckets/indicadores de propósito: continua aparecendo normalmente no
// filtro/aba "Todos" (que não usa STATUS_BUCKETS, passa statuses=undefined
// pra getMyTickets), mas não incrementa nenhum cartão nem conta como
// "Concluído" — cancelar não é a mesma coisa que concluir. A Central de
// Atendimento usa os 7 status operacionais detalhados, sem essa
// simplificação — os dois agrupamentos não precisam ter os mesmos nomes,
// só ser matematicamente coerentes (ver ServiceQueueStats.jsx).
export const STATUS_BUCKETS = {
  aberto: ['aberto', 'em_triagem', 'atribuido', 'reaberto'],
  andamento: ['em_atendimento', 'aguardando_solicitante'],
  concluido: ['resolvido', 'fechado'],
}

const PRIORIDADE_ORDEM = { baixa: 0, media: 1, alta: 2, urgente: 3 }

export const ticketsService = {
  /**
   * Categorias ativas, pra popular o <select> do formulário de abertura.
   * Reaproveita o catálogo já seedado na Sprint 4.1 — nenhuma categoria
   * nova é criada pelo frontend.
   */
  async getCategories() {
    const { data, error } = await supabase
      .from('ti_categorias')
      .select('id, nome, equipe_padrao_id')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) throw error
    return data
  },

  /** Equipes ativas (Infraestrutura/Sistemas) — pra selects de triagem/filtro. */
  async getTeams() {
    const { data, error } = await supabase
      .from('ti_equipes')
      .select('id, nome, codigo')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) throw error
    return data
  },

  /**
   * O usuário autenticado é membro ATIVO de alguma equipe de TI? Usada só
   * pra decidir visibilidade da Central de Atendimento (ver
   * useCentralAtendimentoAccess) — não é uma consulta insegura nem exige
   * RPC nova: a RLS de ti_equipe_membros ("Leitura propria
   * ti_equipe_membros") já restringe TODA leitura dessa tabela a
   * `profile_id = ti_perfil_ativo_id()` — ou seja, mesmo sem nenhum filtro
   * no client, o Postgres nunca devolveria a linha de outra pessoa. Filtrar
   * por `profileId` aqui é só precisão de query, não o limite de segurança
   * real (que é a RLS, avaliada no banco).
   */
  async hasActiveTeamMembership(profileId) {
    if (!profileId) return false
    const { data, error } = await supabase
      .from('ti_equipe_membros')
      .select('equipe_id')
      .eq('profile_id', profileId)
      .eq('ativo', true)
      .limit(1)
    if (error) throw error
    return (data?.length ?? 0) > 0
  },

  /**
   * Abre um chamado novo via RPC ti_criar_chamado (SECURITY DEFINER) — o
   * banco resolve solicitante/SLA/notificação, o service só monta os
   * parâmetros. `prioridadeSugerida` aceita 'baixa' | 'media' | 'alta'
   * (o formulário desta sprint não oferece 'urgente' ao solicitante).
   */
  async createTicket({ categoriaId, equipamento, titulo, descricao, prioridadeSugerida }) {
    const { data, error } = await supabase.rpc('ti_criar_chamado', {
      p_titulo: titulo,
      p_descricao: montarDescricao({ equipamento, descricao }),
      p_categoria_id: categoriaId,
      p_prioridade_sugerida: prioridadeSugerida || null,
    })
    if (error) throw error
    return data // uuid do chamado criado
  },

  /**
   * Lista os chamados do solicitante logado — "Minhas solicitações", só
   * chamados onde o usuário É o solicitante, nunca chamados atribuídos a
   * ele como técnico. CORRIGIDO na revisão de navegação: filtrar por
   * `solicitante_profile_id` explicitamente aqui, não só confiar na RLS.
   * A RLS de ti_chamados libera a leitura por QUALQUER um dos ramos que o
   * usuário tiver (view_all/view_team/triage/view_own) — pra alguém que
   * só tem view_own isso já era equivalente a "só meus chamados", mas pra
   * um agente de TI que também tem view_all/view_team/manage_team/triage
   * (a audiência inteira desta revisão!), uma query sem filtro de dono
   * devolveria TODOS os chamados visíveis por qualquer ramo da RLS — não
   * só os que ele abriu. Esse filtro explícito é o que garante "Minhas
   * solicitações" nunca misturar com a Central de Atendimento.
   *
   * @param {string}   solicitanteProfileId - profile.id do usuário autenticado.
   * @param {string[]} [statuses] - lista de status pra filtrar (ver STATUS_BUCKETS);
   *                                omitido/vazio = todos.
   * @param {string}   [search]   - filtra por número (código) ou título.
   * @param {string}   [sort]     - 'recent' (padrão) | 'oldest' | 'priority' | 'updated'.
   */
  async getMyTickets({ solicitanteProfileId, statuses, search, sort = 'recent' } = {}) {
    let query = supabase
      .from(TABLE)
      .select('id, codigo_chamado, titulo, prioridade, status, created_at, updated_at, ti_categorias(nome)')
      .eq('solicitante_profile_id', solicitanteProfileId)

    if (statuses && statuses.length) query = query.in('status', statuses)
    if (search) {
      query = query.or(`titulo.ilike.%${search}%,codigo_chamado.ilike.%${search}%`)
    }

    // 'priority' precisa de ordenação por severidade real, não alfabética
    // (baixa/media/alta/urgente não estão em ordem alfabética de gravidade)
    // — feito no client depois de buscar; as demais usam ORDER BY no banco.
    if (sort === 'oldest') query = query.order('created_at', { ascending: true })
    else if (sort === 'updated') query = query.order('updated_at', { ascending: false })
    else if (sort !== 'priority') query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error

    if (sort === 'priority') {
      return [...data].sort((a, b) => (PRIORIDADE_ORDEM[b.prioridade] ?? 0) - (PRIORIDADE_ORDEM[a.prioridade] ?? 0))
    }
    return data
  },

  async getTicket(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, ti_categorias(nome), ti_equipes(nome)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  /**
   * Mesma coisa que getTicket(), mas enriquecida com solicitante_nome/
   * responsavel_nome — só usada pela Central de Atendimento (Sprint 4.3).
   * NUNCA faz JOIN direto com user_profiles (RLS da Sprint 2.2 só libera a
   * própria linha) — reaproveita ti_fila_atendimento (SECURITY DEFINER,
   * já aprovada) filtrando pelo código do próprio chamado, que é único
   * (índice único em codigo_chamado), pra obter só os dois nomes.
   */
  async getTicketOperational(id) {
    const ticket = await this.getTicket(id)
    const { data, error } = await supabase.rpc('ti_fila_atendimento', {
      p_busca: ticket.codigo_chamado,
      p_limit: 1,
    })
    if (error) throw error
    const enriched = data?.[0]
    return {
      ...ticket,
      solicitante_nome: enriched?.solicitante_nome ?? null,
      responsavel_nome: enriched?.responsavel_nome ?? null,
    }
  },

  /**
   * Comentários visíveis (RLS já esconde os internos do solicitante —
   * Checkpoint 2). Inclui `interno` — seguro pra sempre selecionar porque a
   * RLS já filtra a LINHA inteira antes de chegar aqui; quem não pode ver
   * um comentário interno nunca recebe a linha, então nunca vê a coluna.
   */
  async getComments(chamadoId) {
    const { data, error } = await supabase
      .from('ti_chamado_comentarios')
      .select('id, mensagem, autor_profile_id, interno, created_at')
      .eq('chamado_id', chamadoId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  /**
   * Comenta via RPC ti_comentar_chamado. Nunca envia p_interno=true — o
   * próprio banco também recusaria (solicitante nunca cria comentário
   * interno, seção 3 do doc), isto é só o client já respeitando a regra.
   * Reaproveitada pela Central de Atendimento como "Responder ao
   * solicitante" (mesmo p_interno=false).
   */
  async addComment(chamadoId, mensagem) {
    const { data, error } = await supabase.rpc('ti_comentar_chamado', {
      p_chamado_id: chamadoId,
      p_mensagem: mensagem,
      p_interno: false,
    })
    if (error) throw error
    return data
  },

  /** "Adicionar nota interna" — só a Central de Atendimento usa isto. */
  async addInternalComment(chamadoId, mensagem) {
    const { data, error } = await supabase.rpc('ti_comentar_chamado', {
      p_chamado_id: chamadoId,
      p_mensagem: mensagem,
      p_interno: true,
    })
    if (error) throw error
    return data
  },

  /**
   * Contadores do dashboard (seção 1) — mesmo motivo de getMyTickets():
   * filtra por `solicitante_profile_id` explicitamente, não só pela RLS
   * (que, sozinha, devolveria todos os chamados visíveis por QUALQUER
   * permissão do usuário, não só os que ele abriu). Volume por solicitante
   * é sempre pequeno, não justifica RPC nova só pra um GROUP BY.
   */
  async getDashboardStats(solicitanteProfileId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('status')
      .eq('solicitante_profile_id', solicitanteProfileId)
    if (error) throw error

    const stats = { aberto: 0, andamento: 0, concluido: 0 }
    for (const { status } of data) {
      if (STATUS_BUCKETS.aberto.includes(status)) stats.aberto += 1
      else if (STATUS_BUCKETS.andamento.includes(status)) stats.andamento += 1
      else if (STATUS_BUCKETS.concluido.includes(status)) stats.concluido += 1
    }
    return stats
  },

  // ============================================================
  // Central de Atendimento (Sprint 4.3) — daqui pra baixo
  // ============================================================

  /**
   * Fila operacional — SEMPRE via RPC ti_fila_atendimento (SECURITY
   * DEFINER). Nunca um JOIN direto com user_profiles no client: a RLS da
   * Sprint 2.2 só libera a própria linha, então um select direto devolveria
   * null pro nome do solicitante/responsável de qualquer chamado que não
   * seja o do próprio agente — a RPC já resolve isso com a mesma
   * autorização de "Leitura ti_chamados" (view_all/manage_all/view_team+
   * própria equipe/triage-não-triado). Sem nenhuma dessas permissões, a
   * RPC devolve 0 linhas — nunca lança erro de acesso negado por si só.
   *
   * Paginação: pede p_limit+1 e corta o excedente, só pra saber se existe
   * próxima página sem precisar de uma segunda query de COUNT(*).
   */
  async getServiceQueue({
    equipeId, status, prioridade, categoriaId, responsavelProfileId,
    semResponsavel, search, limit = 20, offset = 0,
  } = {}) {
    const { data, error } = await supabase.rpc('ti_fila_atendimento', {
      p_equipe_id: equipeId || null,
      p_status: status || null,
      p_prioridade: prioridade || null,
      p_categoria_id: categoriaId || null,
      p_responsavel_profile_id: responsavelProfileId || null,
      p_sem_responsavel: semResponsavel ?? null,
      p_busca: search || null,
      p_limit: limit + 1,
      p_offset: offset,
    })
    if (error) throw error

    const hasMore = data.length > limit
    return { items: hasMore ? data.slice(0, limit) : data, hasMore }
  },

  /**
   * IDs de chamados (dentre os informados) que têm ao menos uma nota
   * interna — usado só pra pintar o indicador de "possui nota interna" na
   * fila da Central de Atendimento (ServiceQueue.jsx). Uma única consulta
   * em lote (WHERE chamado_id IN (...)) pra todos os IDs da página atual,
   * nunca uma consulta por chamado — evita N+1. Segura por construção: a
   * RLS de "Leitura ti_chamado_comentarios" (Sprint 4.1/Checkpoint 2) já
   * exige `ti_pode_ver_interno_chamado(chamado_id)` para qualquer linha com
   * interno=true, então esta função nunca devolve um chamado_id cujo
   * conteúdo interno o usuário atual não tenha permissão de ver — nenhuma
   * tabela ou coluna nova, só reaproveita a RLS já existente.
   */
  async getChamadosComNotaInterna(chamadoIds) {
    if (!chamadoIds || chamadoIds.length === 0) return new Set()
    const { data, error } = await supabase
      .from('ti_chamado_comentarios')
      .select('chamado_id')
      .eq('interno', true)
      .in('chamado_id', chamadoIds)
    if (error) throw error
    return new Set(data.map((row) => row.chamado_id))
  },

  /**
   * Membros ativos de uma equipe — SEMPRE via RPC ti_listar_membros_equipe
   * (mesmo motivo do método acima: ti_equipe_membros só expõe a própria
   * linha via RLS). Usada pelo seletor de "Atribuir responsável".
   */
  async getTeamMembers(equipeId) {
    const { data, error } = await supabase.rpc('ti_listar_membros_equipe', {
      p_equipe_id: equipeId,
    })
    if (error) throw error
    return data
  },

  /**
   * Triagem via RPC ti_triagem_chamado — confirma/ajusta categoria,
   * escolhe equipe, confirma/ajusta prioridade oficial. O banco recalcula
   * SLA e grava histórico/notificação; o service só repassa os parâmetros.
   */
  async triageTicket({ chamadoId, equipeId, prioridade, categoriaId }) {
    const { data, error } = await supabase.rpc('ti_triagem_chamado', {
      p_chamado_id: chamadoId,
      p_equipe_id: equipeId,
      p_prioridade: prioridade,
      p_categoria_id: categoriaId || null,
    })
    if (error) throw error
    return data
  },

  /**
   * Atribui via RPC ti_atribuir_chamado — usada tanto por "Assumir chamado"
   * (responsavelProfileId = próprio perfil) quanto pela 1ª atribuição a um
   * colega escolhido em getTeamMembers(). A própria RPC já:
   *   - permite a 1ª atribuição (responsavel_profile_id era NULL);
   *   - é idempotente pro MESMO responsável (devolve {changed:false});
   *   - bloqueia trocar de um responsável já definido pra outro (23514).
   * Nenhuma dessas regras é reimplementada aqui — só se repassa o erro/
   * resultado pro chamador tratar.
   */
  async assignTicket({ chamadoId, responsavelProfileId }) {
    const { data, error } = await supabase.rpc('ti_atribuir_chamado', {
      p_chamado_id: chamadoId,
      p_responsavel_profile_id: responsavelProfileId,
    })
    if (error) throw error
    return data
  },

  /** "Assumir chamado" — atribui o próprio perfil autenticado. */
  async takeTicket(chamadoId, ownProfileId) {
    return this.assignTicket({ chamadoId, responsavelProfileId: ownProfileId })
  },

  /**
   * Muda status via RPC ti_mudar_status — a interface só oferece os
   * destinos derivados de STATUS_ACTIONS (máquina de estados real), mas a
   * RPC é a fonte de verdade final: qualquer transição inválida é
   * bloqueada lá, não aqui.
   */
  async changeStatus({ chamadoId, novoStatus }) {
    const { data, error } = await supabase.rpc('ti_mudar_status', {
      p_chamado_id: chamadoId,
      p_novo_status: novoStatus,
    })
    if (error) throw error
    return data
  },

  /**
   * Histórico operacional (triagem, atribuição, mudanças de status) — só
   * a Central de Atendimento usa isto, pra montar uma timeline rica pra
   * quem tem permissão de TI. RLS de ti_chamado_historico
   * (ti_pode_ver_interno_chamado) já filtra sozinha: quem não tem
   * permissão de TI simplesmente recebe 0 linhas, nunca um erro — por
   * isso o Portal do Solicitante nunca chama isto (nem precisaria, RLS já
   * devolveria vazio).
   */
  async getHistorico(chamadoId) {
    const { data, error } = await supabase
      .from('ti_chamado_historico')
      .select('id, evento, valor_anterior, valor_novo, created_at')
      .eq('chamado_id', chamadoId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },
}

/**
 * Transições de status oferecidas pela Central de Atendimento — reflete o
 * fluxo revisado pós-teste manual: Atribuído → Em atendimento → Resolvido
 * → Fechado, com Reaberto voltando direto pra Atribuído (sem repetir
 * triagem). 'atribuido → em_atendimento' e 'reaberto → atribuido' agora
 * existem em ti_mudar_status (patch da revisão de UX) sem depender de
 * ti_iniciar_tempo — cronômetro continua fora de escopo (Sprint 4.4).
 *
 * O backend ainda PERMITE "atribuido → resolvido" direto (não removido —
 * flexibilidade pra casos resolvidos rápido demais pra valer a pena abrir
 * "Em atendimento"), mas a interface só oferece o caminho linear
 * recomendado — nunca mostra "Marcar como resolvido" a partir de Atribuído,
 * exatamente pra não repetir a ambiguidade de "Resolver chamado" que soava
 * como encerramento imediato.
 *
 * `permission`:
 *   'manage'     → manage_all OU manage_team (chamado só está visível/
 *                  carregável pro agente se ele já pertence à equipe dele,
 *                  então não precisa reconferir "própria equipe" aqui).
 *   'manage_all' → só manage_all (reaberto/fechado são mais sensíveis —
 *                  mesma régua exata do RPC).
 */
export const STATUS_ACTIONS = {
  aberto: [
    { target: 'cancelado', label: 'Cancelar chamado', icon: 'XCircle', variant: 'danger', permission: 'manage_all', confirm: true },
  ],
  em_triagem: [
    { target: 'cancelado', label: 'Cancelar chamado', icon: 'XCircle', variant: 'danger', permission: 'manage', confirm: true },
  ],
  atribuido: [
    { target: 'em_atendimento', label: 'Iniciar atendimento', icon: 'PlayCircle', variant: 'primary', permission: 'manage', confirm: false },
    { target: 'cancelado', label: 'Cancelar chamado', icon: 'XCircle', variant: 'danger', permission: 'manage', confirm: true },
  ],
  em_atendimento: [
    { target: 'resolvido', label: 'Marcar como resolvido', icon: 'CheckCircle2', variant: 'success', permission: 'manage', confirm: false },
    { target: 'cancelado', label: 'Cancelar chamado', icon: 'XCircle', variant: 'danger', permission: 'manage', confirm: true },
  ],
  resolvido: [
    { target: 'reaberto', label: 'Reabrir chamado', icon: 'RotateCcw', variant: 'secondary', permission: 'manage_all', confirm: false },
    { target: 'fechado', label: 'Fechar chamado', icon: 'CheckCheck', variant: 'secondary', permission: 'manage_all', confirm: false },
  ],
  reaberto: [
    { target: 'atribuido', label: 'Retomar atendimento', icon: 'RefreshCcw', variant: 'primary', permission: 'manage', confirm: false },
  ],
}
