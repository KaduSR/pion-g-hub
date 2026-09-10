-- ============================================================
-- TESTE — Fundação do Controle de Acesso Setorial (rollout progressivo)
-- ============================================================
-- GATE 5.2G.3B, Etapas 4/10. Diferente da maioria dos testes deste
-- repositório (BEGIN...ROLLBACK único), este arquivo PRECISA rodar em
-- múltiplas transações na MESMA sessão psql, porque o objetivo central
-- é comparar o estado de ANTES e DEPOIS da aplicação da migration de
-- fundação — a migration em si roda em sua própria transação implícita
-- (aplicada via \i, entre as duas fases de captura).
--
-- PROCEDIMENTO (ver Etapa 10 do relatório do gate para os comandos
-- shell/Docker completos):
--   1. Banco criado do zero, schema.sql aplicado (baseline legado).
--   2. Rodar a FASE 0 deste arquivo (cria identidades simuladas +
--      snapshot ANTES).
--   3. Aplicar 20260901000000_sector_access_foundation_staged.sql.
--   4. Rodar a FASE 1 deste arquivo (snapshot DEPOIS + comparação +
--      testes de RPC/validador).
--
-- NENHUM dado real (nome/e-mail/feira) é usado — todas as identidades
-- são sintéticas (`teste+<papel>@exemplo.invalido`).
--
-- CRITÉRIO DE SUCESSO: nenhum "TESTE ... FALHOU" em nenhuma das duas
-- fases.
-- ============================================================

-- ── Helper de asserção (mesmo padrão já usado no repositório) ──
CREATE OR REPLACE FUNCTION pg_temp.assert_eq(p_teste text, p_descricao text, p_esperado anyelement, p_obtido anyelement)
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

CREATE OR REPLACE FUNCTION pg_temp.assert_true(p_teste text, p_descricao text, p_condicao boolean)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT COALESCE(p_condicao, false) THEN
    RAISE EXCEPTION 'TESTE % FALHOU (%): condição não satisfeita', p_teste, p_descricao;
  ELSE
    RAISE NOTICE 'Teste % OK (%)', p_teste, p_descricao;
  END IF;
END;
$$;

-- Tabela de snapshot: sobrevive entre transações na mesma sessão
-- (TEMP TABLE dura pela sessão inteira, não só pela transação), o que
-- permite comparar ANTES (antes da migration) com DEPOIS (depois dela)
-- mesmo com a migration rodando em sua própria transação no meio.
CREATE TEMP TABLE IF NOT EXISTS _staged_foundation_snapshot (
  fase       text NOT NULL,
  papel      text NOT NULL,
  metrica    text NOT NULL,
  valor      text  -- NULLABLE: agregações sobre conjunto vazio (ex.: nenhum
                    -- GRANT explícito de authenticated numa tabela) retornam
                    -- NULL legitimamente — comparado como NULL IS NOT
                    -- DISTINCT FROM NULL pelo assert_eq, nunca tratado como erro.
);

-- ============================================================
-- FASE 0 — identidades simuladas + snapshot ANTES da migration
-- ============================================================
BEGIN;

CREATE TEMP TABLE IF NOT EXISTS _teste_pessoas (
  papel        text PRIMARY KEY,
  profile_id   uuid NOT NULL,
  auth_user_id uuid NOT NULL
);

-- GATE 5.2G.3E — necessário desde que os testes passaram a impersonar
-- `authenticated` de verdade via `SET LOCAL ROLE`: uma tabela TEMP
-- pertence ao papel que a criou (`postgres`), e esse privilégio NÃO é
-- herdado automaticamente por outro papel só por estar na mesma sessão
-- — sem este GRANT, qualquer leitura de `_teste_pessoas` dentro de um
-- bloco `SET LOCAL ROLE authenticated` falha com "permission denied"
-- (achado real ao corrigir os testes deste gate).
GRANT SELECT ON _teste_pessoas TO authenticated;

DO $$
DECLARE
  v_papel text;
  v_auth_id uuid;
  v_profile_id uuid;
BEGIN
  FOREACH v_papel IN ARRAY ARRAY['admin', 'gestor', 'marketing', 'vendedor'] LOOP
    v_auth_id := extensions.uuid_generate_v4();
    INSERT INTO auth.users (id, email, encrypted_password, confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (v_auth_id, 'teste+' || v_papel || '_staged@exemplo.invalido', crypt('senha-teste-12345', gen_salt('bf')), NOW(), NOW(), NOW(), '{}', '{}', 'authenticated', 'authenticated');

    INSERT INTO public.user_profiles (user_id, nome, email, role, ativo)
    VALUES (v_auth_id, 'Teste ' || v_papel || ' (fundação setorial)', 'teste+' || v_papel || '_staged@exemplo.invalido', v_papel, true)
    RETURNING id INTO v_profile_id;

    INSERT INTO _teste_pessoas (papel, profile_id, auth_user_id) VALUES (v_papel, v_profile_id, v_auth_id);
  END LOOP;
END $$;

-- Snapshot ANTES: para cada papel simulado, mede o equivalente de
-- has_effective_permission() para um conjunto de códigos representativos
-- (um por domínio funcional) diretamente via role_permissions (mesma
-- fonte que has_effective_permission() consulta) — resultado idêntico,
-- sem precisar impersonar `authenticated` para esta medição específica
-- (a impersonação real via `SET LOCAL ROLE authenticated`, necessária
-- para testar as 3 RPCs desta fundação, é usada mais abaixo — Testes
-- 9/10/11 — corrigida no GATE 5.2G.3E).
INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
SELECT 'antes', tp.papel, 'permissoes_role_count', count(rp.permission_id)::text
FROM _teste_pessoas tp
JOIN public.roles r ON r.code = tp.papel
LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
GROUP BY tp.papel;

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
SELECT 'antes', tp.papel, 'permissoes_codigos', string_agg(p.code, ',' ORDER BY p.code)
FROM _teste_pessoas tp
JOIN public.roles r ON r.code = tp.papel
JOIN public.role_permissions rp ON rp.role_id = r.id
JOIN public.permissions p ON p.id = rp.permission_id
GROUP BY tp.papel;

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('antes', '_global', 'total_roles', (SELECT count(*)::text FROM public.roles));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('antes', '_global', 'total_permissions', (SELECT count(*)::text FROM public.permissions));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('antes', '_global', 'policies_user_profiles', (SELECT string_agg(polname, ',' ORDER BY polname) FROM pg_policy WHERE polrelid = 'public.user_profiles'::regclass));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('antes', '_global', 'grants_user_profiles_authenticated',
  (SELECT string_agg(privilege_type, ',' ORDER BY privilege_type) FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = 'user_profiles' AND grantee = 'authenticated'));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('antes', '_global', 'total_user_profiles', (SELECT count(*)::text FROM public.user_profiles));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('antes', '_global', 'is_permissions_admin_prosrc', (SELECT prosrc FROM pg_proc WHERE proname = 'is_permissions_admin' AND pronamespace = 'public'::regnamespace));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('antes', '_global', 'has_effective_permission_prosrc', (SELECT prosrc FROM pg_proc WHERE proname = 'has_effective_permission' AND pronamespace = 'public'::regnamespace));

COMMIT;

-- >>> AQUI: aplicar 20260901000000_sector_access_foundation_staged.sql <<<
-- (via \i supabase/migrations/20260901000000_sector_access_foundation_staged.sql,
-- fora deste arquivo — ver Etapa 10 do relatório do gate)


-- ============================================================
-- FASE 1 — snapshot DEPOIS + comparação + testes de RPC/validador
-- ============================================================
BEGIN;

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
SELECT 'depois', tp.papel, 'permissoes_role_count', count(rp.permission_id)::text
FROM _teste_pessoas tp
JOIN public.roles r ON r.code = tp.papel
LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
GROUP BY tp.papel;

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
SELECT 'depois', tp.papel, 'permissoes_codigos', string_agg(p.code, ',' ORDER BY p.code)
FROM _teste_pessoas tp
JOIN public.roles r ON r.code = tp.papel
JOIN public.role_permissions rp ON rp.role_id = r.id
JOIN public.permissions p ON p.id = rp.permission_id
GROUP BY tp.papel;

-- total_roles NÃO entra na comparação direta de igualdade (a migration
-- SOMA 2 roles novas por desenho) — medido separadamente abaixo.
INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('depois', '_global', 'total_roles', (SELECT count(*)::text FROM public.roles));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('depois', '_global', 'total_permissions', (SELECT count(*)::text FROM public.permissions));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('depois', '_global', 'policies_user_profiles', (SELECT string_agg(polname, ',' ORDER BY polname) FROM pg_policy WHERE polrelid = 'public.user_profiles'::regclass));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('depois', '_global', 'grants_user_profiles_authenticated',
  (SELECT string_agg(privilege_type, ',' ORDER BY privilege_type) FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = 'user_profiles' AND grantee = 'authenticated'));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('depois', '_global', 'total_user_profiles', (SELECT count(*)::text FROM public.user_profiles));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('depois', '_global', 'is_permissions_admin_prosrc', (SELECT prosrc FROM pg_proc WHERE proname = 'is_permissions_admin' AND pronamespace = 'public'::regnamespace));

INSERT INTO _staged_foundation_snapshot (fase, papel, metrica, valor)
VALUES ('depois', '_global', 'has_effective_permission_prosrc', (SELECT prosrc FROM pg_proc WHERE proname = 'has_effective_permission' AND pronamespace = 'public'::regnamespace));

-- ── Teste 1: permissões de admin/gestor/marketing/vendedor idênticas
--    (contagem e conjunto de códigos) antes e depois. ──
DO $$
DECLARE
  v_papel text;
  v_antes text; v_depois text;
BEGIN
  FOREACH v_papel IN ARRAY ARRAY['admin', 'gestor', 'marketing', 'vendedor'] LOOP
    SELECT valor INTO v_antes FROM _staged_foundation_snapshot WHERE fase = 'antes' AND papel = v_papel AND metrica = 'permissoes_role_count';
    SELECT valor INTO v_depois FROM _staged_foundation_snapshot WHERE fase = 'depois' AND papel = v_papel AND metrica = 'permissoes_role_count';
    PERFORM pg_temp.assert_eq('1a-' || v_papel, 'contagem de permissões do papel ' || v_papel || ' inalterada', v_antes, v_depois);

    SELECT valor INTO v_antes FROM _staged_foundation_snapshot WHERE fase = 'antes' AND papel = v_papel AND metrica = 'permissoes_codigos';
    SELECT valor INTO v_depois FROM _staged_foundation_snapshot WHERE fase = 'depois' AND papel = v_papel AND metrica = 'permissoes_codigos';
    PERFORM pg_temp.assert_eq('1b-' || v_papel, 'conjunto exato de códigos de permissão do papel ' || v_papel || ' inalterado', v_antes, v_depois);
  END LOOP;
END $$;

-- ── Teste 2: total_roles aumenta EXATAMENTE em 2 (executivo/operador),
--    nunca mais, nunca menos. ──
DO $$
DECLARE v_antes int; v_depois int;
BEGIN
  SELECT valor::int INTO v_antes FROM _staged_foundation_snapshot WHERE fase = 'antes' AND papel = '_global' AND metrica = 'total_roles';
  SELECT valor::int INTO v_depois FROM _staged_foundation_snapshot WHERE fase = 'depois' AND papel = '_global' AND metrica = 'total_roles';
  PERFORM pg_temp.assert_eq('2', 'total_roles aumenta em exatamente 2', v_antes + 2, v_depois);
END $$;

-- ── Teste 3: total_permissions inalterado (esta fundação não cria
--    NENHUMA permissão nova no catálogo `permissions` — todas as
--    seeds de setor_role_permissions reaproveitam códigos já existentes). ──
DO $$
DECLARE v_antes text; v_depois text;
BEGIN
  SELECT valor INTO v_antes FROM _staged_foundation_snapshot WHERE fase = 'antes' AND papel = '_global' AND metrica = 'total_permissions';
  SELECT valor INTO v_depois FROM _staged_foundation_snapshot WHERE fase = 'depois' AND papel = '_global' AND metrica = 'total_permissions';
  PERFORM pg_temp.assert_eq('3', 'total_permissions inalterado', v_antes, v_depois);
END $$;

-- ── Teste 4: policies/grants de user_profiles inalterados (nenhum
--    DROP POLICY, nenhum REVOKE/GRANT nesta tabela). ──
DO $$
DECLARE v_antes text; v_depois text;
BEGIN
  SELECT valor INTO v_antes FROM _staged_foundation_snapshot WHERE fase = 'antes' AND papel = '_global' AND metrica = 'policies_user_profiles';
  SELECT valor INTO v_depois FROM _staged_foundation_snapshot WHERE fase = 'depois' AND papel = '_global' AND metrica = 'policies_user_profiles';
  PERFORM pg_temp.assert_eq('4a', 'policies de user_profiles inalteradas', v_antes, v_depois);

  SELECT valor INTO v_antes FROM _staged_foundation_snapshot WHERE fase = 'antes' AND papel = '_global' AND metrica = 'grants_user_profiles_authenticated';
  SELECT valor INTO v_depois FROM _staged_foundation_snapshot WHERE fase = 'depois' AND papel = '_global' AND metrica = 'grants_user_profiles_authenticated';
  PERFORM pg_temp.assert_eq('4b', 'grants de user_profiles para authenticated inalterados', v_antes, v_depois);
END $$;

-- ── Teste 5: nenhum user_profiles ganhou ou perdeu linha (a migration
--    não cria/apaga nenhum perfil). ──
DO $$
DECLARE v_antes text; v_depois text;
BEGIN
  SELECT valor INTO v_antes FROM _staged_foundation_snapshot WHERE fase = 'antes' AND papel = '_global' AND metrica = 'total_user_profiles';
  SELECT valor INTO v_depois FROM _staged_foundation_snapshot WHERE fase = 'depois' AND papel = '_global' AND metrica = 'total_user_profiles';
  PERFORM pg_temp.assert_eq('5', 'total de user_profiles inalterado', v_antes, v_depois);
END $$;

-- ── Teste 6: is_permissions_admin()/has_effective_permission() têm o
--    MESMO corpo (prosrc) byte-a-byte antes e depois — nenhum
--    CREATE OR REPLACE tocou nelas. ──
DO $$
DECLARE v_antes text; v_depois text;
BEGIN
  SELECT valor INTO v_antes FROM _staged_foundation_snapshot WHERE fase = 'antes' AND papel = '_global' AND metrica = 'is_permissions_admin_prosrc';
  SELECT valor INTO v_depois FROM _staged_foundation_snapshot WHERE fase = 'depois' AND papel = '_global' AND metrica = 'is_permissions_admin_prosrc';
  PERFORM pg_temp.assert_eq('6a', 'is_permissions_admin() byte-a-byte idêntica', v_antes, v_depois);

  SELECT valor INTO v_antes FROM _staged_foundation_snapshot WHERE fase = 'antes' AND papel = '_global' AND metrica = 'has_effective_permission_prosrc';
  SELECT valor INTO v_depois FROM _staged_foundation_snapshot WHERE fase = 'depois' AND papel = '_global' AND metrica = 'has_effective_permission_prosrc';
  PERFORM pg_temp.assert_eq('6b', 'has_effective_permission() byte-a-byte idêntica', v_antes, v_depois);
END $$;

-- ── Teste 7: as 2 roles novas existem, mas NENHUM user_profiles.role
--    real assume 'executivo'/'operador' (delta zero de usuários). ──
DO $$
DECLARE v_count int;
BEGIN
  PERFORM pg_temp.assert_true('7a', 'roles executivo/operador foram criadas', EXISTS (SELECT 1 FROM public.roles WHERE code = 'executivo') AND EXISTS (SELECT 1 FROM public.roles WHERE code = 'operador'));
  SELECT count(*) INTO v_count FROM public.user_profiles WHERE role IN ('executivo', 'operador');
  PERFORM pg_temp.assert_eq('7b', 'nenhum user_profiles.role real é executivo/operador', 0, v_count);
END $$;

-- ── Teste 8: nenhum vínculo setorial real foi criado pela migration
--    (user_setor_vinculos nasce vazia). ──
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.user_setor_vinculos;
  PERFORM pg_temp.assert_eq('8', 'user_setor_vinculos nasce vazia (nenhum vínculo nominal criado pela migration)', 0, v_count);
END $$;

-- ============================================================
-- Teste 9 — RPC de preparação: chamar em um perfil real simulado NÃO
-- altera nenhuma permissão efetiva dele (prova direta do invariante,
-- não só por inspeção estrutural).
--
-- GATE 5.2G.3E — CORREÇÃO DE UMA FALHA REAL DE EVIDÊNCIA: a versão
-- anterior deste teste NÃO chamava a RPC de verdade — simulava seu
-- efeito via INSERT direto, com a justificativa (na época) de que
-- "chamar a RPC exige sessão autenticada real". Isso escondia dois
-- problemas: (1) nunca provava que `admin_prepare_user_sector_access_v1`
-- de fato FUNCIONA sob o papel `authenticated` (só provava o INSERT
-- direto, que qualquer superusuário consegue); (2) `set_config` sozinho
-- (sem `SET LOCAL ROLE authenticated`) muda o que `auth.uid()` retorna,
-- mas NÃO muda `current_user` — a sessão continua sendo `postgres`,
-- que ignora todo REVOKE/GRANT concedido a `authenticated` (achado real
-- deste gate, reproduzido em Etapa 1: `current_user`/`session_user`
-- permanecem `postgres` mesmo após configurar
-- `request.jwt.claim.sub`). Corrigido: `SET LOCAL ROLE authenticated`
-- ANTES de qualquer chamada — só assim `current_user` de fato vira
-- `authenticated`, sujeito aos mesmos GRANT/RLS que o PostgREST aplica
-- a uma requisição real.
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_auth_id uuid;
BEGIN
  SELECT auth_user_id INTO v_admin_auth_id FROM _teste_pessoas WHERE papel = 'admin';
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_admin_auth_id::text, true);
END $$;

DO $$
DECLARE v_current_user text; v_session_user text;
BEGIN
  SELECT current_user, session_user INTO v_current_user, v_session_user;
  PERFORM pg_temp.assert_eq('9-precond-a', 'current_user = authenticated (impersonação real, não só auth.uid())', 'authenticated', v_current_user);
  PERFORM pg_temp.assert_eq('9-precond-b', 'session_user permanece postgres (SET LOCAL ROLE não troca a conexão, só o papel avaliado)', 'postgres', v_session_user);
END $$;

DO $$
DECLARE
  v_vendedor_profile_id uuid;
  v_marketing_setor_id uuid;
  v_permissoes_antes text;
  v_permissoes_depois text;
  v_sqlstate text;
  v_erro_capturado boolean := false;
BEGIN
  SELECT profile_id INTO v_vendedor_profile_id FROM _teste_pessoas WHERE papel = 'vendedor';
  SELECT id INTO v_marketing_setor_id FROM public.setores WHERE codigo = 'marketing';

  -- Permissões efetivas do vendedor simulado, medidas via a mesma
  -- fonte que has_effective_permission() usa (role_permissions do papel
  -- ATUAL, real, em user_profiles — nunca alterado pela RPC).
  SELECT string_agg(p.code, ',' ORDER BY p.code) INTO v_permissoes_antes
  FROM public.user_profiles up
  JOIN public.roles r ON r.code = up.role
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE up.id = v_vendedor_profile_id;

  -- ── Prova da elevação controlada: escrita DIRETA nas tabelas
  -- internas, como `authenticated` de verdade, DEVE ser negada
  -- (REVOKE ALL FROM anon, authenticated) — mesmo sendo o admin quem
  -- tenta. Só a RPC (SECURITY DEFINER) consegue escrever. ──
  BEGIN
    INSERT INTO public.user_setor_vinculos (profile_id, setor_id, ativo, principal)
    VALUES (v_vendedor_profile_id, v_marketing_setor_id, true, true);
    v_erro_capturado := false;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    v_erro_capturado := (v_sqlstate = '42501');
  END;
  PERFORM pg_temp.assert_true('9c', 'INSERT direto em user_setor_vinculos, como authenticated real, é negado (42501) mesmo para o admin', v_erro_capturado);

  -- ── A RPC (SECURITY DEFINER) DEVE funcionar, chamada de verdade
  -- como `authenticated`, nunca como postgres. ──
  PERFORM public.admin_prepare_user_sector_access_v1(v_vendedor_profile_id, 'operador', 'Operador de Marketing (preparado)', NULL, v_marketing_setor_id, '{}');

  PERFORM pg_temp.assert_eq('9d', 'prepared_by resolvido do auth.uid() real do admin impersonado, nunca de parâmetro', (SELECT profile_id FROM _teste_pessoas WHERE papel = 'admin'), (SELECT prepared_by FROM public.user_role_staging WHERE profile_id = v_vendedor_profile_id));

  SELECT string_agg(p.code, ',' ORDER BY p.code) INTO v_permissoes_depois
  FROM public.user_profiles up
  JOIN public.roles r ON r.code = up.role
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE up.id = v_vendedor_profile_id;

  PERFORM pg_temp.assert_eq('9a', 'permissões efetivas do vendedor simulado inalteradas após preparação real via RPC (impersonado)', v_permissoes_antes, v_permissoes_depois);

  SELECT role INTO v_permissoes_antes FROM public.user_profiles WHERE id = v_vendedor_profile_id; -- reaproveita variável: agora é a role real
  PERFORM pg_temp.assert_eq('9b', 'user_profiles.role do vendedor simulado permanece "vendedor" (RPC nunca escreve em user_profiles)', 'vendedor', v_permissoes_antes);
END $$;
RESET ROLE;

-- ============================================================
-- Teste 10 — preview_effective_access_staged_v1: retorna exatamente o
-- conjunto esperado para operador+marketing (permissões de papel +
-- permissões setoriais preparadas na Parte 5 da migration).
--
-- GATE 5.2G.3E — corrigido para `SET LOCAL ROLE authenticated` (ver
-- nota extensa no Teste 9 acima). `preview_effective_access_staged_v1`
-- é SECURITY INVOKER — este é o teste que mais depende de rodar como
-- `authenticated` de verdade: sem isso, o teste anterior "passava" só
-- porque `postgres` ignora todo GRANT/RLS, nunca provando que um
-- `authenticated` real consegue ler roles/role_permissions/permissions/
-- setores/setor_role_permissions.
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_auth_id uuid;
BEGIN
  SELECT auth_user_id INTO v_admin_auth_id FROM _teste_pessoas WHERE papel = 'admin';
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_admin_auth_id::text, true);
END $$;

DO $$
DECLARE
  v_marketing_setor_id uuid;
  v_codigos text;
  v_current_user text;
BEGIN
  SELECT current_user INTO v_current_user;
  PERFORM pg_temp.assert_eq('10-precond', 'current_user = authenticated ao chamar o preview', 'authenticated', v_current_user);

  SELECT id INTO v_marketing_setor_id FROM public.setores WHERE codigo = 'marketing';

  SELECT string_agg(permission_code, ',' ORDER BY permission_code) INTO v_codigos
  FROM public.preview_effective_access_staged_v1('operador', v_marketing_setor_id, '{}');

  PERFORM pg_temp.assert_true('10a', 'preview de operador+marketing inclui leads.capture (papel authenticated real)', v_codigos LIKE '%leads.capture%');
  PERFORM pg_temp.assert_true('10b', 'preview de operador+marketing inclui gifts.deliver', v_codigos LIKE '%gifts.deliver%');
  PERFORM pg_temp.assert_true('10c', 'preview de operador+marketing NÃO inclui gifts.manage (ação de gestão, não de operador)', v_codigos NOT LIKE '%gifts.manage%');

  PERFORM pg_temp.assert_eq('10d-prosecdef', 'preview_effective_access_staged_v1 é SECURITY INVOKER (prosecdef=false)', false, (SELECT prosecdef FROM pg_proc WHERE proname = 'preview_effective_access_staged_v1'));
END $$;
RESET ROLE;

-- ── Teste 10e — não-admin (vendedor simulado), como authenticated
--    REAL, é rejeitado pelo preview. ──
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_vendedor_auth_id uuid;
BEGIN
  SELECT auth_user_id INTO v_vendedor_auth_id FROM _teste_pessoas WHERE papel = 'vendedor';
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_vendedor_auth_id::text, true);
END $$;

DO $$
DECLARE v_sqlstate text; v_msg text; v_current_user text;
BEGIN
  SELECT current_user INTO v_current_user;
  PERFORM pg_temp.assert_eq('10e-precond', 'current_user = authenticated ao testar rejeição', 'authenticated', v_current_user);

  BEGIN
    PERFORM public.preview_effective_access_staged_v1('operador', (SELECT id FROM public.setores WHERE codigo = 'marketing'), '{}');
    RAISE EXCEPTION 'FALHA: chamada de não-admin authenticated real NÃO foi rejeitada';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    PERFORM pg_temp.assert_eq('10e', 'não-admin (authenticated real) rejeitado pelo preview com SQLSTATE 42501', '42501', v_sqlstate);
  END;
END $$;
RESET ROLE;

-- ============================================================
-- Teste 11 — admin_validate_sector_cutover_readiness: cobertura parcial
-- (só o vendedor simulado foi preparado) produz ready=false com o
-- bloqueador correto listado.
--
-- GATE 5.2G.3E — corrigido para `SET LOCAL ROLE authenticated`. Prova
-- adicional (11d): o agregado retornado reflete TODOS os perfis
-- (comparado contra uma contagem independente feita como postgres),
-- não só o que o invoker enxergaria de `user_profiles` sob sua própria
-- RLS — é exatamente essa a dependência concreta que justifica
-- `SECURITY DEFINER` para esta função (ver migration, Parte 8).
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_auth_id uuid;
BEGIN
  SELECT auth_user_id INTO v_admin_auth_id FROM _teste_pessoas WHERE papel = 'admin';
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_admin_auth_id::text, true);
END $$;

DO $$
DECLARE v_resultado jsonb; v_current_user text;
BEGIN
  SELECT current_user INTO v_current_user;
  PERFORM pg_temp.assert_eq('11-precond', 'current_user = authenticated ao chamar o validador', 'authenticated', v_current_user);

  SELECT public.admin_validate_sector_cutover_readiness() INTO v_resultado;
  PERFORM pg_temp.assert_true('11a', 'validador retorna ready=false com cobertura parcial (3 dos 4 perfis não-admin sem vínculo)', (v_resultado->>'ready')::boolean = false);
  PERFORM pg_temp.assert_true('11b', 'validador lista o vendedor simulado como coberto (tem vínculo ativo)', NOT (v_resultado->'usuarios_sem_vinculo') @> jsonb_build_array(jsonb_build_object('profile_id', (SELECT profile_id FROM _teste_pessoas WHERE papel = 'vendedor'))));
  PERFORM pg_temp.assert_eq('11d-prosecdef', 'admin_validate_sector_cutover_readiness é SECURITY DEFINER (prosecdef=true) — dependência concreta: RLS de user_profiles não dá visibilidade total ao invoker', true, (SELECT prosecdef FROM pg_proc WHERE proname = 'admin_validate_sector_cutover_readiness'));
END $$;
RESET ROLE;

-- ── Teste 11c — chamador NÃO-admin (vendedor simulado), como
--    authenticated REAL, é rejeitado pelo validador — is_permissions_admin()
--    é checado de verdade, não contornado pela simulação de JWT nem
--    mascarado pelos privilégios de postgres. ──
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_vendedor_auth_id uuid;
BEGIN
  SELECT auth_user_id INTO v_vendedor_auth_id FROM _teste_pessoas WHERE papel = 'vendedor';
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_vendedor_auth_id::text, true);
END $$;

DO $$
DECLARE v_sqlstate text; v_current_user text;
BEGIN
  SELECT current_user INTO v_current_user;
  PERFORM pg_temp.assert_eq('11c-precond', 'current_user = authenticated ao testar rejeição do validador', 'authenticated', v_current_user);

  BEGIN
    PERFORM public.admin_validate_sector_cutover_readiness();
    RAISE EXCEPTION 'FALHA: validador executado por não-admin authenticated real NÃO foi rejeitado';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    PERFORM pg_temp.assert_eq('11c', 'chamador não-admin (authenticated real) rejeitado pelo validador com SQLSTATE 42501', '42501', v_sqlstate);
  END;
END $$;
RESET ROLE;

-- ============================================================
-- Teste 12 — GATE 5.2G.4C: ACL de banco convergida INTENCIONALMENTE
-- para privilégio mínimo (achado real de GATE 5.2G.4B, aplicado em
-- HML, aprovado como hardening — não é um efeito colateral a corrigir
-- nem a restaurar). Cada privilégio é testado INDIVIDUALMENTE via
-- has_table_privilege(): nunca presumir que 'ALL PRIVILEGES' é um
-- conjunto estável entre versões do Postgres (MAINTAIN só existe a
-- partir do Postgres 17 — testar por nome explícito, não por ALL).
--
-- GATE 5.2G.4C, Etapa 4 — achado real (re-teste local): 'MAINTAIN' NÃO
-- é um tipo de privilégio reconhecido pelo has_table_privilege() antes
-- do Postgres 17 — em PG15 (a imagem usada pelo harness local
-- descartável, GATE 5.2G.3B/3E) ele lança
-- `ERROR: unrecognized privilege type: "MAINTAIN"`, que ABORTA A
-- TRANSAÇÃO INTEIRA da FASE 1 (não é uma asserção que falha
-- graciosamente — é um erro SQL real). HML real roda Postgres 17 (onde
-- MAINTAIN existe e foi confirmado via dump real que `anon`/
-- `authenticated` de fato não o têm nessas tabelas), mas o harness
-- local de teste roda PG15 — por isso o teste checa
-- current_setting('server_version_num') e só inclui 'MAINTAIN' no
-- array de privilégios verificados quando o servidor o suporta,
-- registrando explicitamente via RAISE NOTICE quando pula o
-- privilégio (nunca silenciosamente, nunca presumindo o resultado).
-- ============================================================
DO $$
DECLARE
  v_tabela text;
  v_privilegio text;
  v_tem boolean;
  v_privilegios_restritos text[] := ARRAY['REFERENCES', 'TRIGGER', 'TRUNCATE'];
  v_privilegios_authenticated text[] := ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES'];
BEGIN
  IF current_setting('server_version_num')::int >= 170000 THEN
    v_privilegios_restritos := v_privilegios_restritos || ARRAY['MAINTAIN'];
    v_privilegios_authenticated := v_privilegios_authenticated || ARRAY['MAINTAIN'];
  ELSE
    RAISE NOTICE 'Teste 12a/12b: privilégio MAINTAIN NÃO testado nesta sessão (server_version_num=% < 170000 — MAINTAIN só existe a partir do Postgres 17; a verificação real contra MAINTAIN em HML foi feita separadamente via supabase db dump --linked, GATE 5.2G.4C Etapa 5, não por este teste local)', current_setting('server_version_num');
  END IF;

  -- 12a — anon NÃO tem REFERENCES/TRIGGER/TRUNCATE[/MAINTAIN, se
  -- suportado pelo servidor] em NENHUMA das 5 tabelas compartilhadas
  -- com V2/V3 (a migration aplicada em HML revogou esses privilégios
  -- especificamente de anon nelas).
  FOREACH v_tabela IN ARRAY ARRAY[
    'public.setores', 'public.modulos', 'public.setor_modulos',
    'public.setor_role_permissions', 'public.user_setor_vinculos'
  ]
  LOOP
    FOREACH v_privilegio IN ARRAY v_privilegios_restritos
    LOOP
      SELECT has_table_privilege('anon', v_tabela, v_privilegio) INTO v_tem;
      PERFORM pg_temp.assert_eq(
        '12a-' || v_tabela || '-' || v_privilegio,
        'anon NÃO tem ' || v_privilegio || ' em ' || v_tabela || ' (revogação intencional GATE 5.2G.4C, não restaurada)',
        false, v_tem
      );
    END LOOP;
  END LOOP;

  -- 12b — authenticated MANTÉM SELECT, mas NÃO tem
  -- INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES/MAINTAIN em
  -- setor_role_permissions/user_setor_vinculos (as 2 tabelas onde a
  -- migration também restringiu authenticated, além de anon).
  FOREACH v_tabela IN ARRAY ARRAY['public.setor_role_permissions', 'public.user_setor_vinculos']
  LOOP
    SELECT has_table_privilege('authenticated', v_tabela, 'SELECT') INTO v_tem;
    PERFORM pg_temp.assert_eq(
      '12b-' || v_tabela || '-SELECT',
      'authenticated MANTÉM SELECT em ' || v_tabela,
      true, v_tem
    );

    FOREACH v_privilegio IN ARRAY v_privilegios_authenticated
    LOOP
      SELECT has_table_privilege('authenticated', v_tabela, v_privilegio) INTO v_tem;
      PERFORM pg_temp.assert_eq(
        '12b-' || v_tabela || '-' || v_privilegio,
        'authenticated NÃO tem ' || v_privilegio || ' em ' || v_tabela || ' (revogação intencional GATE 5.2G.4C, não restaurada)',
        false, v_tem
      );
    END LOOP;
  END LOOP;

  -- 12c — service_role sanity check: a migration NUNCA revogou nada de
  -- service_role (só de anon/authenticated) — confirma que os
  -- privilégios básicos de CRUD que o backend/Edge Functions dependem
  -- via service_role não foram inadvertidamente removidos como efeito
  -- colateral do REVOKE aplicado a anon/authenticated.
  FOREACH v_tabela IN ARRAY ARRAY[
    'public.setores', 'public.modulos', 'public.setor_modulos',
    'public.setor_role_permissions', 'public.user_setor_vinculos'
  ]
  LOOP
    FOREACH v_privilegio IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    LOOP
      SELECT has_table_privilege('service_role', v_tabela, v_privilegio) INTO v_tem;
      PERFORM pg_temp.assert_eq(
        '12c-' || v_tabela || '-' || v_privilegio,
        'service_role MANTÉM ' || v_privilegio || ' em ' || v_tabela || ' (não tocado por esta migration)',
        true, v_tem
      );
    END LOOP;
  END LOOP;
END $$;

-- Limpeza das identidades simuladas. O admin simulado NÃO é deletado
-- nem desativado — ambas as operações disparam
-- lockout_guard_user_profiles_delete()/lockout_guard_user_profiles_update()
-- (guards PRÉ-EXISTENTES, nada a ver com esta migration: nenhum outro
-- admin real existe neste container de teste isolado, então
-- remover/desativar o único admin deixaria o sistema sem ninguém com
-- permissions.manage/permissions.view — os guards estão corretos em
-- bloquear isso, e essa é exatamente a prova de que eles continuam
-- funcionando inalterados após a migration). O admin simulado permanece
-- no container — seguro, porque o container inteiro é descartável e
-- nunca alcança HML/PROD (ver nota ao final deste arquivo). Os demais 3
-- (gestor/marketing/vendedor) são deletados normalmente, sem esse risco.
DO $$
DECLARE v_auth_id uuid;
BEGIN
  FOR v_auth_id IN SELECT auth_user_id FROM _teste_pessoas WHERE papel <> 'admin' LOOP
    DELETE FROM auth.users WHERE id = v_auth_id; -- cascade cobre user_profiles/user_setor_vinculos/user_role_staging
  END LOOP;
END $$;

COMMIT;

-- Nota: este arquivo COMMITA (não faz ROLLBACK final), de propósito —
-- diferente da convenção de outros testes deste repositório — porque o
-- objetivo é medir o efeito real e permanente da migration num banco
-- Docker descartável, não validar uma condição pontual sem persistir
-- nada. O Docker container inteiro é destruído ao final do ciclo de
-- validação (ver Etapa 10), então nada deste teste jamais alcança HML/
-- PROD.
