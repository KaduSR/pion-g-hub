-- ============================================================
-- MIGRATION: Hardening — restringe leitura administrativa de entregas de
-- brindes (Sprint 5.1.1, Fatia C)
-- ============================================================
-- Achado da auditoria read-only de HML feita antes da Fatia B (Sprint
-- 5.1.1): as policies "Leitura entrega brinde_entregas" e "Leitura entrega
-- brinde_entrega_itens" (criadas no Autoatendimento, Sprint 3.7) dão
-- SELECT amplo — sem filtro por feira nem por usuário — a qualquer um com
-- is_gifts_deliverer() (admin/marketing/gestor/vendedor). Na prática, isso
-- deixa o vendedor ler TODO o histórico administrativo de entregas do
-- sistema (comprovante, destinatário, quem liberou) via API direta —
-- muito além do que o Autoatendimento (Fatia B) realmente precisa.
--
-- Confirmado por leitura de código (ExistingClientGiftForm.jsx e
-- FairGiftDeliveryModal.jsx, ambos em src/modules/.../components): nenhum
-- dos dois fluxos de entrega faz SELECT direto em brinde_entregas ou
-- brinde_entrega_itens — a checagem de duplicidade e o registro em si
-- acontecem inteiramente dentro da RPC registrar_entrega_brinde_feira
-- (SECURITY DEFINER, não afetada por RLS). Ou seja, o vendedor não perde
-- nenhuma funcionalidade do Autoatendimento ao perder este SELECT — só
-- perde uma leitura administrativa que nunca era consumida pelo fluxo dele.
--
-- Esta migration NÃO recria uma policy de leitura mais estreita para
-- vendedor — remove o SELECT amplo por completo. Managers (is_gifts_
-- manager()) continuam com acesso total via a policy "Acesso total
-- brinde_entregas"/"Gestao brinde_entrega_itens" (FOR ALL), que esta
-- migration não toca.
--
-- Também fecha uma lacuna de hardening que ficou pendente na migration
-- 20260717100000 (revogou EXECUTE de anon em registrar_carga_feira e
-- registrar_entrega_brinde_feira, mas não em confirmar_entrega_brinde —
-- mesmo achado: REVOKE ALL ... FROM PUBLIC não remove um GRANT direto a
-- anon vindo de default privilege do schema public). Não era uma
-- vulnerabilidade ativa (a função checa is_gifts_manager() internamente,
-- que depende de auth.uid() — nulo pra anon de verdade), mas fecha a
-- mesma camada de defesa extra já aplicada às outras duas RPCs.
--
-- NÃO altera: tabelas/colunas, registrar_entrega_brinde_feira,
-- is_gifts_manager(), is_gifts_deliverer(), nenhuma permissão PBAC, nenhum
-- dado existente. Autorização/RLS/privilégios de função SÃO alterados
-- (é o próprio objetivo desta migration) — não classificar como
-- "sem alteração" de forma ampla.
--
-- Transacional (BEGIN/COMMIT): todas as três operações abaixo são DDL
-- (DROP POLICY / REVOKE), aplicadas atomicamente — se qualquer uma
-- falhar, nenhuma das outras persiste.
-- ============================================================

BEGIN;

-- ── brinde_entregas: remove o SELECT amplo de is_gifts_deliverer() ──────
-- Managers continuam com acesso total via "Acesso total brinde_entregas"
-- (FOR ALL), não tocada aqui.
DROP POLICY IF EXISTS "Leitura entrega brinde_entregas" ON public.brinde_entregas;

-- ── brinde_entrega_itens: mesma remoção, mesmo motivo ───────────────────
-- Managers continuam com acesso total via "Gestao brinde_entrega_itens"
-- (FOR ALL), não tocada aqui.
DROP POLICY IF EXISTS "Leitura entrega brinde_entrega_itens" ON public.brinde_entrega_itens;

-- ── confirmar_entrega_brinde: fecha a mesma lacuna de anon já corrigida
--    em registrar_carga_feira/registrar_entrega_brinde_feira ────────────
-- REVOKE EXECUTE (não REVOKE ALL): alteração mínima — a função não tem
-- nenhum outro privilégio concedido a anon além de EXECUTE, então revogar
-- especificamente EXECUTE é suficiente e mais explícito sobre a intenção.
-- Preserva o EXECUTE de authenticated (concedido em GRANT EXECUTE ...
-- TO authenticated, migration original — não repetido aqui).
REVOKE EXECUTE ON FUNCTION public.confirmar_entrega_brinde(UUID, UUID) FROM anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
