-- ============================================================
-- ROLLBACK — Autoatendimento (reverte 20260716120100_autoatendimento_destinatarios.sql)
-- ============================================================
-- ATENÇÃO: após este rollback, o FRONTEND ATUAL não será compatível com o
-- banco. giftDeliveriesService.deliverAtFair, LeadCaptureForm.jsx e
-- ExistingClientGiftForm.jsx chamam registrar_entrega_brinde_feira com 12
-- argumentos nomeados (incluindo p_tipo_destinatario, p_destinatario_nome,
-- p_destinatario_empresa, p_destinatario_contato, p_confirmar_duplicidade).
-- Depois de rodar este rollback, TODO o fluxo de Autoatendimento (lead com
-- brinde e cliente existente) vai falhar em runtime até o frontend também
-- ser revertido para uma versão anterior a esta sprint — este script NÃO
-- reverte código frontend, só banco.
--
-- Este rollback reverte SÓ a migration do Autoatendimento — a Sprint 3.7
-- (brinde_feira_estoque, brinde_entrega_itens, is_gifts_deliverer, etc.)
-- permanece intacta, porque outras telas (Carga da Feira, Entregas por
-- feira do módulo /brindes) continuam dependendo dela independentemente
-- do Autoatendimento.
-- ============================================================

-- 1) Remove a RPC de 12 argumentos
DROP FUNCTION IF EXISTS public.registrar_entrega_brinde_feira(
  UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
);

-- 2) Remove índice e constraints criados pelo Autoatendimento
DROP INDEX IF EXISTS public.idx_brinde_entregas_tipo_destinatario;

ALTER TABLE public.brinde_entregas
  DROP CONSTRAINT IF EXISTS chk_brinde_entregas_destinatario;

ALTER TABLE public.brinde_entregas
  DROP CONSTRAINT IF EXISTS brinde_entregas_tipo_destinatario_check;

-- 3) Remove a coluna tipo_destinatario
-- ATENÇÃO: isto apaga a classificação (lead/cliente_existente) de toda
-- entrega gravada depois que o Autoatendimento entrou em produção — não
-- apaga a entrega em si (brinde_entregas.id continua intacto), só perde a
-- informação de "quem recebeu, em termos de negócio" daquele período.
ALTER TABLE public.brinde_entregas DROP COLUMN IF EXISTS tipo_destinatario;

-- 4) Remove a função de normalização (só usada pela RPC removida acima)
DROP FUNCTION IF EXISTS public.normalize_dedup_text(TEXT);

-- unaccent NÃO é removida — é uma extensão genérica do Postgres que pode
-- estar em uso por outra parte do banco; DROP EXTENSION aqui seria
-- destrutivo demais para o que este rollback se propõe a fazer.

-- 5) Restaura a RPC original da Sprint 3.7 (7 argumentos, só fluxo de lead)
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

-- 6) Restaura os grants da versão de 7 argumentos
REVOKE ALL ON FUNCTION public.registrar_entrega_brinde_feira(UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_entrega_brinde_feira(UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT) TO authenticated;

-- 7) Recarrega o schema cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- ATENÇÃO (repetido no final de propósito): após este rollback, o
-- frontend atual não será compatível com o banco. Reverta também o
-- frontend (ou aplique de novo as migrations do Autoatendimento) antes de
-- liberar o app para uso.
-- ============================================================
