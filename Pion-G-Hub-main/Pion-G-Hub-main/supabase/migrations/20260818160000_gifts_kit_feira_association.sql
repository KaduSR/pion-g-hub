-- ============================================================
-- MIGRATION: P2 — Associação Kit ↔ Feira
-- ============================================================
-- Regra de negócio: uma feira configurada deve possuir pelo menos 1 kit
-- associado (catálogo permitido/sugerido de kits para aquela feira).
--
-- Compatibilidade transitória: feiras existentes nascem sem nenhuma linha
-- nesta tabela. 0 associações é tratado pelo FRONTEND (não pelo banco) como
-- "feira legada/ainda não configurada" — nesse estado, todos os kits ativos
-- continuam disponíveis para entrega, preservando o comportamento atual sem
-- exigir backfill. A partir de 1 associação, a feira passa a restringir a
-- lista de kits aos associados (e ativos). Ver
-- src/modules/gifts/services/fairKitsService.js (filterKitsForFair) para a
-- implementação canônica dessa regra de leitura.
--
-- Este é um MVP de curadoria/apresentação (REGRA A comercial/operacional).
-- Não substitui nem duplica a checagem de disponibilidade física já
-- existente em registrar_entrega_brinde_feira() via brinde_feira_estoque
-- (REGRA B) — kit associado não significa kit com saldo local suficiente;
-- a RPC de entrega continua sendo a única autoridade sobre saldo.
-- ============================================================

-- ── TABELA: brinde_kit_feiras ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brinde_kit_feiras (
  kit_id     UUID NOT NULL REFERENCES public.brinde_kits(id) ON DELETE CASCADE,
  feira_id   UUID NOT NULL REFERENCES public.feiras(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (kit_id, feira_id)
);

-- Só feira_id: a PK composta já cobre buscas por kit_id como prefixo; o
-- caso de uso mais comum ("quais kits desta feira") busca por feira_id
-- isolado, que não é o primeiro campo da PK.
CREATE INDEX IF NOT EXISTS idx_brinde_kit_feiras_feira ON public.brinde_kit_feiras (feira_id);

ALTER TABLE public.brinde_kit_feiras ENABLE ROW LEVEL SECURITY;

-- Só leitura por RLS — nenhuma policy de INSERT/UPDATE/DELETE/ALL é criada
-- para authenticated. A escrita só existe através da RPC
-- set_brinde_kits_feira (SECURITY DEFINER, abaixo), que valida regra de
-- negócio (>=1 kit, sem NULL, dedup, kits existentes e ativos, atomicidade)
-- antes de gravar — regras que a RLS por si só não consegue expressar
-- (ex.: "a tabela deve terminar com >=1 linha para esta feira"). Se a
-- escrita fosse permitida por policy direta, qualquer gifts manager
-- poderia contornar essas validações via INSERT/DELETE cru no PostgREST.
DROP POLICY IF EXISTS "Gestao brinde_kit_feiras" ON public.brinde_kit_feiras;
DROP POLICY IF EXISTS "Leitura entrega brinde_kit_feiras" ON public.brinde_kit_feiras;
CREATE POLICY "Leitura brinde_kit_feiras" ON public.brinde_kit_feiras
  FOR SELECT USING (public.is_gifts_manager() OR public.is_gifts_deliverer());

-- ── RPC: set_brinde_kits_feira ─────────────────────────────────
-- Substitui, em uma única transação, a configuração completa de kits de
-- uma feira. Único caminho de escrita em brinde_kit_feiras (nenhuma policy
-- de DML existe para authenticated) — chamado exclusivamente por
-- fairKitsService.setForFair.
--
-- SECURITY DEFINER: necessário porque a tabela não tem nenhuma policy de
-- escrita para authenticated (decisão desta fase — ver comentário da RLS
-- acima). A função não confia no SECURITY DEFINER para autorização: a
-- primeira linha do corpo revalida is_gifts_manager() explicitamente, com
-- search_path fixo (public, pg_temp) para evitar sequestro de função por
-- schema — mesmo padrão de "SECURITY DEFINER + revalidação interna
-- explícita" já usado em registrar_entrega_brinde_feira().
CREATE OR REPLACE FUNCTION public.set_brinde_kits_feira(
  p_feira_id UUID,
  p_kit_ids  UUID[]
)
RETURNS SETOF public.brinde_kit_feiras
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id  UUID;
  v_kit_ids     UUID[];
  v_invalid_kit UUID;
BEGIN
  -- 1. autorização manager — não confiar em SECURITY DEFINER para isso.
  IF NOT public.is_gifts_manager() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores, marketing ou gestores podem configurar os kits de uma feira'
      USING ERRCODE = '42501';
  END IF;

  -- 2. profile ativo.
  SELECT id INTO v_profile_id
  FROM public.user_profiles
  WHERE user_id = auth.uid() AND ativo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuário não encontrado ou inativo' USING ERRCODE = '42501';
  END IF;

  -- 3. feira válida.
  IF p_feira_id IS NULL THEN
    RAISE EXCEPTION 'Informe a feira';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.feiras WHERE id = p_feira_id) THEN
    RAISE EXCEPTION 'Feira não encontrada';
  END IF;

  -- 4. array informado.
  IF p_kit_ids IS NULL OR array_length(p_kit_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um kit para esta feira' USING ERRCODE = '23514';
  END IF;

  -- 5. nenhum NULL dentro do array — rejeitado explicitamente antes de
  -- deduplicar (um NULL sobreviveria a array_agg(DISTINCT ...) como um
  -- elemento próprio e só quebraria mais adiante, na checagem de
  -- existência/ativo, com um erro genérico em vez desta mensagem clara).
  IF EXISTS (
    SELECT 1 FROM unnest(p_kit_ids) AS x(kit_id) WHERE kit_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Lista de kits não pode conter valor nulo' USING ERRCODE = '23514';
  END IF;

  -- 6. deduplicação — não rejeita a chamada por causa disso, só ignora
  -- repetição.
  SELECT array_agg(DISTINCT kit_id) INTO v_kit_ids
  FROM unnest(p_kit_ids) AS kit_id;

  -- 7. >=1 UUID válido após deduplicação (defensivo — com o array já
  -- validado como não-vazio e sem NULL no passo 5, este caso é
  -- inatingível na prática, mas fecha a mesma regra de negócio do passo 4
  -- também depois do dedup, sem assumir).
  IF v_kit_ids IS NULL OR array_length(v_kit_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um kit para esta feira' USING ERRCODE = '23514';
  END IF;

  -- 8 e 9. todo kit informado precisa existir e estar ativo.
  SELECT kit_id INTO v_invalid_kit
  FROM unnest(v_kit_ids) AS kit_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.brinde_kits bk WHERE bk.id = kit_id AND bk.ativo = true
  )
  LIMIT 1;

  IF v_invalid_kit IS NOT NULL THEN
    RAISE EXCEPTION 'Um ou mais kits informados não existem ou estão inativos' USING ERRCODE = '23514';
  END IF;

  -- 10 e 11. só chega aqui depois de toda validação ter passado — nenhuma
  -- associação existente é removida antes de garantir que a nova seleção é
  -- válida. DELETE + INSERT rodam na mesma transação implícita da função:
  -- qualquer erro depois deste ponto desfaz tudo (nenhum estado parcial
  -- possível).
  DELETE FROM public.brinde_kit_feiras WHERE feira_id = p_feira_id;

  INSERT INTO public.brinde_kit_feiras (feira_id, kit_id, created_by)
  SELECT p_feira_id, kit_id, v_profile_id
  FROM unnest(v_kit_ids) AS kit_id;

  -- 12. return.
  RETURN QUERY SELECT * FROM public.brinde_kit_feiras WHERE feira_id = p_feira_id;
END;
$$;

-- REVOKE FROM PUBLIC sozinho não fecha pra anon neste projeto — há uma
-- default privilege no schema public que concede EXECUTE a anon
-- automaticamente em toda função nova (mesmo achado de hardening já
-- aplicado em registrar_carga_feira/registrar_entrega_brinde_feira).
REVOKE ALL ON FUNCTION public.set_brinde_kits_feira(UUID, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_brinde_kits_feira(UUID, UUID[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_brinde_kits_feira(UUID, UUID[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
