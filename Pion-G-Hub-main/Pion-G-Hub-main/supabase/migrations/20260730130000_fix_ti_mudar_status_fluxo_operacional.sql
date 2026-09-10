-- ============================================================
-- PATCH IDEMPOTENTE — ti_mudar_status: fluxo operacional revisado
-- ============================================================
-- Aplicável isoladamente sobre um banco onde a Sprint 4.1
-- (20260722150000_sprint_4_1_chamados_ti_fundacao.sql) já está instalada —
-- não recria tabelas, índices, RLS ou seeds. Contém só CREATE OR REPLACE
-- FUNCTION + REVOKE/GRANT + NOTIFY, seguro reaplicar quantas vezes for
-- preciso. Mesmo texto já incorporado (como espelho local) em
-- supabase/migrations/20260722150000_sprint_4_1_chamados_ti_fundacao.sql e
-- em supabase/schema.sql, para que uma instalação nova a partir do zero já
-- nasça com esta versão.
--
-- MOTIVAÇÃO — revisão de UX operacional pós-teste manual da Sprint 4.3.
-- Dois ajustes na máquina de estados, nenhuma tabela/coluna nova:
--
--   1. atribuido → em_atendimento agora é uma transição manual válida,
--      SEM depender de ti_iniciar_tempo (reservada só pra Sprint 4.4 —
--      cronômetro). "Em atendimento" e "aguardando_solicitante" já
--      existiam no CHECK de status de ti_chamados e já tinham suas
--      transições de SAÍDA modeladas nesta função — só faltava uma via de
--      ENTRADA que não fosse iniciar um cronômetro. Isso separa
--      "iniciar atendimento" (ação manual/visível na Central de
--      Atendimento) de "iniciar tempo" (Sprint 4.4), como pedido na
--      revisão de fluxo. Adicionado também à lista de status que exigem
--      manage_all/manage_team (bloco de autorização) — sem isso, a nova
--      transição reaberto→atribuido (item 2) passaria sem NENHUMA
--      checagem de permissão.
--
--   2. Reaberto → atribuido (era → em_triagem): reabrir um chamado
--      resolvido NÃO deve forçar nova triagem — categoria, equipe e
--      responsável continuam válidos (nenhum deles é limpo por nenhuma
--      transição desta função), só o status "esfriou". Reaberto →
--      em_triagem era um placeholder assumido no Checkpoint 1 da Sprint
--      4.1, nunca implementado no frontend — este ajuste fecha essa
--      lacuna com a semântica correta pedida na revisão de fluxo.
--
-- Nenhuma mudança de assinatura, de quem pode reabrir (continua só
-- solicitante ou manage_all), de pausa/retomada de SLA, de histórico ou
-- notificações — só as duas linhas da tabela de transições e a lista de
-- status autorizados por manage_all/manage_team.
CREATE OR REPLACE FUNCTION public.ti_mudar_status(
  p_chamado_id UUID,
  p_novo_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id UUID;
  v_chamado public.ti_chamados;
  v_transicoes_validas TEXT[];
  -- 7 dias — valor do doc (seção 1, item 11), a confirmar com o time de TI
  -- (seção 13: "valores propostos, não validados").
  v_prazo_reabertura_minutos INTEGER := 7 * 24 * 60;
BEGIN
  v_actor_profile_id := public.ti_perfil_ativo_id();
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_chamado FROM public.ti_chamados WHERE id = p_chamado_id FOR UPDATE;
  IF v_chamado.id IS NULL THEN
    RAISE EXCEPTION 'Chamado % não encontrado', p_chamado_id USING ERRCODE = '22023';
  END IF;

  v_transicoes_validas := CASE v_chamado.status
    WHEN 'em_atendimento'         THEN ARRAY['aguardando_solicitante', 'resolvido', 'cancelado']
    WHEN 'aguardando_solicitante' THEN ARRAY['em_atendimento', 'resolvido', 'cancelado']
    WHEN 'atribuido'              THEN ARRAY['em_atendimento', 'resolvido', 'cancelado']
    WHEN 'aberto'                 THEN ARRAY['cancelado']
    WHEN 'em_triagem'             THEN ARRAY['cancelado']
    WHEN 'resolvido'              THEN ARRAY['reaberto', 'fechado']
    WHEN 'reaberto'               THEN ARRAY['atribuido']
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (p_novo_status = ANY (v_transicoes_validas)) THEN
    RAISE EXCEPTION 'Transição de "%" para "%" não é permitida', v_chamado.status, p_novo_status
      USING ERRCODE = '23514';
  END IF;

  -- ── Autorização por operação ──
  -- 'atribuido' entra aqui pela transição reaberto → atribuido (item 1
  -- acima) — mesma régua de manage_all/manage_team das demais transições
  -- operacionais.
  IF p_novo_status IN ('resolvido', 'cancelado', 'aguardando_solicitante', 'em_atendimento', 'em_triagem', 'atribuido') THEN
    IF NOT (
      public.has_effective_permission('tickets.manage_all')
      OR (public.has_effective_permission('tickets.manage_team') AND public.ti_is_own_equipe(v_chamado.equipe_id))
    ) THEN
      RAISE EXCEPTION 'Sem permissão para alterar o status deste chamado' USING ERRCODE = '42501';
    END IF;
  ELSIF p_novo_status = 'reaberto' THEN
    IF NOT (v_chamado.solicitante_profile_id = v_actor_profile_id OR public.has_effective_permission('tickets.manage_all')) THEN
      RAISE EXCEPTION 'Apenas o solicitante (ou quem gerencia todos os chamados) pode reabrir' USING ERRCODE = '42501';
    END IF;
  ELSIF p_novo_status = 'fechado' THEN
    IF NOT public.has_effective_permission('tickets.manage_all') THEN
      RAISE EXCEPTION 'Sem permissão para fechar chamados manualmente' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── Regras específicas por transição ──
  IF p_novo_status = 'resolvido' AND EXISTS (
    SELECT 1 FROM public.ti_chamado_tempos
    WHERE chamado_id = p_chamado_id AND tipo = 'automatico' AND finalizado_em IS NULL
  ) THEN
    RAISE EXCEPTION 'Encerre o cronômetro ativo antes de resolver o chamado' USING ERRCODE = '23514';
  END IF;

  IF p_novo_status = 'reaberto'
     AND now() > v_chamado.resolved_at + make_interval(mins => v_prazo_reabertura_minutos) THEN
    RAISE EXCEPTION 'Prazo de reabertura expirado — abra um novo chamado vinculado a este (chamado_relacionado_id)'
      USING ERRCODE = '23514';
  END IF;

  -- ── Pausa/retomada de SLA (seção 6 do doc) ──
  IF p_novo_status = 'aguardando_solicitante' THEN
    UPDATE public.ti_chamados SET sla_pausado_em = now() WHERE id = p_chamado_id;

    WITH fechadas AS (
      UPDATE public.ti_chamado_tempos SET
        finalizado_em = now(),
        duracao_segundos = EXTRACT(EPOCH FROM (now() - iniciado_em))::INTEGER,
        updated_at = now()
      WHERE chamado_id = p_chamado_id AND tipo = 'automatico' AND finalizado_em IS NULL
      RETURNING id, duracao_segundos
    )
    INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, tempo_id, valor_novo)
    SELECT p_chamado_id, v_actor_profile_id, 'usuario', 'tempo_trabalhado', fechadas.id,
      jsonb_build_object('duracao_segundos', fechadas.duracao_segundos, 'motivo', 'aguardando_solicitante')
    FROM fechadas;
  ELSIF v_chamado.status = 'aguardando_solicitante' THEN
    UPDATE public.ti_chamados SET
      sla_tempo_pausado_segundos = sla_tempo_pausado_segundos + EXTRACT(EPOCH FROM (now() - sla_pausado_em))::INTEGER,
      sla_pausado_em = NULL
    WHERE id = p_chamado_id;
  END IF;

  UPDATE public.ti_chamados SET
    status = p_novo_status,
    resolved_at = CASE
      WHEN p_novo_status = 'resolvido' THEN now()
      WHEN p_novo_status = 'reaberto' THEN NULL
      ELSE resolved_at
    END,
    closed_at = CASE WHEN p_novo_status = 'fechado' THEN now() ELSE closed_at END,
    updated_at = now()
  WHERE id = p_chamado_id;

  INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, valor_anterior, valor_novo)
  VALUES (p_chamado_id, v_actor_profile_id, 'usuario', 'status_alterado',
    jsonb_build_object('status', v_chamado.status), jsonb_build_object('status', p_novo_status));

  IF p_novo_status = 'resolvido' THEN
    INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
    VALUES (v_chamado.solicitante_profile_id, p_chamado_id, 'chamado_resolvido');
  END IF;

  IF p_novo_status = 'reaberto' THEN
    INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
    SELECT profile_id, p_chamado_id, 'chamado_reaberto'
    FROM (
      SELECT v_chamado.responsavel_profile_id AS profile_id
      WHERE v_chamado.responsavel_profile_id IS NOT NULL
      UNION
      SELECT profile_id FROM public.ti_equipe_membros
      WHERE equipe_id = v_chamado.equipe_id AND coordenador = true AND ativo = true
    ) destinatarios;
  END IF;

  RETURN jsonb_build_object('changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.ti_mudar_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_mudar_status(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_mudar_status(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
