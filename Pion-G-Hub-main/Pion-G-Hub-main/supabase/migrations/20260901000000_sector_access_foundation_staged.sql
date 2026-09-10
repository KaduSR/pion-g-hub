-- ============================================================
-- MIGRATION: Fundação do Controle de Acesso Setorial (rollout progressivo)
-- ============================================================
-- GATE 5.2G.3B — PR A. Origem: reaproveita a lógica JÁ VALIDADA em
-- 20260826120000_access_control_organizational_v2.sql e
-- 20260827000000_sector_driven_access_v3.sql (branch
-- hotfix/access-control-organizational-roles-v2, PR #35) — nenhuma das
-- duas é editada ou renomeada; esta é uma migration NOVA, com timestamp
-- novo, construída a partir daquela lógica mas reestruturada para um
-- rollout seguro em fases.
--
-- DIFERENÇA DELIBERADA EM RELAÇÃO A V2/V3 (decisão arquitetural deste
-- gate, registrada aqui por transparência):
--   1. V2 introduziu 'admin_ti'/'coordenador' como parte do modelo de
--      papéis; V3 REVERTEU essa decisão (comentário da própria V3:
--      "'admin' NÃO é mais tratado como legado... reversão explícita da
--      decisão do V2 de empurrar tudo para admin_ti"). Como nem V2 nem V3
--      jamais foram aplicadas em PROD (confirmado no GATE 5.2G.3A —
--      nenhuma das 7 migrations está no histórico remoto de
--      uginlvintfslfbsfgugq), não existe NENHUM usuário real com role
--      'admin_ti'/'coordenador' a preservar. Esta fundação vai direto ao
--      modelo CANÔNICO FINAL (admin/executivo/gestor/operador) sem
--      recriar o desvio intermediário do V2 — 'admin_ti' e 'coordenador'
--      simplesmente não são criados aqui.
--   2. V2 semeou 8 setores placeholder e V3 precisou reconciliá-los (4
--      promovidos, 1 renomeado, 4 preservados como legado) porque V2 já
--      estava aplicada em HML com esse seed quando V3 rodou. Esta
--      fundação semeia diretamente o catálogo CANÔNICO final de 22
--      setores (7 produtivo + 15 administrativo, mesmo catálogo
--      comprovado da V3), sem a reconciliação de duas fases — não há
--      seed intermediário a reconciliar, porque nenhuma versão anterior
--      deste catálogo foi aplicada em PROD.
--   3. NENHUMA função pré-existente é redefinida: is_permissions_admin()
--      e has_effective_permission() permanecem BYTE-A-BYTE como estão
--      hoje em schema.sql (confirmado por leitura direta antes de
--      escrever esta migration) — nem sequer um CREATE OR REPLACE
--      idêntico é emitido, para não arriscar tocar em nada que já
--      funciona. Isso é possível porque nenhuma capacidade nova desta
--      fundação depende de alterar essas duas funções (ver invariante,
--      Etapa 4 do gate).
--
-- INVARIANTE CENTRAL DESTA MIGRATION (comprovado pelo teste
-- supabase/tests/sector_access_foundation_staged_test.sql): aplicar esta
-- migration sozinha, sem chamar admin_prepare_user_sector_access_v1(),
-- produz DELTA ZERO no acesso efetivo de qualquer usuário existente.
-- Isso é garantido por construção, não por sorte:
--   - Toda tabela é NOVA (nenhuma tabela existente é alterada, exceto
--     ADD COLUMN opcional em `permissions`, nunca lida por código
--     legado).
--   - Toda role nova (`executivo`, `operador`) não corresponde a
--     NENHUM `user_profiles.role` existente hoje — o CHECK constraint de
--     `user_profiles.role` NÃO é alterado por esta migration (permanece
--     admin/marketing/gestor/vendedor) — logo nenhum usuário pode sequer
--     ASSUMIR uma role nova por esta migration.
--   - `has_effective_permission()`/`is_permissions_admin()` continuam
--     ignorando por completo `setores`/`user_setor_vinculos`/
--     `setor_role_permissions` — as tabelas novas existem, mas nenhum
--     código de autorização as lê ainda.
--   - A RPC de preparação (Parte 6) NUNCA escreve em
--     `user_profiles.role`/`gestor_id` — só em `user_setor_vinculos`
--     (tabela nova, não lida por autorização) e em
--     `public.user_role_staging` (tabela nova, de estado ainda não
--     efetivo). Ver justificativa detalhada na Parte 6.
--
-- Nenhuma migration remota é aplicada por esta tarefa (HARD STOP deste
-- gate) — fica em rascunho local até revisão/teste/autorização
-- explícitos.
--
-- ATOMICIDADE (achado real do GATE 5.2G.3B, Etapa 10, cenário 4 —
-- corrige uma suposição inicial desta mesma migration): nenhuma das 7
-- migrations já existentes neste repositório (V2/V3/CS/hotfixes/
-- Grupos de Acesso) tem `BEGIN`/`COMMIT` explícito — presume-se que o
-- runner de migrations (`supabase db push`) envelopa cada arquivo numa
-- transação implícita. Testado agora, diretamente: `psql -f arquivo.sql`
-- SEM `BEGIN`/`COMMIT` explícito NÃO é atômico — cada statement
-- autocommita individualmente (confirmado injetando uma falha
-- deliberada no meio do arquivo: os objetos criados ANTES da falha
-- permaneceram, mesmo com a falha abortando o restante). Um teste
-- isolado (`psql -c "stmt1; stmt2_falha; stmt3"`, tudo numa única
-- mensagem de protocolo) confirmou que o Postgres SIM trata múltiplos
-- statements enviados como uma ÚNICA mensagem como uma transação
-- implícita — a diferença está em COMO o arquivo é enviado ao servidor,
-- não numa regra do Postgres. Não foi possível verificar, dentro do
-- escopo deste gate, se `supabase db push` envia o arquivo inteiro como
-- uma única mensagem (atômico) ou statement-a-statement como `psql -f`
-- (não atômico) — em vez de presumir, esta migration se torna
-- explicitamente atômica por si mesma (`BEGIN`/`COMMIT` abaixo),
-- eliminando a dependência dessa suposição não verificada. As 7
-- migrations existentes (congeladas no PR #35) NÃO são alteradas por
-- este achado — fica registrado aqui e no relatório deste gate como um
-- risco a investigar antes de aplicá-las a PROD.
-- ============================================================

BEGIN;

-- ============================================================
-- PARTE 0 — PREFLIGHT: aborta se qualquer permissão de que esta
-- migration depende (para a seed da matriz setorial, Parte 5) não
-- existir. Mesmo padrão de defesa já usado em V2/V3.
-- ============================================================
DO $$
DECLARE
  v_required_codes TEXT[] := ARRAY[
    'profile.view', 'profile.edit_own', 'profile.change_password_own',
    'tickets.create', 'tickets.view_own', 'tickets.comment_own',
    'dashboard.view', 'dashboard.view_team',
    'fairs.view', 'fairs.create', 'fairs.edit', 'fairs.finish',
    'fairs.team_manage', 'fairs.view_all_teams',
    'leads.capture', 'leads.edit', 'leads.view_own', 'leads.manage_own',
    'leads.view_team', 'leads.manage_team',
    'gifts.view', 'gifts.create', 'gifts.edit', 'gifts.stock_adjust',
    'gifts.deliver', 'gifts.cancel_delivery', 'gifts.manage',
    'reports.export', 'reports.export_team',
    'satisfaction.view', 'satisfaction.manage', 'satisfaction.responses_view',
    'tickets.view_team', 'tickets.manage_team', 'tickets.triage',
    'tickets.view_all', 'tickets.manage_all', 'tickets.reports_view',
    'tickets.time_start', 'tickets.time_log', 'tickets.time_view_team'
  ];
  v_missing TEXT[];
BEGIN
  SELECT array_agg(code) INTO v_missing
  FROM unnest(v_required_codes) AS code
  WHERE NOT EXISTS (SELECT 1 FROM public.permissions p WHERE p.code = code);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Migration abortada: permissões obrigatórias ausentes em public.permissions: %. Nenhuma alteração foi aplicada.', v_missing
      USING ERRCODE = '22023';
  END IF;
END $$;


-- ============================================================
-- RASTREAMENTO DE DELTA (GATE 5.2G.3C — rollback orientado por
-- propriedade, não por código hardcoded)
-- ============================================================
-- O rollback NÃO pode presumir que apagar por `code IN (...)` é seguro —
-- se um ambiente adiantado (ex.: V2/V3 já aplicadas) já tiver criado um
-- 'setores' com codigo='marketing' ANTES desta migration, ela nunca
-- duplica (ON CONFLICT DO NOTHING), mas um rollback ingênuo por código
-- apagaria uma linha que NÃO foi criada por esta migration. Esta tabela
-- registra, para cada objeto identificado por chave natural, se ele
-- REALMENTE não existia (NOT EXISTS) IMEDIATAMENTE ANTES do INSERT que o
-- criou — nunca depois. O rollback (sector_access_foundation_staged_rollback_empty.sql)
-- consulta exclusivamente este registro, nunca uma lista de códigos
-- fixa. Mesmo padrão já usado em `private.access_v3_role_permission_delta`
-- (V3, GATE 5.2B.3), generalizado aqui para múltiplos tipos de objeto via
-- coluna `kind` — schema `private`, não exposto ao PostgREST, mesmo
-- padrão de `private.ti_comentario_interno_raw` (Sprint 4.1).
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.staged_foundation_delta (
  kind        TEXT NOT NULL,
  natural_key TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kind, natural_key)
);

ALTER TABLE private.staged_foundation_delta ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.staged_foundation_delta FROM PUBLIC, anon, authenticated;
-- Nenhuma policy = nega tudo por padrão para qualquer role sujeita a
-- RLS; o REVOKE explícito acima é defesa em profundidade redundante com
-- `private` não estar na lista de schemas expostos ao PostgREST — as
-- duas proteções juntas, nunca uma no lugar da outra. Não contém PII:
-- só um discriminador de tipo e uma chave textual (código de setor/
-- role/módulo, nunca um dado de usuário).

-- ============================================================
-- PARTE 1 — Papéis canônicos novos (catálogo PBAC), SEM tocar no CHECK
-- de user_profiles.role. Nenhum usuário real pode assumir 'executivo'/
-- 'operador' até uma migration futura (PR B) alterar esse CHECK — por
-- desenho, não por omissão.
-- ============================================================
-- Registra o delta ANTES de inserir — só os códigos que AINDA NÃO
-- existem em `roles`. Se este ambiente já tivesse (hipoteticamente) uma
-- role 'executivo' de outra origem, ela NÃO entra aqui, e o rollback
-- nunca a apagaria.
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'role', v.code
FROM (VALUES ('executivo'), ('operador')) AS v(code)
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = v.code)
ON CONFLICT DO NOTHING;

INSERT INTO public.roles (code, nome, descricao, is_system) VALUES
  ('executivo', 'Executivo', 'Visão executiva/estratégica da organização — sem acesso a Marketing/Leads por padrão. Papel PREPARADO nesta fundação; não atribuível a nenhum user_profiles.role real até a migration de cutover (PR B) ampliar o CHECK correspondente.', true),
  ('operador',  'Operador',  'Perfil de execução operacional, escopo definido pelo setor vinculado. Papel PREPARADO nesta fundação; não atribuível a nenhum user_profiles.role real até a migration de cutover (PR B) ampliar o CHECK correspondente.', true)
ON CONFLICT (code) DO NOTHING;

-- Baseline mínimo universal — idêntico em espírito ao já usado por
-- 'gestor'/'vendedor' hoje (profile.*), mas SEM nenhuma permissão de
-- módulo específico. Inerte: nenhum user_profiles.role='executivo'/
-- 'operador' existe para herdar isto.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  ('executivo', 'profile.view'), ('executivo', 'profile.edit_own'), ('executivo', 'profile.change_password_own'),
  ('executivo', 'tickets.create'), ('executivo', 'tickets.view_own'), ('executivo', 'tickets.comment_own'),
  ('operador',  'profile.view'), ('operador',  'profile.edit_own'), ('operador',  'profile.change_password_own'),
  ('operador',  'tickets.create'), ('operador', 'tickets.view_own'), ('operador', 'tickets.comment_own')
) AS seed(role_code, permission_code)
JOIN public.roles r ON r.code = seed.role_code
JOIN public.permissions p ON p.code = seed.permission_code
ON CONFLICT (role_id, permission_id) DO NOTHING;


-- ============================================================
-- PARTE 2 — Catálogo de setores + user_setor_vinculos (com `principal`
-- desde a criação — combina em uma única tabela o que V2 criou e o que
-- V3 precisou adicionar depois via ALTER, já que aqui não há usuário
-- real herdando o formato antigo).
--
-- GATE 5.2G.3C — RASTREIA A CRIAÇÃO DA TABELA EM SI, não só das linhas:
-- `setores` é o MESMO nome de tabela que V2/V3 usam. Num ambiente
-- adiantado (V2/V3 já aplicadas), `CREATE TABLE IF NOT EXISTS` abaixo é
-- um no-op estrutural — a tabela de V2/V3 permanece como está. Sem este
-- registro, um rollback que faz `DROP TABLE public.setores`
-- incondicional destruiria a tabela e todos os dados de V2/V3, mesmo
-- esta migration nunca a tendo criado. Verificado ANTES do CREATE TABLE.
-- ============================================================
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'table_created', 'public.setores'
WHERE to_regclass('public.setores') IS NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.setores (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  codigo      TEXT NOT NULL UNIQUE,
  nome        TEXT NOT NULL,
  categoria   TEXT CHECK (categoria IN ('produtivo', 'administrativo', 'outro')),
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

-- GATE 5.2G.3C — as policies abaixo usam OS MESMOS NOMES que V2/V3
-- ("setores_select_authenticated"/"setores_write_permissions_admin").
-- `DROP POLICY IF EXISTS ...; CREATE POLICY ...` SEMPRE substitui
-- qualquer definição existente sob aquele nome — se `setores` já existe
-- (ambiente adiantado, tabela criada por V2/V3), rodar isso
-- incondicionalmente SOBRESCREVERIA silenciosamente a policy real de
-- V2/V3 pela versão desta fundação, mesmo que sejam diferentes.
-- Corrigido: só cria/substitui a policy quando esta migration
-- COMPROVADAMENTE criou a tabela agora (delta 'table_created' já
-- registrado acima) — se a tabela já existia, a policy de V2/V3
-- permanece exatamente como estava, intocada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.setores') THEN
    EXECUTE 'DROP POLICY IF EXISTS "setores_select_authenticated" ON public.setores';
    EXECUTE 'CREATE POLICY "setores_select_authenticated" ON public.setores FOR SELECT TO authenticated USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "setores_write_permissions_admin" ON public.setores';
    EXECUTE 'CREATE POLICY "setores_write_permissions_admin" ON public.setores FOR ALL TO authenticated USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin())';
  END IF;
END $$;

-- REVOKE/GRANT são seguros incondicionalmente (convergem para o mesmo
-- estado, nunca revogam algo que V2/V3 concederam a mais — o padrão
-- aqui é idêntico ao que V2/V3 já configuram para esta mesma tabela).
REVOKE ALL ON public.setores FROM anon;
GRANT SELECT ON public.setores TO authenticated;

-- Catálogo canônico final (22 setores), semeado diretamente — ver nota
-- de cabeçalho (item 2): nenhuma reconciliação de duas fases é
-- necessária aqui. Delta registrado ANTES do INSERT — só os códigos que
-- ainda não existem (relevante se um ambiente adiantado, ex.: V2/V3 já
-- aplicadas, já tiver criado 'marketing'/'comercial'/'logistica' antes
-- desta migration rodar).
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'setor', v.codigo
FROM (VALUES
  ('comercial'),('marketing'),('logistica'),('tecnologia_informacao'),
  ('compras'),('almoxarifado'),('pcp'),('faturamento'),('financeiro'),
  ('engenharia_industrial'),('qualidade'),('rh'),('manutencao'),
  ('seguranca_trabalho'),('customer_success'),('corte'),('dobra'),
  ('pacote'),('etiquetagem'),('embalagem_nao_esteril'),
  ('embalagem_esteril'),('expedicao')
) AS v(codigo)
WHERE NOT EXISTS (SELECT 1 FROM public.setores WHERE codigo = v.codigo)
ON CONFLICT DO NOTHING;

INSERT INTO public.setores (codigo, nome, categoria) VALUES
  ('comercial',              'Comercial',                  'administrativo'),
  ('marketing',              'Marketing',                  'administrativo'),
  ('logistica',              'Logística',                  'administrativo'),
  ('tecnologia_informacao',  'Tecnologia da Informação',   'administrativo'),
  ('compras',                'Compras',                    'administrativo'),
  ('almoxarifado',           'Almoxarifado',                'administrativo'),
  ('pcp',                    'PCP',                         'administrativo'),
  ('faturamento',            'Faturamento',                 'administrativo'),
  ('financeiro',             'Financeiro',                  'administrativo'),
  ('engenharia_industrial',  'Engenharia Industrial',       'administrativo'),
  ('qualidade',              'Qualidade',                   'administrativo'),
  ('rh',                     'RH',                          'administrativo'),
  ('manutencao',             'Manutenção',                  'administrativo'),
  ('seguranca_trabalho',     'Segurança do Trabalho',       'administrativo'),
  ('customer_success',       'Customer Success',            'administrativo'),
  ('corte',                  'Corte',                       'produtivo'),
  ('dobra',                  'Dobra',                       'produtivo'),
  ('pacote',                 'Pacote',                      'produtivo'),
  ('etiquetagem',            'Etiquetagem',                 'produtivo'),
  ('embalagem_nao_esteril',  'Embalagem não estéril',       'produtivo'),
  ('embalagem_esteril',      'Embalagem estéril',           'produtivo'),
  ('expedicao',              'Expedição',                   'produtivo')
ON CONFLICT (codigo) DO NOTHING;

DO $$
DECLARE v_total INT;
BEGIN
  SELECT count(*) INTO v_total FROM public.setores WHERE codigo IN (
    'comercial','marketing','logistica','tecnologia_informacao','compras',
    'almoxarifado','pcp','faturamento','financeiro','engenharia_industrial',
    'qualidade','rh','manutencao','seguranca_trabalho','customer_success',
    'corte','dobra','pacote','etiquetagem','embalagem_nao_esteril',
    'embalagem_esteril','expedicao'
  );
  IF v_total <> 22 THEN
    RAISE EXCEPTION 'Migration abortada: catálogo de setores canônicos divergente (encontrado %, esperado 22).', v_total
      USING ERRCODE = '22023';
  END IF;
END $$;

-- user_setor_vinculos: tabela NOVA, não lida por NENHUM código de
-- autorização legado (confirmado por busca antes de escrever esta
-- migration: has_effective_permission()/is_permissions_admin()/
-- is_own_or_team_lead() não a referenciam). Escrever aqui é
-- estruturalmente inerte até uma migration futura ensinar
-- has_effective_permission() a consultá-la.
-- Mesmo nome de tabela que V2/V3 — mesmo rastreamento de criação.
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'table_created', 'public.user_setor_vinculos'
WHERE to_regclass('public.user_setor_vinculos') IS NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_setor_vinculos (
  profile_id  UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  setor_id    UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  principal   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, setor_id)
);

CREATE INDEX IF NOT EXISTS idx_user_setor_vinculos_setor ON public.user_setor_vinculos (setor_id);
CREATE INDEX IF NOT EXISTS idx_user_setor_vinculos_ativo ON public.user_setor_vinculos (ativo);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_setor_vinculos_principal_ativo
  ON public.user_setor_vinculos (profile_id)
  WHERE principal AND ativo;

ALTER TABLE public.user_setor_vinculos ENABLE ROW LEVEL SECURITY;

-- Leitura restrita, desde o início, a admin ou à própria linha — mais
-- estreita do que a versão inicial do V2 (que abria escopo ampliado para
-- gestor/coordenador desde o começo). Diferido de propósito: nenhum
-- vínculo real existe ainda; a visibilidade de equipe pode ser adicionada
-- no PR B, quando fizer diferença prática.
--
-- Mesma proteção da Parte 2 (setores): só cria/substitui a policy
-- "user_setor_vinculos_select" quando esta migration comprovadamente
-- criou a tabela agora — se já existia (V2/V3), a policy real deles
-- (com o escopo ampliado gestor/coordenador) permanece intocada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.user_setor_vinculos') THEN
    EXECUTE 'DROP POLICY IF EXISTS "user_setor_vinculos_select" ON public.user_setor_vinculos';
    EXECUTE 'CREATE POLICY "user_setor_vinculos_select" ON public.user_setor_vinculos FOR SELECT TO authenticated USING (public.is_permissions_admin() OR profile_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()))';
  END IF;
END $$;

-- Nenhuma policy de escrita para authenticated — a única escrita é pela
-- RPC SECURITY DEFINER (Parte 6), que bypassa RLS por rodar como dono.
REVOKE ALL ON public.user_setor_vinculos FROM anon, authenticated;
GRANT SELECT ON public.user_setor_vinculos TO authenticated;


-- ============================================================
-- PARTE 3 — Catálogo de módulos + setor_modulos (com modulo_id desde a
-- criação — mesma razão da Parte 2: nada aqui herda formato antigo).
-- ============================================================
-- Mesmo nome de tabela que V3 (modulos só existe a partir da V3, não do
-- V2) — mesmo rastreamento de criação.
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'table_created', 'public.modulos'
WHERE to_regclass('public.modulos') IS NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.modulos (
  id            UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  codigo        TEXT NOT NULL UNIQUE,
  nome          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('active', 'planned', 'disabled')),
  dominio       TEXT NOT NULL,
  permission_codes TEXT[] NOT NULL DEFAULT '{}',
  data_ativacao DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

-- Mesma proteção da Parte 2: só cria/substitui policy se esta migration
-- comprovadamente criou a tabela agora.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.modulos') THEN
    EXECUTE 'DROP POLICY IF EXISTS "modulos_select_authenticated" ON public.modulos';
    EXECUTE 'CREATE POLICY "modulos_select_authenticated" ON public.modulos FOR SELECT TO authenticated USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "modulos_write_permissions_admin" ON public.modulos';
    EXECUTE 'CREATE POLICY "modulos_write_permissions_admin" ON public.modulos FOR ALL TO authenticated USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin())';
  END IF;
END $$;

REVOKE ALL ON public.modulos FROM anon;
GRANT SELECT ON public.modulos TO authenticated;

-- Catálogo real (mesmo inventário comprovado por leitura de código na
-- V3, GATE 5.2A) — nenhum código de módulo além destes existe de fato no
-- frontend hoje. Delta registrado ANTES do INSERT (relevante se V3 já
-- tiver criado algum destes códigos de módulo antes desta migration).
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'modulo', v.codigo
FROM (VALUES
  ('marketing_dashboard'),('marketing_captacao_leads'),('marketing_gestao_leads'),
  ('marketing_feiras'),('marketing_brindes'),('marketing_pesquisas'),
  ('ti_atendimento_interno'),('customer_success')
) AS v(codigo)
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE codigo = v.codigo)
ON CONFLICT DO NOTHING;

INSERT INTO public.modulos (codigo, nome, status, dominio, permission_codes, data_ativacao) VALUES
  ('marketing_dashboard',      'Dashboard de Marketing',    'active',  'marketing', ARRAY['dashboard.view'], CURRENT_DATE),
  ('marketing_captacao_leads', 'Captação de Leads',          'active',  'marketing', ARRAY['leads.capture'], CURRENT_DATE),
  ('marketing_gestao_leads',   'Gestão de Leads',             'active',  'marketing', ARRAY['leads.view_all','leads.view_team','leads.manage_all','leads.manage_team'], CURRENT_DATE),
  ('marketing_feiras',         'Feiras',                      'active',  'marketing', ARRAY['fairs.view'], CURRENT_DATE),
  ('marketing_brindes',        'Gestão de Brindes',           'active',  'marketing', ARRAY['gifts.view'], CURRENT_DATE),
  ('marketing_pesquisas',      'Pesquisas e Satisfação',      'active',  'marketing', ARRAY['satisfaction.view','satisfaction.manage','satisfaction.responses_view'], CURRENT_DATE),
  ('ti_atendimento_interno',   'Atendimento Interno de TI',   'active',  'ti',        ARRAY['tickets.triage','tickets.view_team','tickets.manage_team','tickets.view_all','tickets.manage_all'], CURRENT_DATE),
  ('customer_success',         'Customer Success',            'planned', 'cs',        ARRAY['cs.view_own','cs.view_all','cs.manage'], NULL)
ON CONFLICT (codigo) DO NOTHING;

-- Mesmo nome de tabela que V2/V3 — mesmo rastreamento de criação.
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'table_created', 'public.setor_modulos'
WHERE to_regclass('public.setor_modulos') IS NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.setor_modulos (
  setor_id    UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  modulo_id   UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (setor_id, modulo_id)
);

ALTER TABLE public.setor_modulos ENABLE ROW LEVEL SECURITY;

-- Mesma proteção da Parte 2: só cria/substitui policy se esta migration
-- comprovadamente criou a tabela agora.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.setor_modulos') THEN
    EXECUTE 'DROP POLICY IF EXISTS "setor_modulos_select_authenticated" ON public.setor_modulos';
    EXECUTE 'CREATE POLICY "setor_modulos_select_authenticated" ON public.setor_modulos FOR SELECT TO authenticated USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "setor_modulos_write_permissions_admin" ON public.setor_modulos';
    EXECUTE 'CREATE POLICY "setor_modulos_write_permissions_admin" ON public.setor_modulos FOR ALL TO authenticated USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin())';
  END IF;
END $$;

REVOKE ALL ON public.setor_modulos FROM anon;
GRANT SELECT ON public.setor_modulos TO authenticated;

-- Seed materializado uma única vez (mesma técnica da Parte 5, evita
-- duplicar a lista entre o registro de delta e o INSERT real).
CREATE TEMP TABLE _staged_foundation_setor_modulos_seed (
  setor_codigo TEXT, modulo_codigo TEXT
) ON COMMIT DROP;

INSERT INTO _staged_foundation_setor_modulos_seed (setor_codigo, modulo_codigo) VALUES
  ('marketing', 'marketing_dashboard'),
  ('marketing', 'marketing_captacao_leads'),
  ('marketing', 'marketing_gestao_leads'),
  ('marketing', 'marketing_feiras'),
  ('marketing', 'marketing_brindes'),
  ('marketing', 'marketing_pesquisas'),
  ('comercial', 'marketing_captacao_leads'),
  ('tecnologia_informacao', 'ti_atendimento_interno'),
  ('customer_success', 'customer_success');

-- Delta registrado por par (setor_codigo|modulo_codigo) — não pelo
-- setor_id/modulo_id gerado (esses UUIDs não existem antes do INSERT
-- acima de setores/modulos rodar em cada aplicação; a chave natural
-- textual é estável entre execuções e entre ambientes).
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'setor_modulo', v.setor_codigo || '|' || v.modulo_codigo
FROM _staged_foundation_setor_modulos_seed v
WHERE NOT EXISTS (
  SELECT 1 FROM public.setor_modulos sm
  JOIN public.setores s ON s.id = sm.setor_id
  JOIN public.modulos m ON m.id = sm.modulo_id
  WHERE s.codigo = v.setor_codigo AND m.codigo = v.modulo_codigo
)
ON CONFLICT DO NOTHING;

-- GATE 5.2G.3C, Etapa 5 — achado real: `ON CONFLICT (setor_id,
-- modulo_id)` exige um índice/constraint ÚNICO exatamente nesse
-- formato. Nesta fundação, `setor_modulos` tem PK real (setor_id,
-- modulo_id) — mas em um ambiente adiantado (V2/V3 já aplicadas), a
-- MESMA tabela (nome idêntico) tem PK (setor_id, modulo TEXT) e só um
-- ÍNDICE ÚNICO PARCIAL em (setor_id, modulo_id) WHERE modulo_id IS NOT
-- NULL (V3, Parte 2) — que não corresponde a este ON CONFLICT sem
-- WHERE, e o Postgres rejeita com "no unique or exclusion constraint
-- matching the ON CONFLICT specification" (reproduzido). `WHERE NOT
-- EXISTS` não depende de nenhum nome/forma de constraint — funciona
-- identicamente nos dois formatos de tabela.
INSERT INTO public.setor_modulos (setor_id, modulo_id)
SELECT s.id, m.id
FROM _staged_foundation_setor_modulos_seed seed
JOIN public.setores s ON s.codigo = seed.setor_codigo
JOIN public.modulos m ON m.codigo = seed.modulo_codigo
WHERE NOT EXISTS (
  SELECT 1 FROM public.setor_modulos sm2
  WHERE sm2.setor_id = s.id AND sm2.modulo_id = m.id
);


-- ============================================================
-- PARTE 4 — setor_role_permissions: composição setor × papel ×
-- permissão. Leitura restrita a admin desde o início (diferente de V2,
-- que abriu para authenticated porque has_effective_permission() V2/V3
-- precisava ler a tabela via RLS do próprio chamador — aqui
-- has_effective_permission() não lê esta tabela, então não há motivo
-- para abrir SELECT amplo desde já; endurecido desde o nascimento, sem
-- precisar da correção que V3 Parte 17 precisou fazer depois).
--
-- Mesmo nome de tabela que V2/V3 — mesmo rastreamento de criação.
-- ============================================================
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'table_created', 'public.setor_role_permissions'
WHERE to_regclass('public.setor_role_permissions') IS NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.setor_role_permissions (
  setor_id      UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  role_id       UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (setor_id, role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_setor_role_permissions_role ON public.setor_role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_setor_role_permissions_permission ON public.setor_role_permissions (permission_id);

ALTER TABLE public.setor_role_permissions ENABLE ROW LEVEL SECURITY;

-- Mesma proteção da Parte 2: só cria/substitui policy se esta migration
-- comprovadamente criou a tabela agora ("setor_role_permissions_select_admin"
-- é inclusive o MESMO nome que a V3 Parte 17 usa para o mesmo
-- endurecimento — coincidência de desenho, não de origem; a proteção
-- vale igual).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM private.staged_foundation_delta WHERE kind = 'table_created' AND natural_key = 'public.setor_role_permissions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "setor_role_permissions_select_admin" ON public.setor_role_permissions';
    EXECUTE 'CREATE POLICY "setor_role_permissions_select_admin" ON public.setor_role_permissions FOR SELECT TO authenticated USING (public.is_permissions_admin())';

    EXECUTE 'DROP POLICY IF EXISTS "setor_role_permissions_write_permissions_admin" ON public.setor_role_permissions';
    EXECUTE 'CREATE POLICY "setor_role_permissions_write_permissions_admin" ON public.setor_role_permissions FOR ALL TO authenticated USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin())';
  END IF;
END $$;

REVOKE ALL ON public.setor_role_permissions FROM anon, authenticated;
GRANT SELECT ON public.setor_role_permissions TO authenticated;


-- ============================================================
-- PARTE 5 — Matriz setor × papel × permissão (dado PURAMENTE
-- PREPARATÓRIO — nenhuma linha aqui tem qualquer efeito enquanto
-- has_effective_permission() não for ensinada a consultar esta tabela,
-- o que só acontece no PR B). Reproduz o desenho já validado da V3
-- (GATE 5.2A/5.2A.2), sem os códigos que dependem de conceitos ainda não
-- criados aqui (atendimento.access, permissions.universal — ficam para
-- o PR B, junto com o cutover em si).
-- ============================================================
-- Seed materializado uma única vez em tabela temporária (dura só esta
-- transação/sessão) para alimentar TANTO o registro de delta quanto o
-- INSERT real, sem duplicar as ~70 linhas da matriz e sem risco das
-- duas listas divergirem uma da outra.
CREATE TEMP TABLE _staged_foundation_matrix_seed (
  setor_codigo TEXT, role_code TEXT, permission_code TEXT
) ON COMMIT DROP;

INSERT INTO _staged_foundation_matrix_seed (setor_codigo, role_code, permission_code) VALUES
  ('marketing', 'operador', 'dashboard.view'),
  ('marketing', 'operador', 'fairs.view'),
  ('marketing', 'operador', 'fairs.create'),
  ('marketing', 'operador', 'fairs.edit'),
  ('marketing', 'operador', 'fairs.finish'),
  ('marketing', 'operador', 'gifts.view'),
  ('marketing', 'operador', 'gifts.deliver'),
  ('marketing', 'operador', 'reports.export'),
  ('marketing', 'operador', 'leads.capture'),
  ('marketing', 'operador', 'leads.view_own'),
  ('marketing', 'operador', 'leads.manage_own'),
  ('marketing', 'operador', 'satisfaction.view'),
  ('marketing', 'operador', 'satisfaction.responses_view'),

  ('marketing', 'gestor', 'dashboard.view'),
  ('marketing', 'gestor', 'dashboard.view_team'),
  ('marketing', 'gestor', 'fairs.view'),
  ('marketing', 'gestor', 'fairs.create'),
  ('marketing', 'gestor', 'fairs.edit'),
  ('marketing', 'gestor', 'fairs.finish'),
  ('marketing', 'gestor', 'fairs.team_manage'),
  ('marketing', 'gestor', 'fairs.view_all_teams'),
  ('marketing', 'gestor', 'leads.capture'),
  ('marketing', 'gestor', 'leads.edit'),
  ('marketing', 'gestor', 'leads.view_own'),
  ('marketing', 'gestor', 'leads.manage_own'),
  ('marketing', 'gestor', 'leads.view_team'),
  ('marketing', 'gestor', 'leads.manage_team'),
  ('marketing', 'gestor', 'gifts.view'),
  ('marketing', 'gestor', 'gifts.create'),
  ('marketing', 'gestor', 'gifts.edit'),
  ('marketing', 'gestor', 'gifts.stock_adjust'),
  ('marketing', 'gestor', 'gifts.deliver'),
  ('marketing', 'gestor', 'gifts.cancel_delivery'),
  ('marketing', 'gestor', 'gifts.manage'),
  ('marketing', 'gestor', 'reports.export'),
  ('marketing', 'gestor', 'reports.export_team'),
  ('marketing', 'gestor', 'satisfaction.view'),
  ('marketing', 'gestor', 'satisfaction.manage'),
  ('marketing', 'gestor', 'satisfaction.responses_view'),

  ('marketing', 'executivo', 'dashboard.view'),
  ('marketing', 'executivo', 'dashboard.view_team'),
  ('marketing', 'executivo', 'fairs.view'),
  ('marketing', 'executivo', 'leads.view_team'),
  ('marketing', 'executivo', 'gifts.view'),
  ('marketing', 'executivo', 'reports.export'),
  ('marketing', 'executivo', 'reports.export_team'),

  ('comercial', 'operador', 'leads.capture'),
  ('comercial', 'operador', 'leads.view_own'),
  ('comercial', 'operador', 'leads.manage_own'),

  ('comercial', 'gestor', 'leads.capture'),
  ('comercial', 'gestor', 'leads.view_own'),
  ('comercial', 'gestor', 'leads.manage_own'),
  ('comercial', 'gestor', 'leads.view_team'),
  ('comercial', 'gestor', 'leads.manage_team'),
  ('comercial', 'gestor', 'leads.edit'),

  ('comercial', 'executivo', 'leads.view_team'),
  ('comercial', 'executivo', 'reports.export_team'),

  ('tecnologia_informacao', 'operador', 'tickets.view_team'),
  ('tecnologia_informacao', 'operador', 'tickets.triage'),
  ('tecnologia_informacao', 'operador', 'tickets.time_start'),
  ('tecnologia_informacao', 'operador', 'tickets.time_log'),

  ('tecnologia_informacao', 'gestor', 'tickets.view_team'),
  ('tecnologia_informacao', 'gestor', 'tickets.manage_team'),
  ('tecnologia_informacao', 'gestor', 'tickets.triage'),
  ('tecnologia_informacao', 'gestor', 'tickets.view_all'),
  ('tecnologia_informacao', 'gestor', 'tickets.manage_all'),
  ('tecnologia_informacao', 'gestor', 'tickets.reports_view'),
  ('tecnologia_informacao', 'gestor', 'tickets.time_start'),
  ('tecnologia_informacao', 'gestor', 'tickets.time_log'),
  ('tecnologia_informacao', 'gestor', 'tickets.time_view_team'),

  ('tecnologia_informacao', 'executivo', 'tickets.view_all'),
  ('tecnologia_informacao', 'executivo', 'tickets.reports_view');

-- Delta registrado ANTES do INSERT real, a partir do mesmo seed
-- temporário — só as triplas que ainda não existem (relevante se um
-- ambiente adiantado já tiver alguma delas de outra origem).
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'setor_role_permission', seed.setor_codigo || '|' || seed.role_code || '|' || seed.permission_code
FROM _staged_foundation_matrix_seed seed
WHERE NOT EXISTS (
  SELECT 1 FROM public.setor_role_permissions srp
  JOIN public.setores s ON s.id = srp.setor_id
  JOIN public.roles r ON r.id = srp.role_id
  JOIN public.permissions p ON p.id = srp.permission_id
  WHERE s.codigo = seed.setor_codigo AND r.code = seed.role_code AND p.code = seed.permission_code
)
ON CONFLICT DO NOTHING;

INSERT INTO public.setor_role_permissions (setor_id, role_id, permission_id)
SELECT s.id, r.id, p.id
FROM _staged_foundation_matrix_seed seed
JOIN public.setores s ON s.codigo = seed.setor_codigo
JOIN public.roles r ON r.code = seed.role_code
JOIN public.permissions p ON p.code = seed.permission_code
ON CONFLICT (setor_id, role_id, permission_id) DO NOTHING;


-- ============================================================
-- PARTE 6 — Estado de preparação (staging) + RPC administrativa de
-- preparação/mapeamento. NÃO chamada por esta migration.
-- ============================================================
-- user_role_staging: única fonte do "papel/cargo/gestor FUTUROS" de um
-- perfil, até a migration de cutover (PR B) decidir aplicá-los de fato
-- em user_profiles. Deliberadamente SEPARADA de user_profiles — escrever
-- aqui nunca muda o que has_effective_permission()/is_own_or_team_lead()
-- enxergam hoje, porque nenhum dos dois lê esta tabela.
-- Nome exclusivo desta fundação (nenhuma outra migration do repositório
-- usa este nome) — rastreado mesmo assim, por uniformidade e para
-- proteger qualquer uso futuro coincidente do mesmo nome.
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'table_created', 'public.user_role_staging'
WHERE to_regclass('public.user_role_staging') IS NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_role_staging (
  profile_id        UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  papel_futuro      TEXT NOT NULL CHECK (papel_futuro IN ('admin', 'executivo', 'gestor', 'operador')),
  cargo_futuro      TEXT,
  gestor_id_futuro  UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  -- NULL (não NOT NULL): mesmo padrão de user_access_change_log.actor_profile_id
  -- — ON DELETE SET NULL exige que a coluna aceite NULL; NOT NULL aqui
  -- causaria violação de constraint no instante em que o admin que
  -- preparou o registro fosse removido (achado real durante o teste
  -- local deste gate — supabase/tests/sector_access_foundation_staged_test.sql,
  -- cenário de limpeza de identidade simulada).
  prepared_by       UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_role_staging ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_role_staging_select_admin" ON public.user_role_staging;
CREATE POLICY "user_role_staging_select_admin"
  ON public.user_role_staging FOR SELECT
  TO authenticated
  USING (public.is_permissions_admin());

REVOKE ALL ON public.user_role_staging FROM anon, authenticated;
GRANT SELECT ON public.user_role_staging TO authenticated;

-- Auditoria da preparação — mesmo padrão de user_access_change_log
-- (V2), mas nome próprio para não colidir com a tabela real de
-- auditoria de acesso EFETIVO (que continua não existindo até o PR B,
-- já que esta fundação não introduz nenhuma mudança de acesso efetivo a
-- auditar). Nome exclusivo desta fundação — rastreado por uniformidade.
INSERT INTO private.staged_foundation_delta (kind, natural_key)
SELECT 'table_created', 'public.user_sector_access_preparation_log'
WHERE to_regclass('public.user_sector_access_preparation_log') IS NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_sector_access_preparation_log (
  id                  UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  actor_profile_id    UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  target_profile_id   UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  papel_futuro_before TEXT,
  papel_futuro_after  TEXT,
  setores_before      UUID[] NOT NULL DEFAULT '{}',
  setores_after       UUID[] NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sector_access_preparation_log_target
  ON public.user_sector_access_preparation_log (target_profile_id);

ALTER TABLE public.user_sector_access_preparation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sector_access_preparation_log_select_admin" ON public.user_sector_access_preparation_log;
CREATE POLICY "user_sector_access_preparation_log_select_admin"
  ON public.user_sector_access_preparation_log FOR SELECT
  TO authenticated
  USING (public.is_permissions_admin());

REVOKE ALL ON public.user_sector_access_preparation_log FROM anon, authenticated;
GRANT SELECT ON public.user_sector_access_preparation_log TO authenticated;

-- Preview somente-leitura, hipotético — usada tanto isoladamente quanto
-- embutida no retorno da RPC de escrita abaixo (Parte 8), nunca lê
-- has_effective_permission (que ignora setor) — calcula por conta
-- própria a partir de role_permissions ∪ setor_role_permissions, exatamente
-- o que SERIA efetivo se o cutover já tivesse acontecido para esse
-- papel+setores. Nome versionado (_v1) para nunca colidir com a futura
-- função de preview do PR B.
--
-- GATE 5.2G.3D — SECURITY INVOKER (não DEFINER): executa como invoker
-- porque o chamador administrativo já possui os privilégios necessários
-- para todas as leituras desta função, comprovado objeto a objeto (não
-- presumido):
--   - roles/role_permissions/permissions: policy "Leitura roles"/
--     "Leitura role_permissions"/"Leitura permissions" (schema.sql)
--     é `FOR SELECT TO authenticated USING (true)` — aberta a
--     QUALQUER autenticado, admin ou não.
--   - setores: policy "setores_select_authenticated" (Parte 2 desta
--     migration) — igualmente aberta a qualquer autenticado.
--   - setor_role_permissions: policy "setor_role_permissions_select_admin"
--     (Parte 4) exige `is_permissions_admin()` — exatamente a MESMA
--     checagem que esta função já faz internamente antes de qualquer
--     leitura (RAISE EXCEPTION se falso); um chamador que passou por
--     essa checagem, como invoker, também passa na RLS da tabela.
-- Nenhuma destas tabelas exige elevação além do que a checagem interna
-- já garante. "Proteção contra mudança futura de RLS" NÃO é usada como
-- justificativa (rejeitada explicitamente neste gate) — se uma política
-- futura restringir mais essas tabelas, o comportamento correto é essa
-- mudança quebrar explicitamente esta função (sinal de que a suposição
-- de acesso mudou), não continuar rodando silenciosamente sob um
-- privilégio elevado que mascare a mudança.
CREATE OR REPLACE FUNCTION public.preview_effective_access_staged_v1(
  p_papel_futuro text,
  p_setor_principal_id uuid,
  p_setor_ids_adicionais uuid[]
)
RETURNS TABLE (permission_code text, origem text)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_setores uuid[];
BEGIN
  IF NOT public.is_permissions_admin() THEN
    RAISE EXCEPTION 'Sem permissão para pré-visualizar acesso organizacional' USING ERRCODE = '42501';
  END IF;

  v_setores := COALESCE(p_setor_ids_adicionais, '{}');
  IF p_setor_principal_id IS NOT NULL THEN
    v_setores := array_append(v_setores, p_setor_principal_id);
  END IF;

  RETURN QUERY
  SELECT p.code, 'papel: ' || p_papel_futuro
  FROM public.roles r
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE r.code = p_papel_futuro

  UNION

  SELECT p.code, 'setor: ' || s.nome
  FROM public.setores s
  JOIN public.setor_role_permissions srp ON srp.setor_id = s.id
  JOIN public.roles r ON r.id = srp.role_id AND r.code = p_papel_futuro
  JOIN public.permissions p ON p.id = srp.permission_id
  WHERE s.id = ANY(v_setores) AND s.ativo = true;
END;
$$;

REVOKE ALL ON FUNCTION public.preview_effective_access_staged_v1(text, uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preview_effective_access_staged_v1(text, uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.preview_effective_access_staged_v1(text, uuid, uuid[]) TO authenticated;


-- ============================================================
-- PARTE 7 — admin_prepare_user_sector_access_v1: RPC de preparação.
-- ESCREVE em user_setor_vinculos (tabela nova, inerte) e em
-- user_role_staging (tabela nova, inerte) — NUNCA em user_profiles.role/
-- gestor_id/cargo. É por isso que chamar esta RPC em qualquer perfil
-- real, mesmo hoje, não muda absolutamente nada do que esse perfil pode
-- fazer — só registra o que ele PODERÁ fazer/ser quando o PR B
-- confirmar 100% de cobertura e aplicar o cutover de fato.
--
-- GATE 5.2G.3D — SECURITY DEFINER mantido, dependência concreta: escreve
-- em user_setor_vinculos/user_role_staging/user_sector_access_preparation_log,
-- todas com `REVOKE ALL ... FROM anon, authenticated` (só o dono
-- escreve, por desenho — nenhuma policy de INSERT/UPDATE existe para
-- authenticated em nenhuma das três). Como invoker, qualquer tentativa
-- de escrita falharia por falta de privilégio de tabela, mesmo vindo de
-- um admin genuíno. A elevação permanece limitada pela validação
-- administrativa (passo 1, antes de qualquer mutação), pelo advisory
-- lock por perfil-alvo, pelo search_path fixo e pelos grants mínimos.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_prepare_user_sector_access_v1(
  p_profile_id uuid,
  p_papel_futuro text,
  p_cargo_futuro text,
  p_gestor_id_futuro uuid,
  p_setor_principal_id uuid,
  p_setor_ids_adicionais uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id uuid;
  v_target_ativo boolean;
  v_adicionais uuid[];
  v_setor_final uuid[];
  v_setor_id uuid;
  v_setor_count int;
  v_walk_id uuid;
  v_walk_count int := 0;
  v_gestor_ativo boolean;
  v_papel_futuro_before text;
  v_setores_before uuid[];
BEGIN
  v_adicionais := COALESCE(p_setor_ids_adicionais, '{}');

  -- 1. Valida o administrador chamador (nunca um ID hardcoded — sempre
  -- resolvido do JWT via auth.uid()).
  SELECT id INTO v_actor_profile_id
  FROM public.user_profiles
  WHERE user_id = auth.uid() AND ativo = true;

  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_permissions_admin() THEN
    RAISE EXCEPTION 'Sem permissão para preparar acesso organizacional' USING ERRCODE = '42501';
  END IF;

  -- GATE 5.2G.3C — serializa por perfil-alvo: duas chamadas concorrentes
  -- para o MESMO p_profile_id nunca produzem estado intermediário
  -- indeterminado (last-writer-wins silencioso) — mesmo padrão já usado
  -- em admin_update_user_access_v3 (V3) e no guard de lockout do Centro
  -- de Permissões. A trava é liberada automaticamente no fim da
  -- transação (xact), nunca precisa de unlock explícito.
  PERFORM pg_advisory_xact_lock(hashtext('user_role_staging:prepare:' || p_profile_id::text)::bigint);

  -- 2. Valida o perfil-alvo: precisa existir E estar ativo (esta RPC
  -- nunca cria perfil para Auth sem perfil, e nunca prepara acesso para
  -- usuário inativo).
  SELECT ativo INTO v_target_ativo FROM public.user_profiles WHERE id = p_profile_id;
  IF v_target_ativo IS NULL THEN
    RAISE EXCEPTION 'Usuário alvo não encontrado' USING ERRCODE = '22023';
  END IF;
  IF NOT v_target_ativo THEN
    RAISE EXCEPTION 'Usuário alvo está inativo — preparação de acesso não é permitida para usuário inativo' USING ERRCODE = '23514';
  END IF;

  -- 3. Valida papel futuro (só os 4 canônicos; 'admin' incluído para
  -- permitir preparar quem já é/será administrador global).
  IF p_papel_futuro NOT IN ('admin', 'executivo', 'gestor', 'operador') THEN
    RAISE EXCEPTION 'Papel futuro inválido: % (esperado: admin, executivo, gestor ou operador)', p_papel_futuro
      USING ERRCODE = '22023';
  END IF;

  -- 4. Valida setor principal (obrigatório para os 3 papéis não-admin;
  -- opcional, mas aceito, para admin).
  IF p_papel_futuro <> 'admin' AND p_setor_principal_id IS NULL THEN
    RAISE EXCEPTION 'Setor principal é obrigatório para o papel futuro %', p_papel_futuro USING ERRCODE = '22023';
  END IF;

  IF p_setor_principal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.setores WHERE id = p_setor_principal_id AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Setor principal não encontrado ou inativo: %', p_setor_principal_id USING ERRCODE = '22023';
  END IF;

  IF p_setor_principal_id IS NOT NULL AND p_setor_principal_id = ANY(v_adicionais) THEN
    RAISE EXCEPTION 'Setor principal não pode se repetir na lista de setores adicionais' USING ERRCODE = '23514';
  END IF;

  IF cardinality(v_adicionais) <> (SELECT count(DISTINCT x) FROM unnest(v_adicionais) AS x) THEN
    RAISE EXCEPTION 'Lista de setores adicionais contém duplicidade' USING ERRCODE = '23514';
  END IF;

  -- Cardinalidade: operador aceita EXATAMENTE 1 setor (o principal, sem
  -- adicionais); gestor aceita no máximo 1 (mesma regra restritiva já
  -- usada no V2, preservada aqui por não ter sido revista neste gate).
  IF p_papel_futuro = 'operador' AND cardinality(v_adicionais) > 0 THEN
    RAISE EXCEPTION 'Papel operador aceita exatamente 1 setor (o principal), sem setores adicionais' USING ERRCODE = '23514';
  END IF;

  SELECT cardinality(v_adicionais) INTO v_setor_count;
  IF p_papel_futuro = 'gestor' AND v_setor_count > 0 THEN
    RAISE EXCEPTION 'Papel gestor aceita no máximo 1 setor (o principal), sem setores adicionais, nesta fundação' USING ERRCODE = '23514';
  END IF;

  IF cardinality(v_adicionais) > 0 THEN
    FOREACH v_setor_id IN ARRAY v_adicionais LOOP
      IF NOT EXISTS (SELECT 1 FROM public.setores WHERE id = v_setor_id AND ativo = true) THEN
        RAISE EXCEPTION 'Setor adicional não encontrado ou inativo: %', v_setor_id USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;

  -- 5. Valida gestor futuro (mesma regra de ciclo/autorreferência do
  -- V2/V3 — aplicada aqui contra o CAMPO FUTURO, nunca contra o
  -- gestor_id real de user_profiles).
  IF p_gestor_id_futuro IS NOT NULL THEN
    IF p_gestor_id_futuro = p_profile_id THEN
      RAISE EXCEPTION 'Um usuário não pode ser gestor de si mesmo' USING ERRCODE = '23514';
    END IF;

    SELECT ativo INTO v_gestor_ativo FROM public.user_profiles WHERE id = p_gestor_id_futuro;
    IF v_gestor_ativo IS NULL OR NOT v_gestor_ativo THEN
      RAISE EXCEPTION 'Gestor futuro indicado não encontrado ou inativo' USING ERRCODE = '22023';
    END IF;

    -- Referência circular: segue gestor_id_futuro (staging) a partir do
    -- candidato — teto de 50 saltos, mesma defesa do V2/V3.
    v_walk_id := p_gestor_id_futuro;
    v_walk_count := 0;
    WHILE v_walk_id IS NOT NULL AND v_walk_count < 50 LOOP
      IF v_walk_id = p_profile_id THEN
        RAISE EXCEPTION 'Referência circular de gestor futuro detectada' USING ERRCODE = '23514';
      END IF;
      SELECT gestor_id_futuro INTO v_walk_id FROM public.user_role_staging WHERE profile_id = v_walk_id;
      v_walk_count := v_walk_count + 1;
    END LOOP;
  END IF;

  -- ── Captura estado ANTES (auditoria) ──
  SELECT papel_futuro INTO v_papel_futuro_before FROM public.user_role_staging WHERE profile_id = p_profile_id;
  SELECT COALESCE(array_agg(setor_id ORDER BY setor_id), '{}') INTO v_setores_before
  FROM public.user_setor_vinculos WHERE profile_id = p_profile_id AND ativo = true;

  -- 6. Upsert idempotente do staging (NUNCA toca user_profiles).
  INSERT INTO public.user_role_staging (profile_id, papel_futuro, cargo_futuro, gestor_id_futuro, prepared_by)
  VALUES (p_profile_id, p_papel_futuro, p_cargo_futuro, p_gestor_id_futuro, v_actor_profile_id)
  ON CONFLICT (profile_id) DO UPDATE
    SET papel_futuro = EXCLUDED.papel_futuro,
        cargo_futuro = EXCLUDED.cargo_futuro,
        gestor_id_futuro = EXCLUDED.gestor_id_futuro,
        prepared_by = EXCLUDED.prepared_by,
        updated_at = NOW();

  -- 7. Sincroniza user_setor_vinculos com o conjunto final (principal +
  -- adicionais) — tabela nova, inerte para autorização real (ver Parte 2).
  IF p_setor_principal_id IS NOT NULL THEN
    v_setor_final := array_append(v_adicionais, p_setor_principal_id);

    UPDATE public.user_setor_vinculos
    SET ativo = false, principal = false
    WHERE profile_id = p_profile_id
      AND ativo = true
      AND setor_id <> ALL (v_setor_final);

    INSERT INTO public.user_setor_vinculos (profile_id, setor_id, ativo, principal)
    SELECT p_profile_id, s_id, true, (s_id = p_setor_principal_id)
    FROM unnest(v_setor_final) AS s_id
    ON CONFLICT (profile_id, setor_id) DO UPDATE
      SET ativo = true, principal = (EXCLUDED.setor_id = p_setor_principal_id);
  END IF;

  -- 8. Auditoria da preparação (idempotente por natureza — cada chamada
  -- gera uma linha nova de histórico, nunca substitui a anterior).
  INSERT INTO public.user_sector_access_preparation_log (
    actor_profile_id, target_profile_id,
    papel_futuro_before, papel_futuro_after,
    setores_before, setores_after
  ) VALUES (
    v_actor_profile_id, p_profile_id,
    v_papel_futuro_before, p_papel_futuro,
    v_setores_before,
    (SELECT COALESCE(array_agg(setor_id ORDER BY setor_id), '{}') FROM public.user_setor_vinculos WHERE profile_id = p_profile_id AND ativo = true)
  );

  -- 9. Retorna o estado preparado + preview obrigatório do acesso que
  -- SERIA efetivo se o cutover já tivesse ocorrido — nunca omitido.
  RETURN jsonb_build_object(
    'profile_id', p_profile_id,
    'papel_futuro', p_papel_futuro,
    'cargo_futuro', p_cargo_futuro,
    'gestor_id_futuro', p_gestor_id_futuro,
    'setor_principal_id', p_setor_principal_id,
    'setor_ids_adicionais', v_adicionais,
    'acesso_efetivo_atual_alterado', false,
    'preview_acesso_apos_cutover', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('permission_code', permission_code, 'origem', origem)), '[]'::jsonb)
      FROM public.preview_effective_access_staged_v1(p_papel_futuro, p_setor_principal_id, v_adicionais)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_prepare_user_sector_access_v1(uuid, text, text, uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_prepare_user_sector_access_v1(uuid, text, text, uuid, uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_prepare_user_sector_access_v1(uuid, text, text, uuid, uuid, uuid[]) TO authenticated;


-- ============================================================
-- PARTE 8 — admin_validate_sector_cutover_readiness(): validador
-- somente-leitura, consultado pela FUTURA migration de cutover (PR B)
-- antes de qualquer DELETE/REVOKE. Não altera dado algum.
--
-- GATE 5.2G.3D — SECURITY DEFINER mantido, com dependência CONCRETA e
-- comprovada (não "proteção contra mudança futura de RLS"): esta função
-- precisa agregar contagens sobre TODAS as linhas de
-- `public.user_profiles` (usuários ativos não-admin, cobertura etc.).
-- A RLS de `user_profiles` no schema legado (schema.sql, linha ~188) só
-- tem duas policies de SELECT: "perfil_select_proprio" (USING auth.uid()
-- = user_id — só a própria linha) e "Leitura nomes brindes" (USING
-- is_gifts_deliverer() — sem relação com administração de acesso, é uma
-- policy de OUTRA feature, Brindes). Não existe nenhuma policy "admin vê
-- todos os perfis" no schema legado (essa só é criada pela migration V2,
-- que esta fundação explicitamente NÃO aplica nem depende). Como
-- invoker, um admin que não seja também is_gifts_deliverer() (ex.: um
-- admin puro, sem gifts.manage/gifts.deliver) só enxergaria a PRÓPRIA
-- linha em user_profiles — o agregado ficaria incorreto (contagem de 0
-- ou 1 em vez do total real), não apenas restrito. Depender de
-- "Leitura nomes brindes" para isto funcionar seria acoplar-se a uma
-- policy de outra feature, frágil a qualquer mudança nela.
-- DEFINER aqui bypassa exatamente essa lacuna estrutural — nenhum GRANT
-- amplo foi concedido a `authenticated` em `user_profiles` para
-- viabilizar isso; a elevação permanece limitada pela validação
-- administrativa (is_permissions_admin(), checada antes de qualquer
-- leitura), pelo search_path fixo e pelos grants mínimos já existentes.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_validate_sector_cutover_readiness()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_ativos_nao_admin int;
  v_com_vinculo int;
  v_sem_vinculo jsonb;
  v_gestores_sem_setor jsonb;
  v_operadores_sem_setor jsonb;
  v_orfaos jsonb;
  v_vinculos_setor_inativo jsonb;
  v_papel_legado_pendente jsonb;
  v_sem_modulo jsonb;
  v_ganho_indevido jsonb;
  v_cobertura numeric;
  v_ready boolean;
BEGIN
  IF NOT public.is_permissions_admin() THEN
    RAISE EXCEPTION 'Sem permissão para consultar o validador de cutover' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_total_ativos_nao_admin
  FROM public.user_profiles WHERE ativo = true AND role <> 'admin';

  SELECT count(DISTINCT profile_id) INTO v_com_vinculo
  FROM public.user_setor_vinculos WHERE ativo = true;

  -- Usuários ativos não-admin sem NENHUM vínculo setorial ativo.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('profile_id', up.id, 'nome', up.nome, 'role_atual', up.role)), '[]'::jsonb)
  INTO v_sem_vinculo
  FROM public.user_profiles up
  WHERE up.ativo = true AND up.role <> 'admin'
    AND NOT EXISTS (SELECT 1 FROM public.user_setor_vinculos usv WHERE usv.profile_id = up.id AND usv.ativo = true);

  -- Gestores (papel futuro staged = 'gestor') sem setor principal.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('profile_id', urs.profile_id)), '[]'::jsonb)
  INTO v_gestores_sem_setor
  FROM public.user_role_staging urs
  WHERE urs.papel_futuro = 'gestor'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_setor_vinculos usv
      WHERE usv.profile_id = urs.profile_id AND usv.ativo = true AND usv.principal = true
    );

  -- Operadores (papel futuro staged = 'operador') sem setor principal.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('profile_id', urs.profile_id)), '[]'::jsonb)
  INTO v_operadores_sem_setor
  FROM public.user_role_staging urs
  WHERE urs.papel_futuro = 'operador'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_setor_vinculos usv
      WHERE usv.profile_id = urs.profile_id AND usv.ativo = true AND usv.principal = true
    );

  -- Vínculos órfãos (perfil não existe mais — defesa, não deveria
  -- ocorrer com FK ON DELETE CASCADE).
  SELECT COALESCE(jsonb_agg(jsonb_build_object('profile_id', usv.profile_id, 'setor_id', usv.setor_id)), '[]'::jsonb)
  INTO v_orfaos
  FROM public.user_setor_vinculos usv
  WHERE usv.ativo = true AND NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = usv.profile_id);

  -- Vínculos apontando para setor inativo.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('profile_id', usv.profile_id, 'setor_id', usv.setor_id)), '[]'::jsonb)
  INTO v_vinculos_setor_inativo
  FROM public.user_setor_vinculos usv
  JOIN public.setores s ON s.id = usv.setor_id
  WHERE usv.ativo = true AND s.ativo = false;

  -- Perfis ativos não-admin cujo papel futuro AINDA não foi preparado
  -- (nenhuma linha em user_role_staging).
  SELECT COALESCE(jsonb_agg(jsonb_build_object('profile_id', up.id, 'nome', up.nome, 'role_atual', up.role)), '[]'::jsonb)
  INTO v_papel_legado_pendente
  FROM public.user_profiles up
  WHERE up.ativo = true AND up.role <> 'admin'
    AND NOT EXISTS (SELECT 1 FROM public.user_role_staging urs WHERE urs.profile_id = up.id);

  -- Usuários preparados que ficariam SEM nenhuma permissão não-universal
  -- (nenhum módulo) após o cutover — comparado via a mesma função de
  -- preview usada pela RPC de preparação.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('profile_id', urs.profile_id)), '[]'::jsonb)
  INTO v_sem_modulo
  FROM public.user_role_staging urs
  WHERE NOT EXISTS (
    SELECT 1 FROM public.preview_effective_access_staged_v1(
      urs.papel_futuro,
      (SELECT setor_id FROM public.user_setor_vinculos WHERE profile_id = urs.profile_id AND ativo = true AND principal = true),
      (SELECT COALESCE(array_agg(setor_id), '{}') FROM public.user_setor_vinculos WHERE profile_id = urs.profile_id AND ativo = true AND principal = false)
    ) pv
    WHERE pv.permission_code NOT IN ('profile.view', 'profile.edit_own', 'profile.change_password_own', 'tickets.create', 'tickets.view_own', 'tickets.comment_own')
  );

  -- Ganho indevido: nesta fundação, NENHUM usuário pode ganhar
  -- permissão nova só pela preparação (has_effective_permission ignora
  -- setor) — logo esta lista é sempre vazia por construção; mantida
  -- como campo explícito para a migration de cutover reavaliar com sua
  -- própria lógica (comparação antes/depois real, fora do escopo desta
  -- função somente-leitura da fundação).
  v_ganho_indevido := '[]'::jsonb;

  SELECT round(100.0 * v_com_vinculo / NULLIF(v_total_ativos_nao_admin, 0), 2) INTO v_cobertura;

  v_ready := (
    COALESCE(v_cobertura, 0) = 100
    AND jsonb_array_length(v_orfaos) = 0
    AND jsonb_array_length(v_gestores_sem_setor) = 0
    AND jsonb_array_length(v_operadores_sem_setor) = 0
    AND jsonb_array_length(v_papel_legado_pendente) = 0
    AND jsonb_array_length(v_sem_vinculo) = 0
    AND jsonb_array_length(v_sem_modulo) = 0
    AND jsonb_array_length(v_ganho_indevido) = 0
  );

  RETURN jsonb_build_object(
    'usuarios_ativos_nao_admin', v_total_ativos_nao_admin,
    'usuarios_com_vinculo_ativo', v_com_vinculo,
    'usuarios_sem_vinculo', v_sem_vinculo,
    'gestores_sem_setor_principal', v_gestores_sem_setor,
    'operadores_sem_setor_principal', v_operadores_sem_setor,
    'vinculos_orfaos', v_orfaos,
    'vinculos_setor_inativo', v_vinculos_setor_inativo,
    'papel_legado_pendente', v_papel_legado_pendente,
    'usuarios_sem_modulo_apos_cutover', v_sem_modulo,
    'ganho_indevido_detectado', v_ganho_indevido,
    'cobertura_percentual', COALESCE(v_cobertura, 0),
    'ready', v_ready
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_sector_cutover_readiness() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_validate_sector_cutover_readiness() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_validate_sector_cutover_readiness() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
