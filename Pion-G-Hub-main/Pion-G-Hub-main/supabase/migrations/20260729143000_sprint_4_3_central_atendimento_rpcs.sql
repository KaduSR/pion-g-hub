-- ============================================================
-- PATCH IDEMPOTENTE — Sprint 4.3 (Central de Atendimento)
-- ============================================================
-- Aplicável isoladamente sobre um banco onde a Sprint 4.1
-- (20260722150000_sprint_4_1_chamados_ti_fundacao.sql) e o patch de
-- 20260729120000 (fix de ti_criar_chamado) já estão instalados — não
-- recria tabelas, índices, RLS ou seeds. Contém só CREATE OR REPLACE
-- FUNCTION + REVOKE/GRANT + NOTIFY, seguro reaplicar quantas vezes for
-- preciso. Mesmo texto já incorporado (como espelho local) em
-- supabase/migrations/20260722150000_sprint_4_1_chamados_ti_fundacao.sql e
-- em supabase/schema.sql, para que uma instalação nova a partir do zero já
-- nasça com este estado final.
--
-- ESCOPO DESTE PATCH (revisão pós-checkpoint):
--   1. ti_listar_membros_equipe — nova RPC de leitura.
--   2. ti_fila_atendimento — nova RPC de leitura, agora com paginação
--      (p_limit/p_offset) e ordenação estável (created_at DESC, id DESC).
--   3. ti_atribuir_chamado — CORRIGIDA (não é RPC nova; mesma assinatura
--      já existente na Sprint 4.1) para bloquear reatribuição de um
--      responsável já definido para outro. Incluída neste mesmo patch,
--      documentada em seção própria abaixo, por pedido explícito de
--      revisão — mantém a Sprint 4.3 num único arquivo aplicável.
--
-- MOTIVAÇÃO — três lacunas/gaps encontrados na revisão técnica da Sprint
-- 4.3, os dois primeiros já previstos nos comentários da própria fundação
-- (Sprint 4.1):
--
--   1. RLS de ti_equipe_membros restringe cada perfil a enxergar só a
--      PRÓPRIA linha — não dá pra montar o combo de "Atribuir responsável"
--      com uma query direta da tabela. ti_profiles_in_equipe() já existia,
--      mas nunca teve GRANT para `authenticated` (só uso interno de outras
--      RPCs) — não é um endpoint chamável pelo frontend.
--
--   2. RLS de user_profiles (Sprint 2.2) restringe cada perfil a enxergar
--      só a PRÓPRIA linha — a fila operacional (leitura de ti_chamados)
--      não consegue exibir nome do solicitante/responsável com um JOIN
--      direto. Decisão explícita: NÃO ampliar a RLS de user_profiles (isso
--      abriria o diretório inteiro de usuários pra qualquer perfil de TI)
--      — em vez disso, uma RPC SECURITY DEFINER devolve só os nomes
--      estritamente necessários, já filtrados pelo mesmo escopo de
--      autorização que a RLS de "Leitura ti_chamados" usa.
--
--   3. ti_atribuir_chamado (original da Sprint 4.1) permitia reatribuir um
--      chamado já atribuído para qualquer outro membro válido da equipe,
--      sem nenhuma restrição de negócio — a Sprint 4.3 exige bloquear essa
--      troca no BANCO (não só esconder o botão na interface), até que uma
--      sprint futura implemente reatribuição segura com aceite.
--
-- Nenhuma das RPCs de leitura expõe e-mail, telefone ou qualquer outra
-- coluna de user_profiles além de `nome`. Nenhuma altera tabela, índice ou
-- RLS existente. ti_atribuir_chamado não passa a tocar em
-- ti_chamado_tempos (cronômetro) em nenhum cenário — comportamento
-- inalterado nesse ponto.
-- ============================================================

-- ── ti_listar_membros_equipe ─────────────────────────────────────
-- Só profile_id, nome e a função na equipe (coordenador) — nunca e-mail,
-- telefone ou outra coluna de user_profiles. Autorização: view_all/
-- manage_all (qualquer equipe), view_team/manage_team (só a própria
-- equipe, via ti_is_own_equipe) e tickets.triage (qualquer equipe ativa —
-- precisa avaliar a composição de times durante a triagem, antes de haver
-- vínculo de equipe com o chamado).
CREATE OR REPLACE FUNCTION public.ti_listar_membros_equipe(p_equipe_id UUID)
RETURNS TABLE (profile_id UUID, nome TEXT, coordenador BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.ti_perfil_ativo_id() IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ti_equipes WHERE id = p_equipe_id AND ativo = true) THEN
    RAISE EXCEPTION 'Equipe % não encontrada ou inativa', p_equipe_id USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.has_effective_permission('tickets.view_all')
    OR public.has_effective_permission('tickets.manage_all')
    OR public.has_effective_permission('tickets.triage')
    OR (
      (public.has_effective_permission('tickets.view_team') OR public.has_effective_permission('tickets.manage_team'))
      AND public.ti_is_own_equipe(p_equipe_id)
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para listar membros desta equipe' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT tem.profile_id, up.nome, tem.coordenador
  FROM public.ti_equipe_membros tem
  JOIN public.user_profiles up ON up.id = tem.profile_id AND up.ativo = true
  WHERE tem.equipe_id = p_equipe_id AND tem.ativo = true
  ORDER BY up.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.ti_listar_membros_equipe(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_listar_membros_equipe(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_listar_membros_equipe(UUID) TO authenticated;

-- ── ti_fila_atendimento ──────────────────────────────────────────
-- Fila operacional: mesmos chamados que "Leitura ti_chamados" (RLS da
-- Sprint 4.1) já libera para view_all/manage_all/view_team/manage_team/
-- triage — reproduz EXATAMENTE a mesma condição de autorização (sem o
-- ramo view_own, que é do Portal do Solicitante, não da Central de
-- Atendimento), e adiciona só nome do solicitante e do responsável via
-- JOIN com user_profiles — nunca e-mail, telefone ou qualquer outra
-- coluna. Sem nenhuma permissão de tickets.*, a condição inteira é falsa
-- e a função devolve zero linhas. Filtros são todos opcionais (NULL = não
-- filtra); busca cobre código, título e nome do solicitante. Paginação
-- (p_limit/p_offset) com limites de sanidade (1–200 linhas por página) e
-- ordenação estável (created_at DESC, id DESC como desempate — sem o
-- desempate por id, chamados criados no mesmo instante poderiam mudar de
-- posição entre páginas).
CREATE OR REPLACE FUNCTION public.ti_fila_atendimento(
  p_equipe_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_prioridade TEXT DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_responsavel_profile_id UUID DEFAULT NULL,
  p_sem_responsavel BOOLEAN DEFAULT NULL,
  p_busca TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                      UUID,
  codigo_chamado          TEXT,
  titulo                  TEXT,
  categoria_id            UUID,
  categoria_nome          TEXT,
  equipe_id               UUID,
  equipe_nome             TEXT,
  status                  TEXT,
  prioridade              TEXT,
  prioridade_sugerida     TEXT,
  solicitante_profile_id  UUID,
  solicitante_nome        TEXT,
  responsavel_profile_id  UUID,
  responsavel_nome        TEXT,
  created_at              TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ,
  prazo_resolucao_em      TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id, c.codigo_chamado, c.titulo,
    c.categoria_id, cat.nome,
    c.equipe_id, eq.nome,
    c.status, c.prioridade, c.prioridade_sugerida,
    c.solicitante_profile_id, sol.nome,
    c.responsavel_profile_id, resp.nome,
    c.created_at, c.updated_at, c.prazo_resolucao_em
  FROM public.ti_chamados c
  LEFT JOIN public.ti_categorias cat ON cat.id = c.categoria_id
  LEFT JOIN public.ti_equipes eq ON eq.id = c.equipe_id
  LEFT JOIN public.user_profiles sol ON sol.id = c.solicitante_profile_id
  LEFT JOIN public.user_profiles resp ON resp.id = c.responsavel_profile_id
  WHERE (
    public.has_effective_permission('tickets.view_all')
    OR public.has_effective_permission('tickets.manage_all')
    OR (public.has_effective_permission('tickets.triage') AND c.equipe_id IS NULL)
    OR (
      (public.has_effective_permission('tickets.view_team') OR public.has_effective_permission('tickets.manage_team'))
      AND public.ti_is_own_equipe(c.equipe_id)
    )
  )
  AND (p_equipe_id IS NULL OR c.equipe_id = p_equipe_id)
  AND (p_status IS NULL OR c.status = p_status)
  AND (p_prioridade IS NULL OR c.prioridade = p_prioridade)
  AND (p_categoria_id IS NULL OR c.categoria_id = p_categoria_id)
  AND (p_responsavel_profile_id IS NULL OR c.responsavel_profile_id = p_responsavel_profile_id)
  AND (p_sem_responsavel IS NOT TRUE OR c.responsavel_profile_id IS NULL)
  AND (
    p_busca IS NULL OR btrim(p_busca) = ''
    OR c.codigo_chamado ILIKE '%' || p_busca || '%'
    OR c.titulo ILIKE '%' || p_busca || '%'
    OR sol.nome ILIKE '%' || p_busca || '%'
  )
  ORDER BY c.created_at DESC, c.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.ti_fila_atendimento(UUID, TEXT, TEXT, UUID, UUID, BOOLEAN, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_fila_atendimento(UUID, TEXT, TEXT, UUID, UUID, BOOLEAN, TEXT, INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_fila_atendimento(UUID, TEXT, TEXT, UUID, UUID, BOOLEAN, TEXT, INTEGER, INTEGER) TO authenticated;

-- ── ti_atribuir_chamado (CORRIGIDA — bloqueio real de reatribuição) ─────
-- Mesma assinatura da Sprint 4.1 — CREATE OR REPLACE, não é função nova.
-- ÚNICA mudança de comportamento: com um responsavel_profile_id JÁ
-- definido e diferente do informado, a função agora RECUSA a operação
-- (antes reatribuía livremente, gerando evento 'reatribuicao'). Três
-- cenários, todos resolvidos no próprio banco (não é validação só de
-- interface):
--   1. responsavel_profile_id IS NULL (chamado ainda sem responsável):
--      comportamento igual ao original — atribui, grava histórico
--      'atribuicao', notifica o novo responsável. Cobre tanto "Assumir
--      chamado" (auto-atribuição) quanto atribuir a um colega, na
--      PRIMEIRA vez.
--   2. responsavel_profile_id = p_responsavel_profile_id (mesma pessoa):
--      idempotente — devolve {changed:false} sem tocar em histórico ou
--      notificações (evita duplicidade se o frontend reenviar a mesma
--      atribuição, ex.: duplo clique).
--   3. responsavel_profile_id preenchido e DIFERENTE do informado:
--      bloqueado com exceção clara (23514) — reatribuição segura com
--      aceite fica para sprint futura, fora de escopo agora.
-- A validação de "responsável precisa ser membro ativo da equipe" e a
-- checagem de permissão (manage_all / manage_team+ti_is_own_equipe)
-- continuam exatamente como estavam — nenhuma delas foi relaxada. Nenhuma
-- sessão de ti_chamado_tempos é lida, criada ou alterada por esta função,
-- antes ou depois desta correção.
CREATE OR REPLACE FUNCTION public.ti_atribuir_chamado(
  p_chamado_id UUID,
  p_responsavel_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id UUID;
  v_chamado public.ti_chamados;
BEGIN
  v_actor_profile_id := public.ti_perfil_ativo_id();
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_chamado FROM public.ti_chamados WHERE id = p_chamado_id FOR UPDATE;
  IF v_chamado.id IS NULL THEN
    RAISE EXCEPTION 'Chamado % não encontrado', p_chamado_id USING ERRCODE = '22023';
  END IF;

  IF v_chamado.equipe_id IS NULL THEN
    RAISE EXCEPTION 'Chamado precisa passar pela triagem antes de ser atribuído' USING ERRCODE = '23514';
  END IF;

  IF v_chamado.status NOT IN ('em_triagem', 'atribuido', 'em_atendimento') THEN
    RAISE EXCEPTION 'Chamado no status "%" não admite atribuição', v_chamado.status USING ERRCODE = '23514';
  END IF;

  IF NOT (
    public.has_effective_permission('tickets.manage_all')
    OR (public.has_effective_permission('tickets.manage_team') AND public.ti_is_own_equipe(v_chamado.equipe_id))
  ) THEN
    RAISE EXCEPTION 'Sem permissão para atribuir este chamado' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.ti_equipe_membros tem
    JOIN public.user_profiles up ON up.id = tem.profile_id AND up.ativo = true
    WHERE tem.equipe_id = v_chamado.equipe_id AND tem.profile_id = p_responsavel_profile_id AND tem.ativo = true
  ) THEN
    RAISE EXCEPTION 'Responsável precisa ser membro ativo (perfil e vínculo) da equipe do chamado' USING ERRCODE = '22023';
  END IF;

  -- Sprint 4.3: trocar de um responsável JÁ DEFINIDO para outro é
  -- bloqueado nesta sprint — reatribuição segura com aceite é item de
  -- sprint futura (ver docs/architecture/engineering/sprint-4-chamados-ti.md).
  IF v_chamado.responsavel_profile_id IS NOT NULL
     AND v_chamado.responsavel_profile_id <> p_responsavel_profile_id THEN
    RAISE EXCEPTION 'Chamado já está atribuído a outro responsável — reatribuição não é permitida nesta sprint'
      USING ERRCODE = '23514';
  END IF;

  -- Idempotente: já está atribuído a esta mesma pessoa — nada a fazer,
  -- sem duplicar histórico/notificação.
  IF v_chamado.responsavel_profile_id = p_responsavel_profile_id THEN
    RETURN jsonb_build_object('changed', false);
  END IF;

  -- A partir daqui, só resta o caso responsavel_profile_id IS NULL
  -- (primeira atribuição — inclui "Assumir chamado").
  UPDATE public.ti_chamados SET
    responsavel_profile_id = p_responsavel_profile_id,
    status = 'atribuido',
    updated_at = now()
  WHERE id = p_chamado_id;

  INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, valor_anterior, valor_novo)
  VALUES (p_chamado_id, v_actor_profile_id, 'usuario', 'atribuicao',
    jsonb_build_object('responsavel_profile_id', NULL),
    jsonb_build_object('responsavel_profile_id', p_responsavel_profile_id));

  INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
  VALUES (p_responsavel_profile_id, p_chamado_id, 'atribuicao');

  RETURN jsonb_build_object('changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.ti_atribuir_chamado(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_atribuir_chamado(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_atribuir_chamado(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
