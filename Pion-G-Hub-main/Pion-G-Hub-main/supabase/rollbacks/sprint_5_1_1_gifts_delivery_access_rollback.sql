-- ============================================================
-- ROLLBACK — Sprint 5.1.1, Fatia C: leitura administrativa de entregas de
-- brindes (desfaz 20260806120000_harden_gifts_delivery_read_access.sql)
-- ============================================================
-- ATENÇÃO: restaura o SELECT amplo de is_gifts_deliverer() em
-- brinde_entregas e brinde_entrega_itens — vendedor volta a conseguir ler
-- todo o histórico administrativo de entregas via API direta, e a EXECUTE
-- de anon em confirmar_entrega_brinde volta a existir. Use somente se o
-- hardening da Fatia C causar uma regressão funcional real — não é o
-- estado recomendado, é só o estado imediatamente anterior a esta
-- migration (inclusive a lacuna de hardening de anon, que já era
-- pré-existente antes da Fatia C).
--
-- Transacional (BEGIN/COMMIT) e reexecutável: cada CREATE POLICY é
-- precedido de DROP POLICY IF EXISTS, então rodar este rollback mais de
-- uma vez seguida (por exemplo, depois de já ter sido aplicado) não falha
-- por colisão de nome de policy.
-- ============================================================

BEGIN;

-- ── brinde_entregas: restaura o SELECT amplo original ───────────────────
DROP POLICY IF EXISTS "Leitura entrega brinde_entregas" ON public.brinde_entregas;
CREATE POLICY "Leitura entrega brinde_entregas" ON public.brinde_entregas
  FOR SELECT USING (public.is_gifts_deliverer());

-- ── brinde_entrega_itens: restaura o SELECT amplo original ──────────────
DROP POLICY IF EXISTS "Leitura entrega brinde_entrega_itens" ON public.brinde_entrega_itens;
CREATE POLICY "Leitura entrega brinde_entrega_itens" ON public.brinde_entrega_itens
  FOR SELECT USING (public.is_gifts_deliverer());

-- ── confirmar_entrega_brinde: restaura o EXECUTE de anon ────────────────
-- Este GRANT existe SOMENTE para restaurar o estado anterior à Fatia C
-- (mesma lacuna já presente desde a migration 20260717100000) — não é o
-- comportamento recomendado, é o estado que existia antes desta migration.
GRANT EXECUTE ON FUNCTION public.confirmar_entrega_brinde(UUID, UUID) TO anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
