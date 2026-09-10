-- Hotfix: confirmar_entrega_brinde() aplicava baixa direta no estoque
-- global (brindes.estoque_atual) mesmo quando a entrega estava vinculada
-- a uma feira (feira_id preenchido) — nesse caso, o consumo deveria vir
-- exclusivamente da carga local da feira (brinde_feira_estoque), já
-- debitada do estoque global no momento do envio via registrar_carga_feira.
-- Isso causava baixa dupla no estoque global para entregas de feira feitas
-- por este caminho, sem nunca atualizar quantidade_entregue local.
--
-- Entregas sem feira_id (feira_id IS NULL) continuam usando este fluxo
-- normalmente — comportamento intencional para entregas internas/avulsas
-- fora de feira, sem carga local a consumir.

CREATE OR REPLACE FUNCTION public.confirmar_entrega_brinde(p_entrega_id uuid, p_entregue_por_profile_id uuid DEFAULT NULL::uuid)
 RETURNS brinde_entregas
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_entrega  public.brinde_entregas%ROWTYPE;
  v_item     RECORD;
BEGIN
  IF NOT public.is_gifts_manager() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores, marketing ou gestores podem confirmar entregas de brindes'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_entrega
  FROM public.brinde_entregas
  WHERE id = p_entrega_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrega não encontrada';
  END IF;

  IF v_entrega.status <> 'liberado' THEN
    RAISE EXCEPTION 'Esta entrega já foi %', v_entrega.status;
  END IF;

  IF v_entrega.feira_id IS NOT NULL THEN
    RAISE EXCEPTION 'Entregas vinculadas a feira devem utilizar o estoque da carga da feira.'
      USING ERRCODE = '23514';
  END IF;

  IF v_entrega.tipo_entrega = 'item_avulso' THEN
    PERFORM public.registrar_movimentacao_brinde(
      v_entrega.brinde_id,
      'saida',
      v_entrega.quantidade,
      'Entrega confirmada',
      COALESCE(v_entrega.contexto_tipo, 'entrega_avulsa'),
      v_entrega.contexto_descricao,
      v_entrega.feira_id,
      v_entrega.lead_id,
      p_entregue_por_profile_id,
      v_entrega.created_by,
      'Gerado automaticamente pela confirmação da entrega ' || v_entrega.id,
      v_entrega.id
    );
  ELSE
    FOR v_item IN
      SELECT brinde_id, quantidade
      FROM public.brinde_kit_itens
      WHERE kit_id = v_entrega.kit_id
      ORDER BY brinde_id
    LOOP
      PERFORM public.registrar_movimentacao_brinde(
        v_item.brinde_id,
        'saida',
        v_item.quantidade,
        'Entrega de kit confirmada',
        COALESCE(v_entrega.contexto_tipo, 'entrega_avulsa'),
        v_entrega.contexto_descricao,
        v_entrega.feira_id,
        v_entrega.lead_id,
        p_entregue_por_profile_id,
        v_entrega.created_by,
        'Gerado automaticamente pela confirmação da entrega ' || v_entrega.id,
        v_entrega.id
      );
    END LOOP;
  END IF;

  UPDATE public.brinde_entregas
    SET status = 'entregue',
        entregue_em = NOW(),
        entregue_por_profile_id = p_entregue_por_profile_id
    WHERE id = p_entrega_id
    RETURNING * INTO v_entrega;

  RETURN v_entrega;
END;
$function$;
