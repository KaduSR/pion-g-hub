-- Patch idempotente — corrige bug real reportado no 1º teste manual em HML
-- da Sprint 4.2 (POST /rest/v1/rpc/ti_criar_chamado -> 400, "column "id"
-- does not exist"). Contém SOMENTE o CREATE OR REPLACE FUNCTION afetado,
-- com o mesmo nome/assinatura já existente no banco — não recria tabelas,
-- índices, RLS ou seeds da migration 20260722150000. Seguro reaplicar
-- quantas vezes for preciso.
--
-- Causa raiz: public.ti_profiles_with_permission(TEXT) RETURNS SETOF UUID
-- (tipo escalar). Em "SELECT id, ... FROM ti_profiles_with_permission(...)"
-- sem alias, a única coluna de retorno herda o NOME DA PRÓPRIA FUNÇÃO, não
-- "id" — daí o erro. Correção: alias explícito de coluna
-- "AS destinatarios(profile_id)" + referência "destinatarios.profile_id".
--
-- Verificado (grep completo no projeto): este é o ÚNICO ponto de chamada
-- afetado. O uso equivalente em ti_triagem_chamado
-- ("FROM ti_profiles_in_equipe(p_equipe_id) AS profile_id") já é válido —
-- para uma SRF escalar, "AS profile_id" (sem lista de colunas) faz o alias
-- da tabela dobrar como nome de coluna (mesmo idioma de
-- "SELECT n FROM generate_series(1,5) AS n"), então não precisa mudar.
-- ti_atribuir_chamado e ti_comentar_chamado não chamam nenhuma das duas
-- funções.

CREATE OR REPLACE FUNCTION public.ti_criar_chamado(
  p_titulo TEXT,
  p_descricao TEXT,
  p_categoria_id UUID,
  p_prioridade_sugerida TEXT DEFAULT NULL,
  p_chamado_relacionado_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_solicitante_profile_id UUID;
  v_categoria_ativa BOOLEAN;
  v_prioridade_inicial TEXT;
  v_prazos RECORD;
  v_chamado_id UUID;
BEGIN
  v_solicitante_profile_id := public.ti_perfil_ativo_id();

  IF v_solicitante_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('tickets.create') THEN
    RAISE EXCEPTION 'Sem permissão para abrir chamados' USING ERRCODE = '42501';
  END IF;

  IF p_titulo IS NULL OR btrim(p_titulo) = '' THEN
    RAISE EXCEPTION 'Título é obrigatório' USING ERRCODE = '22023';
  END IF;

  SELECT ativo INTO v_categoria_ativa FROM public.ti_categorias WHERE id = p_categoria_id;
  IF v_categoria_ativa IS NULL OR NOT v_categoria_ativa THEN
    RAISE EXCEPTION 'Categoria % não encontrada ou inativa', p_categoria_id USING ERRCODE = '22023';
  END IF;

  IF p_prioridade_sugerida IS NOT NULL AND p_prioridade_sugerida NOT IN ('baixa', 'media', 'alta', 'urgente') THEN
    RAISE EXCEPTION 'Prioridade sugerida inválida: %', p_prioridade_sugerida USING ERRCODE = '22023';
  END IF;

  IF p_chamado_relacionado_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.ti_chamados WHERE id = p_chamado_relacionado_id AND status = 'fechado') THEN
    RAISE EXCEPTION 'Chamado relacionado % não encontrado ou não está com status fechado', p_chamado_relacionado_id
      USING ERRCODE = '22023';
  END IF;

  v_prioridade_inicial := COALESCE(p_prioridade_sugerida, 'media');

  SELECT * INTO v_prazos FROM public.ti_calcular_prazo_sla(v_prioridade_inicial, now());
  IF v_prazos.prazo_resolucao IS NULL THEN
    RAISE EXCEPTION 'Nenhuma regra de SLA ativa para a prioridade %', v_prioridade_inicial USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ti_chamados (
    titulo, descricao, categoria_id, prioridade_sugerida, prioridade, status,
    solicitante_profile_id, chamado_relacionado_id,
    prazo_primeira_resposta_em, prazo_resolucao_em
  ) VALUES (
    p_titulo, p_descricao, p_categoria_id, p_prioridade_sugerida, v_prioridade_inicial, 'aberto',
    v_solicitante_profile_id, p_chamado_relacionado_id,
    v_prazos.prazo_primeira_resposta, v_prazos.prazo_resolucao
  ) RETURNING id INTO v_chamado_id;

  INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, valor_novo)
  VALUES (v_chamado_id, v_solicitante_profile_id, 'usuario', 'chamado_criado',
    jsonb_build_object('prioridade', v_prioridade_inicial));

  -- Correção (era: "SELECT id, v_chamado_id, ... FROM ti_profiles_with_permission('tickets.triage')" sem alias)
  INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
  SELECT destinatarios.profile_id, v_chamado_id, 'novo_chamado'
  FROM public.ti_profiles_with_permission('tickets.triage') AS destinatarios(profile_id);

  RETURN v_chamado_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ti_criar_chamado(TEXT, TEXT, UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_criar_chamado(TEXT, TEXT, UUID, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_criar_chamado(TEXT, TEXT, UUID, TEXT, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
