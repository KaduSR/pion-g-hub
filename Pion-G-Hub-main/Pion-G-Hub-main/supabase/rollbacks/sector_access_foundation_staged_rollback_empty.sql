-- ============================================================
-- ROLLBACK — Fundação do Controle de Acesso Setorial, rollout
-- progressivo (CENÁRIO A: nenhum dado de preparação real)
-- ============================================================
-- Reverte 20260901000000_sector_access_foundation_staged.sql. USO
-- EXCLUSIVO quando o preflight abaixo (que roda primeiro e ABORTA a
-- transação inteira se encontrar qualquer linha) confirmar que NENHUM
-- perfil real foi preparado ainda — nem em user_setor_vinculos, nem em
-- user_role_staging, nem em user_sector_access_preparation_log. Se
-- houver qualquer preparação real, use
-- sector_access_foundation_staged_contingency_with_data.sql — NUNCA
-- este arquivo.
--
-- GATE 5.2G.3C — ORIENTADO POR DELTA, NÃO POR CÓDIGO HARDCODED.
-- `setores`/`user_setor_vinculos`/`modulos`/`setor_modulos`/
-- `setor_role_permissions` são os MESMOS NOMES DE TABELA que
-- V2/V3 usam. Num ambiente adiantado (V2/V3 já aplicadas antes desta
-- fundação — GATE 5.2G.3C, Etapa 5), a migration original nunca criou
-- essas tabelas (CREATE TABLE IF NOT EXISTS foi no-op) — um `DROP
-- TABLE` incondicional destruiria os dados e a estrutura de V2/V3
-- inteiros, mesmo esta fundação nunca os tendo criado. Este rollback
-- NUNCA usa DROP TABLE/DELETE por nome ou código fixo: consulta
-- exclusivamente `private.staged_foundation_delta`, a tabela que a
-- própria migration populou, ANTES de cada CREATE TABLE/INSERT,
-- registrando apenas o que REALMENTE não existia antes dela rodar.
--
--   kind='table_created'         → tabela é dropada SÓ SE registrada
--                                   (a migration provou que a criou).
--   kind='role'                  → role removida só se registrada.
--   kind='setor'/'modulo'/
--   'setor_modulo'/
--   'setor_role_permission'      → linha removida só se a chave natural
--                                   exata estiver registrada — nunca por
--                                   busca de código solta.
--
-- Se a tabela NÃO foi criada por esta migration (delta ausente), este
-- rollback DELETA APENAS as linhas especificamente registradas como
-- inseridas por ela — a tabela em si, e qualquer linha pré-existente de
-- outra origem (V2/V3), permanece INTOCADA. Resultado: seguro tanto no
-- cenário "fundação isolada" (tabelas dropadas por inteiro) quanto no
-- cenário "ambiente adiantado" (só as linhas extras desta fundação são
-- removidas, nunca a tabela nem os dados de V2/V3).
--
-- NENHUMA função pré-existente é restaurada aqui, porque NENHUMA foi
-- alterada pela migration original — is_permissions_admin()/
-- has_effective_permission() nunca foram tocadas (ver cabeçalho da
-- própria migration). As 3 RPCs desta fundação
-- (preview_effective_access_staged_v1/admin_prepare_user_sector_access_v1/
-- admin_validate_sector_cutover_readiness) têm nomes exclusivos —
-- nenhuma outra migration os usa — seguro removê-las incondicionalmente.
--
-- Não toca em CS (nenhum objeto de cs_clientes/cs_clientes_historico é
-- referenciado aqui).
--
-- GATE 5.2G.4C — ASSIMETRIA DELIBERADA DE ACL, NÃO REVERTIDA AQUI.
-- A aplicação real desta migration em HML (GATE 5.2G.4B) revogou de
-- `anon` (em setores/modulos/setor_modulos/setor_role_permissions/
-- user_setor_vinculos) e de `authenticated` (em setor_role_permissions/
-- user_setor_vinculos, mantendo SELECT) os privilégios REFERENCES/
-- TRIGGER/TRUNCATE/MAINTAIN. O GATE 5.2G.4C decidiu formalmente que
-- essa revogação é hardening de segurança INTENCIONAL (convergência
-- para privilégio mínimo), não um efeito colateral a desfazer. Este
-- rollback é SÓ ESTRUTURAL/DE DADOS (tabelas e linhas via delta) — ele
-- NUNCA restaura esses privilégios revogados, mesmo quando dropa as
-- tabelas inteiras (o DROP TABLE leva os grants dela junto, o que é
-- irrelevante para o ponto: nenhum GRANT de volta a anon/authenticated
-- é emitido por este arquivo em nenhum cenário). Restaurar esses
-- privilégios — se algum dia necessário — exige uma decisão de
-- segurança separada e explícita, documentada e autorizada por um gate
-- próprio, nunca implícita a este rollback.
-- ============================================================

BEGIN;

-- ── PREFLIGHT OBRIGATÓRIO — aborta a transação inteira se houver
--    qualquer preparação real ──
DO $$
DECLARE
  v_vinculos_count    INT := 0;
  v_staging_count     INT := 0;
  v_log_count         INT := 0;
BEGIN
  IF to_regclass('public.user_setor_vinculos') IS NULL THEN
    RAISE EXCEPTION 'Abortado: public.user_setor_vinculos não existe — nada a reverter (a migration já não está aplicada, ou já foi revertida)';
  END IF;

  SELECT count(*) INTO v_vinculos_count FROM public.user_setor_vinculos;
  IF v_vinculos_count <> 0 THEN
    RAISE EXCEPTION 'ABORTADO: user_setor_vinculos tem % linha(s) — cenário A não se aplica. Use a contingência não destrutiva, nunca este arquivo.', v_vinculos_count;
  END IF;

  IF to_regclass('public.user_role_staging') IS NOT NULL THEN
    SELECT count(*) INTO v_staging_count FROM public.user_role_staging;
    IF v_staging_count <> 0 THEN
      RAISE EXCEPTION 'ABORTADO: user_role_staging tem % linha(s) — cenário A não se aplica. Use a contingência não destrutiva, nunca este arquivo.', v_staging_count;
    END IF;
  END IF;

  IF to_regclass('public.user_sector_access_preparation_log') IS NOT NULL THEN
    SELECT count(*) INTO v_log_count FROM public.user_sector_access_preparation_log;
    IF v_log_count <> 0 THEN
      RAISE EXCEPTION 'ABORTADO: user_sector_access_preparation_log tem % linha(s) — histórico de auditoria real existe, cenário A não se aplica. Use a contingência não destrutiva, nunca este arquivo.', v_log_count;
    END IF;
  END IF;

  IF to_regclass('private.staged_foundation_delta') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: private.staged_foundation_delta não existe — impossível determinar com segurança o que esta migration criou. Revisão manual necessária (não improvisar um rollback por código fixo).';
  END IF;
END $$;

-- ── Funções/RPCs desta migration: DROP incondicional (nomes
--    exclusivos, nenhuma colisão possível com V2/V3/CS/Grupos de
--    Acesso — confirmado por busca antes de escrever este rollback) ──
DROP FUNCTION IF EXISTS public.admin_validate_sector_cutover_readiness();
DROP FUNCTION IF EXISTS public.admin_prepare_user_sector_access_v1(uuid, text, text, uuid, uuid, uuid[]);
DROP FUNCTION IF EXISTS public.preview_effective_access_staged_v1(text, uuid, uuid[]);

-- ── Linhas de setor_role_permissions: só as triplas registradas no
--    delta (nunca a tabela inteira nem linhas de outra origem) ──
DELETE FROM public.setor_role_permissions srp
USING public.setores s, public.roles r, public.permissions p
WHERE srp.setor_id = s.id AND srp.role_id = r.id AND srp.permission_id = p.id
  AND EXISTS (
    SELECT 1 FROM private.staged_foundation_delta d
    WHERE d.kind = 'setor_role_permission'
      AND d.natural_key = s.codigo || '|' || r.code || '|' || p.code
  );

-- ── Linhas de setor_modulos: só os pares registrados no delta ──
DELETE FROM public.setor_modulos sm
USING public.setores s, public.modulos m
WHERE sm.setor_id = s.id AND sm.modulo_id = m.id
  AND EXISTS (
    SELECT 1 FROM private.staged_foundation_delta d
    WHERE d.kind = 'setor_modulo'
      AND d.natural_key = s.codigo || '|' || m.codigo
  );

-- ── Linhas de modulos: só os códigos registrados no delta ──
DELETE FROM public.modulos m
WHERE EXISTS (
  SELECT 1 FROM private.staged_foundation_delta d
  WHERE d.kind = 'modulo' AND d.natural_key = m.codigo
);

-- ── Linhas de setores: só os códigos registrados no delta ──
DELETE FROM public.setores s
WHERE EXISTS (
  SELECT 1 FROM private.staged_foundation_delta d
  WHERE d.kind = 'setor' AND d.natural_key = s.codigo
);

-- ── Tabelas: DROP só se esta migration comprovadamente as criou
--    (registrado em kind='table_created') — nunca por nome solto.
--    Ordem: filhas antes de pais (mesmo quando condicional). ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.user_sector_access_preparation_log') THEN
    DROP TABLE IF EXISTS public.user_sector_access_preparation_log;
  END IF;

  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.user_role_staging') THEN
    DROP TABLE IF EXISTS public.user_role_staging;
  END IF;

  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.setor_role_permissions') THEN
    DROP TABLE IF EXISTS public.setor_role_permissions;
  END IF;

  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.setor_modulos') THEN
    DROP TABLE IF EXISTS public.setor_modulos;
  END IF;

  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.user_setor_vinculos') THEN
    DROP TABLE IF EXISTS public.user_setor_vinculos;
  END IF;

  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.modulos') THEN
    DROP TABLE IF EXISTS public.modulos;
  END IF;

  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.setores') THEN
    DROP TABLE IF EXISTS public.setores;
  END IF;
END $$;

-- ── DELETE de roles: só os códigos registrados no delta. protect_system_roles()
--    (PRÉ-EXISTENTE, schema.sql) bloqueia DELETE em qualquer linha com
--    is_system=true — desabilita a trigger só para este DELETE
--    específico, reabilita logo em seguida, na mesma transação. Se a
--    transação abortar entre DISABLE e ENABLE, o próprio ROLLBACK do
--    Postgres desfaz o DISABLE (DDL é transacional) — testado
--    explicitamente (GATE 5.2G.3C, Etapa 3). ──
ALTER TABLE public.roles DISABLE TRIGGER trg_protect_system_roles;
DELETE FROM public.roles r
WHERE EXISTS (
  SELECT 1 FROM private.staged_foundation_delta d
  WHERE d.kind = 'role' AND d.natural_key = r.code
);
ALTER TABLE public.roles ENABLE TRIGGER trg_protect_system_roles;

-- ── Assertion final: confirma que só o que estava no delta foi
--    removido, nunca mais, nunca menos ──
DO $$
DECLARE v_roles_esperadas_removidas INT; v_roles_restantes INT;
BEGIN
  SELECT count(*) INTO v_roles_esperadas_removidas FROM private.staged_foundation_delta WHERE kind = 'role';
  SELECT count(*) INTO v_roles_restantes
  FROM public.roles r
  WHERE EXISTS (SELECT 1 FROM private.staged_foundation_delta d WHERE d.kind = 'role' AND d.natural_key = r.code);

  IF v_roles_restantes <> 0 THEN
    RAISE EXCEPTION 'Rollback incompleto: % role(s) registrada(s) no delta ainda existem em roles', v_roles_restantes;
  END IF;
END $$;

-- ── Limpa o próprio registro de delta (esta fundação foi totalmente
--    revertida) — se as tabelas foram preservadas (ambiente adiantado),
--    o delta não tem mais utilidade para elas; se foram dropadas, o
--    delta de qualquer forma não referencia mais nada existente. ──
DELETE FROM private.staged_foundation_delta;

COMMIT;
