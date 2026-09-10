-- ============================================================
-- PÓS-VERIFICAÇÃO — Autoatendimento (rodar DEPOIS das duas migrations)
-- ============================================================
-- Só LEITURA. Rode cada bloco separadamente no SQL Editor do Supabase e
-- compare com o "resultado esperado" no comentário logo acima de cada um.
-- ============================================================

-- 1) Coluna tipo_destinatario existe e é opcional
-- Esperado: 1 linha — tipo_destinatario | text | YES
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'brinde_entregas' AND column_name = 'tipo_destinatario';

-- 2) Constraint de valores aceitos (só lead/cliente_existente/NULL)
-- Esperado: 1 linha, definição contendo "lead" e "cliente_existente" e
-- NÃO contendo "uso_interno" nem "outro"
SELECT conname, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conname = 'brinde_entregas_tipo_destinatario_check';

-- 3) Constraint de integridade do destinatário
-- Esperado: 1 linha, definição cobrindo os 3 formatos (NULL / lead / cliente_existente)
SELECT conname, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conname = 'chk_brinde_entregas_destinatario';

-- 4) Índice de apoio à duplicidade
-- Esperado: 1 linha
SELECT indexname FROM pg_indexes
WHERE tablename = 'brinde_entregas' AND indexname = 'idx_brinde_entregas_tipo_destinatario';

-- 5) Só existe UMA função registrar_entrega_brinde_feira, com 12 argumentos
-- Esperado: 1 linha — registrar_entrega_brinde_feira | 12 | (lista dos 12 parâmetros)
SELECT p.proname, p.pronargs, pg_get_function_identity_arguments(p.oid) AS argumentos
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'registrar_entrega_brinde_feira';

-- 6) Grants da RPC de 12 argumentos — só authenticated, nunca anon/PUBLIC
-- Esperado: só authenticated | EXECUTE (nenhuma linha com anon ou PUBLIC)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'registrar_entrega_brinde_feira';

-- 7) Confirmação explícita de ausência de acesso anônimo
-- Esperado: 0 linhas
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'registrar_entrega_brinde_feira'
  AND grantee IN ('anon', 'PUBLIC');

-- 8) normalize_dedup_text existe
-- Esperado: 1 linha
SELECT proname, pronargs FROM pg_proc WHERE proname = 'normalize_dedup_text';

-- 9) Quantos registros o backfill classificou como 'lead'
-- Esperado: número >= 0 (reporte este número no relatório da sprint —
-- varia por banco, por isso não é cravado aqui)
SELECT COUNT(*) AS registros_classificados_como_lead
FROM public.brinde_entregas
WHERE tipo_destinatario = 'lead';

-- 10) Quantos registros permanecem não classificados (esperado, não é erro)
SELECT COUNT(*) AS registros_nao_classificados
FROM public.brinde_entregas
WHERE tipo_destinatario IS NULL;

-- 11) Nenhum registro em formato inválido (violaria a constraint se existisse)
-- Esperado: 0 linhas — se retornar alguma linha, a constraint do passo 3
-- não foi aplicada corretamente ou havia dado pré-existente inconsistente.
SELECT id, tipo_destinatario, lead_id, destinatario_nome, destinatario_empresa
FROM public.brinde_entregas
WHERE NOT (
  tipo_destinatario IS NULL
  OR (tipo_destinatario = 'lead' AND lead_id IS NOT NULL)
  OR (
    tipo_destinatario = 'cliente_existente'
    AND lead_id IS NULL
    AND destinatario_nome IS NOT NULL AND trim(destinatario_nome) <> ''
    AND destinatario_empresa IS NOT NULL AND trim(destinatario_empresa) <> ''
  )
);
