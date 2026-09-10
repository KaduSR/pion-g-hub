-- ============================================================
-- MIGRATION: Etapa 6.2 — RPCs de gravação do Centro de Permissões
--            + hardening de user_profiles contra auto-escalação/lockout
-- ============================================================
-- Parte 1: fecha o acesso de escrita direta a role_permissions/
-- user_permissions/permission_change_log (só leitura via RLS, escrita só
-- pelas 4 RPCs SECURITY DEFINER abaixo) e adiciona o guard de lockout
-- administrativo + auditoria transacional.
--
-- Parte 2 (achado durante a auditoria pedida no checkpoint): a RLS de
-- user_profiles garante que cada usuário só toca a PRÓPRIA linha, mas não
-- restringe QUAIS COLUNAS podem mudar — role/ativo/gestor_id eram
-- alteráveis pelo próprio usuário via API direta (fora da UI React).
-- Trigger de coluna + trigger de lockout em UPDATE/DELETE fecham isso,
-- cobrindo tanto o caminho RLS (self-service, admin via UI) quanto
-- service_role (Edge Function admin-auth, que ignora RLS mas não ignora
-- trigger).
--
-- NÃO REMOVE nenhuma policy de LEITURA existente — só adiciona/amplia.
-- ============================================================

-- ── permission_change_log.action: aceita 'inherit' (restauração de   ──
-- ── herança) além de 'grant'/'revoke', pra não registrar falsamente. ──
ALTER TABLE public.permission_change_log DROP CONSTRAINT permission_change_log_action_check;
ALTER TABLE public.permission_change_log
  ADD CONSTRAINT permission_change_log_action_check CHECK (action IN ('grant', 'revoke', 'inherit'));

-- ============================================================
-- count_active_users_with_permissions(codes) — guard de lockout
-- ============================================================
-- Conta perfis ATIVOS cujo conjunto efetivo (papel ∪ grants individuais −
-- revokes individuais, revoke sempre vence — mesma regra de
-- has_effective_permission) contém TODOS os códigos pedidos.
--
-- NÃO reutiliza has_effective_permission() porque ela resolve sempre pra
-- auth.uid() (o usuário chamador); aqui precisamos avaliar QUALQUER
-- profile_id ativo do sistema, não só quem está chamando.
--
-- SECURITY DEFINER: precisa enxergar user_permissions de TODOS os perfis
-- ativos, não só os do chamador — RLS de user_permissions não cobre isso
-- de forma genérica. Sem GRANT EXECUTE pra authenticated/anon: só é
-- alcançável de dentro das 4 RPCs abaixo (que já rodam como o dono da
-- função por serem elas mesmas SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.count_active_users_with_permissions(codes text[])
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer
  FROM public.user_profiles up
  WHERE up.ativo = true
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(codes) AS wanted(code)
      WHERE
        -- revogado individualmente pra este perfil => nunca efetivo, não importa o papel
        EXISTS (
          SELECT 1 FROM public.user_permissions rev
          JOIN public.permissions p ON p.id = rev.permission_id
          WHERE rev.profile_id = up.id AND rev.effect = 'revoke' AND p.code = wanted.code
        )
        OR (
          -- nem o papel dá, nem foi concedido individualmente
          NOT EXISTS (
            SELECT 1 FROM public.roles r
            JOIN public.role_permissions rp ON rp.role_id = r.id
            JOIN public.permissions p ON p.id = rp.permission_id
            WHERE r.code = up.role AND p.code = wanted.code
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.user_permissions grt
            JOIN public.permissions p ON p.id = grt.permission_id
            WHERE grt.profile_id = up.id AND grt.effect = 'grant' AND p.code = wanted.code
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.count_active_users_with_permissions(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_active_users_with_permissions(text[]) FROM anon, authenticated;

-- ============================================================
-- set_role_permission — concede/remove uma permissão de um PAPEL
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_role_permission(
  p_role_code text,
  p_permission_code text,
  p_granted boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id uuid;
  v_role_id uuid;
  v_permission_id uuid;
  v_changed boolean := false;
BEGIN
  -- Chave fixa e documentada — TODAS as 4 RPCs desta migration disputam o
  -- MESMO advisory lock, serializando qualquer alteração concorrente de
  -- permissões (papel ou individual) até o fim da transação. Libera
  -- sozinho no commit/rollback (é xact-scoped). Impede que duas alterações
  -- concorrentes passem cada uma isoladamente no guard de lockout e,
  -- juntas, zerem o último usuário capaz de administrar o Centro.
  PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);

  SELECT id INTO v_actor_profile_id
  FROM public.user_profiles
  WHERE user_id = auth.uid() AND ativo = true;

  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('permissions.manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar o Centro de Permissões' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_role_id FROM public.roles WHERE code = p_role_code;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Papel % não encontrado', p_role_code USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_permission_id FROM public.permissions WHERE code = p_permission_code;
  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permissão % não encontrada', p_permission_code USING ERRCODE = '22023';
  END IF;

  IF p_granted THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_role_id, v_permission_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    v_changed := FOUND; -- idempotente: já concedida => FOUND=false, sem log
  ELSE
    DELETE FROM public.role_permissions
    WHERE role_id = v_role_id AND permission_id = v_permission_id;
    v_changed := FOUND; -- idempotente: já não tinha => FOUND=false, sem log
  END IF;

  -- Guard de lockout: só interessa quando REMOVE um código do par crítico
  -- (conceder nunca reduz o conjunto efetivo de ninguém).
  IF v_changed AND NOT p_granted AND p_permission_code IN ('permissions.manage', 'permissions.view') THEN
    IF public.count_active_users_with_permissions(ARRAY['permissions.manage', 'permissions.view']) = 0 THEN
      RAISE EXCEPTION 'Operação bloqueada: nenhum usuário ativo ficaria com permissions.manage e permissions.view ao mesmo tempo (lockout administrativo)'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_changed THEN
    INSERT INTO public.permission_change_log (actor_profile_id, target_type, target_id, permission_id, action)
    VALUES (v_actor_profile_id, 'role', v_role_id, v_permission_id, CASE WHEN p_granted THEN 'grant' ELSE 'revoke' END);
  END IF;

  RETURN jsonb_build_object('changed', v_changed);
END;
$$;

REVOKE ALL ON FUNCTION public.set_role_permission(text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_role_permission(text, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_role_permission(text, text, boolean) TO authenticated;

-- ============================================================
-- set_user_permission_grant — override individual: concede
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_permission_grant(
  p_profile_id uuid,
  p_permission_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id uuid;
  v_permission_id uuid;
  v_previous_effect text;
  v_changed boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);

  SELECT id INTO v_actor_profile_id
  FROM public.user_profiles WHERE user_id = auth.uid() AND ativo = true;
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('permissions.manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar o Centro de Permissões' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_profile_id AND ativo = true) THEN
    RAISE EXCEPTION 'Usuário alvo não encontrado ou inativo' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_permission_id FROM public.permissions WHERE code = p_permission_code;
  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permissão % não encontrada', p_permission_code USING ERRCODE = '22023';
  END IF;

  SELECT effect INTO v_previous_effect FROM public.user_permissions
  WHERE profile_id = p_profile_id AND permission_id = v_permission_id;

  IF v_previous_effect IS DISTINCT FROM 'grant' THEN
    INSERT INTO public.user_permissions (profile_id, permission_id, effect, created_by)
    VALUES (p_profile_id, v_permission_id, 'grant', v_actor_profile_id)
    ON CONFLICT (profile_id, permission_id)
    DO UPDATE SET effect = 'grant', created_by = v_actor_profile_id, created_at = now();
    v_changed := true;
  END IF;
  -- idempotente: já era 'grant' => v_changed permanece false, sem log

  -- grant nunca reduz o conjunto efetivo de ninguém => não participa do guard de lockout

  IF v_changed THEN
    INSERT INTO public.permission_change_log (actor_profile_id, target_type, target_id, permission_id, action)
    VALUES (v_actor_profile_id, 'user', p_profile_id, v_permission_id, 'grant');
  END IF;

  RETURN jsonb_build_object('changed', v_changed);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_permission_grant(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_permission_grant(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_permission_grant(uuid, text) TO authenticated;

-- ============================================================
-- set_user_permission_revoke — override individual: revoga
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_permission_revoke(
  p_profile_id uuid,
  p_permission_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id uuid;
  v_permission_id uuid;
  v_previous_effect text;
  v_changed boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);

  SELECT id INTO v_actor_profile_id
  FROM public.user_profiles WHERE user_id = auth.uid() AND ativo = true;
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('permissions.manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar o Centro de Permissões' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_profile_id AND ativo = true) THEN
    RAISE EXCEPTION 'Usuário alvo não encontrado ou inativo' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_permission_id FROM public.permissions WHERE code = p_permission_code;
  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permissão % não encontrada', p_permission_code USING ERRCODE = '22023';
  END IF;

  SELECT effect INTO v_previous_effect FROM public.user_permissions
  WHERE profile_id = p_profile_id AND permission_id = v_permission_id;

  IF v_previous_effect IS DISTINCT FROM 'revoke' THEN
    INSERT INTO public.user_permissions (profile_id, permission_id, effect, created_by)
    VALUES (p_profile_id, v_permission_id, 'revoke', v_actor_profile_id)
    ON CONFLICT (profile_id, permission_id)
    DO UPDATE SET effect = 'revoke', created_by = v_actor_profile_id, created_at = now();
    v_changed := true;
  END IF;
  -- idempotente: já era 'revoke' => v_changed permanece false, sem log

  IF v_changed AND p_permission_code IN ('permissions.manage', 'permissions.view') THEN
    IF public.count_active_users_with_permissions(ARRAY['permissions.manage', 'permissions.view']) = 0 THEN
      RAISE EXCEPTION 'Operação bloqueada: nenhum usuário ativo ficaria com permissions.manage e permissions.view ao mesmo tempo (lockout administrativo)'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_changed THEN
    INSERT INTO public.permission_change_log (actor_profile_id, target_type, target_id, permission_id, action)
    VALUES (v_actor_profile_id, 'user', p_profile_id, v_permission_id, 'revoke');
  END IF;

  RETURN jsonb_build_object('changed', v_changed);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_permission_revoke(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_permission_revoke(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_permission_revoke(uuid, text) TO authenticated;

-- ============================================================
-- clear_user_permission_override — remove o override, restaura herança
-- ============================================================
CREATE OR REPLACE FUNCTION public.clear_user_permission_override(
  p_profile_id uuid,
  p_permission_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id uuid;
  v_permission_id uuid;
  v_previous_effect text;
  v_changed boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);

  SELECT id INTO v_actor_profile_id
  FROM public.user_profiles WHERE user_id = auth.uid() AND ativo = true;
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('permissions.manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar o Centro de Permissões' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_permission_id FROM public.permissions WHERE code = p_permission_code;
  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permissão % não encontrada', p_permission_code USING ERRCODE = '22023';
  END IF;

  SELECT effect INTO v_previous_effect FROM public.user_permissions
  WHERE profile_id = p_profile_id AND permission_id = v_permission_id;

  IF v_previous_effect IS NOT NULL THEN
    DELETE FROM public.user_permissions
    WHERE profile_id = p_profile_id AND permission_id = v_permission_id;
    v_changed := true;
  END IF;
  -- idempotente: não tinha override nenhum => v_changed permanece false, sem log

  -- Restaurar herança pode REDUZIR o efetivo (se havia um grant individual
  -- e o papel não dá o código) ou AUMENTAR (se havia um revoke). Roda o
  -- guard nos dois casos por simplicidade/segurança — é barato e o caso
  -- que aumenta nunca vai zerar a contagem mesmo.
  IF v_changed AND p_permission_code IN ('permissions.manage', 'permissions.view') THEN
    IF public.count_active_users_with_permissions(ARRAY['permissions.manage', 'permissions.view']) = 0 THEN
      RAISE EXCEPTION 'Operação bloqueada: nenhum usuário ativo ficaria com permissions.manage e permissions.view ao mesmo tempo (lockout administrativo)'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_changed THEN
    INSERT INTO public.permission_change_log (actor_profile_id, target_type, target_id, permission_id, action)
    VALUES (v_actor_profile_id, 'user', p_profile_id, v_permission_id, 'inherit');
  END IF;

  RETURN jsonb_build_object('changed', v_changed);
END;
$$;

REVOKE ALL ON FUNCTION public.clear_user_permission_override(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_user_permission_override(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_user_permission_override(uuid, text) TO authenticated;

-- ============================================================
-- RLS — fecha escrita direta, amplia leitura pro PBAC efetivo (aditivo)
-- ============================================================

-- role_permissions: remove a policy de escrita direta (mesmo pra admin —
-- só as RPCs escrevem daqui em diante). Mantém a leitura já existente
-- ("Leitura role_permissions", qual: true).
DROP POLICY IF EXISTS "Gestao role_permissions" ON public.role_permissions;

-- user_permissions: idem — remove escrita direta. Amplia a LEITURA (não
-- remove) pra além de self/is_permissions_admin(): quem tem
-- permissions.view OU permissions.manage também pode ler overrides de
-- QUALQUER usuário (precisa pra Etapa 6.1/6.2 da tela funcionar mesmo se
-- o cargo de "administrador do Centro" um dia não for mais o role admin
-- inteiro).
DROP POLICY IF EXISTS "Gestao user_permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Leitura propria user_permissions" ON public.user_permissions;
CREATE POLICY "Leitura user_permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    public.is_permissions_admin()
    OR public.has_effective_permission('permissions.view')
    OR public.has_effective_permission('permissions.manage')
    OR profile_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  );

-- permission_change_log: amplia a leitura pra permissions.audit_view,
-- sem tocar a policy existente de is_permissions_admin(). Continua SEM
-- nenhuma policy de INSERT/UPDATE/DELETE — só as RPCs (SECURITY DEFINER)
-- escrevem aqui, de propósito, desde a Sprint 3.8.
CREATE POLICY "Leitura permission_change_log via audit_view" ON public.permission_change_log
  FOR SELECT TO authenticated
  USING (public.has_effective_permission('permissions.audit_view'));

-- ── Privilégios de tabela: resultado explícito (REVOKE ALL + devolve só ──
-- ── o SELECT necessário) — escrita só pelas 4 RPCs SECURITY DEFINER,     ──
-- ── que não precisam de GRANT nenhum nas tabelas pra funcionar (rodam    ──
-- ── como o dono das tabelas).                                           ──
REVOKE ALL ON public.role_permissions FROM anon, authenticated;
REVOKE ALL ON public.user_permissions FROM anon, authenticated;
REVOKE ALL ON public.permission_change_log FROM anon, authenticated;

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT ON public.user_permissions TO authenticated;
GRANT SELECT ON public.permission_change_log TO authenticated;
-- anon não recebe nada de volta — a RLS já excluía anon de toda policy
-- destas 3 tabelas (nenhuma tem `TO anon`), isso só fecha o privilégio
-- bruto que sobrava solto por baixo.

-- ============================================================
-- HARDENING — user_profiles (achado além do escopo original do
-- checkpoint: a policy "perfil_update" e a "perfil_insert" garantem que a
-- LINHA pertence ao próprio usuário, mas não restringem QUAIS COLUNAS
-- podem mudar. Confirmado sem trigger nenhum hoje: um usuário comum pode,
-- via API direta — sem passar pela UI React — enviar
-- PATCH .../user_profiles?user_id=eq.<próprio> {"role":"admin"} e a RLS
-- permite. Mesmo problema em perfil_insert (autoprovisionamento do
-- primeiro login): {"role":"admin"} no INSERT também passaria. Column-
-- level RLS não existe nativamente pro caso "trava só se NÃO for admin" —
-- a solução padrão é trigger, que também é o ÚNICO mecanismo garantido a
-- rodar em QUALQUER caminho de escrita (RLS-permitido OU service_role via
-- Edge Function, que ignora RLS por completo).
-- ============================================================

-- ── Trava de colunas sensíveis (BEFORE INSERT/UPDATE) ──────────────────
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Conexão direta ao banco (SQL Editor do dashboard, `supabase db query`,
  -- migrations) nunca passa pelo PostgREST — não existe request.jwt.claims
  -- nenhum, então auth.role() E auth.uid() vêm NULL (confirmado
  -- empiricamente: current_user/session_user = 'postgres' nesse caminho).
  -- Quem tem esse nível de acesso já é confiado por definição (é
  -- superusuário — poderia inclusive desabilitar este trigger se quisesse),
  -- igual service_role.
  IF auth.role() IS NULL AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- service_role (Edge Function admin-auth: create_user/toggle_active) já
  -- é um caminho confiado, autorizado inteiramente DENTRO da própria
  -- função (valida ativo=true + role='admin' do chamador antes de chegar
  -- aqui) — nunca fica restrito por esta trava, inclusive pode trocar
  -- user_id (único caminho que pode).
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- user_id é imutável pra QUALQUER caminho que não seja service_role —
  -- nem admin comum troca o vínculo com auth.users pela UI. Não existe
  -- necessidade funcional pra isso (create_user sempre cria o vínculo já
  -- correto, na Edge Function). Fica antes do check de admin de propósito:
  -- não é uma exceção que is_permissions_admin() destrava.
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
  END IF;

  -- is_permissions_admin() (hoje: role admin ativo) pode alterar
  -- role/ativo/gestor_id (mas não user_id, travado acima) de QUALQUER
  -- perfil livremente — é o caminho já usado por adminService.updateUser()
  -- via a policy admin_update_user_profiles.
  IF public.is_permissions_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Autoprovisionamento no primeiro login (policy perfil_insert): trava
    -- pro default seguro documentado em profileService.createDefault()
    -- ('vendedor', ativo, sem gestor) — não importa o que o payload da
    -- requisição tentar mandar. user_id não precisa ser travado aqui: a
    -- própria policy já exige auth.uid() = user_id no WITH CHECK, e é
    -- exatamente o INSERT que estabelece esse vínculo pela primeira vez.
    NEW.role := 'vendedor';
    NEW.ativo := true;
    NEW.gestor_id := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Auto-serviço (policy perfil_update): role/ativo/gestor_id nunca
    -- mudam, não importa o que o payload tentar — voltam pro valor antigo.
    -- (user_id já foi travado acima, antes até do check de admin.)
    NEW.role := OLD.role;
    NEW.ativo := OLD.ativo;
    NEW.gestor_id := OLD.gestor_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_sensitive_profile_fields ON public.user_profiles;
CREATE TRIGGER trg_protect_sensitive_profile_fields
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- ── Guard de lockout em UPDATE (role/ativo) ─────────────────────────────
-- AFTER (não BEFORE): precisa que a linha já esteja fisicamente
-- atualizada na transação pra count_active_users_with_permissions()
-- enxergar o estado hipotético pós-mudança antes do commit. RAISE
-- EXCEPTION aqui desfaz a transação inteira (a linha some do resultado
-- final também).
--
-- Roda pra QUALQUER UPDATE de role/ativo, independente de quem fez —
-- admin via UI (admin_update_user_profiles), Edge Function admin-auth
-- (service_role, ignora RLS mas NÃO ignora trigger), ou qualquer caminho
-- futuro. É o único ponto que protege os 3 caminhos ao mesmo tempo.
CREATE OR REPLACE FUNCTION public.lockout_guard_user_profiles_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Só interessa quando algo pode REDUZIR o conjunto de administradores
  -- capazes: troca de papel (pra qualquer direção — perde acesso via
  -- role_permissions do papel antigo) ou desativação (ativo true->false).
  -- Ativar, ou qualquer outra coluna, nunca reduz — não precisa checar.
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (OLD.ativo = true AND NEW.ativo = false) THEN
    PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);
    IF public.count_active_users_with_permissions(ARRAY['permissions.manage', 'permissions.view']) = 0 THEN
      RAISE EXCEPTION 'Operação bloqueada: esta alteração deixaria o sistema sem nenhum usuário ativo com permissions.manage e permissions.view ao mesmo tempo (lockout administrativo)'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lockout_guard_user_profiles_update ON public.user_profiles;
CREATE TRIGGER trg_lockout_guard_user_profiles_update
  AFTER UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.lockout_guard_user_profiles_update();

-- ── Guard de lockout em DELETE (direto OU cascade de auth.users) ──────
-- user_profiles.user_id -> auth.users.id é ON DELETE CASCADE: apagar o
-- auth.users dispara um DELETE real em user_profiles, que passa por este
-- MESMO trigger — cobre os dois casos com uma única definição.
CREATE OR REPLACE FUNCTION public.lockout_guard_user_profiles_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.ativo THEN
    PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);
    IF public.count_active_users_with_permissions(ARRAY['permissions.manage', 'permissions.view']) = 0 THEN
      RAISE EXCEPTION 'Operação bloqueada: excluir este perfil deixaria o sistema sem nenhum usuário ativo com permissions.manage e permissions.view ao mesmo tempo (lockout administrativo)'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_lockout_guard_user_profiles_delete ON public.user_profiles;
CREATE TRIGGER trg_lockout_guard_user_profiles_delete
  AFTER DELETE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.lockout_guard_user_profiles_delete();

-- ── Privilégio de tabela: DELETE nunca teve policy (já bloqueado por  ──
-- ── RLS default-deny) — revoga o GRANT bruto também, explícito.       ──
-- INSERT/UPDATE continuam concedidos (autoprovisionamento e autoedição
-- de campos não-sensíveis são fluxos reais e legítimos — a proteção
-- deles é o trigger acima, não a ausência do privilégio).
REVOKE DELETE ON public.user_profiles FROM authenticated, anon;

NOTIFY pgrst, 'reload schema';
