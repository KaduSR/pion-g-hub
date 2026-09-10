-- ============================================================
-- ROLLBACK: Hardening — RLS granular de leads_feira via PBAC
-- (desfaz 20260721120000_hardening_leads_feira_rls.sql)
-- ============================================================
-- ATENÇÃO: isto restaura a policy "Acesso total leads_feira" original
-- (USING true, sem nenhuma restrição de linha) — mesmo estado de segurança
-- de antes desta migration. Use só se o hardening precisar ser revertido
-- por regressão funcional; não é o comportamento recomendado.

DROP POLICY IF EXISTS "Leitura leads_feira" ON public.leads_feira;
DROP POLICY IF EXISTS "Insercao leads_feira" ON public.leads_feira;
DROP POLICY IF EXISTS "Atualizacao leads_feira" ON public.leads_feira;
DROP POLICY IF EXISTS "Exclusao leads_feira" ON public.leads_feira;

CREATE POLICY "Acesso total leads_feira" ON public.leads_feira
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Restaura o GRANT de tabela solto pra anon (estado anterior — RLS
-- continua bloqueando de fato, já que a policy acima é só TO authenticated).
GRANT ALL ON public.leads_feira TO anon;

DROP FUNCTION IF EXISTS public.is_own_or_team_lead(UUID);
DROP FUNCTION IF EXISTS public.has_effective_permission(TEXT);

-- Índice: mantido de propósito (não reverte) — é aditivo, sem custo de
-- correção, e útil independente desta migration existir ou não.

NOTIFY pgrst, 'reload schema';
