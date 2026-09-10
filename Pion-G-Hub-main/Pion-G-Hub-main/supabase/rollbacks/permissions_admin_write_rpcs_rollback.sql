-- ============================================================
-- ROLLBACK: Etapa 6.2 — RPCs de gravação + hardening de user_profiles
-- (desfaz 20260722100000_permissions_admin_write_rpcs.sql)
-- ============================================================
-- ATENÇÃO: isto restaura o estado de ANTES desta migration —
-- role_permissions/user_permissions voltam a ser editáveis diretamente
-- por quem passa em is_permissions_admin(), e user_profiles volta a
-- aceitar troca de role/ativo/gestor_id/user_id pelo próprio usuário via
-- API direta (a vulnerabilidade que esta migration fechou). Use só se o
-- hardening causar uma regressão funcional real; não é o comportamento
-- recomendado.

-- ── user_profiles: remove os 3 triggers e as 2 funções de guard ───────
DROP TRIGGER IF EXISTS trg_protect_sensitive_profile_fields ON public.user_profiles;
DROP TRIGGER IF EXISTS trg_lockout_guard_user_profiles_update ON public.user_profiles;
DROP TRIGGER IF EXISTS trg_lockout_guard_user_profiles_delete ON public.user_profiles;
DROP FUNCTION IF EXISTS public.protect_sensitive_profile_fields();
DROP FUNCTION IF EXISTS public.lockout_guard_user_profiles_update();
DROP FUNCTION IF EXISTS public.lockout_guard_user_profiles_delete();

GRANT DELETE ON public.user_profiles TO authenticated, anon;

-- ── role_permissions / user_permissions / permission_change_log ───────
-- Restaura os privilégios de tabela anteriores (grant amplo de novo).
GRANT ALL ON public.role_permissions TO authenticated, anon;
GRANT ALL ON public.user_permissions TO authenticated, anon;
GRANT ALL ON public.permission_change_log TO authenticated, anon;

-- Restaura a leitura de user_permissions ao formato anterior (self OU
-- is_permissions_admin(), sem os caminhos de permissions.view/manage).
DROP POLICY IF EXISTS "Leitura user_permissions" ON public.user_permissions;
CREATE POLICY "Leitura propria user_permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    public.is_permissions_admin()
    OR profile_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  );

-- Remove a leitura de permission_change_log via audit_view (mantém só a
-- policy original de is_permissions_admin()).
DROP POLICY IF EXISTS "Leitura permission_change_log via audit_view" ON public.permission_change_log;

-- Restaura as policies de escrita direta que existiam antes.
CREATE POLICY "Gestao role_permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin());

CREATE POLICY "Gestao user_permissions" ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin());

-- ── Funções e constraint desta migration ───────────────────────────────
DROP FUNCTION IF EXISTS public.set_role_permission(text, text, boolean);
DROP FUNCTION IF EXISTS public.set_user_permission_grant(uuid, text);
DROP FUNCTION IF EXISTS public.set_user_permission_revoke(uuid, text);
DROP FUNCTION IF EXISTS public.clear_user_permission_override(uuid, text);
DROP FUNCTION IF EXISTS public.count_active_users_with_permissions(text[]);

ALTER TABLE public.permission_change_log DROP CONSTRAINT IF EXISTS permission_change_log_action_check;
ALTER TABLE public.permission_change_log
  ADD CONSTRAINT permission_change_log_action_check CHECK (action IN ('grant', 'revoke'));
-- Nota: se já existir alguma linha com action='inherit' gravada por esta
-- migration, o ALTER acima falha (constraint violada por dado existente).
-- Nesse caso, decida antes de rodar o rollback: apagar essas linhas ou
-- manter o constraint ampliado.

NOTIFY pgrst, 'reload schema';
