-- ============================================================
-- TESTE — Sprint 4.1 (Chamados de TI): pré-voo PBAC + bateria de RLS/RPCs
-- ============================================================
-- Documento executável único. Ver
-- docs/architecture/engineering/sprint-4-1-deploy-runbook.md para o
-- procedimento completo de implantação (este arquivo cobre só a seção
-- "Bateria de testes" — pré-voo e testes numerados, tudo numa única
-- transação, do BEGIN ao ROLLBACK).
--
-- NADA aqui persiste: a transação inteira termina em ROLLBACK no final,
-- de propósito — inclusive se todas as asserções passarem. Isto é
-- validação, não seed.
--
-- ANTES DE RODAR: preencha os 5 e-mails de teste na seção "0. Identidades"
-- abaixo. Nenhum outro ponto do arquivo precisa de edição manual.
--
-- CRITÉRIO DE SUCESSO: o script inteiro roda do início ao fim sem nenhum
-- "TESTE ... FALHOU" nem "PRÉ-VOO ... FALHOU" na saída (aparecem como
-- RAISE EXCEPTION, que aborta a transação imediatamente). Se algo falhar,
-- a mensagem de erro já identifica o número/descrição do teste e os
-- valores esperado/obtido — não precisa rodar nada mais pra saber o que
-- quebrou.
-- ============================================================

BEGIN;

-- ── Helper de asserção — vive em pg_temp (schema temporário da sessão),  ──
-- ── some junto no ROLLBACK final. Não precisa de GRANT: funções recebem ──
-- ── EXECUTE de PUBLIC por padrão no Postgres (diferente de tabelas).    ──
CREATE FUNCTION pg_temp.assert_eq(p_teste text, p_descricao text, p_esperado anyelement, p_obtido anyelement)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_esperado IS DISTINCT FROM p_obtido THEN
    RAISE EXCEPTION 'TESTE % FALHOU (%): esperado=%, obtido=%', p_teste, p_descricao, p_esperado, p_obtido;
  ELSE
    RAISE NOTICE 'Teste % OK (%): valor = %', p_teste, p_descricao, p_obtido;
  END IF;
END;
$$;

-- ============================================================
-- 0. IDENTIDADES — preencha os 5 e-mails aqui, só aqui
-- ============================================================
CREATE TEMP TABLE _teste_pessoas (
  papel        text PRIMARY KEY,
  profile_id   uuid NOT NULL,
  auth_user_id uuid NOT NULL
);

INSERT INTO _teste_pessoas (papel, profile_id, auth_user_id)
SELECT 'solicitante',  id, user_id FROM public.user_profiles WHERE email = '<email-solicitante-teste>'
UNION ALL
SELECT 'solicitante2', id, user_id FROM public.user_profiles WHERE email = '<email-outro-solicitante-teste>'
UNION ALL
SELECT 'nicolas',      id, user_id FROM public.user_profiles WHERE email = '<email-nicolas>'
UNION ALL
SELECT 'ricardo',      id, user_id FROM public.user_profiles WHERE email = '<email-ricardo>'
UNION ALL
SELECT 'admin',        id, user_id FROM public.user_profiles WHERE email = '<email-admin-teste>';

DO $$
DECLARE v_faltando text;
BEGIN
  SELECT string_agg(esperado.papel, ', ') INTO v_faltando
  FROM (VALUES ('solicitante'),('solicitante2'),('nicolas'),('ricardo'),('admin')) AS esperado(papel)
  WHERE esperado.papel NOT IN (SELECT papel FROM _teste_pessoas);
  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'SETUP FALHOU: e-mails de teste não resolvidos para: % — corrija a seção 0 antes de continuar', v_faltando;
  END IF;
END $$;

CREATE TEMP TABLE _teste_chamado (id uuid);
GRANT ALL ON _teste_pessoas, _teste_chamado TO authenticated;

-- ============================================================
-- 1. PRÉ-VOO — valida a matriz PBAC de admin, Ricardo e Nícolas ANTES de
--    criar qualquer dado de teste
-- ============================================================

-- ── PRÉ-VOO: admin precisa ter triage e manage_all (usados nos testes 4,
-- ── 6 e 8) ───────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'admin'), true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  PERFORM pg_temp.assert_eq('PRE-6', 'admin tem tickets.triage',
    true, public.has_effective_permission('tickets.triage'));
  PERFORM pg_temp.assert_eq('PRE-7', 'admin tem tickets.manage_all',
    true, public.has_effective_permission('tickets.manage_all'));
END $$;

RESET ROLE;

-- ── PRÉ-VOO: Ricardo (agente usado pra provar isolamento entre equipes) ──
-- ── precisa ter view_team, mas NÃO pode ter view_all nem triage — ambos ──
-- ── mascarariam os testes 3 e 5 (dariam visão por outro caminho).       ──
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'ricardo'), true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  PERFORM pg_temp.assert_eq('PRE-1', 'Ricardo tem tickets.view_team',
    true, public.has_effective_permission('tickets.view_team'));
  PERFORM pg_temp.assert_eq('PRE-2', 'Ricardo NÃO tem tickets.view_all (senão mascara o teste de isolamento)',
    false, public.has_effective_permission('tickets.view_all'));
  PERFORM pg_temp.assert_eq('PRE-3', 'Ricardo NÃO tem tickets.triage (senão mascara o teste de isolamento)',
    false, public.has_effective_permission('tickets.triage'));
END $$;

RESET ROLE;

-- ── PRÉ-VOO: Nícolas precisa ter view_team e time_start (usados nos      ──
-- ── testes 6 e 7) ────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'nicolas'), true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  PERFORM pg_temp.assert_eq('PRE-4', 'Nícolas tem tickets.view_team',
    true, public.has_effective_permission('tickets.view_team'));
  PERFORM pg_temp.assert_eq('PRE-5', 'Nícolas tem tickets.time_start',
    true, public.has_effective_permission('tickets.time_start'));
END $$;

RESET ROLE;

-- ============================================================
-- 2. BATERIA DE TESTES
-- ============================================================

-- ── Teste 1: solicitante cria chamado ────────────────────────────────────
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'solicitante'), true);
SET LOCAL ROLE authenticated;

INSERT INTO _teste_chamado (id)
SELECT public.ti_criar_chamado(
  '[TESTE] Notebook não liga', 'Tela preta ao ligar',
  (SELECT id FROM public.ti_categorias WHERE nome = 'Computador/Notebook'),
  'alta'
);

DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM _teste_chamado;
  PERFORM pg_temp.assert_eq('1', 'chamado de teste criado com id não nulo', true, (v_id IS NOT NULL));
END $$;

RESET ROLE;

-- ── Teste 2: outro solicitante NÃO vê o chamado de teste ────────────────
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'solicitante2'), true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.ti_chamados WHERE id = (SELECT id FROM _teste_chamado);
  PERFORM pg_temp.assert_eq('2', 'outro solicitante não vê o chamado de teste', 0::bigint, v_count);
END $$;

RESET ROLE;

-- ── Teste 3: Ricardo (Infraestrutura) não vê enquanto não-triado ────────
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'ricardo'), true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.ti_chamados WHERE id = (SELECT id FROM _teste_chamado);
  PERFORM pg_temp.assert_eq('3', 'Ricardo não vê chamado não-triado (sem view_all/triage)', 0::bigint, v_count);
END $$;

RESET ROLE;

-- ── Teste 4: admin faz triagem, direciona pra Sistemas, urgente ─────────
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'admin'), true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_result     jsonb;
  v_status     text;
  v_equipe_id  uuid;
  v_prioridade text;
  v_sistemas_id uuid;
BEGIN
  SELECT id INTO v_sistemas_id FROM public.ti_equipes WHERE codigo = 'sistemas';

  SELECT public.ti_triagem_chamado((SELECT id FROM _teste_chamado), v_sistemas_id, 'urgente')
  INTO v_result;
  PERFORM pg_temp.assert_eq('4a', 'ti_triagem_chamado retorna changed=true',
    true, (v_result ->> 'changed')::boolean);

  SELECT status, equipe_id, prioridade INTO v_status, v_equipe_id, v_prioridade
  FROM public.ti_chamados WHERE id = (SELECT id FROM _teste_chamado);

  PERFORM pg_temp.assert_eq('4b', 'status vira em_triagem', 'em_triagem'::text, v_status);
  PERFORM pg_temp.assert_eq('4c', 'equipe_id aponta pra Sistemas', v_sistemas_id, v_equipe_id);
  PERFORM pg_temp.assert_eq('4d', 'prioridade vira urgente', 'urgente'::text, v_prioridade);
END $$;

RESET ROLE;

-- ── Teste 5: Ricardo continua sem ver (chamado agora é de Sistemas) ─────
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'ricardo'), true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.ti_chamados WHERE id = (SELECT id FROM _teste_chamado);
  PERFORM pg_temp.assert_eq('5', 'Ricardo (Infraestrutura) não vê chamado de Sistemas', 0::bigint, v_count);
END $$;

RESET ROLE;

-- ── Teste 6: admin atribui a Nícolas; Nícolas inicia atendimento ────────
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'admin'), true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_result jsonb;
BEGIN
  SELECT public.ti_atribuir_chamado(
    (SELECT id FROM _teste_chamado),
    (SELECT profile_id FROM _teste_pessoas WHERE papel = 'nicolas')
  ) INTO v_result;
  PERFORM pg_temp.assert_eq('6a', 'ti_atribuir_chamado retorna changed=true',
    true, (v_result ->> 'changed')::boolean);
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'nicolas'), true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_count      bigint;
  v_tempo_id   uuid;
  v_status     text;
BEGIN
  SELECT count(*) INTO v_count FROM public.ti_chamados WHERE id = (SELECT id FROM _teste_chamado);
  PERFORM pg_temp.assert_eq('6b', 'Nícolas vê o chamado atribuído a ele', 1::bigint, v_count);

  SELECT public.ti_iniciar_tempo((SELECT id FROM _teste_chamado)) INTO v_tempo_id;
  PERFORM pg_temp.assert_eq('6c', 'ti_iniciar_tempo retorna id de sessão não nulo', true, (v_tempo_id IS NOT NULL));

  SELECT status INTO v_status FROM public.ti_chamados WHERE id = (SELECT id FROM _teste_chamado);
  PERFORM pg_temp.assert_eq('6d', 'status vira em_atendimento', 'em_atendimento'::text, v_status);
END $$;

-- ── Teste 7: comentário interno de Nícolas invisível ao solicitante ─────
SELECT public.ti_comentar_chamado((SELECT id FROM _teste_chamado), '[TESTE] Nota interna: HD com defeito', true);

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'solicitante'), true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_comentarios bigint;
  v_historico   bigint;
  v_tempos      bigint;
BEGIN
  SELECT count(*) INTO v_comentarios FROM public.ti_chamado_comentarios WHERE chamado_id = (SELECT id FROM _teste_chamado);
  SELECT count(*) INTO v_historico   FROM public.ti_chamado_historico   WHERE chamado_id = (SELECT id FROM _teste_chamado);
  SELECT count(*) INTO v_tempos      FROM public.ti_chamado_tempos      WHERE chamado_id = (SELECT id FROM _teste_chamado);

  PERFORM pg_temp.assert_eq('7a', 'solicitante não vê comentário interno', 0::bigint, v_comentarios);
  PERFORM pg_temp.assert_eq('7b', 'solicitante não vê histórico técnico', 0::bigint, v_historico);
  PERFORM pg_temp.assert_eq('7c', 'solicitante não vê sessões de tempo', 0::bigint, v_tempos);
END $$;

RESET ROLE;

-- ── Teste 8: resolver com cronômetro aberto é bloqueado (exceção         ──
-- ── capturada dentro do próprio DO — não aborta a transação inteira)    ──
SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'admin'), true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  PERFORM public.ti_mudar_status((SELECT id FROM _teste_chamado), 'resolvido');
  RAISE EXCEPTION 'TESTE 8 FALHOU: esperava bloqueio por cronômetro aberto, mas resolveu sem erro';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%cronômetro ativo%' THEN
      RAISE NOTICE 'Teste 8 OK (bloqueio de cronômetro aberto): SQLSTATE=%, msg=%', SQLSTATE, SQLERRM;
    ELSE
      RAISE EXCEPTION 'TESTE 8 FALHOU: erro inesperado (SQLSTATE %): %', SQLSTATE, SQLERRM;
    END IF;
END $$;

RESET ROLE;

-- ── Teste 9: usuário inativo não vê nada ─────────────────────────────────
-- Desativação roda SEM JWT simulado (privilégio administrativo) — sob
-- "SET LOCAL ROLE authenticated" com JWT ativo, o trigger
-- protect_sensitive_profile_fields() trataria como auto-serviço comum e
-- forçaria ativo de volta ao valor antigo, ignorando a tentativa.
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);

UPDATE public.user_profiles
SET ativo = false
WHERE id = (SELECT profile_id FROM _teste_pessoas WHERE papel = 'solicitante2');

DO $$
DECLARE v_ativo boolean;
BEGIN
  SELECT ativo INTO v_ativo FROM public.user_profiles
  WHERE id = (SELECT profile_id FROM _teste_pessoas WHERE papel = 'solicitante2');
  PERFORM pg_temp.assert_eq('9-prep', 'desativação do perfil de teste realmente colou', false, v_ativo);
END $$;

SELECT set_config('request.jwt.claim.sub', (SELECT auth_user_id::text FROM _teste_pessoas WHERE papel = 'solicitante2'), true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_perfil_ativo uuid;
  v_equipes      bigint;
  v_chamados     bigint;
BEGIN
  SELECT public.ti_perfil_ativo_id() INTO v_perfil_ativo;
  PERFORM pg_temp.assert_eq('9a', 'perfil inativo não resolve ti_perfil_ativo_id()', NULL::uuid, v_perfil_ativo);

  SELECT count(*) INTO v_equipes FROM public.ti_equipes WHERE codigo = 'sistemas';
  PERFORM pg_temp.assert_eq('9b', 'perfil inativo não vê nem catálogo (ti_equipes)', 0::bigint, v_equipes);

  SELECT count(*) INTO v_chamados FROM public.ti_chamados WHERE id = (SELECT id FROM _teste_chamado);
  PERFORM pg_temp.assert_eq('9c', 'perfil inativo não vê o chamado de teste', 0::bigint, v_chamados);
END $$;

RESET ROLE;

-- ============================================================
-- Se chegou até aqui sem nenhum RAISE EXCEPTION acima, todas as
-- asserções (PRE-1..PRE-7, 1, 2, 3, 4a-4d, 5, 6a-6d, 7a-7c, 8, 9-prep,
-- 9a-9c) passaram. Desfaz tudo — chamado, comentário, tempo, atribuição,
-- desativação do solicitante2, tabelas e função temporárias.
-- ============================================================
ROLLBACK;
