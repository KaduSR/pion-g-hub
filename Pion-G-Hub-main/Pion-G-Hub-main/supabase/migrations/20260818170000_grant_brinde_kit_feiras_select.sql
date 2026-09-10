-- ============================================================
-- MIGRATION CORRETIVA: GRANT SELECT em brinde_kit_feiras
-- ============================================================
-- A migration 20260818160000_gifts_kit_feira_association.sql habilitou RLS
-- e criou a policy de leitura, mas nunca concedeu o privilégio de tabela
-- SELECT a authenticated. RLS decide QUAIS LINHAS um role vê — mas o role
-- precisa primeiro ter o privilégio SQL de tabela para sequer tentar a
-- query; RLS não substitui GRANT. Sem isso, todo SELECT de authenticated
-- contra brinde_kit_feiras falhava com "permission denied for table
-- brinde_kit_feiras" antes mesmo da policy ser avaliada — causa confirmada
-- (via has_table_privilege + relacl, read-only) do erro "Erro ao carregar
-- kits desta feira" observado em QA HML.
--
-- A RPC set_brinde_kits_feira (escrita) nunca foi afetada por isso: roda
-- SECURITY DEFINER, com o privilégio do dono da função, não do
-- authenticated que chama.
--
-- Mesmo padrão já usado em permission_change_log/role_permissions/
-- user_permissions (20260722100000_permissions_admin_write_rpcs.sql):
-- tabela com escrita exclusiva por RPC SECURITY DEFINER, REVOKE ALL
-- explícito (fecha qualquer privilégio solto de default) + GRANT SELECT
-- explícito só para quem precisa ler.
-- ============================================================

REVOKE ALL ON public.brinde_kit_feiras FROM anon, authenticated;

GRANT SELECT ON public.brinde_kit_feiras TO authenticated;
-- anon não recebe nada de volta — a policy de leitura já não inclui anon
-- (USING is_gifts_manager() OR is_gifts_deliverer(), ambas exigem perfil
-- autenticado ativo), isso só fecha o privilégio bruto que sobrava solto.

NOTIFY pgrst, 'reload schema';
