-- ============================================================
-- INVENTÁRIO SOMENTE LEITURA — schema legado (compatível com PROD hoje)
-- ============================================================
-- GATE 5.2G.3B, Etapa 7. §1-§8 abaixo são compatíveis com o schema
-- atualmente aplicado em uginlvintfslfbsfgugq (PROD) — NÃO referenciam
-- setores/user_setor_vinculos/setor_modulos/setor_role_permissions/
-- modulos de forma incondicional (nenhuma dessas tabelas existe em PROD
-- hoje). Consultam somente auth.users e public.user_profiles.
--
-- GATE 5.2G.4D acrescentou, ao final do arquivo (antes do ROLLBACK),
-- uma seção adicional de COMPATIBILIDADE que PASSA A referenciar
-- setores/modulos/setor_modulos — mas só condicionalmente, via
-- to_regclass()/information_schema (nunca uma referência estática que
-- quebraria o parser num ambiente onde essas tabelas não existem) e via
-- SQL dinâmico (EXECUTE) para a checagem das 9 combinações, exatamente
-- para permanecer seguro tanto em PROD hoje (tabelas ausentes) quanto
-- em qualquer estado futuro dessas tabelas. Ver essa seção para o
-- detalhe.
--
-- Para uso automatizado (não só manual no SQL Editor): invocar via
-- `psql -v ON_ERROR_STOP=1 -f legacy_prod_inventory_readonly.sql` — um
-- bloqueio da seção de compatibilidade emite RAISE EXCEPTION, que só
-- produz código de saída não-zero em psql com ON_ERROR_STOP=1.
--
-- NÃO EXECUTADO CONTRA HML/PROD NESTE GATE. Preparado para uso manual
-- futuro (mesmo padrão do GATE 5.2G.2A: rodado por Nícolas diretamente
-- no SQL Editor de PROD, ou por um gate de leitura remota autorizado
-- separadamente) — e também para uso como preflight automatizado antes
-- de qualquer aplicação futura da migration frozen
-- 20260901000000_sector_access_foundation_staged.sql contra qualquer
-- ambiente (GATE 5.2G.4D).
-- ============================================================

BEGIN TRANSACTION READ ONLY;

-- §1 — Perfis existentes, com role/status/cargo atuais e e-mail via
-- auth.users. to_jsonb protege contra coluna opcional ausente em algum
-- snapshot (ex.: 'cargo' pode não existir em toda instalação histórica).
SELECT
  up.id                          AS profile_id,
  up.user_id,
  up.nome,
  au.email,
  up.role                        AS role_atual,
  up.ativo,
  (to_jsonb(up.*) ->> 'cargo')   AS cargo_atual,
  (to_jsonb(up.*) ->> 'setor')   AS setor_legado_texto,
  up.gestor_id,
  up.created_at
FROM public.user_profiles up
LEFT JOIN auth.users au ON au.id = up.user_id
ORDER BY up.nome;

-- §2 — Auth sem perfil (existe em auth.users, nenhuma linha
-- correspondente em user_profiles).
SELECT au.id AS user_id, au.email, au.created_at
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id)
ORDER BY au.created_at;

-- §3 — Perfis sem Auth correspondente (não deveria ocorrer com FK —
-- comprovar, não presumir).
SELECT up.id AS profile_id, up.nome, up.user_id
FROM public.user_profiles up
WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = up.user_id);

-- §4 — Duplicidade: mais de um user_profiles para o mesmo user_id.
SELECT user_id, count(*) AS qtd
FROM public.user_profiles
GROUP BY user_id
HAVING count(*) > 1;

-- §5 — Usuários inativos.
SELECT up.id AS profile_id, up.nome, au.email, up.role
FROM public.user_profiles up
LEFT JOIN auth.users au ON au.id = up.user_id
WHERE up.ativo = false
ORDER BY up.nome;

-- §6 — Contagem por papel (role legado atual).
SELECT role, count(*) AS quantidade, count(*) FILTER (WHERE ativo) AS ativos
FROM public.user_profiles
GROUP BY role
ORDER BY role;

-- §7 — Totais brutos (Auth vs. Perfis) para a reconciliação do §8.
SELECT
  (SELECT count(*) FROM auth.users)         AS total_auth,
  (SELECT count(*) FROM public.user_profiles) AS total_perfis;

-- §8 — Reconciliação MATEMÁTICA das contagens: prova, por soma, que
-- total_auth = perfis_com_auth_correspondente + auth_sem_perfil, e que
-- total_perfis = perfis_com_auth_correspondente + perfis_sem_auth —
-- nunca presumida, sempre recomputada a partir de §1/§2/§3/§7.
WITH totais AS (
  SELECT
    (SELECT count(*) FROM auth.users) AS total_auth,
    (SELECT count(*) FROM public.user_profiles) AS total_perfis,
    (SELECT count(*) FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id)) AS auth_sem_perfil,
    (SELECT count(*) FROM public.user_profiles up WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = up.user_id)) AS perfis_sem_auth,
    (SELECT count(*) FROM public.user_profiles up WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.id = up.user_id)) AS perfis_com_auth
)
SELECT
  total_auth, total_perfis, auth_sem_perfil, perfis_sem_auth, perfis_com_auth,
  (perfis_com_auth + auth_sem_perfil = total_auth)   AS reconciliacao_auth_ok,
  (perfis_com_auth + perfis_sem_auth = total_perfis) AS reconciliacao_perfis_ok
FROM totais;

-- ============================================================
-- COMPATIBILIDADE SETOR_MODULOS — FUNDAÇÃO STAGED (GATE 5.2G.4D)
-- ============================================================
-- Achado real (GATE 5.2G.4C/4D, comprovado em container local): a
-- migration CONGELADA 20260901000000_sector_access_foundation_staged.sql
-- (SHA-256 46f54a6cf26c31b9303cc4dbe3bad7f1bf62b88684dbbbdb64af990e6219b013
-- — nunca editada para "corrigir" isto) insere em public.setor_modulos
-- só (setor_id, modulo_id), nunca a coluna legada `modulo` (TEXT NOT
-- NULL na estrutura real de V2/V3). Isso é seguro em 3 dos 4 estados
-- possíveis do ambiente-alvo e quebra atomicamente (sem corrupção) no
-- quarto. Esta seção classifica o ambiente ANTES de qualquer aplicação,
-- só diagnostica e bloqueia — nunca insere, corrige coluna, relaxa
-- constraint ou cria tabela.
--
-- Os 4 estados possíveis e o que cada um significa para a migration
-- frozen (ver também a matriz em
-- docs/architecture/engineering/access-control-staged-rollout-v1.md):
--   SAFE_CLEAN_BASELINE      — public.setor_modulos não existe (PROD
--                              hoje). A migration cria a tabela no
--                              formato novo, sem a coluna legada.
--   SAFE_FOUNDATION_SCHEMA   — a tabela existe, mas no formato desta
--                              própria fundação (sem `modulo` NOT NULL
--                              impondo preenchimento incompatível).
--   SAFE_ADVANCED_COMPLETE   — a tabela existe no formato real V2/V3
--                              (`modulo` TEXT NOT NULL) E as 9
--                              combinações setor×módulo que a migration
--                              semeia já existem todas — o INSERT da
--                              Parte 3 não terá nenhuma linha nova a
--                              criar (confirmado: é exatamente o estado
--                              real de HML, tljscgsaqofgrfbjuyif, hoje).
--   BLOCKED_PARTIAL_ADVANCED — a tabela existe no formato real V2/V3 e
--                              FALTA pelo menos uma das 9 combinações —
--                              o INSERT tentaria criar essa linha sem
--                              preencher `modulo`, violando NOT NULL e
--                              abortando a migration inteira
--                              (atomicamente — nunca há corrupção nem
--                              estado parcial, só a aplicação inteira
--                              rejeitada). Este script BLOQUEIA antes
--                              disso.
DO $$
DECLARE
  v_tabela_setor_modulos_existe boolean;
  v_coluna_modulo_existe        boolean;
  v_coluna_modulo_not_null      boolean;
  v_pares                       text[][] := ARRAY[
    ARRAY['marketing', 'marketing_dashboard'],
    ARRAY['marketing', 'marketing_captacao_leads'],
    ARRAY['marketing', 'marketing_gestao_leads'],
    ARRAY['marketing', 'marketing_feiras'],
    ARRAY['marketing', 'marketing_brindes'],
    ARRAY['marketing', 'marketing_pesquisas'],
    ARRAY['comercial', 'marketing_captacao_leads'],
    ARRAY['tecnologia_informacao', 'ti_atendimento_interno'],
    ARRAY['customer_success', 'customer_success']
  ];
  v_par      text[];
  v_existe   boolean;
  v_ausentes int := 0;
  v_ausentes_lista text := '';
  v_estado text;
BEGIN
  -- to_regclass() é sempre seguro (nunca lança erro de parser/catálogo
  -- por objeto ausente, só retorna NULL) — mesmo padrão já usado em
  -- todo o resto deste repositório (rollback/migration desta
  -- fundação).
  v_tabela_setor_modulos_existe := (to_regclass('public.setor_modulos') IS NOT NULL);

  IF NOT v_tabela_setor_modulos_existe THEN
    v_estado := 'SAFE_CLEAN_BASELINE';
  ELSE
    -- information_schema é catálogo puro — seguro consultar mesmo que
    -- a coluna específica não exista (retorna zero linhas, nunca erro).
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'setor_modulos' AND column_name = 'modulo'
    ) INTO v_coluna_modulo_existe;

    IF v_coluna_modulo_existe THEN
      SELECT (is_nullable = 'NO') INTO v_coluna_modulo_not_null
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'setor_modulos' AND column_name = 'modulo';
    ELSE
      v_coluna_modulo_not_null := false;
    END IF;

    IF NOT v_coluna_modulo_existe OR NOT v_coluna_modulo_not_null THEN
      v_estado := 'SAFE_FOUNDATION_SCHEMA';
    ELSIF to_regclass('public.setores') IS NULL OR to_regclass('public.modulos') IS NULL THEN
      -- setor_modulos já existe com modulo NOT NULL, mas as tabelas
      -- setores/modulos (necessárias para resolver setor_id/modulo_id
      -- por código e checar as 9 combinações) não existem — estado não
      -- verificável com segurança. Trata-se como bloqueado: nunca
      -- presumir completude sem poder comprová-la.
      v_estado := 'BLOCKED_PARTIAL_ADVANCED';
      v_ausentes_lista := '(não verificável: public.setores ou public.modulos ausente)';
    ELSE
      -- SQL dinâmico (EXECUTE) mesmo já sabendo que as 3 tabelas
      -- existem neste ramo — mantém o padrão pedido pelo gate de nunca
      -- deixar uma referência estática a estas tabelas fora do ramo
      -- condicional que já provou sua existência.
      FOREACH v_par SLICE 1 IN ARRAY v_pares
      LOOP
        EXECUTE format(
          'SELECT EXISTS (SELECT 1 FROM public.setor_modulos sm JOIN public.setores s ON s.id = sm.setor_id JOIN public.modulos m ON m.id = sm.modulo_id WHERE s.codigo = %L AND m.codigo = %L)',
          v_par[1], v_par[2]
        ) INTO v_existe;

        IF NOT v_existe THEN
          v_ausentes := v_ausentes + 1;
          v_ausentes_lista := v_ausentes_lista || (CASE WHEN v_ausentes_lista = '' THEN '' ELSE ', ' END) || (v_par[1] || '|' || v_par[2]);
        END IF;
      END LOOP;

      IF v_ausentes = 0 THEN
        v_estado := 'SAFE_ADVANCED_COMPLETE';
      ELSE
        v_estado := 'BLOCKED_PARTIAL_ADVANCED';
      END IF;
    END IF;
  END IF;

  RAISE NOTICE 'COMPATIBILIDADE SETOR_MODULOS — FUNDAÇÃO STAGED: estado=%, combinacoes_ausentes=%, lista_ausentes=%', v_estado, v_ausentes, v_ausentes_lista;

  IF v_estado = 'BLOCKED_PARTIAL_ADVANCED' THEN
    RAISE EXCEPTION 'BLOQUEADO: setor_modulos V2/V3 parcial possui coluna modulo NOT NULL e combinações ausentes. A migration frozen 20260901000000 não pode ser aplicada neste estado. Combinações ausentes (setor_codigo|modulo_codigo, apenas códigos técnicos, sem PII): %', v_ausentes_lista;
  END IF;
END $$;

ROLLBACK;
