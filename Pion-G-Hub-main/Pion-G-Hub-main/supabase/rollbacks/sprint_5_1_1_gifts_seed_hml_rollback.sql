-- ============================================================
-- ROLLBACK — Seed temporário de teste da Sprint 5.1.1 (Fatia B) em HML
-- ============================================================
-- Ambiente: SOMENTE HML (tljscgsaqofgrfbjuyif). NUNCA rodar em Produção.
-- Reverte exclusivamente supabase/checks/sprint_5_1_1_gifts_seed_hml.sql —
-- não afeta Feira Teste, usuários, ou qualquer entrega que não use os
-- brindes/kits de teste.
--
-- Idempotente: pode ser executado múltiplas vezes seguidas sem erro — se
-- não houver mais nada a apagar, cada DELETE simplesmente afeta 0 linhas.
--
-- IMPORTANTE (correção pós-revisão #1): uma entrega de item avulso pode
-- registrar o(s) brinde(s) SOMENTE em brinde_entrega_itens, mantendo
-- brinde_entregas.brinde_id/kit_id nulos (formato multi-item, Sprint 3.7).
-- Por isso a localização das entregas de teste abaixo NÃO se baseia
-- apenas em brinde_entregas.brinde_id/kit_id — também verifica
-- brinde_entrega_itens.brinde_id via EXISTS, cobrindo entregas reais
-- feitas durante o smoke manual (não só o que o seed inseriu).
--
-- IMPORTANTE (correção pós-revisão #2 — falso positivo na validação):
-- brinde_entregas.brinde_id/kit_id usam ON DELETE SET NULL. Se a validação
-- final localizasse entregas de teste re-consultando "WHERE brinde_id IN
-- (SELECT id FROM brindes WHERE nome LIKE ...)" DEPOIS de brindes já
-- terem sido apagados, o resultado seria sempre 0 mesmo que uma entrega
-- órfã tivesse sobrevivido — a subconsulta contra a tabela-pai já vazia
-- nunca acusaria nada. Por isso os IDs das entregas de teste são
-- CAPTURADOS numa tabela temporária ANTES de qualquer exclusão, e tanto o
-- DELETE quanto a validação final referenciam essa tabela — nunca uma
-- tabela-pai que o próprio script já esvaziou.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1) CAPTURA os IDs das entregas de teste ANTES de excluir qualquer
--    coisa — qualquer entrega que referencie um brinde ou kit de teste,
--    direto ou via brinde_entrega_itens. A tabela sobrevive ao COMMIT
--    (ON COMMIT PRESERVE ROWS) para servir de base à validação final.
--    IF NOT EXISTS + TRUNCATE: se este script já rodou antes na mesma
--    sessão/conexão, a tabela temp ainda existe (PRESERVE ROWS) — sem
--    isso, o CREATE TEMP TABLE de uma segunda execução falharia por
--    colisão, e sem o TRUNCATE os IDs capturados na execução anterior
--    ficariam misturados com os desta.
-- ────────────────────────────────────────────────────────────
CREATE TEMP TABLE IF NOT EXISTS sprint_5_1_1_test_deliveries (
  id uuid PRIMARY KEY
) ON COMMIT PRESERVE ROWS;

TRUNCATE TABLE sprint_5_1_1_test_deliveries;

-- Prefixo e UUIDs fixos ainda são válidos aqui — brindes/brinde_kits
-- ainda não foram tocados neste ponto do script.
INSERT INTO sprint_5_1_1_test_deliveries (id)
SELECT DISTINCT e.id
FROM public.brinde_entregas e
WHERE e.kit_id IN (
        SELECT id FROM public.brinde_kits
        WHERE nome LIKE 'HML TESTE 5.1.1%'
           OR id IN (
             '51115000-0000-4000-8000-000000000001',
             '51115000-0000-4000-8000-000000000002',
             '51115000-0000-4000-8000-000000000003',
             '51115000-0000-4000-8000-000000000004',
             '51115000-0000-4000-8000-000000000005'
           )
      )
   OR e.brinde_id IN (
        SELECT id FROM public.brindes
        WHERE nome LIKE 'HML TESTE 5.1.1%'
           OR id IN (
             '51110000-0000-4000-8000-000000000001',
             '51110000-0000-4000-8000-000000000002',
             '51110000-0000-4000-8000-000000000003',
             '51110000-0000-4000-8000-000000000004',
             '51110000-0000-4000-8000-000000000005',
             '51110000-0000-4000-8000-000000000006',
             '51110000-0000-4000-8000-000000000007'
           )
      )
   OR EXISTS (
        SELECT 1
        FROM public.brinde_entrega_itens ei
        WHERE ei.entrega_id = e.id
          AND ei.brinde_id IN (
            SELECT id FROM public.brindes
            WHERE nome LIKE 'HML TESTE 5.1.1%'
               OR id IN (
                 '51110000-0000-4000-8000-000000000001',
                 '51110000-0000-4000-8000-000000000002',
                 '51110000-0000-4000-8000-000000000003',
                 '51110000-0000-4000-8000-000000000004',
                 '51110000-0000-4000-8000-000000000005',
                 '51110000-0000-4000-8000-000000000006',
                 '51110000-0000-4000-8000-000000000007'
               )
          )
      );

-- ────────────────────────────────────────────────────────────
-- 2) Exclui todas as entregas capturadas. CASCADE
--    (brinde_entrega_itens_entrega_id_fkey) remove os itens delas junto.
-- ────────────────────────────────────────────────────────────
DELETE FROM public.brinde_entregas
WHERE id IN (SELECT id FROM sprint_5_1_1_test_deliveries);

-- ────────────────────────────────────────────────────────────
-- 3) CONFIRMA que nenhuma entrega capturada sobreviveu ao DELETE acima.
--    Se sobrar QUALQUER UMA, aborta o rollback inteiro aqui — apagar os
--    brindes/kits de teste a partir deste ponto perderia a
--    rastreabilidade dessa entrega (ela ficaria "orfanizada" via
--    ON DELETE SET NULL em vez de identificável).
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_restantes INTEGER;
BEGIN
  SELECT count(*) INTO v_restantes
  FROM public.brinde_entregas e
  WHERE e.id IN (SELECT id FROM sprint_5_1_1_test_deliveries);

  IF v_restantes > 0 THEN
    RAISE EXCEPTION 'Rollback abortado: % entrega(s) de teste capturada(s) continuam existindo após o DELETE — investigue antes de apagar brindes/kits (evita perder rastreabilidade via ON DELETE SET NULL).', v_restantes;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 4) Defesa adicional — remove qualquer brinde_entrega_itens residual
--    ligado a um brinde de teste. Depois da confirmação do passo 3, isto
--    não deveria encontrar nenhuma linha (o CASCADE do passo 2 já as
--    removeu); serve só de proteção contra uma execução parcial anterior
--    deste próprio script. Usa os UUIDs/prefixo de teste diretamente —
--    NÃO depende de nenhuma tabela-pai já apagada.
-- ────────────────────────────────────────────────────────────
DELETE FROM public.brinde_entrega_itens
WHERE brinde_id IN (
  SELECT id FROM public.brindes
  WHERE nome LIKE 'HML TESTE 5.1.1%'
     OR id IN (
       '51110000-0000-4000-8000-000000000001',
       '51110000-0000-4000-8000-000000000002',
       '51110000-0000-4000-8000-000000000003',
       '51110000-0000-4000-8000-000000000004',
       '51110000-0000-4000-8000-000000000005',
       '51110000-0000-4000-8000-000000000006',
       '51110000-0000-4000-8000-000000000007'
     )
);

-- ────────────────────────────────────────────────────────────
-- 5) Remove o estoque de feira dos brindes de teste (qualquer feira —
--    não só a Feira Teste, caso o seed tenha rodado mais de uma vez
--    apontando pra feiras diferentes).
-- ────────────────────────────────────────────────────────────
DELETE FROM public.brinde_feira_estoque
WHERE brinde_id IN (
  SELECT id FROM public.brindes
  WHERE nome LIKE 'HML TESTE 5.1.1%'
     OR id IN (
       '51110000-0000-4000-8000-000000000001',
       '51110000-0000-4000-8000-000000000002',
       '51110000-0000-4000-8000-000000000003',
       '51110000-0000-4000-8000-000000000004',
       '51110000-0000-4000-8000-000000000005',
       '51110000-0000-4000-8000-000000000006',
       '51110000-0000-4000-8000-000000000007'
     )
);

-- ────────────────────────────────────────────────────────────
-- 6) Remove os componentes dos kits de teste.
-- ────────────────────────────────────────────────────────────
DELETE FROM public.brinde_kit_itens
WHERE kit_id IN (
  SELECT id FROM public.brinde_kits
  WHERE nome LIKE 'HML TESTE 5.1.1%'
     OR id IN (
       '51115000-0000-4000-8000-000000000001',
       '51115000-0000-4000-8000-000000000002',
       '51115000-0000-4000-8000-000000000003',
       '51115000-0000-4000-8000-000000000004',
       '51115000-0000-4000-8000-000000000005'
     )
);

-- ────────────────────────────────────────────────────────────
-- 7) Remove os kits de teste.
-- ────────────────────────────────────────────────────────────
DELETE FROM public.brinde_kits
WHERE nome LIKE 'HML TESTE 5.1.1%'
   OR id IN (
     '51115000-0000-4000-8000-000000000001',
     '51115000-0000-4000-8000-000000000002',
     '51115000-0000-4000-8000-000000000003',
     '51115000-0000-4000-8000-000000000004',
     '51115000-0000-4000-8000-000000000005'
   );

-- ────────────────────────────────────────────────────────────
-- 8) Remove os brindes de teste (por último — as FKs de
--    brinde_kit_itens/brinde_feira_estoque/brinde_entrega_itens que
--    apontam pra brindes são ON DELETE RESTRICT, então só chegam até
--    aqui se os passos 4-6 já tiverem limpo todas as referências).
-- ────────────────────────────────────────────────────────────
DELETE FROM public.brindes
WHERE nome LIKE 'HML TESTE 5.1.1%'
   OR id IN (
     '51110000-0000-4000-8000-000000000001',
     '51110000-0000-4000-8000-000000000002',
     '51110000-0000-4000-8000-000000000003',
     '51110000-0000-4000-8000-000000000004',
     '51110000-0000-4000-8000-000000000005',
     '51110000-0000-4000-8000-000000000006',
     '51110000-0000-4000-8000-000000000007'
   );

-- Feira Teste (f769171c-4e4d-471d-81da-066d754cf05e) NÃO é tocada — o seed
-- reaproveita uma feira já existente, nunca cria uma feira temporária.

COMMIT;

-- ============================================================
-- VALIDAÇÃO PÓS-ROLLBACK (somente leitura — todos os resultados devem
-- ser 0). Nenhuma consulta abaixo depende de JOIN/subconsulta contra
-- brindes ou brinde_kits — essas tabelas já foram esvaziadas de linhas de
-- teste acima, então usá-las como referência aqui daria falso-positivo
-- (ver nota "correção pós-revisão #2" no topo do arquivo). Brindes/kits
-- são validados por UUID fixo + prefixo; entregas/itens são validados
-- contra a tabela temporária capturada no passo 1, que sobrevive ao
-- COMMIT nesta mesma sessão.
-- ============================================================
-- Consolidado num único SELECT (6 subconsultas escalares) — `supabase db
-- query -f` só exibe o resultado da ÚLTIMA instrução do arquivo; seis
-- SELECTs separados mostrariam só o último dos seis zeros esperados.
SELECT
  (
    SELECT count(*)
    FROM public.brindes
    WHERE nome LIKE 'HML TESTE 5.1.1%'
       OR id IN (
         '51110000-0000-4000-8000-000000000001',
         '51110000-0000-4000-8000-000000000002',
         '51110000-0000-4000-8000-000000000003',
         '51110000-0000-4000-8000-000000000004',
         '51110000-0000-4000-8000-000000000005',
         '51110000-0000-4000-8000-000000000006',
         '51110000-0000-4000-8000-000000000007'
       )
  ) AS brindes_teste_restantes,

  (
    SELECT count(*)
    FROM public.brinde_kits
    WHERE nome LIKE 'HML TESTE 5.1.1%'
       OR id IN (
         '51115000-0000-4000-8000-000000000001',
         '51115000-0000-4000-8000-000000000002',
         '51115000-0000-4000-8000-000000000003',
         '51115000-0000-4000-8000-000000000004',
         '51115000-0000-4000-8000-000000000005'
       )
  ) AS kits_teste_restantes,

  (
    SELECT count(*)
    FROM public.brinde_kit_itens
    WHERE kit_id IN (
        '51115000-0000-4000-8000-000000000001',
        '51115000-0000-4000-8000-000000000002',
        '51115000-0000-4000-8000-000000000003',
        '51115000-0000-4000-8000-000000000004',
        '51115000-0000-4000-8000-000000000005'
      )
       OR brinde_id IN (
        '51110000-0000-4000-8000-000000000001',
        '51110000-0000-4000-8000-000000000002',
        '51110000-0000-4000-8000-000000000003',
        '51110000-0000-4000-8000-000000000004',
        '51110000-0000-4000-8000-000000000005',
        '51110000-0000-4000-8000-000000000006',
        '51110000-0000-4000-8000-000000000007'
      )
  ) AS componentes_teste_restantes,

  (
    SELECT count(*)
    FROM public.brinde_feira_estoque
    WHERE brinde_id IN (
      '51110000-0000-4000-8000-000000000001',
      '51110000-0000-4000-8000-000000000002',
      '51110000-0000-4000-8000-000000000003',
      '51110000-0000-4000-8000-000000000004',
      '51110000-0000-4000-8000-000000000005',
      '51110000-0000-4000-8000-000000000006',
      '51110000-0000-4000-8000-000000000007'
    )
  ) AS estoque_teste_restante,

  (
    SELECT count(*)
    FROM public.brinde_entregas
    WHERE id IN (
      SELECT id
      FROM sprint_5_1_1_test_deliveries
    )
  ) AS entregas_teste_restantes,

  (
    SELECT count(*)
    FROM public.brinde_entrega_itens
    WHERE entrega_id IN (
        SELECT id
        FROM sprint_5_1_1_test_deliveries
      )
       OR brinde_id IN (
        '51110000-0000-4000-8000-000000000001',
        '51110000-0000-4000-8000-000000000002',
        '51110000-0000-4000-8000-000000000003',
        '51110000-0000-4000-8000-000000000004',
        '51110000-0000-4000-8000-000000000005',
        '51110000-0000-4000-8000-000000000006',
        '51110000-0000-4000-8000-000000000007'
      )
  ) AS itens_entrega_teste_restantes;

-- sprint_5_1_1_test_deliveries é uma tabela TEMP: some sozinha ao
-- fim da sessão/conexão — não precisa (nem deve) de um DROP TABLE manual.
