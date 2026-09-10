-- Estabilização operacional Expo: entregas de kit em registrar_entrega_
-- brinde_feira() sempre assumiam exatamente 1 kit por chamada — visitantes
-- em grupo (1 lead cadastrado, N pessoas) não podiam receber mais de 1 kit
-- vinculado ao mesmo lead numa única entrega. Item avulso já suportava
-- quantidade arbitrária via p_itens[].quantidade — nenhuma mudança
-- necessária nesse ramo.
--
-- Mudança: novo parâmetro p_quantidade_kits (DEFAULT 1, retrocompatível —
-- chamadas existentes sem o parâmetro continuam se comportando exatamente
-- como antes). Multiplica a quantidade por componente do kit tanto na
-- validação de saldo (1ª passada) quanto na aplicação da baixa local e no
-- registro de itens entregues (2ª passada). Estoque global continua
-- INTOCADO — a regra de consumo exclusivo de brinde_feira_estoque não
-- muda, só passa a aceitar N kits na mesma operação atômica.
--
-- brinde_entregas.quantidade (sempre NULL para entregas de kit até aqui,
-- já que o detalhamento vive em brinde_entrega_itens) passa a registrar
-- p_quantidade_kits para entregas de kit — só informativo/auditoria, não
-- é usado por nenhuma leitura existente.
--
-- IMPORTANTE: CREATE OR REPLACE só substitui uma função quando a lista de
-- parâmetros é idêntica — como esta mudança adiciona um parâmetro novo, o
-- Postgres trataria como um OVERLOAD separado (ambas as assinaturas
-- coexistindo) em vez de substituir. O DROP explícito abaixo remove a
-- assinatura antiga de 12 parâmetros antes de recriar com 13, garantindo
-- que só exista uma versão da função.
DROP FUNCTION IF EXISTS public.registrar_entrega_brinde_feira(uuid, uuid, text, uuid, jsonb, text, text, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.registrar_entrega_brinde_feira(p_feira_id uuid, p_lead_id uuid DEFAULT NULL::uuid, p_tipo_entrega text DEFAULT 'item_avulso'::text, p_kit_id uuid DEFAULT NULL::uuid, p_itens jsonb DEFAULT NULL::jsonb, p_observacoes text DEFAULT NULL::text, p_origem text DEFAULT 'interno'::text, p_tipo_destinatario text DEFAULT 'lead'::text, p_destinatario_nome text DEFAULT NULL::text, p_destinatario_empresa text DEFAULT NULL::text, p_destinatario_contato text DEFAULT NULL::text, p_confirmar_duplicidade boolean DEFAULT false, p_quantidade_kits integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

    IF p_quantidade_kits IS NULL OR p_quantidade_kits <= 0 THEN
      RAISE EXCEPTION 'Quantidade de kits deve ser maior que zero';
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
    -- de cada item do kit (já multiplicado pela quantidade de kits pedida),
    -- em ordem estável, pra evitar deadlock com outras entregas
    -- concorrentes.
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

      IF v_saldo < v_item.quantidade * p_quantidade_kits THEN
        RAISE EXCEPTION 'Saldo insuficiente na feira para "%" (disponível: %, necessário: %)',
          v_item.nome, v_saldo, v_item.quantidade * p_quantidade_kits USING ERRCODE = '23514';
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
    NULL,
    CASE WHEN p_tipo_entrega = 'kit' THEN p_quantidade_kits ELSE NULL END,
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
  -- saldo local da feira e grava cada item entregue (já multiplicado pela
  -- quantidade de kits, quando aplicável), na mesma ordem estável.
  IF p_tipo_entrega = 'kit' THEN
    FOR v_item IN
      SELECT bki.brinde_id, bki.quantidade
      FROM public.brinde_kit_itens bki
      WHERE bki.kit_id = p_kit_id
      ORDER BY bki.brinde_id
    LOOP
      INSERT INTO public.brinde_feira_estoque (feira_id, brinde_id, quantidade_entregue)
      VALUES (p_feira_id, v_item.brinde_id, v_item.quantidade * p_quantidade_kits)
      ON CONFLICT (feira_id, brinde_id) DO UPDATE
        SET quantidade_entregue = public.brinde_feira_estoque.quantidade_entregue + EXCLUDED.quantidade_entregue,
            updated_at = NOW();

      INSERT INTO public.brinde_entrega_itens (entrega_id, brinde_id, quantidade)
      VALUES (v_entrega.id, v_item.brinde_id, v_item.quantidade * p_quantidade_kits);
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
$function$;

-- Como o DROP+CREATE acima criou um objeto novo (assinatura diferente da
-- anterior), ele não herda os GRANT/REVOKE de hardening aplicados à
-- assinatura antiga (migration 20260716120100 / 20260717100000). Reaplica
-- exatamente o mesmo padrão usado nas outras RPCs de brinde/feira — nunca
-- conceder a anon, nem via PUBLIC — e alinha com o grant set real da RPC
-- irmã registrar_carga_feira (authenticated, service_role, postgres).
REVOKE ALL ON FUNCTION public.registrar_entrega_brinde_feira(
  UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_entrega_brinde_feira(
  UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER
) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_entrega_brinde_feira(
  UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_entrega_brinde_feira(
  UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER
) TO service_role;

NOTIFY pgrst, 'reload schema';
