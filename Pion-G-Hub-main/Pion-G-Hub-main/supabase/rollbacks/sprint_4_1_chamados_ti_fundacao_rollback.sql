-- ============================================================
-- ROLLBACK — Sprint 4.1 (reverte 20260722150000_sprint_4_1_chamados_ti_fundacao.sql)
-- ============================================================
-- Seguro a qualquer momento antes da Sprint 4.2 existir: nenhuma tela do
-- frontend lê ou escreve nestas tabelas/RPCs ainda (fundação só de banco).
--
-- Ordem: 1) desfaz os seeds feitos em tabelas PRÉ-EXISTENTES do PBAC
-- (permissions/role_permissions — não são dropadas, só perdem as linhas
-- `tickets.*`); 2) DROP das RPCs (funções não somem com a tabela, DROP
-- explícito); 3) DROP TABLE filhas antes de pais (remove policies, índices
-- e triggers da tabela junto — não precisa DROP POLICY/INDEX em separado);
-- 4) reverte protect_sensitive_profile_fields() pro estado anterior a esta
-- migration; 5) remove user_profiles.tipo_vinculo.
--
-- ATENÇÃO: se qualquer chamado de TI já foi aberto em produção antes deste
-- rollback, todo o histórico (chamados, comentários, tempos, notificações)
-- é perdido em definitivo — DROP TABLE não tem undo. Confirme que o módulo
-- ainda não está em uso real antes de rodar isto.
-- ============================================================

-- ── Desfaz os seeds no catálogo PBAC pré-existente ──────────────────
DELETE FROM public.role_permissions
WHERE permission_id IN (SELECT id FROM public.permissions WHERE resource = 'tickets');

DELETE FROM public.permissions WHERE resource = 'tickets';

-- ── RPCs (ordem irrelevante entre si, mas depois das tabelas seria mais ──
-- ── lento por causa de dependência de tipo — dropar antes é mais simples) ──
DROP FUNCTION IF EXISTS public.ti_marcar_notificacao_lida(UUID);
DROP FUNCTION IF EXISTS public.ti_comentar_chamado(UUID, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.ti_lancar_tempo_manual(UUID, UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.ti_encerrar_tempo(UUID);
DROP FUNCTION IF EXISTS public.ti_iniciar_tempo(UUID);
DROP FUNCTION IF EXISTS public.ti_mudar_status(UUID, TEXT);
DROP FUNCTION IF EXISTS public.ti_atribuir_chamado(UUID, UUID);
DROP FUNCTION IF EXISTS public.ti_triagem_chamado(UUID, UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.ti_criar_chamado(TEXT, TEXT, UUID, TEXT, UUID);

-- ── Funções auxiliares ───────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.ti_calcular_prazo_sla(TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.ti_profiles_with_permission(TEXT);
DROP FUNCTION IF EXISTS public.ti_profiles_in_equipe(UUID);
DROP FUNCTION IF EXISTS public.ti_pode_ver_interno_chamado(UUID);
DROP FUNCTION IF EXISTS public.ti_pode_ver_chamado(UUID);
DROP FUNCTION IF EXISTS public.ti_e_solicitante(UUID);
DROP FUNCTION IF EXISTS public.ti_is_own_equipe(UUID);
DROP FUNCTION IF EXISTS public.ti_perfil_ativo_id();

-- ── Schema private (revisão do Checkpoint 2) ──────────────────────────
-- Função dropada primeiro; DROP SCHEMA (sem CASCADE) só sucede se o schema
-- já estiver vazio — falha alto e claro se algo mais tiver sido criado
-- ali por engano, em vez de apagar objetos não relacionados a esta sprint.
DROP FUNCTION IF EXISTS private.ti_comentario_interno_raw(UUID, UUID);
DROP SCHEMA IF EXISTS private;

-- ── Tabelas — filhas antes de pais ───────────────────────────────────
-- (DROP TABLE ti_chamados também derruba a sequence ti_chamados_numero_seq,
-- que é OWNED BY numero_sequencial.)
DROP TABLE IF EXISTS public.ti_notificacoes_envios;
DROP TABLE IF EXISTS public.ti_preferencias_notificacao;
DROP TABLE IF EXISTS public.ti_notificacoes;
DROP TABLE IF EXISTS public.ti_chamado_kb_artigos;
DROP TABLE IF EXISTS public.ti_kb_artigos;
DROP TABLE IF EXISTS public.ti_chamado_anexos;
DROP TABLE IF EXISTS public.ti_chamado_comentarios;
DROP TABLE IF EXISTS public.ti_chamado_historico;
DROP TABLE IF EXISTS public.ti_chamado_tempos;
DROP TABLE IF EXISTS public.ti_chamados;
DROP TABLE IF EXISTS public.ti_sla_regras;
DROP TABLE IF EXISTS public.ti_equipe_membros;
DROP TABLE IF EXISTS public.ti_categorias;
DROP TABLE IF EXISTS public.ti_equipes;

-- ── Reverte protect_sensitive_profile_fields() pro estado anterior a ────
-- ── esta migration (sem tipo_vinculo — definição original de           ──
-- ── 20260721120000_hardening_leads_feira_rls.sql).                     ──
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() IS NULL AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
  END IF;

  IF public.is_permissions_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'vendedor';
    NEW.ativo := true;
    NEW.gestor_id := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.role := OLD.role;
    NEW.ativo := OLD.ativo;
    NEW.gestor_id := OLD.gestor_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Remove user_profiles.tipo_vinculo ────────────────────────────────
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS tipo_vinculo;

NOTIFY pgrst, 'reload schema';
