-- ============================================================
-- MIGRATION: Autoatendimento interno — tipo_destinatario + RPC estendida
-- ============================================================
-- Depende de 20260716120000_sprint_3_7_brindes_feira.sql já aplicada
-- (is_gifts_deliverer(), brinde_feira_estoque, brinde_entrega_itens,
-- registrar_entrega_brinde_feira de 7 argumentos). O bloco abaixo falha com
-- mensagem clara se algum desses pré-requisitos estiver ausente, em vez de
-- um erro genérico de "tabela/função não existe" no meio da migration.
-- ============================================================

DO $$
BEGIN
  IF to_regprocedure('public.is_gifts_deliverer()') IS NULL THEN
    RAISE EXCEPTION 'Pré-requisito ausente: public.is_gifts_deliverer() não existe. Aplique 20260716120000_sprint_3_7_brindes_feira.sql antes desta migration.';
  END IF;

  IF to_regclass('public.brinde_feira_estoque') IS NULL THEN
    RAISE EXCEPTION 'Pré-requisito ausente: tabela public.brinde_feira_estoque não existe. Aplique 20260716120000_sprint_3_7_brindes_feira.sql antes desta migration.';
  END IF;

  IF to_regclass('public.brinde_entrega_itens') IS NULL THEN
    RAISE EXCEPTION 'Pré-requisito ausente: tabela public.brinde_entrega_itens não existe. Aplique 20260716120000_sprint_3_7_brindes_feira.sql antes desta migration.';
  END IF;

  IF to_regprocedure('public.registrar_entrega_brinde_feira(uuid, uuid, text, uuid, jsonb, text, text)') IS NULL THEN
    RAISE EXCEPTION 'Pré-requisito ausente: registrar_entrega_brinde_feira (versão de 7 argumentos) não existe. Aplique 20260716120000_sprint_3_7_brindes_feira.sql antes desta migration.';
  END IF;

  IF to_regclass('public.brinde_entregas') IS NULL THEN
    RAISE EXCEPTION 'Pré-requisito ausente: tabela public.brinde_entregas não existe (Sprint 3.1). Aplique as migrations anteriores antes desta.';
  END IF;
END $$;

-- ── 1) Coluna tipo_destinatario ─────────────────────────────────
-- Quem recebeu o brinde: 'lead' (tem lead_id) ou 'cliente_existente'
-- (pessoa/empresa já conhecida, sem lead nesta feira — nome/empresa ficam
-- em destinatario_nome/destinatario_empresa, já existentes desde a Sprint
-- 3.1). Só 'lead'/'cliente_existente' são aceitos — a RPC não processa
-- 'uso_interno'/'outro' hoje, então o banco não deve aceitar esses valores.
-- NULLABLE: entregas anteriores a esta coluna ficam NULL = "não
-- classificado" até o backfill conservador abaixo.
ALTER TABLE public.brinde_entregas
  ADD COLUMN IF NOT EXISTS tipo_destinatario TEXT NULL;

ALTER TABLE public.brinde_entregas
  DROP CONSTRAINT IF EXISTS brinde_entregas_tipo_destinatario_check;

ALTER TABLE public.brinde_entregas
  ADD CONSTRAINT brinde_entregas_tipo_destinatario_check
    CHECK (tipo_destinatario IS NULL OR tipo_destinatario IN ('lead', 'cliente_existente'));

-- ── 2) Backfill conservador ──────────────────────────────────────
-- Só reclassifica como 'lead' o que dá pra inferir com segurança: já tinha
-- lead_id E contexto_tipo='feira' (veio do próprio fluxo de entrega por
-- feira). Qualquer linha ambígua permanece tipo_destinatario = NULL de
-- propósito — "não classificado" é preferível a um chute errado.
--
-- IMPORTANTE: rode a contagem abaixo ANTES do UPDATE pra saber quantas
-- linhas serão afetadas no SEU banco (não há acesso a produção neste
-- ambiente de edição, então esse número não pode ser cravado aqui):
--
--   SELECT COUNT(*) FROM public.brinde_entregas
--   WHERE tipo_destinatario IS NULL AND lead_id IS NOT NULL AND contexto_tipo = 'feira';
--
UPDATE public.brinde_entregas
SET tipo_destinatario = 'lead'
WHERE tipo_destinatario IS NULL
  AND lead_id IS NOT NULL
  AND contexto_tipo = 'feira';

-- ── 3) Constraint de integridade do destinatário ────────────────
-- Validação de banco, independente da RPC — cobre também um INSERT direto
-- fora do frontend. Três formatos válidos: (1) NULL = registro anterior,
-- não classificado; (2) 'lead' = lead_id obrigatório; (3) 'cliente_existente'
-- = lead_id NULL, nome e empresa obrigatórios e não-vazios.
ALTER TABLE public.brinde_entregas
  DROP CONSTRAINT IF EXISTS chk_brinde_entregas_destinatario;

ALTER TABLE public.brinde_entregas
  ADD CONSTRAINT chk_brinde_entregas_destinatario CHECK (
    tipo_destinatario IS NULL
    OR (tipo_destinatario = 'lead' AND lead_id IS NOT NULL)
    OR (
      tipo_destinatario = 'cliente_existente'
      AND lead_id IS NULL
      AND destinatario_nome IS NOT NULL AND trim(destinatario_nome) <> ''
      AND destinatario_empresa IS NOT NULL AND trim(destinatario_empresa) <> ''
    )
  );

-- ── 4) Índice de apoio à checagem de duplicidade por feira ──────
CREATE INDEX IF NOT EXISTS idx_brinde_entregas_tipo_destinatario
  ON public.brinde_entregas (feira_id, tipo_destinatario)
  WHERE tipo_destinatario IS NOT NULL;

-- ── 5) Normalização de texto pra duplicidade de cliente existente ─
-- unaccent é extensão padrão do Postgres (contrib), liberada em projetos
-- Supabase — usada pra "São Lucas"/"Sao Lucas" contarem como o mesmo nome.
-- Se o ambiente não permitir CREATE EXTENSION (raro em Supabase gerenciado),
-- esta linha falha alto e claro — melhor que degradar silenciosamente pra
-- uma comparação que não reconhece acentos.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- STABLE (não IMMUTABLE): unaccent() em si é STABLE no Postgres. Não é
-- usada em índice funcional nesta sprint, então a diferença não importa na
-- prática — mas IMMUTABLE seria uma promessa que a função chamada não cumpre.
CREATE OR REPLACE FUNCTION public.normalize_dedup_text(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT NULLIF(trim(regexp_replace(lower(unaccent(COALESCE(p_text, ''))), '\s+', ' ', 'g')), '');
$$;

-- ── 6) Assinatura antiga (7 argumentos) precisa sair antes da nova ──
-- de 12 — número de parâmetros diferente é overload distinto no Postgres,
-- não substituição via CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.registrar_entrega_brinde_feira(
  UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT
);

-- ── 7) RPC — versão completa e atualizada (12 argumentos) ───────
-- Extensão (Autoatendimento interno): p_tipo_destinatario distingue duas
-- pessoas que podem receber o brinde — 'lead' (obrigatório p_lead_id) ou
-- 'cliente_existente' (pessoa já conhecida da empresa, sem lead nesta
-- feira — obrigatório p_destinatario_nome/p_destinatario_empresa). Para
-- 'cliente_existente', antes de gravar é feita uma checagem "soft" de
-- possível duplicidade (mesmo nome+empresa já recebeu brinde nesta feira,
-- comparado via normalize_dedup_text): se encontrar e
-- p_confirmar_duplicidade ainda não veio true, a função RETORNA (não
-- RAISE) um JSON com possivel_duplicata=true em vez de gravar — o frontend
-- mostra o alerta e, se o usuário confirmar, chama de novo com
-- p_confirmar_duplicidade=true para efetivar a entrega.
--
-- Ordem de validação: usuário autenticado + perfil ativo + permissão
-- (is_gifts_deliverer + lookup de profile_id) → tipo_entrega/origem/
-- tipo_destinatario válidos → feira existe → destinatário válido (lead ou
-- cliente_existente) → duplicidade (só cliente_existente) → kit/itens
-- válidos → lock FOR UPDATE + existência de carga + saldo por item → cria
-- entrega → cria itens → atualiza estoque → retorna JSON. Tudo dentro da
-- mesma transação implícita da chamada RPC: qualquer RAISE EXCEPTION em
-- qualquer etapa desfaz tudo que já rodou antes nesta mesma chamada.
CREATE OR REPLACE FUNCTION public.registrar_entrega_brinde_feira(
  p_feira_id              UUID,
  p_lead_id               UUID DEFAULT NULL,
  p_tipo_entrega          TEXT DEFAULT 'item_avulso',
  p_kit_id                UUID DEFAULT NULL,
  p_itens                 JSONB DEFAULT NULL,
  p_observacoes           TEXT DEFAULT NULL,
  p_origem                TEXT DEFAULT 'interno',
  p_tipo_destinatario     TEXT DEFAULT 'lead',
  p_destinatario_nome     TEXT DEFAULT NULL,
  p_destinatario_empresa  TEXT DEFAULT NULL,
  p_destinatario_contato  TEXT DEFAULT NULL,
  p_confirmar_duplicidade BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id           UUID;
  v_kit                  RECORD;
  v_item                 RECORD;
  v_estoque              public.brinde_feira_estoque%ROWTYPE;
  v_saldo                INTEGER;
  v_entrega              public.brinde_entregas%ROWTYPE;
  v_codigo               TEXT;
  v_itens_json           JSONB;
  v_destinatario_nome    TEXT;
  v_destinatario_empresa TEXT;
  v_duplicata            RECORD;
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

  IF p_tipo_destinatario NOT IN ('lead', 'cliente_existente') THEN
    RAISE EXCEPTION 'Tipo de destinatário inválido: %', p_tipo_destinatario;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.feiras WHERE id = p_feira_id) THEN
    RAISE EXCEPTION 'Feira não encontrada';
  END IF;

  IF p_tipo_destinatario = 'lead' THEN
    IF p_lead_id IS NULL THEN
      RAISE EXCEPTION 'Informe o lead para esta entrega';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.leads_feira WHERE id = p_lead_id AND feira_id = p_feira_id) THEN
      RAISE EXCEPTION 'Lead não encontrado nesta feira';
    END IF;
  ELSE -- cliente_existente: sem lead_id, exige nome + empresa do destinatário
    v_destinatario_nome    := NULLIF(trim(p_destinatario_nome), '');
    v_destinatario_empresa := NULLIF(trim(p_destinatario_empresa), '');

    IF v_destinatario_nome IS NULL OR v_destinatario_empresa IS NULL THEN
      RAISE EXCEPTION 'Informe o nome e a empresa do cliente';
    END IF;

    IF NOT p_confirmar_duplicidade THEN
      SELECT be.destinatario_nome AS nome, be.destinatario_empresa AS empresa, be.entregue_em
        INTO v_duplicata
      FROM public.brinde_entregas be
      WHERE be.feira_id = p_feira_id
        AND be.tipo_destinatario = 'cliente_existente'
        AND be.status <> 'cancelado'
        AND public.normalize_dedup_text(be.destinatario_nome) = public.normalize_dedup_text(v_destinatario_nome)
        AND public.normalize_dedup_text(be.destinatario_empresa) = public.normalize_dedup_text(v_destinatario_empresa)
      ORDER BY be.entregue_em DESC
      LIMIT 1;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'possivel_duplicata', true,
          'destinatario_nome', v_duplicata.nome,
          'destinatario_empresa', v_duplicata.empresa,
          'entregue_em', v_duplicata.entregue_em
        );
      END IF;
    END IF;
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

    -- 1ª passada: trava (FOR UPDATE) e valida existência de carga + saldo
    -- de cada item do kit, em ordem estável, pra evitar deadlock com
    -- outras entregas concorrentes.
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

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Brinde "%" não foi enviado para esta feira', v_item.nome USING ERRCODE = '23514';
      END IF;

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

    -- Mesmo brinde repetido em duas linhas do payload: além de indicar erro
    -- de UI, colidiria com o UNIQUE(entrega_id, brinde_id) de
    -- brinde_entrega_itens na 2ª passada (erro cru de constraint em vez de
    -- mensagem amigável). Bloqueado aqui, antes de travar qualquer saldo.
    IF EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(p_itens) AS x(brinde_id UUID, quantidade INTEGER)
      GROUP BY x.brinde_id
      HAVING COUNT(*) > 1
    ) THEN
      RAISE EXCEPTION 'Não repita o mesmo brinde na entrega avulsa. Ajuste a quantidade em uma única linha.'
        USING ERRCODE = '23514';
    END IF;

    -- 1ª passada: mesma lógica de trava + existência de carga + saldo, acima.
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

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Brinde "%" não foi enviado para esta feira', v_item.nome USING ERRCODE = '23514';
      END IF;

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
    entregue_por_profile_id, created_by, entregue_em, observacoes, origem,
    tipo_destinatario, destinatario_nome, destinatario_empresa, destinatario_contato
  ) VALUES (
    p_tipo_entrega,
    CASE WHEN p_tipo_entrega = 'kit' THEN p_kit_id ELSE NULL END,
    NULL, NULL,
    p_feira_id, p_lead_id,
    'feira', 'entregue', v_codigo,
    v_profile_id, v_profile_id, NOW(), p_observacoes, p_origem,
    p_tipo_destinatario,
    CASE WHEN p_tipo_destinatario = 'cliente_existente' THEN v_destinatario_nome ELSE NULL END,
    CASE WHEN p_tipo_destinatario = 'cliente_existente' THEN v_destinatario_empresa ELSE NULL END,
    CASE WHEN p_tipo_destinatario = 'cliente_existente' THEN NULLIF(trim(p_destinatario_contato), '') ELSE NULL END
  )
  RETURNING * INTO v_entrega;

  -- 2ª passada: agora que a entrega existe (e a 1ª passada já confirmou que
  -- toda linha de estoque necessária existe e tem saldo), aplica a baixa no
  -- saldo local da feira e grava cada item entregue, na mesma ordem estável.
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

-- ── 8) Nunca conceder a anon ──────────────────────────────────────
-- REVOKE FROM PUBLIC sozinho não fecha pra anon neste projeto: há uma
-- default privilege no schema public que concede EXECUTE a anon
-- automaticamente em toda função nova (ver pg_default_acl) — REVOKE FROM
-- anon explícito abaixo (achado de hardening pós-Sprint 3.8).
REVOKE ALL ON FUNCTION public.registrar_entrega_brinde_feira(UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_entrega_brinde_feira(UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_entrega_brinde_feira(UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
