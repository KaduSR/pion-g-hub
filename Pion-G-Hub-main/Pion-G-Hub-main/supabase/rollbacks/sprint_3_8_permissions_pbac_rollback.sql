-- ============================================================
-- ROLLBACK — Sprint 3.8 (reverte 20260717090000_sprint_3_8_permissions_pbac.sql)
-- ============================================================
-- Seguro a qualquer momento: nenhum código do frontend ou outra RPC lê as
-- tabelas abaixo (usePermissions() continua 100% baseado no mapa estático
-- em src/modules/permissions/constants/permissions.js até a Etapa 5).
-- Reverter isto não quebra nada em produção, em nenhuma etapa até a
-- Etapa 5 estar implementada e aplicada.
--
-- Ordem: filhas antes de pais (role_permissions/user_permissions/
-- permission_change_log referenciam roles/permissions/user_profiles via FK).
-- DROP TABLE já remove policies, índices e o trigger trg_protect_system_roles
-- (associado à tabela roles) junto — não é preciso DROP POLICY/DROP INDEX/
-- DROP TRIGGER em separado.
--
-- Duas funções FORAM criadas nesta sprint (revisão pós-checkpoint):
-- is_permissions_admin() e protect_system_roles() (função de trigger).
-- Diferente do trigger em si, funções são objetos independentes — não somem
-- sozinhas quando a tabela roles é dropada, por isso o DROP FUNCTION
-- explícito abaixo. is_gifts_manager() NÃO foi tocada nesta sprint (nunca
-- foi usada aqui após a revisão) e não é removida.
-- ============================================================

DROP TABLE IF EXISTS public.permission_change_log;
DROP TABLE IF EXISTS public.user_permissions;
DROP TABLE IF EXISTS public.role_permissions;
DROP TABLE IF EXISTS public.roles;
DROP TABLE IF EXISTS public.permissions;

DROP FUNCTION IF EXISTS public.protect_system_roles();
DROP FUNCTION IF EXISTS public.is_permissions_admin();

NOTIFY pgrst, 'reload schema';
