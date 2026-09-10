-- ============================================================
-- MIGRATION: Sprint 3.8 — Centro de Permissões (PBAC), Etapa 3: Banco de Dados
-- ============================================================
-- Cria a estrutura de dados (tabelas + catálogo + seed de role_permissions).
-- Esta migration NÃO muda o comportamento atual do frontend — usePermissions()
-- continua lendo o mapa estático de src/modules/permissions/constants/permissions.js
-- até a Etapa 5 (migração do frontend para consumir estas tabelas) ser
-- implementada. Ainda assim, ela CRIA estruturas novas e sujeitas às
-- políticas RLS abaixo — ou seja, endpoints novos passam a existir e
-- responder a partir do momento em que esta migration é aplicada, mesmo que
-- nenhuma tela do sistema os utilize ainda.
--
-- Ver docs/architecture/permissions-pbac-inventario.md para o inventário e
-- catálogo completos que fundamentam esta migration (Etapas 1 e 2).
--
-- Papéis novos (Pré-vendas, Recepção etc., citados no pedido original) NÃO
-- são criados aqui, por decisão explícita: a tabela `roles` fica pronta pra
-- recebê-los, mas cada papel novo precisa de alguém definir suas permissões
-- antes de existir — não há como inferir isso do código atual. Além disso,
-- uma auditoria (ver docs/architecture/permissions-pbac-inventario.md,
-- seção "Auditoria de bloqueios para papéis dinâmicos") encontrou pontos
-- fora deste banco que hoje só aceitam os 4 papéis atuais — a tabela
-- `roles` sozinha não é suficiente para um papel novo funcionar de ponta a
-- ponta ainda.
--
-- Regra de seed do role_permissions (documentada aqui pra quem for auditar):
-- toda permissão nova (granular) é concedida a um role SOMENTE quando esse
-- role já possui, hoje, a permissão "guarda-chuva" equivalente em
-- ROLE_PERMISSIONS (ex: fairs.manage → fairs.create/edit/delete/finish/
-- team_manage). Gaps de UI encontrados no inventário (ex: o botão de
-- excluir lead em /leads não checa NADA hoje, nem role) não foram
-- promovidos a "todo mundo pode" — isso seria formalizar um bug como
-- comportamento pretendido. Quando a Etapa 5 finalmente conectar
-- `can('leads.delete')` ao botão, o gate passa a ser esta tabela, e nesse
-- momento qualquer role que hoje "vaza" acesso por falta de checagem deixa
-- de vazar — o que é a correção, não uma regressão.
--
-- REVISÃO PÓS-CHECKPOINT (mesma sprint, antes da aplicação):
--   1. is_gifts_manager() (admin+marketing+gestor) NÃO é mais usada para
--      administrar estas tabelas — ela deixaria marketing/gestor
--      inserir/alterar/excluir roles, permissions, role_permissions e
--      user_permissions diretamente pela API. Nova função
--      is_permissions_admin() (só admin) assume esse papel em todas as
--      policies de escrita + na leitura de permission_change_log.
--   2. Catálogo ganhou permissions.view/manage/audit_view, concedidas só a admin.
--   3. roles ganhou trigger protegendo papéis de sistema contra DELETE,
--      troca de `code` e reversão de `is_system` para false.
--   4. selfservice.credential_scan REMOVIDA do catálogo e dos seeds — a
--      integração com o QR da organizadora foi descartada por
--      impossibilidade técnica (ver inventário, seção Autoatendimento).
--
-- REVISÃO 2 (mesmo checkpoint, antes da aplicação):
--   5. permission_change_log passa a ser SOMENTE LEITURA por RLS — não
--      existe mais NENHUMA policy de escrita nesta tabela, nem pra admin.
--      Isso significa que, hoje, nada consegue gravar uma linha aqui via
--      API do Supabase (nem direto, nem através de is_permissions_admin());
--      a Etapa 6 terá que escrever via trigger ou RPC SECURITY DEFINER,
--      que roda com o privilégio do dono da função, não do usuário logado
--      — por isso RLS "fechado pra todo mundo" não impede a Etapa 6 de
--      funcionar, só impede um INSERT solto vindo direto do frontend.
--   6. permissions (catálogo) também passa a ser SOMENTE LEITURA por RLS —
--      novas permissões só entram via migration nova, nunca pela futura
--      tela administrativa. A UI (Etapa 6) administra roles,
--      role_permissions, user_permissions e lê permission_change_log —
--      não cria/edita/exclui o catálogo em si.
--   7. GRANT/REVOKE explícitos em is_permissions_admin() (só authenticated
--      executa) e protect_system_roles() (REVOKE de PUBLIC — função de
--      trigger, nunca chamada diretamente por SQL de um usuário; o
--      trigger continua dependência do Postgres, TG_OP interno, não
--      passa pelo mecanismo normal de EXECUTE, então revogar de PUBLIC
--      não quebra o disparo automático em UPDATE/DELETE de roles).
-- ============================================================

-- ── TABELA: permissions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permissions (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,     -- 'gifts.deliver' — mesmo formato já usado em PERMISSIONS (permissions.js)
  resource    TEXT NOT NULL,            -- 'gifts'
  action      TEXT NOT NULL,            -- 'deliver'
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions (resource);

-- ── TABELA: roles ─────────────────────────────────────────────────
-- Espelha (não substitui) public.user_profiles.role, que continua sendo a
-- coluna real de identidade do usuário. `roles.code` é o elo entre as duas.
-- is_system=true protege os 4 papéis atuais — reforçado pelo trigger
-- protect_system_roles() abaixo, porque a coluna sozinha não impede nada
-- (é só um dado; sem trigger, um DELETE ou UPDATE direto ignora o que ela
-- "significa").
CREATE TABLE IF NOT EXISTS public.roles (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,     -- 'admin', 'vendedor', futuramente 'pre_vendas', 'recepcao'...
  nome        TEXT NOT NULL,
  descricao   TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABELA: role_permissions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions (permission_id);

-- ── TABELA: user_permissions ──────────────────────────────────────
-- Sobrescritas individuais (Etapa 6: "Permissões Individuais por Usuário").
-- effect='grant' libera algo além do que o role já dá; effect='revoke' tira
-- algo que o role concederia. Nenhum código consome esta tabela ainda.
CREATE TABLE IF NOT EXISTS public.user_permissions (
  profile_id    UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  effect        TEXT NOT NULL CHECK (effect IN ('grant', 'revoke')),
  created_by    UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_profile ON public.user_permissions (profile_id);

-- ── TABELA: permission_change_log ─────────────────────────────────
-- Histórico de alterações (Etapa 6, "se possível"). Nenhum código escreve
-- aqui ainda — fica pronta pra quando a UI administrativa existir.
-- REQUISITO OBRIGATÓRIO para quando essa escrita for implementada (Etapa 6):
-- o preenchimento deve vir de um trigger ou de uma RPC SECURITY DEFINER
-- que valida a operação — nunca de um INSERT direto disparado pelo
-- frontend, que poderia gravar um log falso ou incompleto.
CREATE TABLE IF NOT EXISTS public.permission_change_log (
  id                UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  actor_profile_id  UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  target_type       TEXT NOT NULL CHECK (target_type IN ('role', 'user')),
  target_id         UUID NOT NULL,  -- role_id ou profile_id, conforme target_type (sem FK cruzada por causa do tipo variável)
  permission_id     UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  action            TEXT NOT NULL CHECK (action IN ('grant', 'revoke')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_change_log_target ON public.permission_change_log (target_type, target_id);

-- ── Helper de autorização: quem administra o Centro de Permissões ──
-- Deliberadamente MAIS ESTRITA que is_gifts_manager() (que inclui
-- marketing e gestor). Administrar roles/permissions/vínculos é uma
-- operação de raiz de confiança do sistema — só admin ativo. Provisória
-- (ver comentário no cabeçalho): a Etapa 6 pode decidir abrir
-- `permissions.manage` pra outros papéis via role_permissions no futuro,
-- mas até lá o banco não confia em ninguém além de admin pra essa escrita.
CREATE OR REPLACE FUNCTION public.is_permissions_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND ativo = true
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_permissions_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_permissions_admin() TO authenticated;

-- ── Trigger: protege papéis de sistema (roles.is_system = true) ────
-- A coluna is_system sozinha é só um dado — sem isto, um DELETE ou UPDATE
-- direto na tabela ignora completamente o que ela deveria significar.
-- Bloqueia: (1) excluir um papel de sistema; (2) trocar o `code` de um
-- papel de sistema; (3) desmarcar is_system (true→false) de um papel de
-- sistema. Nome e descrição continuam livremente editáveis.
CREATE OR REPLACE FUNCTION public.protect_system_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'Não é permitido excluir o papel de sistema "%".', OLD.code
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  -- TG_OP = 'UPDATE'
  IF OLD.is_system THEN
    IF NEW.code IS DISTINCT FROM OLD.code THEN
      RAISE EXCEPTION 'Não é permitido alterar o código do papel de sistema "%".', OLD.code
        USING ERRCODE = '42501';
    END IF;
    IF NEW.is_system = false THEN
      RAISE EXCEPTION 'Não é permitido remover a marcação de sistema do papel "%".', OLD.code
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Função de trigger: nunca chamada diretamente por SQL de um usuário (só o
-- mecanismo de trigger do Postgres a invoca, internamente, no BEFORE
-- UPDATE/DELETE de roles). Revogar de PUBLIC não quebra o disparo — quem
-- precisa de EXECUTE pra uma função de trigger disparar é o dono/criador do
-- trigger no momento do CREATE TRIGGER, não o usuário que depois faz o
-- UPDATE/DELETE na tabela.
REVOKE ALL ON FUNCTION public.protect_system_roles() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_system_roles ON public.roles;
CREATE TRIGGER trg_protect_system_roles
  BEFORE UPDATE OR DELETE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_system_roles();

-- ── RLS ────────────────────────────────────────────────────────────
-- Leitura liberada pra qualquer authenticated em permissions/roles/
-- role_permissions (o frontend inteiro vai precisar ler isto pra montar
-- `can()` na Etapa 5 — restringir a leitura travaria a própria checagem de
-- permissão).
--
-- permissions (catálogo) é SOMENTE LEITURA pra todo mundo, inclusive
-- admin, via API do Supabase — de propósito, sem nenhuma policy de
-- INSERT/UPDATE/DELETE. Novas permissões só entram por migration nova,
-- junto com a funcionalidade correspondente (regra permanente desta
-- sprint). A futura tela administrativa (Etapa 6) NÃO cria/edita/exclui
-- código de permissão — ela administra roles, role_permissions e
-- user_permissions, e lê (só leitura) permission_change_log.
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura permissions" ON public.permissions;
CREATE POLICY "Leitura permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Gestao permissions" ON public.permissions;

-- Escrita (INSERT/UPDATE/DELETE) nas demais tabelas restrita a
-- is_permissions_admin() — só admin ativo, nunca marketing/gestor.
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura roles" ON public.roles;
CREATE POLICY "Leitura roles" ON public.roles
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Gestao roles" ON public.roles;
CREATE POLICY "Gestao roles" ON public.roles
  FOR ALL TO authenticated
  USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin());

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura role_permissions" ON public.role_permissions;
CREATE POLICY "Leitura role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Gestao role_permissions" ON public.role_permissions;
CREATE POLICY "Gestao role_permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin());

-- user_permissions: leitura restrita ao próprio usuário + quem administra —
-- diferente das tabelas acima, isto pode conter dado sensível por pessoa
-- (ex: uma revogação individual), então não abre leitura geral.
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura propria user_permissions" ON public.user_permissions;
CREATE POLICY "Leitura propria user_permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    public.is_permissions_admin()
    OR profile_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Gestao user_permissions" ON public.user_permissions;
CREATE POLICY "Gestao user_permissions" ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin());

-- permission_change_log é SOMENTE LEITURA pra todo mundo, inclusive admin,
-- via API do Supabase — nenhuma policy de INSERT/UPDATE/DELETE existe, de
-- propósito. É um log de auditoria: se um admin pudesse escrever nele
-- direto, deixaria de provar nada (poderia forjar o próprio histórico). A
-- Etapa 6 escreve aqui via trigger ou RPC SECURITY DEFINER — que roda com
-- o privilégio do DONO da função (não do usuário logado), então RLS
-- "fechado pra todo mundo" não impede a escrita real acontecer, só impede
-- um INSERT solto vindo direto do frontend/API.
ALTER TABLE public.permission_change_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura permission_change_log" ON public.permission_change_log;
CREATE POLICY "Leitura permission_change_log" ON public.permission_change_log
  FOR SELECT TO authenticated USING (public.is_permissions_admin());
DROP POLICY IF EXISTS "Gestao permission_change_log" ON public.permission_change_log;

-- ── SEED: roles (os 4 papéis já em produção) ────────────────────────
INSERT INTO public.roles (code, nome, descricao, is_system) VALUES
  ('admin',     'Administrador', 'Acesso total ao sistema', true),
  ('marketing', 'Marketing',     'Gestão de feiras, leads e relatórios; sem gestão de usuários ou configurações', true),
  ('gestor',    'Gestor',        'Gerencia a própria equipe', true),
  ('vendedor',  'Vendedor',      'Capta e administra apenas os próprios leads', true)
ON CONFLICT (code) DO NOTHING;

-- ── SEED: permissions (catálogo completo — Etapa 2, revisado) ───────
-- Inclui permissões já em uso 🟢, já declaradas mas sem tela que use 🟡, e
-- novas propostas 🆕 (granularização de bundles hoje monolíticos, como
-- fairs.manage/gifts.manage/users.manage). NÃO inclui itens puramente 🔮
-- roadmap (leads.export, selfservice.enable/disable) — a funcionalidade
-- correspondente ainda não existe, e a regra permanente desta sprint é
-- "toda funcionalidade nova registra sua permissão junto", não o inverso.
-- selfservice.credential_scan REMOVIDA (revisão pós-checkpoint): a leitura
-- de QR de credencial foi descontinuada, ver comentário no cabeçalho.
-- permissions.view/manage/audit_view: NOVAS nesta revisão — cobrem o
-- próprio Centro de Permissões (Etapa 6), concedidas só a admin no seed
-- abaixo.
INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('dashboard.view',              'dashboard',    'view',             'Visualizar dashboard geral'),
  ('dashboard.view_team',         'dashboard',    'view_team',        'Visualizar dashboard da própria equipe'),

  ('fairs.view',                  'fairs',        'view',             'Visualizar feiras'),
  ('fairs.create',                'fairs',        'create',           'Criar feira'),
  ('fairs.edit',                  'fairs',        'edit',             'Editar feira'),
  ('fairs.delete',                'fairs',        'delete',           'Excluir feira'),
  ('fairs.finish',                'fairs',        'finish',           'Encerrar feira'),
  ('fairs.team_manage',           'fairs',        'team_manage',      'Adicionar/remover integrantes da equipe da feira'),
  ('fairs.view_all_teams',        'fairs',        'view_all_teams',   'Ver todas as feiras, não só as da própria equipe'),
  ('fairs.manage',                'fairs',        'manage',           'Gerenciar feiras (bundle: create+edit+delete+finish+team_manage)'),

  ('leads.view_all',              'leads',        'view_all',         'Visualizar todos os leads'),
  ('leads.view_team',             'leads',        'view_team',        'Visualizar leads da própria equipe'),
  ('leads.view_own',              'leads',        'view_own',         'Visualizar os próprios leads'),
  ('leads.capture',               'leads',        'capture',          'Captar novo lead'),
  ('leads.edit',                  'leads',        'edit',             'Editar lead (ex: alterar status)'),
  ('leads.delete',                'leads',        'delete',           'Excluir lead'),
  ('leads.manage_all',            'leads',        'manage_all',       'Gerenciar todos os leads (bundle: edit+delete, escopo total)'),
  ('leads.manage_team',           'leads',        'manage_team',      'Gerenciar leads da própria equipe (bundle: edit+delete, escopo equipe)'),
  ('leads.manage_own',            'leads',        'manage_own',       'Gerenciar os próprios leads (bundle: edit+delete, escopo próprio)'),

  ('gifts.view',                  'gifts',        'view',             'Visualizar estoque/kits/movimentações de brindes'),
  ('gifts.create',                'gifts',        'create',           'Cadastrar brinde ou kit'),
  ('gifts.edit',                  'gifts',        'edit',             'Editar brinde ou kit'),
  ('gifts.delete',                'gifts',        'delete',           'Excluir/inativar brinde ou kit'),
  ('gifts.stock_adjust',          'gifts',        'stock_adjust',     'Ajustar estoque, incluindo carga da feira'),
  ('gifts.deliver',               'gifts',        'deliver',          'Liberar entrega de brinde'),
  ('gifts.cancel_delivery',       'gifts',        'cancel_delivery',  'Cancelar entrega de brinde'),
  ('gifts.manage',                'gifts',        'manage',           'Gerenciar brindes (bundle: view+create+edit+delete+stock_adjust+cancel_delivery+deliver)'),

  ('selfservice.view',            'selfservice',  'view',             'Acessar o Autoatendimento interno'),

  ('users.view',                  'users',        'view',             'Visualizar usuários'),
  ('users.create',                'users',        'create',           'Criar usuário'),
  ('users.edit',                  'users',        'edit',             'Editar usuário (cargo, setor, role)'),
  ('users.disable',               'users',        'disable',          'Ativar/desativar usuário'),
  ('users.reset_password',        'users',        'reset_password',   'Redefinir senha de outro usuário'),
  ('users.manage',                'users',        'manage',           'Gerenciar usuários (bundle: view+create+edit+disable+reset_password)'),

  ('settings.edit',               'settings',     'edit',             'Editar configurações do sistema'),
  ('settings.manage',             'settings',     'manage',           'Gerenciar configurações (alias de settings.edit)'),

  ('profile.view',                'profile',      'view',             'Visualizar o próprio perfil'),
  ('profile.edit_own',            'profile',      'edit_own',         'Editar o próprio perfil'),
  ('profile.change_password_own', 'profile',      'change_password_own', 'Alterar a própria senha'),

  ('satisfaction.view',           'satisfaction', 'view',             'Visualizar pesquisas de satisfação'),
  ('satisfaction.manage',         'satisfaction', 'manage',           'Criar/editar/duplicar/ativar pesquisas e perguntas'),
  ('satisfaction.responses_view', 'satisfaction', 'responses_view',   'Visualizar respostas de pesquisas'),

  ('reports.export',              'reports',      'export',           'Exportar relatórios (todos)'),
  ('reports.export_team',         'reports',      'export_team',      'Exportar relatórios da própria equipe'),

  ('permissions.view',            'permissions',  'view',             'Visualizar o Centro de Permissões (papéis, permissões e vínculos)'),
  ('permissions.manage',          'permissions',  'manage',           'Gerenciar papéis, vínculos de permissões e sobrescritas individuais'),
  ('permissions.audit_view',      'permissions',  'audit_view',       'Visualizar o histórico de alterações de permissões')
ON CONFLICT (code) DO NOTHING;

-- ── SEED: role_permissions ───────────────────────────────────────────
-- Espelha EXATAMENTE ROLE_PERMISSIONS de permissions.js (linhas com 🟢/🟡
-- no catálogo) + o backfill de granulares derivado de bundles já
-- concedidos (🆕, ver regra de seed no cabeçalho desta migration).
-- permissions.view/manage/audit_view vão SÓ para admin (ver revisão
-- pós-checkpoint). selfservice.credential_scan removida de todos os 4 papéis.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  -- ===== admin =====
  ('admin', 'dashboard.view'), ('admin', 'fairs.view'), ('admin', 'fairs.manage'),
  ('admin', 'leads.view_all'), ('admin', 'leads.capture'), ('admin', 'leads.manage_all'),
  ('admin', 'settings.manage'), ('admin', 'users.manage'), ('admin', 'reports.export'),
  ('admin', 'profile.view'), ('admin', 'gifts.manage'),
  ('admin', 'fairs.create'), ('admin', 'fairs.edit'), ('admin', 'fairs.delete'),
  ('admin', 'fairs.finish'), ('admin', 'fairs.team_manage'), ('admin', 'fairs.view_all_teams'),
  ('admin', 'satisfaction.view'), ('admin', 'satisfaction.manage'), ('admin', 'satisfaction.responses_view'),
  ('admin', 'leads.edit'), ('admin', 'leads.delete'),
  ('admin', 'selfservice.view'),
  ('admin', 'gifts.view'), ('admin', 'gifts.create'), ('admin', 'gifts.edit'), ('admin', 'gifts.delete'),
  ('admin', 'gifts.stock_adjust'), ('admin', 'gifts.cancel_delivery'), ('admin', 'gifts.deliver'),
  ('admin', 'users.view'), ('admin', 'users.create'), ('admin', 'users.edit'),
  ('admin', 'users.disable'), ('admin', 'users.reset_password'),
  ('admin', 'settings.edit'),
  ('admin', 'profile.edit_own'), ('admin', 'profile.change_password_own'),
  ('admin', 'permissions.view'), ('admin', 'permissions.manage'), ('admin', 'permissions.audit_view'),

  -- ===== marketing =====
  ('marketing', 'dashboard.view'), ('marketing', 'fairs.view'), ('marketing', 'fairs.manage'),
  ('marketing', 'leads.view_all'), ('marketing', 'leads.capture'), ('marketing', 'leads.manage_all'),
  ('marketing', 'reports.export'), ('marketing', 'profile.view'), ('marketing', 'gifts.manage'),
  ('marketing', 'fairs.create'), ('marketing', 'fairs.edit'), ('marketing', 'fairs.delete'),
  ('marketing', 'fairs.finish'), ('marketing', 'fairs.team_manage'), ('marketing', 'fairs.view_all_teams'),
  ('marketing', 'satisfaction.view'), ('marketing', 'satisfaction.manage'), ('marketing', 'satisfaction.responses_view'),
  ('marketing', 'leads.edit'), ('marketing', 'leads.delete'),
  ('marketing', 'selfservice.view'),
  ('marketing', 'gifts.view'), ('marketing', 'gifts.create'), ('marketing', 'gifts.edit'), ('marketing', 'gifts.delete'),
  ('marketing', 'gifts.stock_adjust'), ('marketing', 'gifts.cancel_delivery'), ('marketing', 'gifts.deliver'),
  ('marketing', 'profile.edit_own'), ('marketing', 'profile.change_password_own'),

  -- ===== gestor =====
  ('gestor', 'dashboard.view_team'), ('gestor', 'fairs.view'), ('gestor', 'leads.view_team'),
  ('gestor', 'leads.capture'), ('gestor', 'leads.manage_team'), ('gestor', 'reports.export_team'),
  ('gestor', 'profile.view'), ('gestor', 'gifts.manage'),
  ('gestor', 'fairs.view_all_teams'),
  ('gestor', 'satisfaction.view'), ('gestor', 'satisfaction.manage'), ('gestor', 'satisfaction.responses_view'),
  ('gestor', 'leads.edit'), ('gestor', 'leads.delete'),
  ('gestor', 'selfservice.view'),
  ('gestor', 'gifts.view'), ('gestor', 'gifts.create'), ('gestor', 'gifts.edit'), ('gestor', 'gifts.delete'),
  ('gestor', 'gifts.stock_adjust'), ('gestor', 'gifts.cancel_delivery'), ('gestor', 'gifts.deliver'),
  ('gestor', 'profile.edit_own'), ('gestor', 'profile.change_password_own'),

  -- ===== vendedor =====
  ('vendedor', 'leads.capture'), ('vendedor', 'leads.view_own'), ('vendedor', 'leads.manage_own'),
  ('vendedor', 'profile.view'), ('vendedor', 'gifts.deliver'),
  ('vendedor', 'leads.edit'), ('vendedor', 'leads.delete'),
  ('vendedor', 'selfservice.view'),
  ('vendedor', 'profile.edit_own'), ('vendedor', 'profile.change_password_own')
) AS seed(role_code, permission_code)
JOIN public.roles r ON r.code = seed.role_code
JOIN public.permissions p ON p.code = seed.permission_code
ON CONFLICT (role_id, permission_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
