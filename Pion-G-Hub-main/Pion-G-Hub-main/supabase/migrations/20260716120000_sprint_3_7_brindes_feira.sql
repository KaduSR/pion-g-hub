-- ============================================================
-- MIGRATION: Sprint 3.7 — Brindes por Feira: Carga, Entrega e Vínculo com Lead
-- ============================================================
-- Extraído de supabase/schema.sql (seção "SPRINT 3.7"), versão já revisada
-- e corrigida (ajustes de RLS/auditoria/concorrência aplicados antes desta
-- migration existir como arquivo). Idempotente: pode ser reaplicada sem
-- efeito colateral (todo CREATE/ALTER usa IF NOT EXISTS / DROP IF EXISTS
-- antes de recriar).
--
-- Pré-requisito: tabelas base de brindes da Sprint 3.1 (brindes, brinde_kits,
-- brinde_kit_itens, brinde_entregas, brinde_movimentacoes,
-- registrar_movimentacao_brinde) e feiras/leads_feira já devem existir.
--
-- Depois desta migration, aplique 20260716120100_autoatendimento_destinatarios.sql
-- — ela depende de is_gifts_deliverer(), brinde_feira_estoque,
-- brinde_entrega_itens e da RPC registrar_entrega_brinde_feira criadas aqui.
-- ============================================================

-- ── Helper de autorização: quem pode REALIZAR entrega ─────────
-- SECURITY DEFINER: esta função é usada dentro de uma policy da própria
-- public.user_profiles (ver abaixo). Se rodasse como SECURITY INVOKER, o
-- SELECT interno em user_profiles reavaliaria a RLS da própria tabela, que
-- por sua vez chama esta função de novo — recursão. SECURITY DEFINER roda
-- com o privilégio do owner da função (BYPASSRLS), quebrando o ciclo.
CREATE OR REPLACE FUNCTION public.is_gifts_deliverer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND ativo = true
      AND role IN ('admin', 'marketing', 'gestor', 'vendedor')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_gifts_deliverer() TO anon, authenticated;

-- ── user_profiles: leitura de nomes para auditoria de entregas ─
DROP POLICY IF EXISTS "Leitura nomes brindes" ON public.user_profiles;
CREATE POLICY "Leitura nomes brindes" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (public.is_gifts_deliverer());

-- ── Leitura ampliada (vendedor) nas tabelas já existentes ─────
DROP POLICY IF EXISTS "Leitura entrega brindes" ON public.brindes;
CREATE POLICY "Leitura entrega brindes" ON public.brindes
  FOR SELECT USING (public.is_gifts_deliverer());

DROP POLICY IF EXISTS "Leitura entrega brinde_kits" ON public.brinde_kits;
CREATE POLICY "Leitura entrega brinde_kits" ON public.brinde_kits
  FOR SELECT USING (public.is_gifts_deliverer());

DROP POLICY IF EXISTS "Leitura entrega brinde_kit_itens" ON public.brinde_kit_itens;
CREATE POLICY "Leitura entrega brinde_kit_itens" ON public.brinde_kit_itens
  FOR SELECT USING (public.is_gifts_deliverer());

DROP POLICY IF EXISTS "Leitura entrega brinde_entregas" ON public.brinde_entregas;
CREATE POLICY "Leitura entrega brinde_entregas" ON public.brinde_entregas
  FOR SELECT USING (public.is_gifts_deliverer());

-- ── brinde_entregas: origem + formato multi-item de item_avulso ─
ALTER TABLE public.brinde_entregas
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'interno'
    CHECK (origem IN ('interno', 'kiosk'));

ALTER TABLE public.brinde_entregas
  DROP CONSTRAINT IF EXISTS chk_brinde_entregas_item;

ALTER TABLE public.brinde_entregas
  ADD CONSTRAINT chk_brinde_entregas_item CHECK (
    (tipo_entrega = 'kit' AND kit_id IS NOT NULL AND brinde_id IS NULL)
    OR
    (tipo_entrega = 'item_avulso' AND kit_id IS NULL AND (
      (brinde_id IS NOT NULL AND quantidade IS NOT NULL) -- formato antigo (Sprint 3.1)
      OR
      (brinde_id IS NULL AND quantidade IS NULL)         -- formato novo (Sprint 3.7)
    ))
  );

-- Reforço em banco contra kit duplicado sob concorrência.
CREATE UNIQUE INDEX IF NOT EXISTS uq_brinde_entrega_kit_lead_feira_ativo
  ON public.brinde_entregas (feira_id, lead_id, kit_id)
  WHERE tipo_entrega = 'kit'
    AND kit_id IS NOT NULL
    AND status <> 'cancelado';

-- ── TABELA: brinde_feira_estoque ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.brinde_feira_estoque (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feira_id              UUID NOT NULL REFERENCES public.feiras(id) ON DELETE CASCADE,
  brinde_id             UUID NOT NULL REFERENCES public.brindes(id) ON DELETE RESTRICT,
  quantidade_enviada    INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_enviada >= 0),
  quantidade_entregue   INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_entregue >= 0),
  quantidade_retorno    INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_retorno >= 0),
  quantidade_perda      INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_perda >= 0),
  observacoes           TEXT,
  created_by            UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_brinde_feira_estoque_feira_brinde UNIQUE (feira_id, brinde_id)
);

CREATE INDEX IF NOT EXISTS idx_brinde_feira_estoque_feira  ON public.brinde_feira_estoque (feira_id);
CREATE INDEX IF NOT EXISTS idx_brinde_feira_estoque_brinde ON public.brinde_feira_estoque (brinde_id);

ALTER TABLE public.brinde_feira_estoque ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestao brinde_feira_estoque" ON public.brinde_feira_estoque;
CREATE POLICY "Gestao brinde_feira_estoque" ON public.brinde_feira_estoque
  FOR ALL USING (public.is_gifts_manager()) WITH CHECK (public.is_gifts_manager());
DROP POLICY IF EXISTS "Leitura entrega brinde_feira_estoque" ON public.brinde_feira_estoque;
CREATE POLICY "Leitura entrega brinde_feira_estoque" ON public.brinde_feira_estoque
  FOR SELECT USING (public.is_gifts_deliverer());

-- ── TABELA: brinde_entrega_itens ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.brinde_entrega_itens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entrega_id  UUID NOT NULL REFERENCES public.brinde_entregas(id) ON DELETE CASCADE,
  brinde_id   UUID NOT NULL REFERENCES public.brindes(id) ON DELETE RESTRICT,
  quantidade  INTEGER NOT NULL CHECK (quantidade > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_brinde_entrega_itens_entrega_brinde UNIQUE (entrega_id, brinde_id)
);

CREATE INDEX IF NOT EXISTS idx_brinde_entrega_itens_entrega ON public.brinde_entrega_itens (entrega_id);
CREATE INDEX IF NOT EXISTS idx_brinde_entrega_itens_brinde  ON public.brinde_entrega_itens (brinde_id);

ALTER TABLE public.brinde_entrega_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestao brinde_entrega_itens" ON public.brinde_entrega_itens;
CREATE POLICY "Gestao brinde_entrega_itens" ON public.brinde_entrega_itens
  FOR ALL USING (public.is_gifts_manager()) WITH CHECK (public.is_gifts_manager());
DROP POLICY IF EXISTS "Leitura entrega brinde_entrega_itens" ON public.brinde_entrega_itens;
CREATE POLICY "Leitura entrega brinde_entrega_itens" ON public.brinde_entrega_itens
  FOR SELECT USING (public.is_gifts_deliverer());

-- ── RPC: registrar_carga_feira ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.registrar_carga_feira(
  p_feira_id     UUID,
  p_brinde_id    UUID,
  p_quantidade   INTEGER,
  p_observacoes  TEXT DEFAULT NULL,
  p_created_by   UUID DEFAULT NULL
)
RETURNS public.brinde_feira_estoque
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_estoque     public.brinde_feira_estoque%ROWTYPE;
  v_profile_id  UUID;
BEGIN
  IF NOT public.is_gifts_manager() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores, marketing ou gestores podem preparar a carga de brindes de uma feira'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_profile_id
  FROM public.user_profiles
  WHERE user_id = auth.uid() AND ativo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuário não encontrado ou inativo' USING ERRCODE = '42501';
  END IF;

  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade maior que zero';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.feiras WHERE id = p_feira_id) THEN
    RAISE EXCEPTION 'Feira não encontrada';
  END IF;

  PERFORM public.registrar_movimentacao_brinde(
    p_brinde_id, 'saida', p_quantidade,
    'Carga enviada para feira', 'carga_feira', NULL,
    p_feira_id, NULL, v_profile_id, v_profile_id,
    p_observacoes
  );

  INSERT INTO public.brinde_feira_estoque (
    feira_id, brinde_id, quantidade_enviada, observacoes, created_by
  ) VALUES (
    p_feira_id, p_brinde_id, p_quantidade, p_observacoes, v_profile_id
  )
  ON CONFLICT (feira_id, brinde_id) DO UPDATE
    SET quantidade_enviada = public.brinde_feira_estoque.quantidade_enviada + EXCLUDED.quantidade_enviada,
        observacoes        = COALESCE(EXCLUDED.observacoes, public.brinde_feira_estoque.observacoes),
        updated_at         = NOW()
  RETURNING * INTO v_estoque;

  RETURN v_estoque;
END;
$$;

-- REVOKE FROM PUBLIC sozinho não fecha pra anon neste projeto: há uma
-- default privilege no schema public que concede EXECUTE a anon
-- automaticamente em toda função nova (ver pg_default_acl) — REVOKE FROM
-- anon explícito abaixo (achado de hardening pós-Sprint 3.8).
REVOKE ALL ON FUNCTION public.registrar_carga_feira(UUID, UUID, INTEGER, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_carga_feira(UUID, UUID, INTEGER, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_carga_feira(UUID, UUID, INTEGER, TEXT, UUID) TO authenticated;

-- ── RPC: registrar_entrega_brinde_feira (versão base, 7 argumentos) ─
-- ATENÇÃO: esta é a versão ORIGINAL da Sprint 3.7 (só fluxo de lead). A
-- migration seguinte (autoatendimento_destinatarios) substitui esta função
-- por uma versão de 12 argumentos — rodar as duas migrations em sequência é
-- obrigatório, não opcional, para o Autoatendimento funcionar.
CREATE OR REPLACE FUNCTION public.registrar_entrega_brinde_feira(
  p_feira_id      UUID,
  p_lead_id       UUID,
  p_tipo_entrega  TEXT,
  p_kit_id        UUID DEFAULT NULL,
  p_itens         JSONB DEFAULT NULL,
  p_observacoes   TEXT DEFAULT NULL,
  p_origem        TEXT DEFAULT 'interno'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id  UUID;
  v_kit         RECORD;
  v_item        RECORD;
  v_estoque     public.brinde_feira_estoque%ROWTYPE;
  v_saldo       INTEGER;
  v_entrega     public.brinde_entregas%ROWTYPE;
  v_codigo      TEXT;
  v_itens_json  JSONB;
BEGIN
  IF NOT public.is_gifts_deliverer() THEN
    RAISE EXCEPTION 'Acesso negado: você não tem permissão para liberar brindes'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_profile_id
  FROM public.user_profiles
  WHERE user_id = auth.uid() AND ativo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuário não encontrado ou inativo' USING ERRCODE = '42501';
  END IF;

  IF p_tipo_entrega NOT IN ('kit', 'item_avulso') THEN
    RAISE EXCEPTION 'Tipo de entrega inválido: %', p_tipo_entrega;
  END IF;

  IF p_origem NOT IN ('interno', 'kiosk') THEN
    RAISE EXCEPTION 'Origem inválida: %', p_origem;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.feiras WHERE id = p_feira_id) THEN
    RAISE EXCEPTION 'Feira não encontrada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.leads_feira WHERE id = p_lead_id AND feira_id = p_feira_id) THEN
    RAISE EXCEPTION 'Lead não encontrado nesta feira';
  END IF;

  IF p_tipo_entrega = 'kit' THEN
    IF p_kit_id IS NULL THEN
      RAISE EXCEPTION 'Informe o kit a ser entregue';
    END IF;

    SELECT id, nome INTO v_kit FROM public.brinde_kits WHERE id = p_kit_id AND ativo = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Kit não encontrado ou inativo';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.brinde_kit_itens WHERE kit_id = p_kit_id) THEN
      RAISE EXCEPTION 'Este kit não tem itens cadastrados';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.brinde_entregas
      WHERE feira_id = p_feira_id AND lead_id = p_lead_id
        AND tipo_entrega = 'kit' AND kit_id = p_kit_id AND status <> 'cancelado'
    ) THEN
      RAISE EXCEPTION 'Este lead já recebeu o kit "%" nesta feira', v_kit.nome USING ERRCODE = '23505';
    END IF;

    FOR v_item IN
      SELECT bki.brinde_id, bki.quantidade, b.nome
      FROM public.brinde_kit_itens bki
      JOIN public.brindes b ON b.id = bki.brinde_id
      WHERE bki.kit_id = p_kit_id
      ORDER BY bki.brinde_id
    LOOP
      SELECT * INTO v_estoque
      FROM public.brinde_feira_estoque
      WHERE feira_id = p_feira_id AND brinde_id = v_item.brinde_id
      FOR UPDATE;

      v_saldo := COALESCE(v_estoque.quantidade_enviada, 0)
               - COALESCE(v_estoque.quantidade_entregue, 0)
               - COALESCE(v_estoque.quantidade_perda, 0)
               + COALESCE(v_estoque.quantidade_retorno, 0);

      IF v_saldo < v_item.quantidade THEN
        RAISE EXCEPTION 'Saldo insuficiente na feira para "%" (disponível: %, necessário: %)',
          v_item.nome, v_saldo, v_item.quantidade USING ERRCODE = '23514';
      END IF;
    END LOOP;
  ELSE
    IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
      RAISE EXCEPTION 'Informe ao menos um item avulso para entregar';
    END IF;

    IF EXISTS (
      SELECT 1 FROM jsonb_to_recordset(p_itens) AS x(brinde_id UUID, quantidade INTEGER)
      WHERE brinde_id IS NULL OR quantidade IS NULL OR quantidade <= 0
    ) THEN
      RAISE EXCEPTION 'Item avulso inválido: informe brinde e quantidade maior que zero';
    END IF;

    IF EXISTS (
      SELECT 1 FROM jsonb_to_recordset(p_itens) AS x(brinde_id UUID, quantidade INTEGER)
      WHERE NOT EXISTS (SELECT 1 FROM public.brindes b WHERE b.id = x.brinde_id AND b.ativo = true)
    ) THEN
      RAISE EXCEPTION 'Um ou mais brindes informados não existem ou estão inativos';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(p_itens) AS x(brinde_id UUID, quantidade INTEGER)
      GROUP BY x.brinde_id
      HAVING COUNT(*) > 1
    ) THEN
      RAISE EXCEPTION 'Não repita o mesmo brinde na entrega avulsa. Ajuste a quantidade em uma única linha.'
        USING ERRCODE = '23514';
    END IF;

    FOR v_item IN
      SELECT x.brinde_id, x.quantidade, b.nome
      FROM jsonb_to_recordset(p_itens) AS x(brinde_id UUID, quantidade INTEGER)
      JOIN public.brindes b ON b.id = x.brinde_id
      ORDER BY x.brinde_id
    LOOP
      SELECT * INTO v_estoque
      FROM public.brinde_feira_estoque
      WHERE feira_id = p_feira_id AND brinde_id = v_item.brinde_id
      FOR UPDATE;

      v_saldo := COALESCE(v_estoque.quantidade_enviada, 0)
               - COALESCE(v_estoque.quantidade_entregue, 0)
               - COALESCE(v_estoque.quantidade_perda, 0)
               + COALESCE(v_estoque.quantidade_retorno, 0);

      IF v_saldo < v_item.quantidade THEN
        RAISE EXCEPTION 'Saldo insuficiente na feira para "%" (disponível: %, necessário: %)',
          v_item.nome, v_saldo, v_item.quantidade USING ERRCODE = '23514';
      END IF;
    END LOOP;
  END IF;

  v_codigo := 'BR-' || to_char(NOW(), 'YYMMDD') || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.brinde_entregas (
    tipo_entrega, kit_id, brinde_id, quantidade, feira_id, lead_id,
    contexto_tipo, status, codigo_comprovante,
    entregue_por_profile_id, created_by, entregue_em, observacoes, origem
  ) VALUES (
    p_tipo_entrega,
    CASE WHEN p_tipo_entrega = 'kit' THEN p_kit_id ELSE NULL END,
    NULL, NULL,
    p_feira_id, p_lead_id,
    'feira', 'entregue', v_codigo,
    v_profile_id, v_profile_id, NOW(), p_observacoes, p_origem
  )
  RETURNING * INTO v_entrega;

  IF p_tipo_entrega = 'kit' THEN
    FOR v_item IN
      SELECT bki.brinde_id, bki.quantidade
      FROM public.brinde_kit_itens bki
      WHERE bki.kit_id = p_kit_id
      ORDER BY bki.brinde_id
    LOOP
      INSERT INTO public.brinde_feira_estoque (feira_id, brinde_id, quantidade_entregue)
      VALUES (p_feira_id, v_item.brinde_id, v_item.quantidade)
      ON CONFLICT (feira_id, brinde_id) DO UPDATE
        SET quantidade_entregue = public.brinde_feira_estoque.quantidade_entregue + EXCLUDED.quantidade_entregue,
            updated_at = NOW();

      INSERT INTO public.brinde_entrega_itens (entrega_id, brinde_id, quantidade)
      VALUES (v_entrega.id, v_item.brinde_id, v_item.quantidade);
    END LOOP;
  ELSE
    FOR v_item IN
      SELECT (x->>'brinde_id')::UUID AS brinde_id, (x->>'quantidade')::INTEGER AS quantidade
      FROM jsonb_array_elements(p_itens) AS x
      ORDER BY (x->>'brinde_id')::UUID
    LOOP
      INSERT INTO public.brinde_feira_estoque (feira_id, brinde_id, quantidade_entregue)
      VALUES (p_feira_id, v_item.brinde_id, v_item.quantidade)
      ON CONFLICT (feira_id, brinde_id) DO UPDATE
        SET quantidade_entregue = public.brinde_feira_estoque.quantidade_entregue + EXCLUDED.quantidade_entregue,
            updated_at = NOW();

      INSERT INTO public.brinde_entrega_itens (entrega_id, brinde_id, quantidade)
      VALUES (v_entrega.id, v_item.brinde_id, v_item.quantidade);
    END LOOP;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'brinde_id', bei.brinde_id, 'nome', b.nome, 'quantidade', bei.quantidade
  )), '[]'::jsonb)
  INTO v_itens_json
  FROM public.brinde_entrega_itens bei
  JOIN public.brindes b ON b.id = bei.brinde_id
  WHERE bei.entrega_id = v_entrega.id;

  RETURN jsonb_build_object('entrega', to_jsonb(v_entrega), 'itens', v_itens_json);
END;
$$;

-- REVOKE FROM PUBLIC sozinho não fecha pra anon neste projeto (ver
-- comentário acima em registrar_carga_feira) — REVOKE FROM anon explícito.
REVOKE ALL ON FUNCTION public.registrar_entrega_brinde_feira(UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_entrega_brinde_feira(UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_entrega_brinde_feira(UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
