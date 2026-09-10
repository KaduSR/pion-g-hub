-- ============================================================
-- MIGRATION: Hardening — RLS granular de leads_feira via PBAC
-- ============================================================
-- Achado da Etapa 5 (Bloco 2, migração de LeadsPage para o Centro de
-- Permissões): leads_feira tinha 1 única policy "Acesso total leads_feira"
-- (FOR ALL TO authenticated USING (true) WITH CHECK (true)) — sem NENHUMA
-- restrição de linha. "gestor vê só a equipe" e "vendedor só vê os
-- próprios leads" eram garantias inteiramente da UI (filtro client-side em
-- LeadsPage/leadsService), nunca do banco. Confirmado empiricamente:
-- Vendedor 1 conseguiu ler o lead do Vendedor 2 via API direta, sem o
-- filtro client-side.
--
-- Esta migration substitui a policy única por 4 policies granulares
-- (SELECT/INSERT/UPDATE/DELETE), apoiadas nas permissões efetivas do PBAC
-- (Sprint 3.8: roles/permissions/role_permissions/user_permissions) via
-- has_effective_permission() — não papéis hardcoded.
--
-- INVESTIGAÇÃO PRÉVIA (ver checkpoint para detalhes completos):
--   - user_profiles já tem SELECT amplo pra authenticated ("ativo = true"),
--     e roles/permissions/role_permissions já são "qual: true" pra
--     authenticated — logo has_effective_permission() e
--     is_own_or_team_lead() NÃO precisam de SECURITY DEFINER (o invocador
--     já enxerga tudo que a função precisa ler, sob a própria RLS dele).
--   - user_profiles.gestor_id referencia user_profiles.id (não user_id) —
--     é o vínculo de equipe usado no escopo "team".
--   - Fluxo real de criação (LeadCapturePage.jsx, LeadCaptureForm.jsx):
--     sempre client-side com created_by = usuário autenticado atual, nunca
--     um UUID arbitrário — mas a policy antiga não impedia enviar outro.
--   - O totem público (/autoatendimento) NUNCA insere direto em
--     leads_feira — passa por register_kiosk_lead(), SECURITY DEFINER,
--     que sempre deixa created_by NULL. Isso é preexistente e não muda
--     aqui, mas tem uma CONSEQUÊNCIA INTENCIONAL desta migration: leads do
--     totem (created_by NULL) deixam de aparecer para gestor/vendedor sob
--     as novas policies de escopo "team"/"own" (não casam com nenhum
--     created_by) — antes apareciam pra gestor (RLS permissiva não
--     filtrava nada). Continuam 100% visíveis pra quem tem leads.view_all
--     (admin/marketing). Sinalizado explicitamente no checkpoint.
-- ============================================================

-- ── has_effective_permission(permission_code) ──────────────────────────
-- Função genérica e reutilizável: papel do usuário (via roles/
-- role_permissions) MAIS grants individuais MENOS revokes individuais
-- (revoke sempre vence — mesma ordem de resolução do permissionService.js
-- no frontend). Só considera o profile ATIVO do usuário autenticado
-- (auth.uid()) — perfil inativo ou inexistente resolve pra nenhuma
-- permissão (fail-closed).
CREATE OR REPLACE FUNCTION public.has_effective_permission(permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH me AS (
    SELECT id, role
    FROM public.user_profiles
    WHERE user_id = auth.uid() AND ativo = true
  ),
  role_grant AS (
    SELECT 1
    FROM me
    JOIN public.roles r ON r.code = me.role
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE p.code = permission_code
  ),
  individual_grant AS (
    SELECT 1
    FROM me
    JOIN public.user_permissions up ON up.profile_id = me.id
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE p.code = permission_code AND up.effect = 'grant'
  ),
  individual_revoke AS (
    SELECT 1
    FROM me
    JOIN public.user_permissions up ON up.profile_id = me.id
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE p.code = permission_code AND up.effect = 'revoke'
  )
  SELECT
    (EXISTS (SELECT 1 FROM role_grant) OR EXISTS (SELECT 1 FROM individual_grant))
    AND NOT EXISTS (SELECT 1 FROM individual_revoke);
$$;

REVOKE ALL ON FUNCTION public.has_effective_permission(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_effective_permission(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_effective_permission(TEXT) TO authenticated;

-- ── is_own_or_team_lead(created_by) ─────────────────────────────────────
-- Helper de escopo "own OR equipe": usado pelas 3 policies que dependem de
-- view_team/manage_team, pra não repetir a mesma subquery em cada uma.
-- "Equipe" = perfis cujo gestor_id aponta pro profile do usuário atual.
CREATE OR REPLACE FUNCTION public.is_own_or_team_lead(created_by UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT created_by = auth.uid()
    OR created_by IN (
      SELECT up.user_id
      FROM public.user_profiles up
      WHERE up.gestor_id = (
        SELECT me.id FROM public.user_profiles me WHERE me.user_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_own_or_team_lead(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_own_or_team_lead(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_own_or_team_lead(UUID) TO authenticated;

-- ── leads_feira: policy única → 4 policies granulares ───────────────────
DROP POLICY IF EXISTS "Acesso total leads_feira" ON public.leads_feira;

CREATE POLICY "Leitura leads_feira" ON public.leads_feira
  FOR SELECT TO authenticated
  USING (
    public.has_effective_permission('leads.view_all')
    OR (public.has_effective_permission('leads.view_team') AND public.is_own_or_team_lead(created_by))
    OR (public.has_effective_permission('leads.view_own') AND created_by = auth.uid())
  );

-- created_by = auth.uid() (nunca NULL, nunca outro UUID): um usuário
-- authenticated com leads.capture não pode criar um lead sem responsável
-- nem ocultá-lo do próprio escopo. created_by NULL só existe pra leads do
-- totem público, que NUNCA passam por esta policy — register_kiosk_lead()
-- é SECURITY DEFINER e insere como o dono da função (bypassa RLS por
-- completo), não como authenticated. Ver confirmação abaixo.
CREATE POLICY "Insercao leads_feira" ON public.leads_feira
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_effective_permission('leads.capture')
    AND created_by = auth.uid()
  );

CREATE POLICY "Atualizacao leads_feira" ON public.leads_feira
  FOR UPDATE TO authenticated
  USING (
    public.has_effective_permission('leads.manage_all')
    OR (public.has_effective_permission('leads.manage_team') AND public.is_own_or_team_lead(created_by))
    OR (public.has_effective_permission('leads.manage_own') AND created_by = auth.uid())
  )
  WITH CHECK (
    public.has_effective_permission('leads.manage_all')
    OR (public.has_effective_permission('leads.manage_team') AND public.is_own_or_team_lead(created_by))
    OR (public.has_effective_permission('leads.manage_own') AND created_by = auth.uid())
  );

CREATE POLICY "Exclusao leads_feira" ON public.leads_feira
  FOR DELETE TO authenticated
  USING (
    public.has_effective_permission('leads.manage_all')
    OR (public.has_effective_permission('leads.manage_team') AND public.is_own_or_team_lead(created_by))
    OR (public.has_effective_permission('leads.manage_own') AND created_by = auth.uid())
  );

-- Defesa em profundidade: mesmo achado do hardening anterior (default
-- privilege do projeto concede EXECUTE/GRANT direto a anon em todo objeto
-- novo). RLS já bloqueia anon de fato (nenhuma policy o inclui), mas o
-- GRANT de tabela solto é uma camada a menos — fecha aqui também.
REVOKE ALL ON public.leads_feira FROM anon;

-- ── Índice ausente ───────────────────────────────────────────────────────
-- created_by e user_profiles.user_id já tinham índice. gestor_id não —
-- e agora é consultado em toda leitura/escrita de leads_feira sob escopo
-- team (is_own_or_team_lead).
CREATE INDEX IF NOT EXISTS idx_user_profiles_gestor_id ON public.user_profiles (gestor_id);

NOTIFY pgrst, 'reload schema';
