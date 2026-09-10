-- ============================================================
-- CONTINGÊNCIA — Fundação do Controle de Acesso Setorial, rollout
-- progressivo (CENÁRIO B: preparação real já existe)
-- ============================================================
-- Uso quando o preflight do rollback destrutivo encontrar QUALQUER
-- linha em user_setor_vinculos, user_role_staging ou
-- user_sector_access_preparation_log (preparação real de ao menos um
-- usuário).
--
-- NÃO é um rollback estrutural. NÃO usa DROP TABLE, DROP em cascata de
-- dado, nem qualquer operação destrutiva de linha. "Reverter" aqui
-- significa CONGELAR a capacidade de preparar NOVOS usuários — todo o
-- trabalho de mapeamento nominal já feito (vínculos, papéis futuros,
-- histórico de auditoria) continua existindo, consultável, e intocado.
--
-- Por que isso é seguro e suficiente: nenhuma tabela desta fundação é
-- lida por has_effective_permission()/is_permissions_admin() ou por
-- qualquer código de autorização real (por desenho, documentado no
-- cabeçalho da própria migration) — congelar a escrita aqui não afeta o
-- acesso efetivo de NINGUÉM, preparado ou não. O único efeito é impedir
-- que MAIS preparação nominal aconteça enquanto a contingência estiver
-- ativa.
--
-- Reversível: para desfazer o congelamento, basta reconceder o EXECUTE
-- removido abaixo — nenhuma tabela/função/trigger foi tocada, só
-- privilégio de execução da RPC de escrita.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_vinculos_count INT := 0;
  v_staging_count  INT := 0;
BEGIN
  IF to_regclass('public.user_setor_vinculos') IS NULL THEN
    RAISE EXCEPTION 'Abortado: public.user_setor_vinculos não existe — a fundação não está aplicada, ou já foi revertida pelo cenário A';
  END IF;

  SELECT count(*) INTO v_vinculos_count FROM public.user_setor_vinculos;
  SELECT count(*) INTO v_staging_count FROM public.user_role_staging;

  RAISE NOTICE 'Congelando preparação com % vínculo(s) e % linha(s) de staging já existentes — preservados intactos.', v_vinculos_count, v_staging_count;
END $$;

-- Remove a capacidade de CHAMAR a RPC de preparação — a função em si
-- (e todo o dado já preparado) permanece intacta, só deixa de ser
-- executável por `authenticated` até a restauração explícita.
REVOKE EXECUTE ON FUNCTION public.admin_prepare_user_sector_access_v1(uuid, text, text, uuid, uuid, uuid[]) FROM authenticated;

-- Leitura (validador de cobertura, preview, e as próprias tabelas via
-- suas policies de SELECT admin) permanece disponível — congelamento é
-- só de escrita nova, nunca de consulta ao que já foi preparado.

COMMIT;
