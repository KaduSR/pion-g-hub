-- ============================================================
-- PRÉ-VERIFICAÇÃO — Autoatendimento (rodar ANTES das migrations)
-- ============================================================
-- Só LEITURA — nenhuma linha aqui altera dados ou schema. Rode isto no SQL
-- Editor do Supabase antes de aplicar as migrations da Sprint 3.7 e do
-- Autoatendimento, pra confirmar o que já existe e o que falta.
--
-- Resultado esperado ANTES de qualquer migration: tudo "FALTANDO".
-- Resultado esperado DEPOIS de 20260716120000_sprint_3_7_brindes_feira.sql:
--   tudo "OK", exceto o que só a migration do Autoatendimento cria
--   (tipo_destinatario, normalize_dedup_text) — esses continuam "FALTANDO"
--   até a segunda migration rodar.
-- ============================================================

SELECT 'tabela: brinde_entregas' AS dependencia,
       CASE WHEN to_regclass('public.brinde_entregas') IS NOT NULL THEN 'OK' ELSE 'FALTANDO' END AS status
UNION ALL
SELECT 'tabela: brinde_kits',
       CASE WHEN to_regclass('public.brinde_kits') IS NOT NULL THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'tabela: brinde_kit_itens',
       CASE WHEN to_regclass('public.brinde_kit_itens') IS NOT NULL THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'tabela: brinde_feira_estoque (Sprint 3.7)',
       CASE WHEN to_regclass('public.brinde_feira_estoque') IS NOT NULL THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'tabela: brinde_entrega_itens (Sprint 3.7)',
       CASE WHEN to_regclass('public.brinde_entrega_itens') IS NOT NULL THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'função: is_gifts_manager()',
       CASE WHEN to_regprocedure('public.is_gifts_manager()') IS NOT NULL THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'função: is_gifts_deliverer() (Sprint 3.7)',
       CASE WHEN to_regprocedure('public.is_gifts_deliverer()') IS NOT NULL THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'função: registrar_movimentacao_brinde (12 args)',
       CASE WHEN to_regprocedure('public.registrar_movimentacao_brinde(uuid, text, integer, text, text, text, uuid, uuid, uuid, uuid, text, uuid)') IS NOT NULL
            THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'função: registrar_carga_feira (Sprint 3.7)',
       CASE WHEN to_regprocedure('public.registrar_carga_feira(uuid, uuid, integer, text, uuid)') IS NOT NULL THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'função: registrar_entrega_brinde_feira — 7 args (Sprint 3.7 base)',
       CASE WHEN to_regprocedure('public.registrar_entrega_brinde_feira(uuid, uuid, text, uuid, jsonb, text, text)') IS NOT NULL
            THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'função: registrar_entrega_brinde_feira — 12 args (Autoatendimento)',
       CASE WHEN to_regprocedure('public.registrar_entrega_brinde_feira(uuid, uuid, text, uuid, jsonb, text, text, text, text, text, text, boolean)') IS NOT NULL
            THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'função: normalize_dedup_text (Autoatendimento)',
       CASE WHEN to_regprocedure('public.normalize_dedup_text(text)') IS NOT NULL THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'extensão: unaccent',
       CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'coluna: brinde_entregas.origem (Sprint 3.7)',
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'brinde_entregas' AND column_name = 'origem'
       ) THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'coluna: brinde_entregas.tipo_destinatario (Autoatendimento)',
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'brinde_entregas' AND column_name = 'tipo_destinatario'
       ) THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'índice: uq_brinde_entrega_kit_lead_feira_ativo (Sprint 3.7)',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_indexes WHERE tablename = 'brinde_entregas' AND indexname = 'uq_brinde_entrega_kit_lead_feira_ativo'
       ) THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'índice: idx_brinde_entregas_tipo_destinatario (Autoatendimento)',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_indexes WHERE tablename = 'brinde_entregas' AND indexname = 'idx_brinde_entregas_tipo_destinatario'
       ) THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'constraint: chk_brinde_entregas_item (Sprint 3.7, formato multi-item)',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'chk_brinde_entregas_item'
       ) THEN 'OK' ELSE 'FALTANDO' END
UNION ALL
SELECT 'constraint: chk_brinde_entregas_destinatario (Autoatendimento)',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'chk_brinde_entregas_destinatario'
       ) THEN 'OK' ELSE 'FALTANDO' END
ORDER BY 1;
