-- ============================================================
-- SEED TEMPORÁRIO DE TESTE — Sprint 5.1.1 (Fatia B: kit/item avulso)
-- ============================================================
-- Ambiente: SOMENTE HML (tljscgsaqofgrfbjuyif). NUNCA rodar em Produção.
-- Confirme o project-ref antes de executar (ver runbook
-- docs/deployments/2026-08-06-sprint-5.1.1-gifts-hml-test-runbook.md).
--
-- Objetivo: criar brindes/kits/estoque EXCLUSIVOS de teste, cobrindo os 7
-- cenários de disponibilidade usados no smoke manual do Autoatendimento
-- (ExistingClientGiftForm.jsx). Não cria entregas, não cria usuários, não
-- cria feira — reaproveita a feira HML já existente "Feira Teste".
--
-- Todos os objetos usam o prefixo "HML TESTE 5.1.1" no nome e UUIDs fixos
-- documentados abaixo, para que seed/validação/rollback sejam
-- determinísticos e fáceis de conferir visualmente.
--
-- Transacional: aborta ANTES de qualquer INSERT se a feira não existir/não
-- bater o nome, se o prefixo OU os UUIDs fixos já estiverem em uso, ou se
-- a estrutura de Brindes esperada não existir neste ambiente.
--
-- NÃO é idempotente por design — é proteção contra reaplicação duplicada:
-- rodar este script duas vezes seguidas sem antes aplicar o rollback
-- (supabase/rollbacks/sprint_5_1_1_gifts_seed_hml_rollback.sql) deve
-- abortar, nunca duplicar ou sobrescrever silenciosamente os dados de
-- teste já existentes.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 0) PRECONDIÇÕES — aborta a transação inteira antes de inserir
--    qualquer linha se algo não bater.
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.feiras
    WHERE id = 'f769171c-4e4d-471d-81da-066d754cf05e'
      AND nome = 'Feira Teste'
  ) THEN
    RAISE EXCEPTION 'Feira de teste (f769171c-4e4d-471d-81da-066d754cf05e / "Feira Teste") não encontrada ou nome divergente — abortando seed.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.brindes WHERE nome LIKE 'HML TESTE 5.1.1%')
     OR EXISTS (SELECT 1 FROM public.brinde_kits WHERE nome LIKE 'HML TESTE 5.1.1%')
  THEN
    RAISE EXCEPTION 'Já existem objetos com o prefixo "HML TESTE 5.1.1" — rode supabase/rollbacks/sprint_5_1_1_gifts_seed_hml_rollback.sql antes de gerar um novo seed.';
  END IF;

  -- Colisão de UUID fixo, mesmo que o nome não tenha (ou não tenha mais)
  -- o prefixo — por exemplo, se alguém renomeou uma linha de teste
  -- anterior sem rodar o rollback. Checado à parte do prefixo acima.
  IF EXISTS (
    SELECT 1 FROM public.brindes
    WHERE id IN (
      '51110000-0000-4000-8000-000000000001',
      '51110000-0000-4000-8000-000000000002',
      '51110000-0000-4000-8000-000000000003',
      '51110000-0000-4000-8000-000000000004',
      '51110000-0000-4000-8000-000000000005',
      '51110000-0000-4000-8000-000000000006',
      '51110000-0000-4000-8000-000000000007'
    )
  ) OR EXISTS (
    SELECT 1 FROM public.brinde_kits
    WHERE id IN (
      '51115000-0000-4000-8000-000000000001',
      '51115000-0000-4000-8000-000000000002',
      '51115000-0000-4000-8000-000000000003',
      '51115000-0000-4000-8000-000000000004',
      '51115000-0000-4000-8000-000000000005'
    )
  ) THEN
    RAISE EXCEPTION 'Pelo menos um UUID fixo do seed já existe (brinde ou kit), mesmo sem o prefixo "HML TESTE 5.1.1" no nome — rode o rollback antes de reaplicar o seed.';
  END IF;

  IF to_regclass('public.brinde_kits') IS NULL
     OR to_regclass('public.brinde_kit_itens') IS NULL
     OR to_regclass('public.brinde_feira_estoque') IS NULL
     OR to_regclass('public.brinde_entregas') IS NULL
     OR to_regclass('public.brinde_entrega_itens') IS NULL
  THEN
    RAISE EXCEPTION 'Estrutura de Brindes incompleta neste ambiente (tabela ausente) — abortando seed.';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 1) BRINDES DE TESTE (7 — um por papel nos cenários)
-- ────────────────────────────────────────────────────────────
-- UUIDs fixos e documentados (namespace 51110000-... exclusivo do seed):
--   ...0001  Item avulso — disponível (cenário 1)
--   ...0002  Item avulso — sem saldo (cenário 2)
--   ...0003  Componente do Kit Válido — A (cenário 3)
--   ...0004  Componente do Kit Válido — B (cenário 3)
--   ...0005  Componente inativo (cenário 5)
--   ...0006  Componente sem linha de estoque na feira (cenário 6)
--   ...0007  Componente com saldo insuficiente (cenário 7)
INSERT INTO public.brindes (id, nome, ativo, estoque_atual, observacoes) VALUES
  ('51110000-0000-4000-8000-000000000001', 'HML TESTE 5.1.1 - Item Avulso Disponivel',       true,  0, 'Dado temporário de teste HML — Sprint 5.1.1. Remover via rollback específico.'),
  ('51110000-0000-4000-8000-000000000002', 'HML TESTE 5.1.1 - Item Avulso Sem Saldo',         true,  0, 'Dado temporário de teste HML — Sprint 5.1.1. Remover via rollback específico.'),
  ('51110000-0000-4000-8000-000000000003', 'HML TESTE 5.1.1 - Componente Kit Valido A',       true,  0, 'Dado temporário de teste HML — Sprint 5.1.1. Remover via rollback específico.'),
  ('51110000-0000-4000-8000-000000000004', 'HML TESTE 5.1.1 - Componente Kit Valido B',       true,  0, 'Dado temporário de teste HML — Sprint 5.1.1. Remover via rollback específico.'),
  ('51110000-0000-4000-8000-000000000005', 'HML TESTE 5.1.1 - Componente Inativo',            false, 0, 'Dado temporário de teste HML — Sprint 5.1.1. Remover via rollback específico.'),
  ('51110000-0000-4000-8000-000000000006', 'HML TESTE 5.1.1 - Componente Sem Estoque Feira',  true,  0, 'Dado temporário de teste HML — Sprint 5.1.1. Remover via rollback específico.'),
  ('51110000-0000-4000-8000-000000000007', 'HML TESTE 5.1.1 - Componente Saldo Insuficiente', true,  0, 'Dado temporário de teste HML — Sprint 5.1.1. Remover via rollback específico.');

-- ────────────────────────────────────────────────────────────
-- 2) KITS DE TESTE (5 — um por cenário de kit)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.brinde_kits (id, nome, ativo, descricao) VALUES
  ('51115000-0000-4000-8000-000000000001', 'HML TESTE 5.1.1 - Kit Valido (2 disponiveis)',   true, 'Dado temporário de teste HML — Sprint 5.1.1.'),
  ('51115000-0000-4000-8000-000000000002', 'HML TESTE 5.1.1 - Kit Sem Componentes',          true, 'Dado temporário de teste HML — Sprint 5.1.1.'),
  ('51115000-0000-4000-8000-000000000003', 'HML TESTE 5.1.1 - Kit Com Componente Inativo',   true, 'Dado temporário de teste HML — Sprint 5.1.1.'),
  ('51115000-0000-4000-8000-000000000004', 'HML TESTE 5.1.1 - Kit Sem Estoque Na Feira',     true, 'Dado temporário de teste HML — Sprint 5.1.1.'),
  ('51115000-0000-4000-8000-000000000005', 'HML TESTE 5.1.1 - Kit Com Saldo Insuficiente',   true, 'Dado temporário de teste HML — Sprint 5.1.1.');
-- "Kit Sem Componentes" NÃO recebe nenhuma linha em brinde_kit_itens — é o
-- ponto central do cenário 4 (kit ativo, mas sem itens cadastrados).

-- ────────────────────────────────────────────────────────────
-- 3) COMPONENTES DOS KITS
-- ────────────────────────────────────────────────────────────
-- Kit Válido: A (qtd 2 por kit) + B (qtd 1 por kit). Com o estoque do
-- passo 4, floor(7/2)=3 para A e floor(2/1)=2 para B → min(3,2)=2, ou
-- seja, exatamente 2 kits completos disponíveis (cenário 3: "pelo menos
-- duas entregas").
INSERT INTO public.brinde_kit_itens (kit_id, brinde_id, quantidade) VALUES
  ('51115000-0000-4000-8000-000000000001', '51110000-0000-4000-8000-000000000003', 2),
  ('51115000-0000-4000-8000-000000000001', '51110000-0000-4000-8000-000000000004', 1),
  ('51115000-0000-4000-8000-000000000003', '51110000-0000-4000-8000-000000000005', 1),
  ('51115000-0000-4000-8000-000000000004', '51110000-0000-4000-8000-000000000006', 1),
  ('51115000-0000-4000-8000-000000000005', '51110000-0000-4000-8000-000000000007', 3);

-- ────────────────────────────────────────────────────────────
-- 4) ESTOQUE NA FEIRA DE TESTE (livro-razão local, brinde_feira_estoque)
-- ────────────────────────────────────────────────────────────
-- Saldo = quantidade_enviada - quantidade_entregue - quantidade_perda + quantidade_retorno.
-- O componente "Sem Estoque Feira" (...0006) PROPOSITALMENTE não recebe
-- nenhuma linha aqui — é o próprio cenário 6.
INSERT INTO public.brinde_feira_estoque (feira_id, brinde_id, quantidade_enviada) VALUES
  ('f769171c-4e4d-471d-81da-066d754cf05e', '51110000-0000-4000-8000-000000000001', 10), -- item avulso disponível: saldo 10
  ('f769171c-4e4d-471d-81da-066d754cf05e', '51110000-0000-4000-8000-000000000002', 0),  -- item avulso sem saldo: saldo 0 (linha existe)
  ('f769171c-4e4d-471d-81da-066d754cf05e', '51110000-0000-4000-8000-000000000003', 7),  -- kit válido, componente A: floor(7/2)=3
  ('f769171c-4e4d-471d-81da-066d754cf05e', '51110000-0000-4000-8000-000000000004', 2),  -- kit válido, componente B: floor(2/1)=2
  ('f769171c-4e4d-471d-81da-066d754cf05e', '51110000-0000-4000-8000-000000000005', 10), -- inativo, mesmo com saldo saudável (prova que o motivo é a inatividade, não o estoque)
  ('f769171c-4e4d-471d-81da-066d754cf05e', '51110000-0000-4000-8000-000000000007', 1);  -- saldo insuficiente: floor(1/3)=0 (kit exige 3)

COMMIT;

-- ============================================================
-- VERIFICAÇÃO (somente leitura — rodar após o COMMIT acima)
-- Nenhum dado pessoal envolvido: só nomes de brindes/kits e números.
-- ============================================================

-- Brindes de teste: nome, ativo, saldo na Feira Teste
SELECT
  b.nome,
  b.ativo,
  bfe.quantidade_enviada,
  bfe.quantidade_entregue,
  COALESCE(bfe.quantidade_enviada, 0) - COALESCE(bfe.quantidade_entregue, 0)
    - COALESCE(bfe.quantidade_perda, 0) + COALESCE(bfe.quantidade_retorno, 0) AS saldo_calculado
FROM public.brindes b
LEFT JOIN public.brinde_feira_estoque bfe
  ON bfe.brinde_id = b.id AND bfe.feira_id = 'f769171c-4e4d-471d-81da-066d754cf05e'
WHERE b.nome LIKE 'HML TESTE 5.1.1%'
ORDER BY b.nome;

-- Kits de teste: nome, ativo, quantidade de componentes, disponibilidade
-- aproximada (cálculo de referência — a decisão final acontece no
-- frontend, ver kitAvailability em ExistingClientGiftForm.jsx).
SELECT
  bk.nome AS kit,
  bk.ativo,
  COUNT(bki.id) AS componentes,
  MIN(
    FLOOR(
      (
        COALESCE(bfe.quantidade_enviada, 0) - COALESCE(bfe.quantidade_entregue, 0)
        - COALESCE(bfe.quantidade_perda, 0) + COALESCE(bfe.quantidade_retorno, 0)
      )::numeric / NULLIF(bki.quantidade, 0)
    )
  ) AS disponibilidade_aproximada
FROM public.brinde_kits bk
LEFT JOIN public.brinde_kit_itens bki ON bki.kit_id = bk.id
LEFT JOIN public.brinde_feira_estoque bfe
  ON bfe.brinde_id = bki.brinde_id AND bfe.feira_id = 'f769171c-4e4d-471d-81da-066d754cf05e'
WHERE bk.nome LIKE 'HML TESTE 5.1.1%'
GROUP BY bk.id, bk.nome, bk.ativo
ORDER BY bk.nome;

-- Componentes de cada kit de teste (detalhe)
SELECT bk.nome AS kit, b.nome AS componente, b.ativo AS componente_ativo, bki.quantidade AS qtd_exigida
FROM public.brinde_kit_itens bki
JOIN public.brinde_kits bk ON bk.id = bki.kit_id
JOIN public.brindes b ON b.id = bki.brinde_id
WHERE bk.nome LIKE 'HML TESTE 5.1.1%'
ORDER BY bk.nome, b.nome;

-- ============================================================
-- Resultado esperado (ver docs/deployments/2026-08-06-sprint-5.1.1-gifts-hml-test-runbook.md):
--   Item Avulso Disponivel        → saldo 10
--   Item Avulso Sem Saldo         → saldo 0 (linha existe)
--   Kit Valido (2 disponiveis)    → 2 componentes, disponibilidade 2
--   Kit Sem Componentes           → 0 componentes, disponibilidade NULL
--   Kit Com Componente Inativo    → 1 componente, ativo=false
--   Kit Sem Estoque Na Feira      → 1 componente, sem linha de estoque
--   Kit Com Saldo Insuficiente    → 1 componente, disponibilidade 0
-- ============================================================
