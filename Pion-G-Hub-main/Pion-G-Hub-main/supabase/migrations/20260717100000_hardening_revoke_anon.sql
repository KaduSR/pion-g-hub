-- ============================================================
-- MIGRATION: Hardening — revoga EXECUTE de anon nas RPCs de brindes por feira
-- ============================================================
-- Achado da auditoria pós-Sprint 3.8: este projeto Supabase tem uma default
-- privilege configurada no schema public (ver pg_default_acl) que concede
-- EXECUTE automaticamente a anon/authenticated em toda função nova criada
-- por postgres. "REVOKE ALL ... FROM PUBLIC" — usado nas migrations
-- originais da Sprint 3.7 e do Autoatendimento — não desfaz isso, porque é
-- uma concessão DIRETA a anon, não via PUBLIC.
--
-- Não era uma vulnerabilidade ativa: as duas funções abaixo validam
-- is_gifts_manager()/is_gifts_deliverer() internamente, que dependem de
-- auth.uid() (nulo para uma sessão anônima de verdade) — então uma
-- chamada anônima já falhava com "Acesso negado" mesmo com o GRANT aberto.
-- Ainda assim, a documentação das migrations originais prometia "nunca
-- conceder a anon", e o GRANT real não cumpria isso — esta migration fecha
-- essa camada de defesa extra.
--
-- Só toca nestas duas funções (as únicas onde o achado se aplicava — RPCs
-- de escrita sensíveis). is_gifts_deliverer() continua concedida a
-- anon/authenticated de propósito (é usada dentro de policies avaliadas
-- também para sessões anônimas).
-- ============================================================

REVOKE ALL ON FUNCTION public.registrar_carga_feira(
  UUID, UUID, INTEGER, TEXT, UUID
) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_carga_feira(
  UUID, UUID, INTEGER, TEXT, UUID
) TO authenticated;

REVOKE ALL ON FUNCTION public.registrar_entrega_brinde_feira(
  UUID, UUID, TEXT, UUID, JSONB,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_entrega_brinde_feira(
  UUID, UUID, TEXT, UUID, JSONB,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated;

NOTIFY pgrst, 'reload schema';
