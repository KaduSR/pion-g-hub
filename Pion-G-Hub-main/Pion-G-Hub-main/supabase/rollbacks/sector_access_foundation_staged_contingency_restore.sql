-- ============================================================
-- RESTAURAÇÃO — desfaz sector_access_foundation_staged_contingency_with_data.sql
-- ============================================================
-- Reconcede exatamente o privilégio de EXECUTE removido pela
-- contingência de congelamento — restaura a capacidade de preparar
-- novos usuários, sem tocar em nenhuma linha de user_setor_vinculos/
-- user_role_staging/user_sector_access_preparation_log.
--
-- Seguro por natureza: GRANT não tem efeito sobre dado já existente —
-- só sobre permissão de execução futura. Nenhum dado é lido, alterado
-- ou movido por este arquivo.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.user_setor_vinculos') IS NULL THEN
    RAISE EXCEPTION 'Abortado: public.user_setor_vinculos não existe — nada a restaurar (a fundação não está aplicada, ou já foi revertida pelo cenário A)';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_prepare_user_sector_access_v1(uuid, text, text, uuid, uuid, uuid[]) TO authenticated;

COMMIT;
