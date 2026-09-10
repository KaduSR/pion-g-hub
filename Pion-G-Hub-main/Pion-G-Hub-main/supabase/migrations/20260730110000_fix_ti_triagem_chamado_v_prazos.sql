-- ============================================================
-- PATCH IDEMPOTENTE — Correção de ti_triagem_chamado (v_prazos RECORD)
-- ============================================================
-- Aplicável isoladamente sobre um banco onde a Sprint 4.1
-- (20260722150000_sprint_4_1_chamados_ti_fundacao.sql) já está instalada —
-- não recria tabelas, índices, RLS ou seeds. Contém só CREATE OR REPLACE
-- FUNCTION + REVOKE/GRANT + NOTIFY, seguro reaplicar quantas vezes for
-- preciso. Mesmo texto já incorporado (como espelho local) em
-- supabase/migrations/20260722150000_sprint_4_1_chamados_ti_fundacao.sql e
-- em supabase/schema.sql, para que uma instalação nova a partir do zero já
-- nasça com esta correção.
--
-- BUG (achado no teste manual da Sprint 4.3): concluir ou editar uma
-- triagem retornava HTTP 500 com "record "v_prazos" is not assigned yet".
--
-- CAUSA RAIZ: v_prazos era declarada como RECORD genérico e só recebia
-- valor dentro de "IF v_prioridade_mudou THEN SELECT * INTO v_prazos ...".
-- Quando a triagem mantinha a MESMA prioridade que o chamado já tinha
-- (v_prioridade_mudou = false) — cenário comum tanto na 1ª triagem quanto
-- ao reabrir "Editar triagem" sem trocar a prioridade — esse bloco inteiro
-- era pulado, e v_prazos NUNCA era atribuída nesta execução. O UPDATE
-- logo abaixo referencia v_prazos.prazo_primeira_resposta/prazo_resolucao
-- dentro de expressões CASE; para uma variável RECORD nunca atribuída,
-- referenciar QUALQUER campo dela falha ao montar a instrução SQL —
-- independente de qual ramo do CASE "venceria" em teoria — daí o erro.
--
-- CORREÇÃO: v_prazos (RECORD) trocada por duas variáveis escalares
-- tipadas — v_prazo_primeira_resposta/v_prazo_resolucao TIMESTAMPTZ.
-- Variáveis escalares começam NULL e permanecem NULL até serem atribuídas;
-- diferente de um RECORD, referenciá-las antes de uma atribuição nunca
-- lança erro (NULL é um valor válido pra elas). O SELECT INTO explícito
-- (colunas nomeadas, não SELECT *) mais o teste "IF NOT FOUND OR
-- v_prazo_resolucao IS NULL" garante o erro amigável correto quando não
-- existir regra de SLA ativa pra prioridade escolhida — cenário que ANTES
-- também quebraria com o mesmo erro genérico de RECORD, em vez da exceção
-- pretendida.
--
-- Nenhuma mudança de assinatura, permissão, histórico ou notificação —
-- só a correção do bug de inicialização. Transação continua atômica: toda
-- validação (incluindo a nova checagem de SLA) ocorre ANTES do UPDATE, e
-- uma falha em RAISE EXCEPTION aborta a função inteira sem gravação parcial
-- (comportamento padrão de funções PL/pgSQL dentro da transação do
-- chamador).
CREATE OR REPLACE FUNCTION public.ti_triagem_chamado(
  p_chamado_id UUID,
  p_equipe_id UUID,
  p_prioridade TEXT,
  p_categoria_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id UUID;
  v_chamado public.ti_chamados;
  v_prazo_primeira_resposta TIMESTAMPTZ;
  v_prazo_resolucao TIMESTAMPTZ;
  v_prioridade_mudou BOOLEAN;
BEGIN
  v_actor_profile_id := public.ti_perfil_ativo_id();
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('tickets.triage') THEN
    RAISE EXCEPTION 'Sem permissão para triagem de chamados' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_chamado FROM public.ti_chamados WHERE id = p_chamado_id FOR UPDATE;
  IF v_chamado.id IS NULL THEN
    RAISE EXCEPTION 'Chamado % não encontrado', p_chamado_id USING ERRCODE = '22023';
  END IF;

  IF v_chamado.status NOT IN ('aberto', 'em_triagem') THEN
    RAISE EXCEPTION 'Chamado no status "%" não admite triagem', v_chamado.status USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ti_equipes WHERE id = p_equipe_id AND ativo = true) THEN
    RAISE EXCEPTION 'Equipe % não encontrada ou inativa', p_equipe_id USING ERRCODE = '22023';
  END IF;

  IF p_prioridade NOT IN ('baixa', 'media', 'alta', 'urgente') THEN
    RAISE EXCEPTION 'Prioridade inválida: %', p_prioridade USING ERRCODE = '22023';
  END IF;

  IF p_categoria_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.ti_categorias WHERE id = p_categoria_id AND ativo = true) THEN
    RAISE EXCEPTION 'Categoria % não encontrada ou inativa', p_categoria_id USING ERRCODE = '22023';
  END IF;

  v_prioridade_mudou := (p_prioridade IS DISTINCT FROM v_chamado.prioridade);

  IF v_prioridade_mudou THEN
    SELECT prazo_primeira_resposta, prazo_resolucao
    INTO v_prazo_primeira_resposta, v_prazo_resolucao
    FROM public.ti_calcular_prazo_sla(p_prioridade, v_chamado.created_at);

    IF NOT FOUND OR v_prazo_resolucao IS NULL THEN
      RAISE EXCEPTION 'Nenhuma regra de SLA ativa para a prioridade %', p_prioridade USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.ti_chamados SET
    categoria_id = COALESCE(p_categoria_id, categoria_id),
    equipe_id = p_equipe_id,
    prioridade = p_prioridade,
    status = 'em_triagem',
    prazo_primeira_resposta_em = CASE WHEN v_prioridade_mudou THEN v_prazo_primeira_resposta ELSE prazo_primeira_resposta_em END,
    prazo_resolucao_em = CASE WHEN v_prioridade_mudou THEN v_prazo_resolucao ELSE prazo_resolucao_em END,
    updated_at = now()
  WHERE id = p_chamado_id;

  INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, valor_anterior, valor_novo)
  VALUES (
    p_chamado_id, v_actor_profile_id, 'usuario', 'triagem',
    jsonb_build_object('equipe_id', v_chamado.equipe_id, 'prioridade', v_chamado.prioridade, 'categoria_id', v_chamado.categoria_id),
    jsonb_build_object('equipe_id', p_equipe_id, 'prioridade', p_prioridade, 'categoria_id', COALESCE(p_categoria_id, v_chamado.categoria_id))
  );

  IF v_prioridade_mudou THEN
    INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, valor_anterior, valor_novo)
    VALUES (p_chamado_id, v_actor_profile_id, 'usuario', 'sla_recalculado',
      jsonb_build_object('prazo_resolucao_em', v_chamado.prazo_resolucao_em),
      jsonb_build_object('prazo_resolucao_em', v_prazo_resolucao));

    INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
    VALUES (v_chamado.solicitante_profile_id, p_chamado_id, 'prioridade_alterada');
  END IF;

  INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
  SELECT profile_id, p_chamado_id, 'direcionado_equipe'
  FROM public.ti_profiles_in_equipe(p_equipe_id) AS profile_id;

  RETURN jsonb_build_object('changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.ti_triagem_chamado(UUID, UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_triagem_chamado(UUID, UUID, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_triagem_chamado(UUID, UUID, TEXT, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
