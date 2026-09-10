-- ============================================================
-- CHECKS READ-ONLY — reconciliação de histórico de migrations (HML)
-- ============================================================
-- Somente SELECT / funções de introspecção (to_regclass, to_regprocedure,
-- has_function_privilege, has_table_privilege) e catálogos do Postgres
-- (pg_class, pg_namespace, pg_attribute, pg_constraint, pg_indexes,
-- pg_proc, pg_trigger, pg_policies, information_schema) + contagens nas
-- tabelas de catálogo PBAC (permissions/roles/role_permissions — só
-- código/quantidade, nunca dado de usuário). NENHUM INSERT/UPDATE/DELETE/DDL.
--
-- Referência: docs/deployments/2026-08-06-hml-migration-history-reconciliation-audit.md
-- Escopo: as 11 migrations anteriores à Fatia C (20260806120000 NÃO entra
-- aqui — deve permanecer pendente).
-- ============================================================

SELECT mig, objeto, resultado FROM (

  -- ── 01 — 20260716120000_sprint_3_7_brindes_feira ──────────────────────
  SELECT '01' AS mig, 'function is_gifts_deliverer()' AS objeto,
    (to_regprocedure('public.is_gifts_deliverer()') IS NOT NULL)::text AS resultado
  UNION ALL SELECT '01', 'anon EXECUTE is_gifts_deliverer (esperado: true)',
    has_function_privilege('anon', 'public.is_gifts_deliverer()', 'EXECUTE')::text
  UNION ALL SELECT '01', 'policy: Leitura nomes brindes (user_profiles)',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profiles' AND policyname='Leitura nomes brindes')::text
  UNION ALL SELECT '01', 'policy: Leitura entrega brindes (brindes)',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='brindes' AND policyname='Leitura entrega brindes')::text
  UNION ALL SELECT '01', 'policy: Leitura entrega brinde_kits',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='brinde_kits' AND policyname='Leitura entrega brinde_kits')::text
  UNION ALL SELECT '01', 'policy: Leitura entrega brinde_kit_itens',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='brinde_kit_itens' AND policyname='Leitura entrega brinde_kit_itens')::text
  UNION ALL SELECT '01', 'column brinde_entregas.origem',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='brinde_entregas' AND column_name='origem')::text
  UNION ALL SELECT '01', 'constraint chk_brinde_entregas_item',
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_brinde_entregas_item' AND conrelid='public.brinde_entregas'::regclass)::text
  UNION ALL SELECT '01', 'index uq_brinde_entrega_kit_lead_feira_ativo',
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uq_brinde_entrega_kit_lead_feira_ativo')::text
  UNION ALL SELECT '01', 'table brinde_feira_estoque',
    (to_regclass('public.brinde_feira_estoque') IS NOT NULL)::text
  UNION ALL SELECT '01', 'constraint uq_brinde_feira_estoque_feira_brinde',
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_brinde_feira_estoque_feira_brinde')::text
  UNION ALL SELECT '01', 'index idx_brinde_feira_estoque_feira',
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_brinde_feira_estoque_feira')::text
  UNION ALL SELECT '01', 'index idx_brinde_feira_estoque_brinde',
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_brinde_feira_estoque_brinde')::text
  UNION ALL SELECT '01', 'rls enabled: brinde_feira_estoque',
    COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.brinde_feira_estoque')), false)::text
  UNION ALL SELECT '01', 'policy: Gestao brinde_feira_estoque',
    EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brinde_feira_estoque' AND policyname='Gestao brinde_feira_estoque')::text
  UNION ALL SELECT '01', 'policy: Leitura entrega brinde_feira_estoque',
    EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brinde_feira_estoque' AND policyname='Leitura entrega brinde_feira_estoque')::text
  UNION ALL SELECT '01', 'table brinde_entrega_itens',
    (to_regclass('public.brinde_entrega_itens') IS NOT NULL)::text
  UNION ALL SELECT '01', 'constraint uq_brinde_entrega_itens_entrega_brinde',
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_brinde_entrega_itens_entrega_brinde')::text
  UNION ALL SELECT '01', 'index idx_brinde_entrega_itens_entrega',
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_brinde_entrega_itens_entrega')::text
  UNION ALL SELECT '01', 'index idx_brinde_entrega_itens_brinde',
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_brinde_entrega_itens_brinde')::text
  UNION ALL SELECT '01', 'rls enabled: brinde_entrega_itens',
    COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.brinde_entrega_itens')), false)::text
  UNION ALL SELECT '01', 'policy: Gestao brinde_entrega_itens',
    EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brinde_entrega_itens' AND policyname='Gestao brinde_entrega_itens')::text
  UNION ALL SELECT '01', 'function registrar_carga_feira(uuid,uuid,integer,text,uuid)',
    (to_regprocedure('public.registrar_carga_feira(uuid,uuid,integer,text,uuid)') IS NOT NULL)::text
  UNION ALL SELECT '01', 'anon EXECUTE registrar_carga_feira (esperado: false)',
    has_function_privilege('anon', 'public.registrar_carga_feira(uuid,uuid,integer,text,uuid)', 'EXECUTE')::text
  UNION ALL SELECT '01', 'authenticated EXECUTE registrar_carga_feira (esperado: true)',
    has_function_privilege('authenticated', 'public.registrar_carga_feira(uuid,uuid,integer,text,uuid)', 'EXECUTE')::text
  UNION ALL SELECT '01', 'function registrar_entrega_brinde_feira 7-arg (esperado: ausente, dropada na migration 02)',
    (to_regprocedure('public.registrar_entrega_brinde_feira(uuid,uuid,text,uuid,jsonb,text,text)') IS NOT NULL)::text

  -- ── 02 — 20260716120100_autoatendimento_destinatarios ─────────────────
  UNION ALL SELECT '02', 'column brinde_entregas.tipo_destinatario',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='brinde_entregas' AND column_name='tipo_destinatario')::text
  UNION ALL SELECT '02', 'constraint brinde_entregas_tipo_destinatario_check',
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname='brinde_entregas_tipo_destinatario_check')::text
  UNION ALL SELECT '02', 'constraint chk_brinde_entregas_destinatario',
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_brinde_entregas_destinatario')::text
  UNION ALL SELECT '02', 'index idx_brinde_entregas_tipo_destinatario',
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_brinde_entregas_tipo_destinatario')::text
  UNION ALL SELECT '02', 'extension unaccent',
    EXISTS (SELECT 1 FROM pg_extension WHERE extname='unaccent')::text
  UNION ALL SELECT '02', 'function normalize_dedup_text(text)',
    (to_regprocedure('public.normalize_dedup_text(text)') IS NOT NULL)::text
  UNION ALL SELECT '02', 'function registrar_entrega_brinde_feira 12-arg (versão vigente)',
    (to_regprocedure('public.registrar_entrega_brinde_feira(uuid,uuid,text,uuid,jsonb,text,text,text,text,text,text,boolean)') IS NOT NULL)::text
  UNION ALL SELECT '02', 'anon EXECUTE registrar_entrega_brinde_feira 12-arg (esperado: false)',
    has_function_privilege('anon', 'public.registrar_entrega_brinde_feira(uuid,uuid,text,uuid,jsonb,text,text,text,text,text,text,boolean)', 'EXECUTE')::text
  UNION ALL SELECT '02', 'authenticated EXECUTE registrar_entrega_brinde_feira 12-arg (esperado: true)',
    has_function_privilege('authenticated', 'public.registrar_entrega_brinde_feira(uuid,uuid,text,uuid,jsonb,text,text,text,text,text,text,boolean)', 'EXECUTE')::text

  -- ── 03 — 20260717090000_sprint_3_8_permissions_pbac ───────────────────
  UNION ALL SELECT '03', 'table permissions', (to_regclass('public.permissions') IS NOT NULL)::text
  UNION ALL SELECT '03', 'table roles', (to_regclass('public.roles') IS NOT NULL)::text
  UNION ALL SELECT '03', 'table role_permissions', (to_regclass('public.role_permissions') IS NOT NULL)::text
  UNION ALL SELECT '03', 'table user_permissions', (to_regclass('public.user_permissions') IS NOT NULL)::text
  UNION ALL SELECT '03', 'table permission_change_log', (to_regclass('public.permission_change_log') IS NOT NULL)::text
  UNION ALL SELECT '03', 'index idx_permissions_resource', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_permissions_resource')::text
  UNION ALL SELECT '03', 'index idx_role_permissions_permission', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_role_permissions_permission')::text
  UNION ALL SELECT '03', 'index idx_user_permissions_profile', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_user_permissions_profile')::text
  UNION ALL SELECT '03', 'index idx_permission_change_log_target', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_permission_change_log_target')::text
  UNION ALL SELECT '03', 'function is_permissions_admin()', (to_regprocedure('public.is_permissions_admin()') IS NOT NULL)::text
  UNION ALL SELECT '03', 'function protect_system_roles()', (to_regprocedure('public.protect_system_roles()') IS NOT NULL)::text
  UNION ALL SELECT '03', 'trigger trg_protect_system_roles on roles',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_protect_system_roles' AND tgrelid='public.roles'::regclass)::text
  UNION ALL SELECT '03', 'policy: Leitura permissions', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permissions' AND policyname='Leitura permissions')::text
  UNION ALL SELECT '03', 'policy: Leitura roles', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='roles' AND policyname='Leitura roles')::text
  UNION ALL SELECT '03', 'policy: Gestao roles', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='roles' AND policyname='Gestao roles')::text
  UNION ALL SELECT '03', 'policy: Leitura role_permissions', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='role_permissions' AND policyname='Leitura role_permissions')::text
  UNION ALL SELECT '03', 'policy: Gestao role_permissions (esperado: ausente, dropada na migration 06)',
    EXISTS (SELECT 1 FROM pg_policies WHERE tablename='role_permissions' AND policyname='Gestao role_permissions')::text
  UNION ALL SELECT '03', 'policy: Leitura permission_change_log', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permission_change_log' AND policyname='Leitura permission_change_log')::text
  UNION ALL SELECT '03', 'seed roles = 4', (SELECT count(*)::text FROM public.roles WHERE code IN ('admin','marketing','gestor','vendedor'))
  UNION ALL SELECT '03', 'seed permissions (resource<>tickets) = 47', (SELECT count(*)::text FROM public.permissions WHERE resource <> 'tickets')
  UNION ALL SELECT '03', 'seed role_permissions admin (non-tickets) = 41',
    (SELECT count(*)::text FROM public.role_permissions rp JOIN public.roles r ON r.id=rp.role_id JOIN public.permissions p ON p.id=rp.permission_id WHERE r.code='admin' AND p.resource<>'tickets')
  UNION ALL SELECT '03', 'seed role_permissions marketing (non-tickets) = 30',
    (SELECT count(*)::text FROM public.role_permissions rp JOIN public.roles r ON r.id=rp.role_id JOIN public.permissions p ON p.id=rp.permission_id WHERE r.code='marketing' AND p.resource<>'tickets')
  UNION ALL SELECT '03', 'seed role_permissions gestor (non-tickets) = 24',
    (SELECT count(*)::text FROM public.role_permissions rp JOIN public.roles r ON r.id=rp.role_id JOIN public.permissions p ON p.id=rp.permission_id WHERE r.code='gestor' AND p.resource<>'tickets')
  UNION ALL SELECT '03', 'seed role_permissions vendedor (non-tickets) = 10',
    (SELECT count(*)::text FROM public.role_permissions rp JOIN public.roles r ON r.id=rp.role_id JOIN public.permissions p ON p.id=rp.permission_id WHERE r.code='vendedor' AND p.resource<>'tickets')

  -- ── 04 — 20260717100000_hardening_revoke_anon ─────────────────────────
  UNION ALL SELECT '04', 'anon EXECUTE registrar_carga_feira (esperado: false)',
    has_function_privilege('anon', 'public.registrar_carga_feira(uuid,uuid,integer,text,uuid)', 'EXECUTE')::text
  UNION ALL SELECT '04', 'authenticated EXECUTE registrar_carga_feira (esperado: true)',
    has_function_privilege('authenticated', 'public.registrar_carga_feira(uuid,uuid,integer,text,uuid)', 'EXECUTE')::text
  UNION ALL SELECT '04', 'anon EXECUTE registrar_entrega_brinde_feira 12-arg (esperado: false)',
    has_function_privilege('anon', 'public.registrar_entrega_brinde_feira(uuid,uuid,text,uuid,jsonb,text,text,text,text,text,text,boolean)', 'EXECUTE')::text
  UNION ALL SELECT '04', 'authenticated EXECUTE registrar_entrega_brinde_feira 12-arg (esperado: true)',
    has_function_privilege('authenticated', 'public.registrar_entrega_brinde_feira(uuid,uuid,text,uuid,jsonb,text,text,text,text,text,text,boolean)', 'EXECUTE')::text

  -- ── 05 — 20260721120000_hardening_leads_feira_rls ─────────────────────
  UNION ALL SELECT '05', 'function has_effective_permission(text)', (to_regprocedure('public.has_effective_permission(text)') IS NOT NULL)::text
  UNION ALL SELECT '05', 'function is_own_or_team_lead(uuid)', (to_regprocedure('public.is_own_or_team_lead(uuid)') IS NOT NULL)::text
  UNION ALL SELECT '05', 'policy: Acesso total leads_feira (esperado: ausente, dropada nesta migration)',
    EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads_feira' AND policyname='Acesso total leads_feira')::text
  UNION ALL SELECT '05', 'policy: Leitura leads_feira', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads_feira' AND policyname='Leitura leads_feira')::text
  UNION ALL SELECT '05', 'policy: Insercao leads_feira', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads_feira' AND policyname='Insercao leads_feira')::text
  UNION ALL SELECT '05', 'policy: Atualizacao leads_feira', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads_feira' AND policyname='Atualizacao leads_feira')::text
  UNION ALL SELECT '05', 'policy: Exclusao leads_feira', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads_feira' AND policyname='Exclusao leads_feira')::text
  UNION ALL SELECT '05', 'policy Leitura leads_feira usa has_effective_permission',
    (SELECT qual LIKE '%has_effective_permission%' FROM pg_policies WHERE tablename='leads_feira' AND policyname='Leitura leads_feira')::text
  UNION ALL SELECT '05', 'anon SELECT leads_feira (esperado: false)', has_table_privilege('anon', 'public.leads_feira', 'SELECT')::text
  UNION ALL SELECT '05', 'index idx_user_profiles_gestor_id', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_user_profiles_gestor_id')::text

  -- ── 06 — 20260722100000_permissions_admin_write_rpcs ──────────────────
  UNION ALL SELECT '06', 'constraint permission_change_log_action_check aceita inherit',
    (SELECT pg_get_constraintdef(oid) LIKE '%inherit%' FROM pg_constraint WHERE conname='permission_change_log_action_check')::text
  UNION ALL SELECT '06', 'function count_active_users_with_permissions(text[])',
    (to_regprocedure('public.count_active_users_with_permissions(text[])') IS NOT NULL)::text
  UNION ALL SELECT '06', 'authenticated EXECUTE count_active_users_with_permissions (esperado: false, só uso interno)',
    has_function_privilege('authenticated', 'public.count_active_users_with_permissions(text[])', 'EXECUTE')::text
  UNION ALL SELECT '06', 'function set_role_permission(text,text,boolean)', (to_regprocedure('public.set_role_permission(text,text,boolean)') IS NOT NULL)::text
  UNION ALL SELECT '06', 'function set_user_permission_grant(uuid,text)', (to_regprocedure('public.set_user_permission_grant(uuid,text)') IS NOT NULL)::text
  UNION ALL SELECT '06', 'function set_user_permission_revoke(uuid,text)', (to_regprocedure('public.set_user_permission_revoke(uuid,text)') IS NOT NULL)::text
  UNION ALL SELECT '06', 'function clear_user_permission_override(uuid,text)', (to_regprocedure('public.clear_user_permission_override(uuid,text)') IS NOT NULL)::text
  UNION ALL SELECT '06', 'policy: Leitura user_permissions (substitui Leitura propria)', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_permissions' AND policyname='Leitura user_permissions')::text
  UNION ALL SELECT '06', 'policy: Leitura propria user_permissions (esperado: ausente, substituída nesta migration)',
    EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_permissions' AND policyname='Leitura propria user_permissions')::text
  UNION ALL SELECT '06', 'policy: Gestao user_permissions (esperado: ausente, dropada nesta migration)',
    EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_permissions' AND policyname='Gestao user_permissions')::text
  UNION ALL SELECT '06', 'policy: Leitura permission_change_log via audit_view', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permission_change_log' AND policyname='Leitura permission_change_log via audit_view')::text
  UNION ALL SELECT '06', 'anon SELECT role_permissions (esperado: false)', has_table_privilege('anon', 'public.role_permissions', 'SELECT')::text
  UNION ALL SELECT '06', 'authenticated SELECT role_permissions (esperado: true)', has_table_privilege('authenticated', 'public.role_permissions', 'SELECT')::text
  UNION ALL SELECT '06', 'authenticated SELECT user_permissions (esperado: true)', has_table_privilege('authenticated', 'public.user_permissions', 'SELECT')::text
  UNION ALL SELECT '06', 'authenticated SELECT permission_change_log (esperado: true)', has_table_privilege('authenticated', 'public.permission_change_log', 'SELECT')::text
  UNION ALL SELECT '06', 'trigger trg_protect_sensitive_profile_fields on user_profiles',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_protect_sensitive_profile_fields' AND tgrelid='public.user_profiles'::regclass)::text
  UNION ALL SELECT '06', 'function lockout_guard_user_profiles_update()', (to_regprocedure('public.lockout_guard_user_profiles_update()') IS NOT NULL)::text
  UNION ALL SELECT '06', 'trigger trg_lockout_guard_user_profiles_update',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_lockout_guard_user_profiles_update' AND tgrelid='public.user_profiles'::regclass)::text
  UNION ALL SELECT '06', 'function lockout_guard_user_profiles_delete()', (to_regprocedure('public.lockout_guard_user_profiles_delete()') IS NOT NULL)::text
  UNION ALL SELECT '06', 'trigger trg_lockout_guard_user_profiles_delete',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_lockout_guard_user_profiles_delete' AND tgrelid='public.user_profiles'::regclass)::text
  UNION ALL SELECT '06', 'authenticated DELETE user_profiles (esperado: false)', has_table_privilege('authenticated', 'public.user_profiles', 'DELETE')::text
  UNION ALL SELECT '06', 'anon DELETE user_profiles (esperado: false)', has_table_privilege('anon', 'public.user_profiles', 'DELETE')::text

  -- ── 07 — 20260722150000_sprint_4_1_chamados_ti_fundacao (+ mirror 8-11) ──
  UNION ALL SELECT '07', 'column user_profiles.tipo_vinculo', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_profiles' AND column_name='tipo_vinculo')::text
  UNION ALL SELECT '07', 'protect_sensitive_profile_fields() body inclui tipo_vinculo (versão final)',
    (pg_get_functiondef('public.protect_sensitive_profile_fields()'::regprocedure) LIKE '%tipo_vinculo%')::text
  UNION ALL SELECT '07', 'table ti_equipes', (to_regclass('public.ti_equipes') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_categorias', (to_regclass('public.ti_categorias') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_equipe_membros', (to_regclass('public.ti_equipe_membros') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_sla_regras', (to_regclass('public.ti_sla_regras') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_chamados', (to_regclass('public.ti_chamados') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_chamado_tempos', (to_regclass('public.ti_chamado_tempos') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_chamado_historico', (to_regclass('public.ti_chamado_historico') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_chamado_comentarios', (to_regclass('public.ti_chamado_comentarios') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_chamado_anexos', (to_regclass('public.ti_chamado_anexos') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_kb_artigos', (to_regclass('public.ti_kb_artigos') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_chamado_kb_artigos', (to_regclass('public.ti_chamado_kb_artigos') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_notificacoes', (to_regclass('public.ti_notificacoes') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_preferencias_notificacao', (to_regclass('public.ti_preferencias_notificacao') IS NOT NULL)::text
  UNION ALL SELECT '07', 'table ti_notificacoes_envios', (to_regclass('public.ti_notificacoes_envios') IS NOT NULL)::text
  UNION ALL SELECT '07', 'sequence ti_chamados_numero_seq', (to_regclass('public.ti_chamados_numero_seq') IS NOT NULL)::text
  UNION ALL SELECT '07', 'index idx_ti_categorias_equipe_padrao', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_categorias_equipe_padrao')::text
  UNION ALL SELECT '07', 'index idx_ti_equipe_membros_profile', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_equipe_membros_profile')::text
  UNION ALL SELECT '07', 'index idx_ti_chamados_solicitante', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamados_solicitante')::text
  UNION ALL SELECT '07', 'index idx_ti_chamados_responsavel', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamados_responsavel')::text
  UNION ALL SELECT '07', 'index idx_ti_chamados_equipe', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamados_equipe')::text
  UNION ALL SELECT '07', 'index idx_ti_chamados_status', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamados_status')::text
  UNION ALL SELECT '07', 'index idx_ti_chamados_relacionado', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamados_relacionado')::text
  UNION ALL SELECT '07', 'index unique idx_ti_chamados_codigo_chamado', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamados_codigo_chamado')::text
  UNION ALL SELECT '07', 'index idx_ti_chamado_tempos_chamado', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamado_tempos_chamado')::text
  UNION ALL SELECT '07', 'index idx_ti_chamado_tempos_agente', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamado_tempos_agente')::text
  UNION ALL SELECT '07', 'index unique uq_ti_chamado_tempos_automatico_aberto', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='uq_ti_chamado_tempos_automatico_aberto')::text
  UNION ALL SELECT '07', 'index idx_ti_chamado_historico_chamado', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamado_historico_chamado')::text
  UNION ALL SELECT '07', 'index idx_ti_chamado_historico_tempo', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamado_historico_tempo')::text
  UNION ALL SELECT '07', 'index idx_ti_chamado_comentarios_chamado', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamado_comentarios_chamado')::text
  UNION ALL SELECT '07', 'index idx_ti_chamado_anexos_chamado', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamado_anexos_chamado')::text
  UNION ALL SELECT '07', 'index idx_ti_chamado_anexos_comentario', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamado_anexos_comentario')::text
  UNION ALL SELECT '07', 'index idx_ti_kb_artigos_categoria', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_kb_artigos_categoria')::text
  UNION ALL SELECT '07', 'index idx_ti_kb_artigos_status', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_kb_artigos_status')::text
  UNION ALL SELECT '07', 'index gin idx_ti_kb_artigos_busca', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_kb_artigos_busca')::text
  UNION ALL SELECT '07', 'index idx_ti_chamado_kb_artigos_artigo', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_chamado_kb_artigos_artigo')::text
  UNION ALL SELECT '07', 'index idx_ti_notificacoes_chamado', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_notificacoes_chamado')::text
  UNION ALL SELECT '07', 'index idx_ti_notificacoes_nao_lidas', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_notificacoes_nao_lidas')::text
  UNION ALL SELECT '07', 'index unique uq_ti_preferencias_geral', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='uq_ti_preferencias_geral')::text
  UNION ALL SELECT '07', 'index unique uq_ti_preferencias_especifica', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='uq_ti_preferencias_especifica')::text
  UNION ALL SELECT '07', 'index idx_ti_notificacoes_envios_pendentes', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ti_notificacoes_envios_pendentes')::text
  UNION ALL SELECT '07', 'function ti_perfil_ativo_id()', (to_regprocedure('public.ti_perfil_ativo_id()') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_is_own_equipe(uuid)', (to_regprocedure('public.ti_is_own_equipe(uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_e_solicitante(uuid)', (to_regprocedure('public.ti_e_solicitante(uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_pode_ver_chamado(uuid)', (to_regprocedure('public.ti_pode_ver_chamado(uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_pode_ver_interno_chamado(uuid)', (to_regprocedure('public.ti_pode_ver_interno_chamado(uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'schema private', EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='private')::text
  UNION ALL SELECT '07', 'authenticated USAGE schema private (esperado: true)', has_schema_privilege('authenticated', 'private', 'USAGE')::text
  UNION ALL SELECT '07', 'function private.ti_comentario_interno_raw(uuid,uuid)', (to_regprocedure('private.ti_comentario_interno_raw(uuid,uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_profiles_in_equipe(uuid)', (to_regprocedure('public.ti_profiles_in_equipe(uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_profiles_with_permission(text)', (to_regprocedure('public.ti_profiles_with_permission(text)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_calcular_prazo_sla(text,timestamptz)', (to_regprocedure('public.ti_calcular_prazo_sla(text,timestamptz)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'rls enabled: ti_chamados', COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.ti_chamados')), false)::text
  UNION ALL SELECT '07', 'policy: Leitura ti_chamados', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_chamados' AND policyname='Leitura ti_chamados')::text
  UNION ALL SELECT '07', 'policy: Leitura ti_equipes', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_equipes' AND policyname='Leitura ti_equipes')::text
  UNION ALL SELECT '07', 'policy: Leitura ti_categorias', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_categorias' AND policyname='Leitura ti_categorias')::text
  UNION ALL SELECT '07', 'policy: Leitura propria ti_equipe_membros', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_equipe_membros' AND policyname='Leitura propria ti_equipe_membros')::text
  UNION ALL SELECT '07', 'policy: Leitura ti_sla_regras', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_sla_regras' AND policyname='Leitura ti_sla_regras')::text
  UNION ALL SELECT '07', 'policy: Leitura ti_chamado_tempos', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_chamado_tempos' AND policyname='Leitura ti_chamado_tempos')::text
  UNION ALL SELECT '07', 'policy: Leitura ti_chamado_historico', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_chamado_historico' AND policyname='Leitura ti_chamado_historico')::text
  UNION ALL SELECT '07', 'policy: Leitura ti_chamado_comentarios', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_chamado_comentarios' AND policyname='Leitura ti_chamado_comentarios')::text
  UNION ALL SELECT '07', 'policy: Leitura ti_chamado_anexos', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_chamado_anexos' AND policyname='Leitura ti_chamado_anexos')::text
  UNION ALL SELECT '07', 'policy: Leitura ti_kb_artigos', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_kb_artigos' AND policyname='Leitura ti_kb_artigos')::text
  UNION ALL SELECT '07', 'policy: Leitura ti_chamado_kb_artigos', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_chamado_kb_artigos' AND policyname='Leitura ti_chamado_kb_artigos')::text
  UNION ALL SELECT '07', 'policy: Leitura propria ti_notificacoes', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_notificacoes' AND policyname='Leitura propria ti_notificacoes')::text
  UNION ALL SELECT '07', 'policy: Gestao propria ti_preferencias_notificacao', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_preferencias_notificacao' AND policyname='Gestao propria ti_preferencias_notificacao')::text
  UNION ALL SELECT '07', 'policy: Leitura ti_notificacoes_envios via settings', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ti_notificacoes_envios' AND policyname='Leitura ti_notificacoes_envios via settings')::text
  UNION ALL SELECT '07', 'function ti_criar_chamado(text,text,uuid,text,uuid)', (to_regprocedure('public.ti_criar_chamado(text,text,uuid,text,uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'ti_criar_chamado body usa alias destinatarios(profile_id) (fix migration 08)',
    (pg_get_functiondef('public.ti_criar_chamado(text,text,uuid,text,uuid)'::regprocedure) LIKE '%destinatarios(profile_id)%')::text
  UNION ALL SELECT '07', 'function ti_triagem_chamado(uuid,uuid,text,uuid)', (to_regprocedure('public.ti_triagem_chamado(uuid,uuid,text,uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'ti_triagem_chamado body usa v_prazo_resolucao escalar (fix migration 10, não RECORD)',
    (pg_get_functiondef('public.ti_triagem_chamado(uuid,uuid,text,uuid)'::regprocedure) LIKE '%v_prazo_resolucao TIMESTAMPTZ%')::text
  UNION ALL SELECT '07', 'function ti_atribuir_chamado(uuid,uuid)', (to_regprocedure('public.ti_atribuir_chamado(uuid,uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'ti_atribuir_chamado body bloqueia reatribuicao (fix migration 09)',
    (pg_get_functiondef('public.ti_atribuir_chamado(uuid,uuid)'::regprocedure) LIKE '%reatribuição não é permitida%')::text
  UNION ALL SELECT '07', 'function ti_mudar_status(uuid,text)', (to_regprocedure('public.ti_mudar_status(uuid,text)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'ti_mudar_status body inclui atribuido->em_atendimento (fix migration 11)',
    (pg_get_functiondef('public.ti_mudar_status(uuid,text)'::regprocedure) LIKE '%WHEN ''atribuido''              THEN ARRAY[''em_atendimento''%')::text
  UNION ALL SELECT '07', 'function ti_iniciar_tempo(uuid)', (to_regprocedure('public.ti_iniciar_tempo(uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_encerrar_tempo(uuid)', (to_regprocedure('public.ti_encerrar_tempo(uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_lancar_tempo_manual(uuid,uuid,integer,text)', (to_regprocedure('public.ti_lancar_tempo_manual(uuid,uuid,integer,text)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_comentar_chamado(uuid,text,boolean)', (to_regprocedure('public.ti_comentar_chamado(uuid,text,boolean)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_marcar_notificacao_lida(uuid)', (to_regprocedure('public.ti_marcar_notificacao_lida(uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_listar_membros_equipe(uuid)', (to_regprocedure('public.ti_listar_membros_equipe(uuid)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'function ti_fila_atendimento(9 args)', (to_regprocedure('public.ti_fila_atendimento(uuid,text,text,uuid,uuid,boolean,text,integer,integer)') IS NOT NULL)::text
  UNION ALL SELECT '07', 'seed ti_equipes = 2', (SELECT count(*)::text FROM public.ti_equipes WHERE codigo IN ('infraestrutura','sistemas'))
  UNION ALL SELECT '07', 'seed ti_categorias = 8', (SELECT count(*)::text FROM public.ti_categorias)
  UNION ALL SELECT '07', 'seed ti_sla_regras = 4', (SELECT count(*)::text FROM public.ti_sla_regras)
  UNION ALL SELECT '07', 'seed permissions resource=tickets = 19', (SELECT count(*)::text FROM public.permissions WHERE resource='tickets')
  UNION ALL SELECT '07', 'seed role_permissions tickets.* admin = 19',
    (SELECT count(*)::text FROM public.role_permissions rp JOIN public.roles r ON r.id=rp.role_id JOIN public.permissions p ON p.id=rp.permission_id WHERE r.code='admin' AND p.resource='tickets')
  UNION ALL SELECT '07', 'seed role_permissions tickets.* marketing/gestor/vendedor = 5 cada',
    (SELECT string_agg(r.code || '=' || cnt::text, ', ') FROM (
      SELECT r.code, count(*) cnt FROM public.role_permissions rp JOIN public.roles r ON r.id=rp.role_id JOIN public.permissions p ON p.id=rp.permission_id
      WHERE r.code IN ('marketing','gestor','vendedor') AND p.resource='tickets' GROUP BY r.code
    ) x(code, cnt) JOIN public.roles r ON r.code = x.code)

  -- ── 08 — 20260729120000_fix_ti_criar_chamado_notificacao_alias ────────
  UNION ALL SELECT '08', 'function ti_criar_chamado(text,text,uuid,text,uuid) (mesma assinatura, ver 07)',
    (to_regprocedure('public.ti_criar_chamado(text,text,uuid,text,uuid)') IS NOT NULL)::text
  UNION ALL SELECT '08', 'anon EXECUTE ti_criar_chamado (esperado: false)',
    has_function_privilege('anon', 'public.ti_criar_chamado(text,text,uuid,text,uuid)', 'EXECUTE')::text
  UNION ALL SELECT '08', 'authenticated EXECUTE ti_criar_chamado (esperado: true)',
    has_function_privilege('authenticated', 'public.ti_criar_chamado(text,text,uuid,text,uuid)', 'EXECUTE')::text

  -- ── 09 — 20260729143000_sprint_4_3_central_atendimento_rpcs ───────────
  UNION ALL SELECT '09', 'function ti_listar_membros_equipe(uuid) (ver 07)', (to_regprocedure('public.ti_listar_membros_equipe(uuid)') IS NOT NULL)::text
  UNION ALL SELECT '09', 'authenticated EXECUTE ti_listar_membros_equipe (esperado: true)',
    has_function_privilege('authenticated', 'public.ti_listar_membros_equipe(uuid)', 'EXECUTE')::text
  UNION ALL SELECT '09', 'function ti_fila_atendimento(9 args) (ver 07)',
    (to_regprocedure('public.ti_fila_atendimento(uuid,text,text,uuid,uuid,boolean,text,integer,integer)') IS NOT NULL)::text
  UNION ALL SELECT '09', 'authenticated EXECUTE ti_fila_atendimento (esperado: true)',
    has_function_privilege('authenticated', 'public.ti_fila_atendimento(uuid,text,text,uuid,uuid,boolean,text,integer,integer)', 'EXECUTE')::text
  UNION ALL SELECT '09', 'function ti_atribuir_chamado(uuid,uuid) (ver 07)', (to_regprocedure('public.ti_atribuir_chamado(uuid,uuid)') IS NOT NULL)::text

  -- ── 10 — 20260730110000_fix_ti_triagem_chamado_v_prazos ───────────────
  UNION ALL SELECT '10', 'function ti_triagem_chamado(uuid,uuid,text,uuid) (mesma assinatura, ver 07)',
    (to_regprocedure('public.ti_triagem_chamado(uuid,uuid,text,uuid)') IS NOT NULL)::text
  UNION ALL SELECT '10', 'authenticated EXECUTE ti_triagem_chamado (esperado: true)',
    has_function_privilege('authenticated', 'public.ti_triagem_chamado(uuid,uuid,text,uuid)', 'EXECUTE')::text

  -- ── 11 — 20260730130000_fix_ti_mudar_status_fluxo_operacional ─────────
  UNION ALL SELECT '11', 'function ti_mudar_status(uuid,text) (mesma assinatura, ver 07)',
    (to_regprocedure('public.ti_mudar_status(uuid,text)') IS NOT NULL)::text
  UNION ALL SELECT '11', 'authenticated EXECUTE ti_mudar_status (esperado: true)',
    has_function_privilege('authenticated', 'public.ti_mudar_status(uuid,text)', 'EXECUTE')::text

) x
ORDER BY mig, objeto;
