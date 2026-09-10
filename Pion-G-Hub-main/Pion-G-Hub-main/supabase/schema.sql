-- ============================================================
-- Módulo de Feiras e Captação de Leads
-- Supabase SQL Schema
-- ============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: feiras
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feiras (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome        TEXT NOT NULL,
  cidade      TEXT NOT NULL,
  estado      TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim    DATE NOT NULL,
  responsavel TEXT NOT NULL,
  observacoes TEXT,
  status      TEXT NOT NULL DEFAULT 'Planejada'
                CHECK (status IN ('Planejada', 'Em andamento', 'Finalizada')),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_feiras_status    ON public.feiras (status);
CREATE INDEX idx_feiras_data_ini  ON public.feiras (data_inicio);

-- ============================================================
-- TABELA: leads_feira
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads_feira (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  feira_id          UUID NOT NULL REFERENCES public.feiras (id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  empresa           TEXT NOT NULL,
  telefone          TEXT,
  email             TEXT,
  cidade            TEXT,
  estado            TEXT,
  segmento          TEXT,
  produto_interesse TEXT,
  observacoes       TEXT,
  temperatura       TEXT NOT NULL DEFAULT 'Frio'
                    CHECK (temperatura IN ('Frio', 'Morno', 'Quente')),
  vendedor          TEXT,
  status            TEXT NOT NULL DEFAULT 'Novo'
                    CHECK (status IN ('Novo', 'Enviado ao RD', 'Em Atendimento', 'Convertido', 'Perdido')),
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Garantir que pelo menos telefone ou email seja fornecido
  CONSTRAINT telefone_ou_email CHECK (telefone IS NOT NULL OR email IS NOT NULL)
);

-- Índices
CREATE INDEX idx_leads_feira_id    ON public.leads_feira (feira_id);
CREATE INDEX idx_leads_temperatura ON public.leads_feira (temperatura);
CREATE INDEX idx_leads_status      ON public.leads_feira (status);
CREATE INDEX idx_leads_vendedor    ON public.leads_feira (vendedor);
CREATE INDEX idx_leads_segmento    ON public.leads_feira (segmento);
CREATE INDEX idx_leads_created_at  ON public.leads_feira (created_at);

-- ============================================================
-- RLS (Row Level Security) - Habilitando para produção futura
-- ============================================================
ALTER TABLE public.feiras     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_feira ENABLE ROW LEVEL SECURITY;

-- Sprint 3.6: restrito a `authenticated` (era USING(true) sem escopo de role,
-- ou seja, também liberado para `anon`). Nenhum fluxo hoje usa essas tabelas
-- via anon — todas as telas internas (Feiras, Leads, Dashboard, Captação)
-- já operam com o usuário logado — então isso não muda nada em produção.
-- Ficou necessário agora porque a Sprint 3.6 introduz o primeiro acesso
-- anônimo real do sistema (tablet de autoatendimento no estande), e esse
-- fluxo passa inteiramente pelas RPCs públicas SECURITY DEFINER abaixo,
-- nunca por leitura/escrita direta nestas tabelas.
-- ENABLE explícito de novo aqui (idempotente, sem erro se já estiver
-- habilitado) — garante que a policy restrita abaixo realmente valha, sem
-- depender de a linha 66/67 já ter rodado antes neste ambiente.
ALTER TABLE public.feiras      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_feira ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total feiras" ON public.feiras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total leads_feira" ON public.leads_feira
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- DADOS INICIAIS DE EXEMPLO
-- ============================================================
INSERT INTO public.feiras (nome, cidade, estado, data_inicio, data_fim, responsavel, status, observacoes) VALUES
  ('Hospitalar 2024',    'São Paulo',       'SP', '2024-05-13', '2024-05-16', 'Carlos Mendes',   'Finalizada',   'Maior feira hospitalar da América Latina'),
  ('Vet & Cia 2024',     'Belo Horizonte',  'MG', '2024-08-20', '2024-08-22', 'Ana Rodrigues',   'Finalizada',   'Feira especializada em produtos veterinários'),
  ('MedPlus 2025',       'Rio de Janeiro',  'RJ', '2025-03-10', '2025-03-12', 'Pedro Alves',     'Em andamento', NULL),
  ('ClínicaExpo 2025',   'Curitiba',        'PR', '2025-06-05', '2025-06-07', 'Mariana Costa',   'Planejada',    'Foco em clínicas gerais e especializadas'),
  ('Hospitalar Norte',   'Belém',           'PA', '2025-09-15', '2025-09-17', 'Carlos Mendes',   'Planejada',    NULL);

-- ============================================================
-- MÓDULO DE CONFIGURAÇÕES
-- ============================================================

-- Tabela singleton (sempre 1 registro com id = 1)
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id           INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome_sistema TEXT    NOT NULL DEFAULT 'Pion G Plus',
  subtitulo    TEXT             DEFAULT 'Leads & Feiras',
  cor_primaria TEXT    NOT NULL DEFAULT '#1B3A6B',
  logo_url     TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total configuracoes" ON public.configuracoes FOR ALL USING (true) WITH CHECK (true);

-- Registro inicial com os defaults
INSERT INTO public.configuracoes (id, nome_sistema, subtitulo, cor_primaria)
VALUES (1, 'Pion G Plus', 'Leads & Feiras', '#1B3A6B')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE: bucket para logos
-- ============================================================
-- Execute no Supabase Dashboard > Storage > New bucket:
--   Nome: assets
--   Public: true (habilitar acesso público para leitura)
--
-- Ou via SQL (requer extensão storage):
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: leitura pública
CREATE POLICY "Logos publicos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assets');

-- Policy: upload sem autenticação (uso interno)
-- Sprint 3.2: exclui o prefixo brindes/, que passa a ter policy própria
-- restrita a quem gerencia o módulo de brindes (ver seção da Sprint 3.2).
-- Logo/avatar continuam exatamente como antes, sem exigir autenticação.
DROP POLICY IF EXISTS "Upload logos" ON storage.objects;
CREATE POLICY "Upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assets' AND name NOT LIKE 'brindes/%');

-- Policy: remoção sem autenticação (mesma ressalva acima)
DROP POLICY IF EXISTS "Remover logos" ON storage.objects;
CREATE POLICY "Remover logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'assets' AND name NOT LIKE 'brindes/%');

-- ============================================================
-- SPRINT 2.2 — MÓDULO DE PERFIS DE USUÁRIO
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT,
  email       TEXT,
  telefone    TEXT,
  cargo       TEXT,
  setor       TEXT,
  role        TEXT        NOT NULL DEFAULT 'vendedor'
                          CHECK (role IN ('admin', 'marketing', 'gestor', 'vendedor')),
  gestor_id   UUID        REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  avatar_url  TEXT,
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_profiles_user_id UNIQUE (user_id)
);

-- Índices
CREATE INDEX idx_user_profiles_user_id  ON public.user_profiles (user_id);
CREATE INDEX idx_user_profiles_role     ON public.user_profiles (role);
CREATE INDEX idx_user_profiles_gestor   ON public.user_profiles (gestor_id);
CREATE INDEX idx_user_profiles_ativo    ON public.user_profiles (ativo);

-- ============================================================
-- RLS — Sprint 2.2: cada usuário lê/edita apenas o próprio perfil.
-- Políticas de admin e gestor serão adicionadas na sprint de permissões.
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Leitura: somente o próprio usuário (auth.uid() = user_id)
CREATE POLICY "perfil_select_proprio"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert/Update/Delete: somente o próprio usuário
CREATE POLICY "perfil_modificar_proprio"
  ON public.user_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE — avatars dentro do bucket 'assets' já existente
-- Caminho: assets/avatars/{userId}-{timestamp}.{ext}
-- As policies abaixo complementam as já criadas para o bucket assets.
-- Se já existirem políticas com esses nomes, renomeie conforme necessário.
-- ============================================================

-- Leitura pública de avatars (já coberta pela policy "Logos publicos" do bucket assets)
-- Nenhuma policy adicional necessária para SELECT.

-- Upload autenticado de avatar (complementa a policy "Upload logos")
-- A policy existente de INSERT já cobre todo o bucket assets — nenhuma alteração necessária.

-- Nota: caso queira isolar avatars por usuário no futuro, use:
-- WITH CHECK (bucket_id = 'assets' AND name LIKE 'avatars/' || auth.uid() || '-%')

-- ============================================================
-- SPRINT 2.4 — LEADS POR PERFIL
-- ============================================================

-- Identifica quem cadastrou o lead (auth.users.id).
-- Nullable para compatibilidade com leads já existentes sem este campo.
-- Leads sem created_by (anteriores a esta sprint) não aparecem
-- na view "Meus Leads" do vendedor — comportamento correto por design.
ALTER TABLE public.leads_feira
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índice para filtro eficiente em getAll e getDashboardStats por usuário
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON public.leads_feira (created_by);

-- ============================================================
-- SPRINT 2.5 — EQUIPE DA FEIRA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feira_equipe (
  feira_id   UUID NOT NULL REFERENCES public.feiras(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (feira_id, profile_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_feira_equipe_feira   ON public.feira_equipe (feira_id);
CREATE INDEX IF NOT EXISTS idx_feira_equipe_profile ON public.feira_equipe (profile_id);

-- RLS — Sprint 2.5: Políticas abertas (conforme escopo acordado)
ALTER TABLE public.feira_equipe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total feira_equipe" ON public.feira_equipe;
CREATE POLICY "Acesso total feira_equipe" ON public.feira_equipe FOR ALL USING (true) WITH CHECK (true);
-- ============================================================
-- SPRINT 3.1 — CENTRAL DE BRINDES / ESTOQUE PROMOCIONAL (MVP)
-- ============================================================
-- O módulo de brindes é independente do módulo de feiras: o brinde existe
-- no estoque geral e pode ser entregue em qualquer contexto (feira, lead,
-- cliente, visitante, evento interno, ação comercial, treinamento, entrega
-- avulsa etc). feira_id/lead_id em brinde_movimentacoes e brinde_entregas
-- são sempre opcionais — a feira consome brindes, o brinde não depende dela.
--
-- Controle de acesso: diferente de feiras/leads_feira (RLS permissiva com
-- USING true), as tabelas de brindes envolvem estoque e não podem depender
-- apenas da UI para bloquear escrita. A RLS aqui é fechada por role:
-- somente user_profiles.role IN ('admin', 'marketing', 'gestor') — ativo=true —
-- podem ler ou escrever. Vendedor e anônimo não têm acesso nenhum (nem leitura),
-- já que nesta sprint o módulo não tem tela nenhuma exposta a vendedor.
-- As RPCs de estoque (registrar_movimentacao_brinde, confirmar_entrega_brinde)
-- repetem essa checagem explicitamente, além de herdarem a RLS das tabelas
-- que tocam — dupla trava, já que estoque é o dado mais sensível do módulo.

-- Garante a extensão usada por uuid_generate_v4().
-- Se a extensão já existir no projeto, esta linha não altera nada.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper de autorização: true se o usuário autenticado (auth.uid()) tiver
-- perfil ativo com role de gestão de brindes. SECURITY INVOKER (padrão) é
-- suficiente aqui: a policy "perfil_select_proprio" de user_profiles já
-- permite que qualquer usuário leia a própria linha, então a subquery abaixo
-- nunca é bloqueada pela RLS de user_profiles ao checar o próprio perfil.
CREATE OR REPLACE FUNCTION public.is_gifts_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND ativo = true
      AND role IN ('admin', 'marketing', 'gestor')
  );
$$;

-- Usada dentro de policies (avaliada até para sessões anônimas), então
-- precisa ser executável por anon e authenticated — ela mesma decide
-- internamente quem passa, retornando false para quem não tiver perfil.
GRANT EXECUTE ON FUNCTION public.is_gifts_manager() TO anon, authenticated;

-- ── TABELA: brindes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brindes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  categoria       TEXT,
  fornecedor      TEXT,
  valor_unitario  NUMERIC(10,2) NOT NULL DEFAULT 0,
  estoque_atual   INTEGER NOT NULL DEFAULT 0,
  estoque_minimo  INTEGER NOT NULL DEFAULT 0,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_brindes_estoque_atual_nao_negativo CHECK (estoque_atual >= 0)
);

CREATE INDEX IF NOT EXISTS idx_brindes_ativo     ON public.brindes (ativo);
CREATE INDEX IF NOT EXISTS idx_brindes_categoria ON public.brindes (categoria);

ALTER TABLE public.brindes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total brindes" ON public.brindes;
CREATE POLICY "Acesso total brindes" ON public.brindes
  FOR ALL USING (public.is_gifts_manager()) WITH CHECK (public.is_gifts_manager());

-- ── TABELA: brinde_movimentacoes ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.brinde_movimentacoes (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- IMPORTANTE:
  -- ON DELETE RESTRICT preserva o histórico de estoque.
  -- Se um brinde já teve movimentação, ele não deve ser apagado.
  -- O caminho correto é inativar o brinde em public.brindes.ativo = false.
  brinde_id                UUID NOT NULL REFERENCES public.brindes(id) ON DELETE RESTRICT,

  tipo                     TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'perda', 'devolucao')),
  quantidade               INTEGER NOT NULL,
  valor_unitario_snapshot  NUMERIC(10,2),
  motivo                   TEXT,
  contexto_tipo            TEXT,
  contexto_descricao       TEXT,
  feira_id                 UUID NULL REFERENCES public.feiras(id) ON DELETE SET NULL,
  lead_id                  UUID NULL REFERENCES public.leads_feira(id) ON DELETE SET NULL,
  responsavel_profile_id   UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_by               UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacoes              TEXT
);

CREATE INDEX IF NOT EXISTS idx_brinde_mov_brinde     ON public.brinde_movimentacoes (brinde_id);
CREATE INDEX IF NOT EXISTS idx_brinde_mov_tipo       ON public.brinde_movimentacoes (tipo);
CREATE INDEX IF NOT EXISTS idx_brinde_mov_feira      ON public.brinde_movimentacoes (feira_id);
CREATE INDEX IF NOT EXISTS idx_brinde_mov_lead       ON public.brinde_movimentacoes (lead_id);
CREATE INDEX IF NOT EXISTS idx_brinde_mov_created_at ON public.brinde_movimentacoes (created_at DESC);

ALTER TABLE public.brinde_movimentacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total brinde_movimentacoes" ON public.brinde_movimentacoes;
CREATE POLICY "Acesso total brinde_movimentacoes" ON public.brinde_movimentacoes
  FOR ALL USING (public.is_gifts_manager()) WITH CHECK (public.is_gifts_manager());

-- ── TABELA: brinde_kits ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brinde_kits (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome               TEXT NOT NULL,
  descricao          TEXT,
  contexto_sugerido  TEXT,
  ativo              BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brinde_kits_ativo ON public.brinde_kits (ativo);

ALTER TABLE public.brinde_kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total brinde_kits" ON public.brinde_kits;
CREATE POLICY "Acesso total brinde_kits" ON public.brinde_kits
  FOR ALL USING (public.is_gifts_manager()) WITH CHECK (public.is_gifts_manager());

-- ── TABELA: brinde_kit_itens ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brinde_kit_itens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kit_id      UUID NOT NULL REFERENCES public.brinde_kits(id) ON DELETE CASCADE,

  -- IMPORTANTE:
  -- ON DELETE RESTRICT evita apagar um brinde que já compõe algum kit.
  -- Para remover um item do kit, apague a linha do kit_item.
  -- Para descontinuar o brinde, inative o cadastro do brinde.
  brinde_id   UUID NOT NULL REFERENCES public.brindes(id) ON DELETE RESTRICT,

  quantidade  INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  CONSTRAINT uq_brinde_kit_itens_kit_brinde UNIQUE (kit_id, brinde_id)
);

CREATE INDEX IF NOT EXISTS idx_brinde_kit_itens_kit    ON public.brinde_kit_itens (kit_id);
CREATE INDEX IF NOT EXISTS idx_brinde_kit_itens_brinde ON public.brinde_kit_itens (brinde_id);

ALTER TABLE public.brinde_kit_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total brinde_kit_itens" ON public.brinde_kit_itens;
CREATE POLICY "Acesso total brinde_kit_itens" ON public.brinde_kit_itens
  FOR ALL USING (public.is_gifts_manager()) WITH CHECK (public.is_gifts_manager());

-- ── TABELA: brinde_entregas ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brinde_entregas (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_entrega             TEXT NOT NULL CHECK (tipo_entrega IN ('kit', 'item_avulso')),
  kit_id                   UUID NULL REFERENCES public.brinde_kits(id) ON DELETE SET NULL,

  -- Mantido como SET NULL porque a entrega pode continuar existindo mesmo se,
  -- em uma manutenção futura, o cadastro do brinde for removido. Porém, na prática,
  -- recomenda-se NÃO apagar brindes usados: use ativo=false.
  brinde_id                UUID NULL REFERENCES public.brindes(id) ON DELETE SET NULL,

  quantidade               INTEGER NULL CHECK (quantidade IS NULL OR quantidade > 0),
  feira_id                 UUID NULL REFERENCES public.feiras(id) ON DELETE SET NULL,
  lead_id                  UUID NULL REFERENCES public.leads_feira(id) ON DELETE SET NULL,
  destinatario_nome        TEXT,
  destinatario_empresa     TEXT,
  destinatario_contato     TEXT,
  contexto_tipo            TEXT,
  contexto_descricao       TEXT,
  status                   TEXT NOT NULL DEFAULT 'liberado' CHECK (status IN ('liberado', 'entregue', 'cancelado')),
  codigo_comprovante       TEXT,
  entregue_por_profile_id  UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_by               UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entregue_em              TIMESTAMPTZ,
  observacoes              TEXT,
  CONSTRAINT chk_brinde_entregas_item CHECK (
    (tipo_entrega = 'kit' AND kit_id IS NOT NULL AND brinde_id IS NULL)
    OR
    (tipo_entrega = 'item_avulso' AND brinde_id IS NOT NULL AND kit_id IS NULL AND quantidade IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_brinde_entregas_status     ON public.brinde_entregas (status);
CREATE INDEX IF NOT EXISTS idx_brinde_entregas_feira      ON public.brinde_entregas (feira_id);
CREATE INDEX IF NOT EXISTS idx_brinde_entregas_lead       ON public.brinde_entregas (lead_id);
CREATE INDEX IF NOT EXISTS idx_brinde_entregas_kit        ON public.brinde_entregas (kit_id);
CREATE INDEX IF NOT EXISTS idx_brinde_entregas_brinde     ON public.brinde_entregas (brinde_id);
CREATE INDEX IF NOT EXISTS idx_brinde_entregas_created_at ON public.brinde_entregas (created_at DESC);

ALTER TABLE public.brinde_entregas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total brinde_entregas" ON public.brinde_entregas;
CREATE POLICY "Acesso total brinde_entregas" ON public.brinde_entregas
  FOR ALL USING (public.is_gifts_manager()) WITH CHECK (public.is_gifts_manager());

-- ============================================================
-- FUNÇÕES — regra de estoque centralizada no banco.
-- Nenhuma tela deve fazer UPDATE direto em brindes.estoque_atual: toda
-- alteração passa por uma destas funções, que bloqueia estoque negativo
-- e sempre grava a movimentação correspondente (transação atômica).
-- ============================================================

-- Registra uma movimentação (entrada/saida/ajuste/perda/devolucao) e
-- atualiza brindes.estoque_atual de forma atômica (lock da linha do brinde).
-- entrada/devolucao: quantidade > 0, soma ao estoque.
-- saida/perda:       quantidade > 0, subtrai do estoque.
-- ajuste:            quantidade != 0 (aceita negativo), aplicado como delta direto.
--
-- Sprint 3.2: ganhou o parâmetro p_entrega_id (trailing, default NULL). Como
-- mudar a lista de tipos de argumento faz o Postgres tratar a definição como
-- uma função DISTINTA (overload) em vez de substituir a antiga, o DROP abaixo
-- remove explicitamente a assinatura de 11 argumentos da Sprint 3.1 antes de
-- recriar com 12 — sem isso, um banco que já tivesse a versão antiga aplicada
-- ficaria com as duas funções coexistindo, causando ambiguidade na chamada RPC.
DROP FUNCTION IF EXISTS public.registrar_movimentacao_brinde(
  UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, TEXT
);

CREATE OR REPLACE FUNCTION public.registrar_movimentacao_brinde(
  p_brinde_id               UUID,
  p_tipo                    TEXT,
  p_quantidade              INTEGER,
  p_motivo                  TEXT DEFAULT NULL,
  p_contexto_tipo           TEXT DEFAULT NULL,
  p_contexto_descricao      TEXT DEFAULT NULL,
  p_feira_id                UUID DEFAULT NULL,
  p_lead_id                 UUID DEFAULT NULL,
  p_responsavel_profile_id  UUID DEFAULT NULL,
  p_created_by              UUID DEFAULT NULL,
  p_observacoes             TEXT DEFAULT NULL,
  p_entrega_id              UUID DEFAULT NULL
)
RETURNS public.brinde_movimentacoes
LANGUAGE plpgsql
AS $$
DECLARE
  v_brinde        public.brindes%ROWTYPE;
  v_delta         INTEGER;
  v_novo_estoque  INTEGER;
  v_movimentacao  public.brinde_movimentacoes%ROWTYPE;
BEGIN
  IF NOT public.is_gifts_manager() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores, marketing ou gestores podem movimentar estoque de brindes'
      USING ERRCODE = '42501';
  END IF;

  IF p_tipo NOT IN ('entrada', 'saida', 'ajuste', 'perda', 'devolucao') THEN
    RAISE EXCEPTION 'Tipo de movimentação inválido: %', p_tipo;
  END IF;

  IF p_tipo = 'ajuste' THEN
    IF p_quantidade = 0 THEN
      RAISE EXCEPTION 'Informe uma quantidade diferente de zero para o ajuste';
    END IF;
    v_delta := p_quantidade;
  ELSIF p_tipo IN ('entrada', 'devolucao') THEN
    IF p_quantidade <= 0 THEN
      RAISE EXCEPTION 'A quantidade deve ser maior que zero';
    END IF;
    v_delta := p_quantidade;
  ELSE -- saida, perda
    IF p_quantidade <= 0 THEN
      RAISE EXCEPTION 'A quantidade deve ser maior que zero';
    END IF;
    v_delta := -p_quantidade;
  END IF;

  -- Lock da linha do brinde para evitar corrida entre movimentações concorrentes
  SELECT * INTO v_brinde FROM public.brindes WHERE id = p_brinde_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brinde não encontrado';
  END IF;

  v_novo_estoque := v_brinde.estoque_atual + v_delta;

  IF v_novo_estoque < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente para "%" (disponível: %, solicitado: %)',
      v_brinde.nome, v_brinde.estoque_atual, p_quantidade;
  END IF;

  UPDATE public.brindes
    SET estoque_atual = v_novo_estoque, updated_at = NOW()
    WHERE id = p_brinde_id;

  INSERT INTO public.brinde_movimentacoes (
    brinde_id, tipo, quantidade, valor_unitario_snapshot, motivo,
    contexto_tipo, contexto_descricao, feira_id, lead_id,
    responsavel_profile_id, created_by, observacoes, entrega_id
  ) VALUES (
    p_brinde_id, p_tipo, p_quantidade, v_brinde.valor_unitario, p_motivo,
    p_contexto_tipo, p_contexto_descricao, p_feira_id, p_lead_id,
    p_responsavel_profile_id, p_created_by, p_observacoes, p_entrega_id
  )
  RETURNING * INTO v_movimentacao;

  RETURN v_movimentacao;
END;
$$;

-- Só authenticated pode sequer tentar chamar — anon é barrado no grant,
-- antes mesmo de chegar na checagem de role feita dentro da função.
REVOKE ALL ON FUNCTION public.registrar_movimentacao_brinde(
  UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, TEXT, UUID
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_movimentacao_brinde(
  UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, TEXT, UUID
) TO authenticated;

-- Confirma uma entrega (kit ou item avulso): valida estoque de todos os itens
-- envolvidos, gera as movimentações de saída correspondentes e marca a
-- entrega como 'entregue'. Se algum item não tiver estoque suficiente, a
-- exceção propaga e a transação inteira é revertida (nenhuma baixa parcial).
CREATE OR REPLACE FUNCTION public.confirmar_entrega_brinde(
  p_entrega_id               UUID,
  p_entregue_por_profile_id  UUID DEFAULT NULL
)
RETURNS public.brinde_entregas
LANGUAGE plpgsql
AS $$
DECLARE
  v_entrega  public.brinde_entregas%ROWTYPE;
  v_item     RECORD;
BEGIN
  IF NOT public.is_gifts_manager() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores, marketing ou gestores podem confirmar entregas de brindes'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_entrega FROM public.brinde_entregas WHERE id = p_entrega_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrega não encontrada';
  END IF;

  IF v_entrega.status <> 'liberado' THEN
    RAISE EXCEPTION 'Esta entrega já foi %', v_entrega.status;
  END IF;

  IF v_entrega.tipo_entrega = 'item_avulso' THEN
    PERFORM public.registrar_movimentacao_brinde(
      v_entrega.brinde_id, 'saida', v_entrega.quantidade,
      'Entrega confirmada', COALESCE(v_entrega.contexto_tipo, 'entrega_avulsa'), v_entrega.contexto_descricao,
      v_entrega.feira_id, v_entrega.lead_id, p_entregue_por_profile_id, v_entrega.created_by,
      'Gerado automaticamente pela confirmação da entrega ' || v_entrega.id,
      v_entrega.id
    );
  ELSE
    -- Kit: valida e baixa cada item, em ordem estável, para evitar deadlocks
    -- entre confirmações concorrentes de entregas que compartilhem itens.
    FOR v_item IN
      SELECT brinde_id, quantidade
      FROM public.brinde_kit_itens
      WHERE kit_id = v_entrega.kit_id
      ORDER BY brinde_id
    LOOP
      PERFORM public.registrar_movimentacao_brinde(
        v_item.brinde_id, 'saida', v_item.quantidade,
        'Entrega de kit confirmada', COALESCE(v_entrega.contexto_tipo, 'entrega_avulsa'), v_entrega.contexto_descricao,
        v_entrega.feira_id, v_entrega.lead_id, p_entregue_por_profile_id, v_entrega.created_by,
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
$$;

REVOKE ALL ON FUNCTION public.confirmar_entrega_brinde(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_entrega_brinde(UUID, UUID) TO authenticated;

-- ============================================================
-- SPRINT 3.2 — IMAGENS DE BRINDES E HISTÓRICO INTELIGENTE DE KITS
-- ============================================================

-- ── Imagem opcional por brinde ────────────────────────────────
-- Só a URL pública é persistida — nunca base64. O upload em si acontece
-- no bucket 'assets' (Storage), pasta 'brindes/'; ver policies abaixo.
ALTER TABLE public.brindes
  ADD COLUMN IF NOT EXISTS imagem_url TEXT;

-- ── Storage: policies restritas para o prefixo brindes/ ──────
-- O bucket 'assets' segue público para leitura (policy "Logos publicos",
-- inalterada — a imagem do brinde deve carregar sem autenticação, como
-- logo/avatar). Upload e remoção, porém, exigem is_gifts_manager() para
-- o prefixo brindes/ especificamente; "Upload logos"/"Remover logos" já
-- foram ajustadas (seção STORAGE, no topo do arquivo) para excluir esse
-- prefixo, então não há sobreposição entre as policies.
DROP POLICY IF EXISTS "Upload brindes restrito" ON storage.objects;
CREATE POLICY "Upload brindes restrito"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assets' AND name LIKE 'brindes/%' AND public.is_gifts_manager());

DROP POLICY IF EXISTS "Remover brindes restrito" ON storage.objects;
CREATE POLICY "Remover brindes restrito"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'assets' AND name LIKE 'brindes/%' AND public.is_gifts_manager());

-- ── Rastreabilidade: liga movimentação → entrega que a gerou ──
-- Substitui o parser de texto da observação ("Gerado automaticamente pela
-- confirmação da entrega {id}") por uma FK de verdade, permitindo agrupar
-- e somar (SUM quantidade * valor_unitario_snapshot) por entrega sem
-- N+1. ON DELETE RESTRICT: uma entrega com movimentações vinculadas não
-- pode ser apagada (a própria aplicação nunca apaga entregas, só cancela).
ALTER TABLE public.brinde_movimentacoes
  ADD COLUMN IF NOT EXISTS entrega_id UUID NULL;

ALTER TABLE public.brinde_movimentacoes
  DROP CONSTRAINT IF EXISTS brinde_movimentacoes_entrega_id_fkey;

ALTER TABLE public.brinde_movimentacoes
  ADD CONSTRAINT brinde_movimentacoes_entrega_id_fkey
  FOREIGN KEY (entrega_id)
  REFERENCES public.brinde_entregas(id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_brinde_mov_entrega
  ON public.brinde_movimentacoes(entrega_id);

-- Movimentações antigas (anteriores a esta sprint) permanecem com
-- entrega_id = NULL e continuam aparecendo como movimentações avulsas —
-- nenhuma migração retroativa via parser de texto é feita nesta sprint.

-- ============================================================
-- SPRINT 3.5 — PESQUISA DE SATISFAÇÃO DINÂMICA POR FEIRA
-- ============================================================
-- Cada feira pode ter uma ou mais pesquisas de satisfação, com perguntas
-- configuráveis. Respostas vêm de visitantes anônimos via link público
-- (/pesquisa/:publicToken) — por isso o fluxo público passa inteiramente
-- por duas funções RPC SECURITY DEFINER, nunca por acesso direto às
-- tabelas. As tabelas em si ficam fechadas para authenticated autorizado
-- (mesmo papel que já vê Feiras: admin/marketing/gestor) — anon não lê
-- nem escreve nelas diretamente, só através das RPCs.

-- Helper de autorização, mesmo padrão de public.is_gifts_manager() (Sprint
-- 3.1): true se o usuário autenticado tiver perfil ativo com role que já
-- enxerga o macro módulo Feiras & Leads (admin/marketing/gestor — os
-- mesmos que têm fairs.view no frontend). Não criamos permissão nova; esta
-- função só espelha no banco a mesma regra já usada em ROUTE_PERMISSIONS.
CREATE OR REPLACE FUNCTION public.is_satisfaction_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND ativo = true
      AND role IN ('admin', 'marketing', 'gestor')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_satisfaction_manager() TO anon, authenticated;

-- ── TABELA: pesquisas_satisfacao ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.pesquisas_satisfacao (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feira_id     UUID NOT NULL REFERENCES public.feiras(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL UNIQUE,
  titulo       TEXT NOT NULL,
  descricao    TEXT NULL,
  ativa        BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pesquisas_satisfacao_feira ON public.pesquisas_satisfacao (feira_id);
CREATE INDEX IF NOT EXISTS idx_pesquisas_satisfacao_token ON public.pesquisas_satisfacao (public_token);

ALTER TABLE public.pesquisas_satisfacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso gestao pesquisas_satisfacao" ON public.pesquisas_satisfacao;
CREATE POLICY "Acesso gestao pesquisas_satisfacao" ON public.pesquisas_satisfacao
  FOR ALL USING (public.is_satisfaction_manager()) WITH CHECK (public.is_satisfaction_manager());

-- ── TABELA: pesquisa_satisfacao_perguntas ─────────────────────
CREATE TABLE IF NOT EXISTS public.pesquisa_satisfacao_perguntas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id UUID NOT NULL REFERENCES public.pesquisas_satisfacao(id) ON DELETE CASCADE,
  ordem       INT NOT NULL DEFAULT 0,
  titulo      TEXT NOT NULL,
  descricao   TEXT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('short_text', 'long_text', 'rating_1_5', 'nps_0_10', 'single_choice')),
  obrigatoria BOOLEAN NOT NULL DEFAULT true,
  opcoes      JSONB NULL,
  ativa       BOOLEAN NOT NULL DEFAULT true,
  metric_key  TEXT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pesquisa_perguntas_pesquisa ON public.pesquisa_satisfacao_perguntas (pesquisa_id);
CREATE INDEX IF NOT EXISTS idx_pesquisa_perguntas_ordem   ON public.pesquisa_satisfacao_perguntas (pesquisa_id, ordem);

ALTER TABLE public.pesquisa_satisfacao_perguntas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso gestao pesquisa_perguntas" ON public.pesquisa_satisfacao_perguntas;
CREATE POLICY "Acesso gestao pesquisa_perguntas" ON public.pesquisa_satisfacao_perguntas
  FOR ALL USING (public.is_satisfaction_manager()) WITH CHECK (public.is_satisfaction_manager());

-- ── TABELA: pesquisa_satisfacao_respostas ─────────────────────
-- feira_id é denormalizado a partir de pesquisas_satisfacao.feira_id (a
-- própria RPC de submissão preenche) para permitir filtrar/agregar por
-- feira sem precisar de join extra em toda consulta do Dashboard.
CREATE TABLE IF NOT EXISTS public.pesquisa_satisfacao_respostas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id           UUID NOT NULL REFERENCES public.pesquisas_satisfacao(id) ON DELETE CASCADE,
  feira_id              UUID NOT NULL REFERENCES public.feiras(id) ON DELETE CASCADE,
  respondente_nome      TEXT NULL,
  respondente_empresa   TEXT NULL,
  respondente_cargo     TEXT NULL,
  respondente_telefone  TEXT NULL,
  respondente_email     TEXT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pesquisa_respostas_pesquisa ON public.pesquisa_satisfacao_respostas (pesquisa_id);
CREATE INDEX IF NOT EXISTS idx_pesquisa_respostas_feira    ON public.pesquisa_satisfacao_respostas (feira_id);
CREATE INDEX IF NOT EXISTS idx_pesquisa_respostas_created  ON public.pesquisa_satisfacao_respostas (created_at DESC);

ALTER TABLE public.pesquisa_satisfacao_respostas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso gestao pesquisa_respostas" ON public.pesquisa_satisfacao_respostas;
CREATE POLICY "Acesso gestao pesquisa_respostas" ON public.pesquisa_satisfacao_respostas
  FOR ALL USING (public.is_satisfaction_manager()) WITH CHECK (public.is_satisfaction_manager());

-- ── TABELA: pesquisa_satisfacao_resposta_itens ────────────────
-- UNIQUE(resposta_id, pergunta_id): trava em banco contra item duplicado
-- pra mesma pergunta na mesma resposta — defesa em profundidade, já que a
-- função de submissão também garante isso por construção (ver comentário
-- na função submit_satisfaction_survey_response).
CREATE TABLE IF NOT EXISTS public.pesquisa_satisfacao_resposta_itens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id  UUID NOT NULL REFERENCES public.pesquisa_satisfacao_respostas(id) ON DELETE CASCADE,
  pergunta_id  UUID NOT NULL REFERENCES public.pesquisa_satisfacao_perguntas(id) ON DELETE RESTRICT,
  valor_texto  TEXT NULL,
  valor_numero NUMERIC NULL,
  valor_opcao  TEXT NULL,
  valor_json   JSONB NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pesquisa_item_resposta_pergunta UNIQUE (resposta_id, pergunta_id)
);

CREATE INDEX IF NOT EXISTS idx_pesquisa_itens_resposta ON public.pesquisa_satisfacao_resposta_itens (resposta_id);
CREATE INDEX IF NOT EXISTS idx_pesquisa_itens_pergunta ON public.pesquisa_satisfacao_resposta_itens (pergunta_id);

ALTER TABLE public.pesquisa_satisfacao_resposta_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso gestao pesquisa_itens" ON public.pesquisa_satisfacao_resposta_itens;
CREATE POLICY "Acesso gestao pesquisa_itens" ON public.pesquisa_satisfacao_resposta_itens
  FOR ALL USING (public.is_satisfaction_manager()) WITH CHECK (public.is_satisfaction_manager());

-- ============================================================
-- FUNÇÕES RPC — fluxo público (anon), SECURITY DEFINER.
--
-- As 4 tabelas acima são fechadas para anon (RLS só libera
-- is_satisfaction_manager()). As duas funções abaixo são o ÚNICO caminho
-- de acesso público: rodam como SECURITY DEFINER (dono das tabelas), então
-- ignoram a RLS de propósito — cada uma faz sua própria validação
-- explícita em vez de depender de policy, e só devolve/aceita exatamente
-- os campos necessários ao fluxo público (nunca respostas de terceiros,
-- nunca dados de usuário interno).
-- ============================================================

-- Retorna os dados públicos de uma pesquisa ativa pelo token: título,
-- descrição, nome da feira e perguntas ativas ordenadas (com opções).
-- Nunca retorna respostas, ids de usuário ou qualquer coisa interna.
CREATE OR REPLACE FUNCTION public.get_public_satisfaction_survey(p_public_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pesquisa  RECORD;
  v_perguntas JSONB;
BEGIN
  SELECT ps.id, ps.titulo, ps.descricao, ps.ativa, f.nome AS feira_nome
    INTO v_pesquisa
    FROM public.pesquisas_satisfacao ps
    JOIN public.feiras f ON f.id = ps.feira_id
    WHERE ps.public_token = p_public_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesquisa não encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_pesquisa.ativa THEN
    RAISE EXCEPTION 'Esta pesquisa não está mais disponível' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'ordem', p.ordem,
      'titulo', p.titulo,
      'descricao', p.descricao,
      'tipo', p.tipo,
      'obrigatoria', p.obrigatoria,
      'opcoes', p.opcoes,
      'metric_key', p.metric_key
    ) ORDER BY p.ordem
  )
  INTO v_perguntas
  FROM public.pesquisa_satisfacao_perguntas p
  WHERE p.pesquisa_id = v_pesquisa.id AND p.ativa = true;

  RETURN jsonb_build_object(
    'id', v_pesquisa.id,
    'titulo', v_pesquisa.titulo,
    'descricao', v_pesquisa.descricao,
    'feira_nome', v_pesquisa.feira_nome,
    'perguntas', COALESCE(v_perguntas, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_satisfaction_survey(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_satisfaction_survey(TEXT) TO anon, authenticated;

-- Recebe e valida a resposta de um visitante e grava resposta + itens numa
-- única chamada. p_respondent: {"nome","empresa","cargo","telefone","email"}.
-- p_answers: array de {"pergunta_id","valor_texto","valor_numero","valor_opcao","valor_json"}.
--
-- Revisão pós-review desta função:
--  - validação por TIPO de pergunta (antes, qualquer campo preenchido
--    "colava" como resposta válida — um rating_1_5 obrigatório passava só
--    com valor_texto, sem valor_numero);
--  - o loop principal percorre as PERGUNTAS ativas da pesquisa, não o
--    array bruto enviado pelo cliente: cada pergunta_id gera no máximo 1
--    item (busca com LIMIT 1 dentro do próprio loop), então um payload com
--    pergunta_id duplicado não consegue gerar itens duplicados — reforçado
--    ainda pela constraint uq_pesquisa_item_resposta_pergunta na tabela
--    (ON CONFLICT ... DO NOTHING) como defesa em profundidade;
--  - só considera perguntas com ativa = true: pergunta inativa nunca entra
--    no loop, então nunca gera item — não depende mais de um EXISTS
--    separado no momento do insert;
--  - pergunta_id vindo do cliente NUNCA é convertido para uuid — a
--    comparação é sempre texto contra v_pergunta.id::text (um uuid que já
--    veio confiável do banco). Um pergunta_id malformado ou de outra
--    pesquisa simplesmente não casa com nada (vira "sem resposta"), em vez
--    de estourar erro de cast;
--  - valor_numero é convertido dentro de um bloco com EXCEPTION, then uma
--    mensagem clara em vez do erro bruto de cast do Postgres;
--  - valida logo no início que p_answers é array e p_respondent é objeto
--    (ou nulo) antes de processar qualquer coisa.
CREATE OR REPLACE FUNCTION public.submit_satisfaction_survey_response(
  p_public_token TEXT,
  p_respondent   JSONB,
  p_answers      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pesquisa      RECORD;
  v_resposta_id   UUID;
  v_pergunta      RECORD;
  v_answer        JSONB;
  v_answers_array JSONB;
  v_valor_numero  NUMERIC;
  v_valor_opcao   TEXT;
  v_valor_texto   TEXT;
BEGIN
  IF p_answers IS NOT NULL AND jsonb_typeof(p_answers) <> 'array' THEN
    RAISE EXCEPTION 'Formato inválido: as respostas devem ser uma lista' USING ERRCODE = '22023';
  END IF;

  IF p_respondent IS NOT NULL AND jsonb_typeof(p_respondent) <> 'object' THEN
    RAISE EXCEPTION 'Formato inválido: os dados do respondente devem ser um objeto' USING ERRCODE = '22023';
  END IF;

  v_answers_array := COALESCE(p_answers, '[]'::jsonb);

  SELECT id, feira_id, ativa INTO v_pesquisa
    FROM public.pesquisas_satisfacao
    WHERE public_token = p_public_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesquisa não encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_pesquisa.ativa THEN
    RAISE EXCEPTION 'Esta pesquisa não está mais disponível' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.pesquisa_satisfacao_respostas (
    pesquisa_id, feira_id,
    respondente_nome, respondente_empresa, respondente_cargo,
    respondente_telefone, respondente_email
  ) VALUES (
    v_pesquisa.id, v_pesquisa.feira_id,
    p_respondent->>'nome', p_respondent->>'empresa', p_respondent->>'cargo',
    p_respondent->>'telefone', p_respondent->>'email'
  )
  RETURNING id INTO v_resposta_id;

  -- Se qualquer validação abaixo falhar, o RAISE EXCEPTION derruba a
  -- transação inteira desta chamada de RPC — incluindo o INSERT acima e
  -- quaisquer itens já gravados neste loop. Nunca fica resposta "pela
  -- metade": ou grava tudo, ou não grava nada.
  FOR v_pergunta IN
    SELECT id, tipo, obrigatoria, opcoes
    FROM public.pesquisa_satisfacao_perguntas
    WHERE pesquisa_id = v_pesquisa.id AND ativa = true
    ORDER BY ordem
  LOOP
    v_answer := NULL;
    v_valor_numero := NULL;
    v_valor_opcao := NULL;
    v_valor_texto := NULL;

    SELECT a INTO v_answer
      FROM jsonb_array_elements(v_answers_array) a
      WHERE a->>'pergunta_id' = v_pergunta.id::text
      LIMIT 1;

    IF v_pergunta.tipo IN ('rating_1_5', 'nps_0_10') THEN
      IF v_answer IS NOT NULL AND v_answer->>'valor_numero' IS NOT NULL THEN
        BEGIN
          v_valor_numero := (v_answer->>'valor_numero')::numeric;
        EXCEPTION WHEN invalid_text_representation THEN
          RAISE EXCEPTION 'Valor numérico inválido para uma das perguntas' USING ERRCODE = '23514';
        END;
      END IF;

      IF v_pergunta.obrigatoria AND v_valor_numero IS NULL THEN
        RAISE EXCEPTION 'Existe uma pergunta obrigatória sem resposta' USING ERRCODE = '23514';
      END IF;

      IF v_valor_numero IS NOT NULL THEN
        IF v_pergunta.tipo = 'rating_1_5' AND (v_valor_numero < 1 OR v_valor_numero > 5) THEN
          RAISE EXCEPTION 'Avaliação inválida (deve ser entre 1 e 5)' USING ERRCODE = '23514';
        END IF;
        IF v_pergunta.tipo = 'nps_0_10' AND (v_valor_numero < 0 OR v_valor_numero > 10) THEN
          RAISE EXCEPTION 'Nota inválida (deve ser entre 0 e 10)' USING ERRCODE = '23514';
        END IF;
      END IF;

    ELSIF v_pergunta.tipo = 'single_choice' THEN
      IF v_answer IS NOT NULL THEN
        v_valor_opcao := NULLIF(v_answer->>'valor_opcao', '');
      END IF;

      IF v_pergunta.obrigatoria AND v_valor_opcao IS NULL THEN
        RAISE EXCEPTION 'Existe uma pergunta obrigatória sem resposta' USING ERRCODE = '23514';
      END IF;

      IF v_valor_opcao IS NOT NULL AND v_pergunta.opcoes IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(v_pergunta.opcoes) opt WHERE opt = v_valor_opcao
      ) THEN
        RAISE EXCEPTION 'Opção inválida para uma das perguntas' USING ERRCODE = '23514';
      END IF;

    ELSE -- short_text, long_text
      IF v_answer IS NOT NULL THEN
        v_valor_texto := NULLIF(TRIM(BOTH FROM (v_answer->>'valor_texto')), '');
      END IF;

      IF v_pergunta.obrigatoria AND v_valor_texto IS NULL THEN
        RAISE EXCEPTION 'Existe uma pergunta obrigatória sem resposta' USING ERRCODE = '23514';
      END IF;
    END IF;

    IF v_answer IS NOT NULL THEN
      INSERT INTO public.pesquisa_satisfacao_resposta_itens (
        resposta_id, pergunta_id, valor_texto, valor_numero, valor_opcao, valor_json
      ) VALUES (
        v_resposta_id, v_pergunta.id, v_valor_texto, v_valor_numero, v_valor_opcao, v_answer->'valor_json'
      )
      ON CONFLICT (resposta_id, pergunta_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'resposta_id', v_resposta_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_satisfaction_survey_response(TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_satisfaction_survey_response(TEXT, JSONB, JSONB) TO anon, authenticated;

-- ============================================================
-- SPRINT 3.6 — CAPTAÇÃO PÚBLICA EM TABLET (AUTOATENDIMENTO)
-- ============================================================
-- Tablet fixado no estande, sem login, onde o próprio visitante se
-- cadastra. Mesmo modelo de segurança da Sprint 3.5 (pesquisa pública):
-- tabelas internas fechadas para anon, e todo o fluxo público passa por
-- RPCs SECURITY DEFINER que validam tudo explicitamente. Ver também o
-- ajuste de RLS de public.feiras/public.leads_feira (TO authenticated) no
-- topo deste arquivo, necessário para que "fechado pra anon" seja real.

-- Origem do lead. 'manual' é o default (mantém o comportamento atual do
-- formulário interno /captacao sem precisar alterá-lo); 'tablet' identifica
-- os leads vindos do autoatendimento público desta sprint.
ALTER TABLE public.leads_feira
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'manual'
    CHECK (origem IN ('manual', 'tablet'));

CREATE INDEX IF NOT EXISTS idx_leads_origem ON public.leads_feira (origem);

-- ── RPCs públicas de leitura (anon) ───────────────────────────
-- Só os campos necessários pra montar a tela do tablet — nunca responsavel,
-- observações internas ou qualquer outra coisa de public.feiras.

CREATE OR REPLACE FUNCTION public.get_public_kiosk_fairs()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('id', id, 'nome', nome, 'cidade', cidade, 'estado', estado)
      ORDER BY data_inicio ASC
    ),
    '[]'::jsonb
  )
  FROM public.feiras
  WHERE status IN ('Planejada', 'Em andamento');
$$;

REVOKE ALL ON FUNCTION public.get_public_kiosk_fairs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_kiosk_fairs() TO anon, authenticated;

-- Usada quando o link do tablet já vem com a feira pré-definida
-- (/autoatendimento/:feiraId) — valida que a feira existe e está aceitando
-- cadastros antes mesmo de mostrar o formulário.
CREATE OR REPLACE FUNCTION public.get_public_kiosk_fair(p_feira_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_feira RECORD;
BEGIN
  SELECT id, nome, cidade, estado, status INTO v_feira
  FROM public.feiras WHERE id = p_feira_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feira não encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF v_feira.status NOT IN ('Planejada', 'Em andamento') THEN
    RAISE EXCEPTION 'Esta feira não está aceitando cadastros no momento' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'id', v_feira.id, 'nome', v_feira.nome, 'cidade', v_feira.cidade, 'estado', v_feira.estado
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_kiosk_fair(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_kiosk_fair(UUID) TO anon, authenticated;

-- Token da pesquisa de satisfação ativa da feira, se houver — usada só para
-- mostrar (ou não) o botão "Responder pesquisa de satisfação" depois do
-- cadastro. Não expõe nada além do token (já pensado pra ser público).
-- Join com feiras + status: uma pesquisa "ativa" não deve valer nada se a
-- própria feira já não estiver mais aceitando cadastros (ex: encerrada).
CREATE OR REPLACE FUNCTION public.get_active_survey_token_for_fair(p_feira_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ps.public_token
  FROM public.pesquisas_satisfacao ps
  JOIN public.feiras f ON f.id = ps.feira_id
  WHERE ps.feira_id = p_feira_id
    AND ps.ativa = true
    AND f.status IN ('Planejada', 'Em andamento')
  ORDER BY ps.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_active_survey_token_for_fair(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_survey_token_for_fair(UUID) TO anon, authenticated;

-- ── RPC pública de escrita (anon) ──────────────────────────────
-- Único caminho para o tablet gravar um lead. Proteções contra spam:
--   - honeypot: campo invisível no formulário; se vier preenchido, é bot —
--     retorna sucesso "fake" sem gravar nada (não avisa o bot que foi pego);
--   - todos os campos obrigatórios validados no servidor (nunca confia só
--     na validação do formulário);
--   - a feira precisa existir e estar com status Planejada/Em andamento;
--   - duplicidade: mesmo e-mail OU telefone já cadastrado nesta feira nos
--     últimos 30 minutos é bloqueado (mesma proteção cobre bot martelando
--     o formulário e visitante tocando "enviar" duas vezes sem querer).
CREATE OR REPLACE FUNCTION public.register_kiosk_lead(
  p_feira_id UUID,
  p_nome     TEXT,
  p_email    TEXT,
  p_telefone TEXT,
  p_empresa  TEXT,
  p_honeypot TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_feira    RECORD;
  v_nome     TEXT;
  v_empresa  TEXT;
  v_telefone TEXT;
  v_email    TEXT;
  v_lead_id  UUID;
BEGIN
  IF p_honeypot IS NOT NULL AND length(trim(p_honeypot)) > 0 THEN
    RETURN jsonb_build_object('success', true, 'lead_id', NULL, 'nome', NULL);
  END IF;

  v_nome     := NULLIF(trim(p_nome), '');
  v_empresa  := NULLIF(trim(p_empresa), '');
  v_telefone := NULLIF(trim(p_telefone), '');
  v_email    := NULLIF(trim(p_email), '');

  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Nome é obrigatório' USING ERRCODE = '23514';
  END IF;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Empresa é obrigatória' USING ERRCODE = '23514';
  END IF;
  IF v_telefone IS NULL THEN
    RAISE EXCEPTION 'Telefone é obrigatório' USING ERRCODE = '23514';
  END IF;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'E-mail é obrigatório' USING ERRCODE = '23514';
  END IF;
  IF v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail inválido' USING ERRCODE = '23514';
  END IF;

  SELECT id, status INTO v_feira FROM public.feiras WHERE id = p_feira_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feira não encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF v_feira.status NOT IN ('Planejada', 'Em andamento') THEN
    RAISE EXCEPTION 'Esta feira não está aceitando cadastros no momento' USING ERRCODE = 'P0001';
  END IF;

  -- Telefone comparado normalizado (só dígitos): "(11) 99999-0000" e
  -- "11999990000" são o mesmo número pra esse fim, e o visitante não
  -- necessariamente digita com a mesma máscara da vez anterior.
  IF EXISTS (
    SELECT 1 FROM public.leads_feira
    WHERE feira_id = p_feira_id
      AND created_at > NOW() - INTERVAL '30 minutes'
      AND (
        lower(email) = lower(v_email)
        OR regexp_replace(COALESCE(telefone, ''), '\D', '', 'g') = regexp_replace(COALESCE(v_telefone, ''), '\D', '', 'g')
      )
  ) THEN
    RAISE EXCEPTION 'Você já se cadastrou recentemente para esta feira. Obrigado!' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.leads_feira (
    feira_id, nome, empresa, telefone, email, temperatura, vendedor, status, origem
  ) VALUES (
    p_feira_id, v_nome, v_empresa, v_telefone, v_email, 'Morno', 'Autoatendimento (Tablet)', 'Novo', 'tablet'
  )
  RETURNING id INTO v_lead_id;

  RETURN jsonb_build_object('success', true, 'lead_id', v_lead_id, 'nome', v_nome);
END;
$$;

REVOKE ALL ON FUNCTION public.register_kiosk_lead(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_kiosk_lead(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- SPRINT 3.7 — BRINDES POR FEIRA: CARGA, ENTREGA E VÍNCULO COM LEAD
-- ============================================================
-- Transforma Brindes em controle operacional de feira, com dois estágios:
--   1) CARGA (antes da feira): o estoque central (public.brindes.estoque_atual)
--      é baixado uma única vez, via registrar_movimentacao_brinde já
--      existente, e a quantidade enviada é somada num livro-razão local por
--      feira (public.brinde_feira_estoque). É a mesma lógica de "saída de
--      estoque" que já existe, só que com contexto_tipo = 'carga_feira'.
--   2) ENTREGA (durante a feira): debita apenas o livro-razão local da
--      feira (quantidade_entregue) — o estoque central NÃO é debitado de
--      novo aqui, porque o brinde já saiu fisicamente do depósito na carga.
--      Por isso registrar_entrega_brinde_feira não chama
--      registrar_movimentacao_brinde.
--
-- A rota pública /autoatendimento continua sem qualquer acesso a isto: as
-- duas funções abaixo são GRANT apenas para authenticated (nunca anon), e a
-- liberação de brinde só acontece dentro do módulo interno /brindes, com
-- usuário logado.

-- ── Helper de autorização: quem pode REALIZAR entrega ─────────
-- Mais amplo que is_gifts_manager(): inclui vendedor, que no estande
-- realiza a entrega mas não pode alterar a carga enviada pra feira (isso
-- continua exclusivo de admin/marketing/gestor via is_gifts_manager()).
-- SECURITY DEFINER (revisão pós-review): esta função é usada dentro de uma
-- policy da própria public.user_profiles (ver abaixo). Se ela rodasse como
-- SECURITY INVOKER, o SELECT interno em user_profiles reavaliaria a RLS da
-- própria tabela, que por sua vez chama esta função de novo — recursão.
-- Como SECURITY DEFINER roda com o privilégio do owner da função (que tem
-- BYPASSRLS), o SELECT interno não reavalia nenhuma policy, quebrando o
-- ciclo. auth.uid() continua refletindo o usuário autenticado da sessão
-- normalmente — DEFINER só muda o role de execução, não a JWT.
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
-- A Sprint 3.7 exige mostrar "quem liberou" cada entrega na tela (Sprint
-- 2.2 só permitia cada usuário ler o próprio perfil). Sem isso, o embed
-- `user_profiles(nome)` usado pelo front pra resolver entregue_por_profile_id
-- volta NULL pra qualquer entrega liberada por outra pessoa. Escopo
-- deliberadamente amplo (linha inteira, não só o nome — RLS não filtra
-- coluna) mas restrito ao contexto de brindes: só quem já é
-- admin/marketing/gestor/vendedor enxerga o cadastro de colegas, nunca anon.
-- `TO authenticated` explícito: anon nunca deveria nem tentar essa policy
-- (is_gifts_deliverer() já retornaria false pra ele, mas ficar explícito
-- documenta a intenção e evita depender só da lógica interna da função).
DROP POLICY IF EXISTS "Leitura nomes brindes" ON public.user_profiles;
CREATE POLICY "Leitura nomes brindes" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (public.is_gifts_deliverer());

-- ── Leitura ampliada (vendedor) nas tabelas já existentes ─────
-- Só SELECT: is_gifts_manager() continua sendo o único FOR ALL de cada
-- tabela (INSERT/UPDATE/DELETE seguem restritos a admin/marketing/gestor).
-- Isto só abre visibilidade extra para o vendedor montar a tela de entrega
-- (ver brindes/kits disponíveis, ver o histórico de entregas da feira).
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
-- 'interno' é o default (telas internas do módulo Brindes); 'kiosk'
-- identifica entregas iniciadas a partir do botão "Liberar Brinde" do
-- autoatendimento (o registro em si SEMPRE é feito no módulo interno,
-- 'kiosk' aqui só marca a origem do fluxo, para fins de auditoria).
ALTER TABLE public.brinde_entregas
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'interno'
    CHECK (origem IN ('interno', 'kiosk'));

-- Quem recebeu, em termos de negócio: 'lead' (tem lead_id) ou 'cliente_existente'
-- (pessoa/empresa já conhecida da Pion G, sem lead nesta feira — nome/empresa
-- ficam em destinatario_nome/destinatario_empresa, já existentes desde a
-- Sprint 3.1). Revisão pós-implementação: removidos 'uso_interno'/'outro' do
-- CHECK — a RPC só processa 'lead'/'cliente_existente' hoje, então não faz
-- sentido o banco aceitar um valor que o código não sabe tratar; esses dois
-- tipos voltam quando (e se) seus fluxos forem implementados de verdade.
-- NULLABLE de propósito: entregas anteriores a esta coluna não são
-- reclassificadas automaticamente (ficam NULL = "não classificado") — só um
-- backfill explícito e conservador (abaixo) reclassifica o que dá pra
-- inferir com segurança.
ALTER TABLE public.brinde_entregas
  ADD COLUMN IF NOT EXISTS tipo_destinatario TEXT NULL;

ALTER TABLE public.brinde_entregas
  DROP CONSTRAINT IF EXISTS brinde_entregas_tipo_destinatario_check;

ALTER TABLE public.brinde_entregas
  ADD CONSTRAINT brinde_entregas_tipo_destinatario_check
    CHECK (tipo_destinatario IS NULL OR tipo_destinatario IN ('lead', 'cliente_existente'));

-- Backfill conservador: só reclassifica como 'lead' o que dá pra inferir com
-- segurança (já tinha lead_id E contexto_tipo='feira', ou seja, veio do
-- próprio fluxo de entrega por feira). Qualquer linha ambígua (contexto
-- diferente, ou sem lead_id) permanece tipo_destinatario = NULL de propósito
-- — "não classificado" é um estado válido e preferível a um chute errado.
-- Rode a consulta de contagem abaixo ANTES do UPDATE pra saber quantas
-- linhas serão afetadas (o relatório desta sprint reporta esse número como
-- "a ser confirmado pelo operador", já que não há acesso direto ao banco de
-- produção neste ambiente de edição):
--   SELECT COUNT(*) FROM public.brinde_entregas
--   WHERE tipo_destinatario IS NULL AND lead_id IS NOT NULL AND contexto_tipo = 'feira';
UPDATE public.brinde_entregas
SET tipo_destinatario = 'lead'
WHERE tipo_destinatario IS NULL
  AND lead_id IS NOT NULL
  AND contexto_tipo = 'feira';

-- Constraint de integridade do destinatário — validação de banco, independente
-- do que a RPC já garante, pra cobrir também um INSERT direto (fora do
-- frontend/RPC). Três formatos válidos: (1) NULL = registro anterior a esta
-- coluna, não classificado; (2) 'lead' = lead_id obrigatório; (3)
-- 'cliente_existente' = lead_id deve ser NULL, nome e empresa do
-- destinatário obrigatórios e não-vazios (trim() barra string só de espaços).
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

-- ── Normalização pra checagem de duplicidade de cliente existente ──
-- unaccent é extensão padrão do Postgres (contrib), liberada em projetos
-- Supabase — usada aqui pra "São Lucas"/"Sao Lucas" contarem como o mesmo
-- nome. Se o ambiente não permitir CREATE EXTENSION (raro em Supabase
-- gerenciado), esta linha falha alto e claro — melhor que degradar
-- silenciosamente para uma comparação que não reconhece acentos.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- STABLE (não IMMUTABLE): unaccent() em si é STABLE no Postgres (depende de
-- dicionário de texto). Não é usada em índice funcional nesta sprint, então
-- a diferença não importa na prática — mas marcar como IMMUTABLE seria uma
-- promessa que a função chamada não cumpre.
CREATE OR REPLACE FUNCTION public.normalize_dedup_text(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT NULLIF(trim(regexp_replace(lower(unaccent(COALESCE(p_text, ''))), '\s+', ' ', 'g')), '');
$$;

-- Relaxa a constraint da Sprint 3.1: item_avulso passa a aceitar também o
-- formato "múltiplos itens", onde brinde_id/quantidade ficam NULL na linha
-- de cabeçalho e os itens de fato vão para public.brinde_entrega_itens
-- (nova tabela abaixo). O formato antigo (um único brinde_id direto na
-- linha) continua válido e sem migração — é o que o DeliveryModal.jsx já
-- existente continua gravando, sem nenhuma alteração de comportamento.
ALTER TABLE public.brinde_entregas
  DROP CONSTRAINT IF EXISTS chk_brinde_entregas_item;

ALTER TABLE public.brinde_entregas
  ADD CONSTRAINT chk_brinde_entregas_item CHECK (
    (tipo_entrega = 'kit' AND kit_id IS NOT NULL AND brinde_id IS NULL)
    OR
    (tipo_entrega = 'item_avulso' AND kit_id IS NULL AND (
      (brinde_id IS NOT NULL AND quantidade IS NOT NULL) -- formato antigo (Sprint 3.1)
      OR
      (brinde_id IS NULL AND quantidade IS NULL)         -- formato novo (Sprint 3.7, ver brinde_entrega_itens)
    ))
  );

-- Reforço em banco contra kit duplicado sob concorrência: a checagem feita
-- dentro de registrar_entrega_brinde_feira (SELECT ... WHERE status <>
-- 'cancelado') não é atômica sozinha — duas chamadas simultâneas para o
-- mesmo lead/feira/kit poderiam passar pela checagem antes de qualquer uma
-- confirmar o INSERT. Este índice único parcial faz o banco rejeitar a
-- segunda tentativa mesmo nesse cenário de corrida.
CREATE UNIQUE INDEX IF NOT EXISTS uq_brinde_entrega_kit_lead_feira_ativo
  ON public.brinde_entregas (feira_id, lead_id, kit_id)
  WHERE tipo_entrega = 'kit'
    AND kit_id IS NOT NULL
    AND status <> 'cancelado';

-- ── TABELA: brinde_feira_estoque ───────────────────────────────
-- Livro-razão local por feira: quanto foi enviado, entregue, retornado e
-- perdido de cada brinde numa feira específica. Saldo disponível =
-- enviada - entregue - perda + retorno. Retorno/perda ainda não têm
-- fluxo de UI nesta sprint (fica para o fechamento de feira, sprint
-- futura), mas os campos já existem para não exigir migração depois.
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
-- Detalhe item a item de uma entrega — essencial pra kit (vários brindes
-- numa só entrega) e pro novo formato multi-item de item_avulso. Entregas
-- antigas (formato de brinde_id único na própria linha) não têm linhas
-- aqui, e o frontend trata isso como "sem itens filhos = usa o formato
-- antigo da própria linha".
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
-- Restrita a is_gifts_manager() (vendedor NÃO pode ajustar carga). Baixa o
-- estoque central (mesma trilha de auditoria de qualquer saída) e soma a
-- quantidade enviada no livro-razão local da feira, de forma atômica.
-- p_created_by (revisão pós-review): mantido na assinatura só por
-- compatibilidade com a chamada já feita pelo frontend — o valor recebido
-- é IGNORADO. Quem grava é sempre resolvido no servidor a partir de
-- auth.uid(), igual a registrar_entrega_brinde_feira, pra auditoria não
-- depender de o cliente informar o profile_id certo.
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

-- REVOKE FROM PUBLIC sozinho não é suficiente neste projeto: existe uma
-- default privilege no schema public que concede EXECUTE a anon/authenticated
-- automaticamente em toda função nova (ver pg_default_acl) — REVOKE FROM
-- anon explícito é necessário pra realmente fechar a função pra sessões
-- anônimas (achado da auditoria pós-Sprint 3.8, hardening aplicado
-- retroativamente via migration própria).
REVOKE ALL ON FUNCTION public.registrar_carga_feira(UUID, UUID, INTEGER, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_carga_feira(UUID, UUID, INTEGER, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_carga_feira(UUID, UUID, INTEGER, TEXT, UUID) TO authenticated;

-- ── RPC: registrar_entrega_brinde_feira ────────────────────────
-- Único caminho para dar baixa de brinde numa feira. SECURITY DEFINER
-- porque o vendedor (is_gifts_deliverer) precisa conseguir gravar em
-- brinde_entregas/brinde_entrega_itens/brinde_feira_estoque mesmo sem ter
-- permissão de escrita direta nessas tabelas (só is_gifts_manager() tem
-- FOR ALL) — toda a validação de autorização e de regra de negócio abaixo
-- é feita explicitamente dentro da função antes de qualquer escrita.
-- created_by/entregue_por são resolvidos a partir de auth.uid() no
-- servidor (nunca recebidos como parâmetro do cliente), pra a auditoria
-- não depender de o front-end informar o usuário certo.
--
-- Extensão (Autoatendimento interno): p_tipo_destinatario distingue duas
-- pessoas que podem receber o brinde — 'lead' (obrigatório p_lead_id) ou
-- 'cliente_existente' (pessoa já conhecida da empresa, sem lead nesta
-- feira — obrigatório p_destinatario_nome/p_destinatario_empresa). Para
-- 'cliente_existente', antes de gravar é feita uma checagem "soft" de
-- possível duplicidade (mesmo nome+empresa já recebeu brinde nesta feira):
-- se encontrar e p_confirmar_duplicidade ainda não veio true, a função
-- RETORNA (não RAISE) um JSON com possivel_duplicata=true em vez de
-- gravar — o frontend mostra o alerta e, se o usuário confirmar, chama de
-- novo com p_confirmar_duplicidade=true para efetivar a entrega.
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
  v_profile_id          UUID;
  v_kit                 RECORD;
  v_item                RECORD;
  v_estoque             public.brinde_feira_estoque%ROWTYPE;
  v_saldo               INTEGER;
  v_entrega             public.brinde_entregas%ROWTYPE;
  v_codigo              TEXT;
  v_itens_json          JSONB;
  v_destinatario_nome    TEXT;
  v_destinatario_empresa TEXT;
  v_duplicata           RECORD;
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

    -- 1ª passada: trava (FOR UPDATE) e valida o saldo de cada item do kit,
    -- em ordem estável, pra evitar deadlock com outras entregas concorrentes.
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

      -- Distingue "nunca chegou carga pra este brinde nesta feira" (nenhuma
      -- linha em brinde_feira_estoque) de "chegou, mas o saldo já foi
      -- consumido" (linha existe, saldo insuficiente) — mensagens
      -- diferentes ajudam o atendente a saber se o problema é "avise o
      -- gestor pra mandar mais carga" ou "peça pro gestor preparar a carga
      -- desse brinde nesta feira".
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

    -- 1ª passada: mesma lógica de trava + validação de saldo do kit, acima.
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

      -- Distingue "nunca chegou carga pra este brinde nesta feira" (nenhuma
      -- linha em brinde_feira_estoque) de "chegou, mas o saldo já foi
      -- consumido" (linha existe, saldo insuficiente) — mensagens
      -- diferentes ajudam o atendente a saber se o problema é "avise o
      -- gestor pra mandar mais carga" ou "peça pro gestor preparar a carga
      -- desse brinde nesta feira".
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

  -- 2ª passada: agora que a entrega existe, aplica a baixa no saldo local
  -- da feira e grava cada item entregue, na mesma ordem estável da 1ª.
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

-- Nunca conceder a anon: liberar brinde exige sempre usuário autenticado
-- com is_gifts_deliverer() = true, checado explicitamente dentro da função.
-- REVOKE FROM PUBLIC sozinho não é suficiente neste projeto (default
-- privilege do schema public concede EXECUTE a anon automaticamente em toda
-- função nova — ver pg_default_acl) — REVOKE FROM anon explícito abaixo.
REVOKE ALL ON FUNCTION public.registrar_entrega_brinde_feira(UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_entrega_brinde_feira(UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_entrega_brinde_feira(UUID, UUID, TEXT, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- ============================================================
-- SPRINT 3.8 — CENTRO DE PERMISSÕES (PBAC), ETAPA 3: BANCO DE DADOS
-- ============================================================
-- Cria a estrutura de dados (tabelas + catálogo + seed de role_permissions).
-- Esta migration NÃO muda o comportamento atual do frontend — usePermissions()
-- continua lendo o mapa estático de src/modules/permissions/constants/permissions.js
-- até a Etapa 5 (migração do frontend para consumir estas tabelas) ser
-- implementada. Ainda assim, ela CRIA estruturas novas e sujeitas às
-- políticas RLS abaixo — ou seja, endpoints novos passam a existir e
-- responder a partir do momento em que esta migration é aplicada, mesmo que
-- nenhuma tela do sistema os utilize ainda.
--
-- Ver docs/architecture/permissions-pbac-inventario.md para o inventário e
-- catálogo completos que fundamentam esta migration (Etapas 1 e 2).
--
-- Papéis novos (Pré-vendas, Recepção etc., citados no pedido original) NÃO
-- são criados aqui, por decisão explícita: a tabela `roles` fica pronta pra
-- recebê-los, mas cada papel novo precisa de alguém definir suas permissões
-- antes de existir — não há como inferir isso do código atual. Além disso,
-- uma auditoria (ver docs/architecture/permissions-pbac-inventario.md,
-- seção "Auditoria de bloqueios para papéis dinâmicos") encontrou pontos
-- fora deste banco que hoje só aceitam os 4 papéis atuais — a tabela
-- `roles` sozinha não é suficiente para um papel novo funcionar de ponta a
-- ponta ainda.
--
-- Regra de seed do role_permissions (documentada aqui pra quem for auditar):
-- toda permissão nova (granular) é concedida a um role SOMENTE quando esse
-- role já possui, hoje, a permissão "guarda-chuva" equivalente em
-- ROLE_PERMISSIONS (ex: fairs.manage → fairs.create/edit/delete/finish/
-- team_manage). Gaps de UI encontrados no inventário (ex: o botão de
-- excluir lead em /leads não checa NADA hoje, nem role) não foram
-- promovidos a "todo mundo pode" — isso seria formalizar um bug como
-- comportamento pretendido. Quando a Etapa 5 finalmente conectar
-- `can('leads.delete')` ao botão, o gate passa a ser esta tabela, e nesse
-- momento qualquer role que hoje "vaza" acesso por falta de checagem deixa
-- de vazar — o que é a correção, não uma regressão.
--
-- REVISÃO PÓS-CHECKPOINT (mesma sprint, antes da aplicação):
--   1. is_gifts_manager() (admin+marketing+gestor) NÃO é mais usada para
--      administrar estas tabelas — ela deixaria marketing/gestor
--      inserir/alterar/excluir roles, permissions, role_permissions e
--      user_permissions diretamente pela API. Nova função
--      is_permissions_admin() (só admin) assume esse papel em todas as
--      policies de escrita + na leitura de permission_change_log.
--   2. Catálogo ganhou permissions.view/manage/audit_view, concedidas só a admin.
--   3. roles ganhou trigger protegendo papéis de sistema contra DELETE,
--      troca de `code` e reversão de `is_system` para false.
--   4. selfservice.credential_scan REMOVIDA do catálogo e dos seeds — a
--      integração com o QR da organizadora foi descartada por
--      impossibilidade técnica (ver inventário, seção Autoatendimento).
--
-- REVISÃO 2 (mesmo checkpoint, antes da aplicação):
--   5. permission_change_log passa a ser SOMENTE LEITURA por RLS — não
--      existe mais NENHUMA policy de escrita nesta tabela, nem pra admin.
--      Isso significa que, hoje, nada consegue gravar uma linha aqui via
--      API do Supabase (nem direto, nem através de is_permissions_admin());
--      a Etapa 6 terá que escrever via trigger ou RPC SECURITY DEFINER,
--      que roda com o privilégio do dono da função, não do usuário logado
--      — por isso RLS "fechado pra todo mundo" não impede a Etapa 6 de
--      funcionar, só impede um INSERT solto vindo direto do frontend.
--   6. permissions (catálogo) também passa a ser SOMENTE LEITURA por RLS —
--      novas permissões só entram via migration nova, nunca pela futura
--      tela administrativa. A UI (Etapa 6) administra roles,
--      role_permissions, user_permissions e lê permission_change_log —
--      não cria/edita/exclui o catálogo em si.
--   7. GRANT/REVOKE explícitos em is_permissions_admin() (só authenticated
--      executa) e protect_system_roles() (REVOKE de PUBLIC — função de
--      trigger, nunca chamada diretamente por SQL de um usuário; o
--      trigger continua dependência do Postgres, TG_OP interno, não
--      passa pelo mecanismo normal de EXECUTE, então revogar de PUBLIC
--      não quebra o disparo automático em UPDATE/DELETE de roles).
-- ============================================================

-- ── TABELA: permissions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permissions (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,     -- 'gifts.deliver' — mesmo formato já usado em PERMISSIONS (permissions.js)
  resource    TEXT NOT NULL,            -- 'gifts'
  action      TEXT NOT NULL,            -- 'deliver'
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions (resource);

-- ── TABELA: roles ─────────────────────────────────────────────────
-- Espelha (não substitui) public.user_profiles.role, que continua sendo a
-- coluna real de identidade do usuário. `roles.code` é o elo entre as duas.
-- is_system=true protege os 4 papéis atuais — reforçado pelo trigger
-- protect_system_roles() abaixo, porque a coluna sozinha não impede nada
-- (é só um dado; sem trigger, um DELETE ou UPDATE direto ignora o que ela
-- "significa").
CREATE TABLE IF NOT EXISTS public.roles (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,     -- 'admin', 'vendedor', futuramente 'pre_vendas', 'recepcao'...
  nome        TEXT NOT NULL,
  descricao   TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABELA: role_permissions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions (permission_id);

-- ── TABELA: user_permissions ──────────────────────────────────────
-- Sobrescritas individuais (Etapa 6: "Permissões Individuais por Usuário").
-- effect='grant' libera algo além do que o role já dá; effect='revoke' tira
-- algo que o role concederia. Nenhum código consome esta tabela ainda.
CREATE TABLE IF NOT EXISTS public.user_permissions (
  profile_id    UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  effect        TEXT NOT NULL CHECK (effect IN ('grant', 'revoke')),
  created_by    UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_profile ON public.user_permissions (profile_id);

-- ── TABELA: permission_change_log ─────────────────────────────────
-- Histórico de alterações (Etapa 6, "se possível"). Nenhum código escreve
-- aqui ainda — fica pronta pra quando a UI administrativa existir.
-- REQUISITO OBRIGATÓRIO para quando essa escrita for implementada (Etapa 6):
-- o preenchimento deve vir de um trigger ou de uma RPC SECURITY DEFINER
-- que valida a operação — nunca de um INSERT direto disparado pelo
-- frontend, que poderia gravar um log falso ou incompleto.
CREATE TABLE IF NOT EXISTS public.permission_change_log (
  id                UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  actor_profile_id  UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  target_type       TEXT NOT NULL CHECK (target_type IN ('role', 'user')),
  target_id         UUID NOT NULL,  -- role_id ou profile_id, conforme target_type (sem FK cruzada por causa do tipo variável)
  permission_id     UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  action            TEXT NOT NULL CHECK (action IN ('grant', 'revoke')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_change_log_target ON public.permission_change_log (target_type, target_id);

-- ── Helper de autorização: quem administra o Centro de Permissões ──
-- Deliberadamente MAIS ESTRITA que is_gifts_manager() (que inclui
-- marketing e gestor). Administrar roles/permissions/vínculos é uma
-- operação de raiz de confiança do sistema — só admin ativo. Provisória
-- (ver comentário no cabeçalho): a Etapa 6 pode decidir abrir
-- `permissions.manage` pra outros papéis via role_permissions no futuro,
-- mas até lá o banco não confia em ninguém além de admin pra essa escrita.
CREATE OR REPLACE FUNCTION public.is_permissions_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND ativo = true
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_permissions_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_permissions_admin() TO authenticated;

-- ── Trigger: protege papéis de sistema (roles.is_system = true) ────
-- A coluna is_system sozinha é só um dado — sem isto, um DELETE ou UPDATE
-- direto na tabela ignora completamente o que ela deveria significar.
-- Bloqueia: (1) excluir um papel de sistema; (2) trocar o `code` de um
-- papel de sistema; (3) desmarcar is_system (true→false) de um papel de
-- sistema. Nome e descrição continuam livremente editáveis.
CREATE OR REPLACE FUNCTION public.protect_system_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'Não é permitido excluir o papel de sistema "%".', OLD.code
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  -- TG_OP = 'UPDATE'
  IF OLD.is_system THEN
    IF NEW.code IS DISTINCT FROM OLD.code THEN
      RAISE EXCEPTION 'Não é permitido alterar o código do papel de sistema "%".', OLD.code
        USING ERRCODE = '42501';
    END IF;
    IF NEW.is_system = false THEN
      RAISE EXCEPTION 'Não é permitido remover a marcação de sistema do papel "%".', OLD.code
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Função de trigger: nunca chamada diretamente por SQL de um usuário (só o
-- mecanismo de trigger do Postgres a invoca, internamente, no BEFORE
-- UPDATE/DELETE de roles). Revogar de PUBLIC não quebra o disparo — quem
-- precisa de EXECUTE pra uma função de trigger disparar é o dono/criador do
-- trigger no momento do CREATE TRIGGER, não o usuário que depois faz o
-- UPDATE/DELETE na tabela.
REVOKE ALL ON FUNCTION public.protect_system_roles() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_system_roles ON public.roles;
CREATE TRIGGER trg_protect_system_roles
  BEFORE UPDATE OR DELETE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_system_roles();

-- ── RLS ────────────────────────────────────────────────────────────
-- Leitura liberada pra qualquer authenticated em permissions/roles/
-- role_permissions (o frontend inteiro vai precisar ler isto pra montar
-- `can()` na Etapa 5 — restringir a leitura travaria a própria checagem de
-- permissão).
--
-- permissions (catálogo) é SOMENTE LEITURA pra todo mundo, inclusive
-- admin, via API do Supabase — de propósito, sem nenhuma policy de
-- INSERT/UPDATE/DELETE. Novas permissões só entram por migration nova,
-- junto com a funcionalidade correspondente (regra permanente desta
-- sprint). A futura tela administrativa (Etapa 6) NÃO cria/edita/exclui
-- código de permissão — ela administra roles, role_permissions e
-- user_permissions, e lê (só leitura) permission_change_log.
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura permissions" ON public.permissions;
CREATE POLICY "Leitura permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Gestao permissions" ON public.permissions;

-- Escrita (INSERT/UPDATE/DELETE) nas demais tabelas restrita a
-- is_permissions_admin() — só admin ativo, nunca marketing/gestor.
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura roles" ON public.roles;
CREATE POLICY "Leitura roles" ON public.roles
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Gestao roles" ON public.roles;
CREATE POLICY "Gestao roles" ON public.roles
  FOR ALL TO authenticated
  USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin());

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura role_permissions" ON public.role_permissions;
CREATE POLICY "Leitura role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Gestao role_permissions" ON public.role_permissions;
CREATE POLICY "Gestao role_permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin());

-- user_permissions: leitura restrita ao próprio usuário + quem administra —
-- diferente das tabelas acima, isto pode conter dado sensível por pessoa
-- (ex: uma revogação individual), então não abre leitura geral.
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura propria user_permissions" ON public.user_permissions;
CREATE POLICY "Leitura propria user_permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    public.is_permissions_admin()
    OR profile_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Gestao user_permissions" ON public.user_permissions;
CREATE POLICY "Gestao user_permissions" ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.is_permissions_admin()) WITH CHECK (public.is_permissions_admin());

-- permission_change_log é SOMENTE LEITURA pra todo mundo, inclusive admin,
-- via API do Supabase — nenhuma policy de INSERT/UPDATE/DELETE existe, de
-- propósito. É um log de auditoria: se um admin pudesse escrever nele
-- direto, deixaria de provar nada (poderia forjar o próprio histórico). A
-- Etapa 6 escreve aqui via trigger ou RPC SECURITY DEFINER — que roda com
-- o privilégio do DONO da função (não do usuário logado), então RLS
-- "fechado pra todo mundo" não impede a escrita real acontecer, só impede
-- um INSERT solto vindo direto do frontend/API.
ALTER TABLE public.permission_change_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura permission_change_log" ON public.permission_change_log;
CREATE POLICY "Leitura permission_change_log" ON public.permission_change_log
  FOR SELECT TO authenticated USING (public.is_permissions_admin());
DROP POLICY IF EXISTS "Gestao permission_change_log" ON public.permission_change_log;

-- ── SEED: roles (os 4 papéis já em produção) ────────────────────────
INSERT INTO public.roles (code, nome, descricao, is_system) VALUES
  ('admin',     'Administrador', 'Acesso total ao sistema', true),
  ('marketing', 'Marketing',     'Gestão de feiras, leads e relatórios; sem gestão de usuários ou configurações', true),
  ('gestor',    'Gestor',        'Gerencia a própria equipe', true),
  ('vendedor',  'Vendedor',      'Capta e administra apenas os próprios leads', true)
ON CONFLICT (code) DO NOTHING;

-- ── SEED: permissions (catálogo completo — Etapa 2, revisado) ───────
-- Inclui permissões já em uso 🟢, já declaradas mas sem tela que use 🟡, e
-- novas propostas 🆕 (granularização de bundles hoje monolíticos, como
-- fairs.manage/gifts.manage/users.manage). NÃO inclui itens puramente 🔮
-- roadmap (leads.export, selfservice.enable/disable) — a funcionalidade
-- correspondente ainda não existe, e a regra permanente desta sprint é
-- "toda funcionalidade nova registra sua permissão junto", não o inverso.
-- selfservice.credential_scan REMOVIDA (revisão pós-checkpoint): a leitura
-- de QR de credencial foi descontinuada, ver comentário no cabeçalho.
-- permissions.view/manage/audit_view: NOVAS nesta revisão — cobrem o
-- próprio Centro de Permissões (Etapa 6), concedidas só a admin no seed
-- abaixo.
INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('dashboard.view',              'dashboard',    'view',             'Visualizar dashboard geral'),
  ('dashboard.view_team',         'dashboard',    'view_team',        'Visualizar dashboard da própria equipe'),

  ('fairs.view',                  'fairs',        'view',             'Visualizar feiras'),
  ('fairs.create',                'fairs',        'create',           'Criar feira'),
  ('fairs.edit',                  'fairs',        'edit',             'Editar feira'),
  ('fairs.delete',                'fairs',        'delete',           'Excluir feira'),
  ('fairs.finish',                'fairs',        'finish',           'Encerrar feira'),
  ('fairs.team_manage',           'fairs',        'team_manage',      'Adicionar/remover integrantes da equipe da feira'),
  ('fairs.view_all_teams',        'fairs',        'view_all_teams',   'Ver todas as feiras, não só as da própria equipe'),
  ('fairs.manage',                'fairs',        'manage',           'Gerenciar feiras (bundle: create+edit+delete+finish+team_manage)'),

  ('leads.view_all',              'leads',        'view_all',         'Visualizar todos os leads'),
  ('leads.view_team',             'leads',        'view_team',        'Visualizar leads da própria equipe'),
  ('leads.view_own',              'leads',        'view_own',         'Visualizar os próprios leads'),
  ('leads.capture',               'leads',        'capture',          'Captar novo lead'),
  ('leads.edit',                  'leads',        'edit',             'Editar lead (ex: alterar status)'),
  ('leads.delete',                'leads',        'delete',           'Excluir lead'),
  ('leads.manage_all',            'leads',        'manage_all',       'Gerenciar todos os leads (bundle: edit+delete, escopo total)'),
  ('leads.manage_team',           'leads',        'manage_team',      'Gerenciar leads da própria equipe (bundle: edit+delete, escopo equipe)'),
  ('leads.manage_own',            'leads',        'manage_own',       'Gerenciar os próprios leads (bundle: edit+delete, escopo próprio)'),

  ('gifts.view',                  'gifts',        'view',             'Visualizar estoque/kits/movimentações de brindes'),
  ('gifts.create',                'gifts',        'create',           'Cadastrar brinde ou kit'),
  ('gifts.edit',                  'gifts',        'edit',             'Editar brinde ou kit'),
  ('gifts.delete',                'gifts',        'delete',           'Excluir/inativar brinde ou kit'),
  ('gifts.stock_adjust',          'gifts',        'stock_adjust',     'Ajustar estoque, incluindo carga da feira'),
  ('gifts.deliver',               'gifts',        'deliver',          'Liberar entrega de brinde'),
  ('gifts.cancel_delivery',       'gifts',        'cancel_delivery',  'Cancelar entrega de brinde'),
  ('gifts.manage',                'gifts',        'manage',           'Gerenciar brindes (bundle: view+create+edit+delete+stock_adjust+cancel_delivery+deliver)'),

  ('selfservice.view',            'selfservice',  'view',             'Acessar o Autoatendimento interno'),

  ('users.view',                  'users',        'view',             'Visualizar usuários'),
  ('users.create',                'users',        'create',           'Criar usuário'),
  ('users.edit',                  'users',        'edit',             'Editar usuário (cargo, setor, role)'),
  ('users.disable',               'users',        'disable',          'Ativar/desativar usuário'),
  ('users.reset_password',        'users',        'reset_password',   'Redefinir senha de outro usuário'),
  ('users.manage',                'users',        'manage',           'Gerenciar usuários (bundle: view+create+edit+disable+reset_password)'),

  ('settings.edit',               'settings',     'edit',             'Editar configurações do sistema'),
  ('settings.manage',             'settings',     'manage',           'Gerenciar configurações (alias de settings.edit)'),

  ('profile.view',                'profile',      'view',             'Visualizar o próprio perfil'),
  ('profile.edit_own',            'profile',      'edit_own',         'Editar o próprio perfil'),
  ('profile.change_password_own', 'profile',      'change_password_own', 'Alterar a própria senha'),

  ('satisfaction.view',           'satisfaction', 'view',             'Visualizar pesquisas de satisfação'),
  ('satisfaction.manage',         'satisfaction', 'manage',           'Criar/editar/duplicar/ativar pesquisas e perguntas'),
  ('satisfaction.responses_view', 'satisfaction', 'responses_view',   'Visualizar respostas de pesquisas'),

  ('reports.export',              'reports',      'export',           'Exportar relatórios (todos)'),
  ('reports.export_team',         'reports',      'export_team',      'Exportar relatórios da própria equipe'),

  ('permissions.view',            'permissions',  'view',             'Visualizar o Centro de Permissões (papéis, permissões e vínculos)'),
  ('permissions.manage',          'permissions',  'manage',           'Gerenciar papéis, vínculos de permissões e sobrescritas individuais'),
  ('permissions.audit_view',      'permissions',  'audit_view',       'Visualizar o histórico de alterações de permissões')
ON CONFLICT (code) DO NOTHING;

-- ── SEED: role_permissions ───────────────────────────────────────────
-- Espelha EXATAMENTE ROLE_PERMISSIONS de permissions.js (linhas com 🟢/🟡
-- no catálogo) + o backfill de granulares derivado de bundles já
-- concedidos (🆕, ver regra de seed no cabeçalho desta migration).
-- permissions.view/manage/audit_view vão SÓ para admin (ver revisão
-- pós-checkpoint). selfservice.credential_scan removida de todos os 4 papéis.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  -- ===== admin =====
  ('admin', 'dashboard.view'), ('admin', 'fairs.view'), ('admin', 'fairs.manage'),
  ('admin', 'leads.view_all'), ('admin', 'leads.capture'), ('admin', 'leads.manage_all'),
  ('admin', 'settings.manage'), ('admin', 'users.manage'), ('admin', 'reports.export'),
  ('admin', 'profile.view'), ('admin', 'gifts.manage'),
  ('admin', 'fairs.create'), ('admin', 'fairs.edit'), ('admin', 'fairs.delete'),
  ('admin', 'fairs.finish'), ('admin', 'fairs.team_manage'), ('admin', 'fairs.view_all_teams'),
  ('admin', 'satisfaction.view'), ('admin', 'satisfaction.manage'), ('admin', 'satisfaction.responses_view'),
  ('admin', 'leads.edit'), ('admin', 'leads.delete'),
  ('admin', 'selfservice.view'),
  ('admin', 'gifts.view'), ('admin', 'gifts.create'), ('admin', 'gifts.edit'), ('admin', 'gifts.delete'),
  ('admin', 'gifts.stock_adjust'), ('admin', 'gifts.cancel_delivery'), ('admin', 'gifts.deliver'),
  ('admin', 'users.view'), ('admin', 'users.create'), ('admin', 'users.edit'),
  ('admin', 'users.disable'), ('admin', 'users.reset_password'),
  ('admin', 'settings.edit'),
  ('admin', 'profile.edit_own'), ('admin', 'profile.change_password_own'),
  ('admin', 'permissions.view'), ('admin', 'permissions.manage'), ('admin', 'permissions.audit_view'),

  -- ===== marketing =====
  ('marketing', 'dashboard.view'), ('marketing', 'fairs.view'), ('marketing', 'fairs.manage'),
  ('marketing', 'leads.view_all'), ('marketing', 'leads.capture'), ('marketing', 'leads.manage_all'),
  ('marketing', 'reports.export'), ('marketing', 'profile.view'), ('marketing', 'gifts.manage'),
  ('marketing', 'fairs.create'), ('marketing', 'fairs.edit'), ('marketing', 'fairs.delete'),
  ('marketing', 'fairs.finish'), ('marketing', 'fairs.team_manage'), ('marketing', 'fairs.view_all_teams'),
  ('marketing', 'satisfaction.view'), ('marketing', 'satisfaction.manage'), ('marketing', 'satisfaction.responses_view'),
  ('marketing', 'leads.edit'), ('marketing', 'leads.delete'),
  ('marketing', 'selfservice.view'),
  ('marketing', 'gifts.view'), ('marketing', 'gifts.create'), ('marketing', 'gifts.edit'), ('marketing', 'gifts.delete'),
  ('marketing', 'gifts.stock_adjust'), ('marketing', 'gifts.cancel_delivery'), ('marketing', 'gifts.deliver'),
  ('marketing', 'profile.edit_own'), ('marketing', 'profile.change_password_own'),

  -- ===== gestor =====
  ('gestor', 'dashboard.view_team'), ('gestor', 'fairs.view'), ('gestor', 'leads.view_team'),
  ('gestor', 'leads.capture'), ('gestor', 'leads.manage_team'), ('gestor', 'reports.export_team'),
  ('gestor', 'profile.view'), ('gestor', 'gifts.manage'),
  ('gestor', 'fairs.view_all_teams'),
  ('gestor', 'satisfaction.view'), ('gestor', 'satisfaction.manage'), ('gestor', 'satisfaction.responses_view'),
  ('gestor', 'leads.edit'), ('gestor', 'leads.delete'),
  ('gestor', 'selfservice.view'),
  ('gestor', 'gifts.view'), ('gestor', 'gifts.create'), ('gestor', 'gifts.edit'), ('gestor', 'gifts.delete'),
  ('gestor', 'gifts.stock_adjust'), ('gestor', 'gifts.cancel_delivery'), ('gestor', 'gifts.deliver'),
  ('gestor', 'profile.edit_own'), ('gestor', 'profile.change_password_own'),

  -- ===== vendedor =====
  ('vendedor', 'leads.capture'), ('vendedor', 'leads.view_own'), ('vendedor', 'leads.manage_own'),
  ('vendedor', 'profile.view'), ('vendedor', 'gifts.deliver'),
  ('vendedor', 'leads.edit'), ('vendedor', 'leads.delete'),
  ('vendedor', 'selfservice.view'),
  ('vendedor', 'profile.edit_own'), ('vendedor', 'profile.change_password_own')
) AS seed(role_code, permission_code)
JOIN public.roles r ON r.code = seed.role_code
JOIN public.permissions p ON p.code = seed.permission_code
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- HARDENING — RLS granular de leads_feira via PBAC
-- ============================================================
-- Achado da Etapa 5 (Bloco 2): leads_feira tinha 1 única policy "Acesso
-- total leads_feira" (FOR ALL TO authenticated USING (true) WITH CHECK
-- (true)) — sem NENHUMA restrição de linha. "gestor vê só a equipe" e
-- "vendedor só vê os próprios leads" eram garantias inteiramente da UI,
-- nunca do banco (confirmado empiricamente: Vendedor 1 conseguiu ler o
-- lead do Vendedor 2 via API direta).
--
-- Precisa vir DEPOIS da seção PBAC acima (roles/permissions/
-- role_permissions/user_permissions) — has_effective_permission() depende
-- dessas tabelas já existirem. Por isso substitui a policy original de
-- "TABELA: leads_feira" (topo do arquivo) aqui, em vez de editá-la in-place
-- como Sprint 3.6 fez (naquele caso não havia dependência de ordem).
--
-- has_effective_permission()/is_own_or_team_lead() NÃO usam SECURITY
-- DEFINER: user_profiles já tem SELECT amplo pra authenticated
-- ("ativo = true"), e roles/permissions/role_permissions já são
-- "qual: true" pra authenticated — o invocador já enxerga tudo que estas
-- funções precisam ler, sob a própria RLS dele.
--
-- CONSEQUÊNCIA INTENCIONAL: leads do totem público (/autoatendimento,
-- via register_kiosk_lead() SECURITY DEFINER, sempre created_by NULL)
-- deixam de aparecer pra gestor/vendedor sob escopo team/own (não casam
-- com nenhum created_by) — antes apareciam pra gestor (RLS permissiva não
-- filtrava nada). Continuam 100% visíveis pra quem tem leads.view_all
-- (admin/marketing).
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_effective_permission(permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH me AS (
    SELECT id, role
    FROM public.user_profiles
    WHERE user_id = auth.uid() AND ativo = true
  ),
  role_grant AS (
    SELECT 1
    FROM me
    JOIN public.roles r ON r.code = me.role
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE p.code = permission_code
  ),
  individual_grant AS (
    SELECT 1
    FROM me
    JOIN public.user_permissions up ON up.profile_id = me.id
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE p.code = permission_code AND up.effect = 'grant'
  ),
  individual_revoke AS (
    SELECT 1
    FROM me
    JOIN public.user_permissions up ON up.profile_id = me.id
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE p.code = permission_code AND up.effect = 'revoke'
  )
  SELECT
    (EXISTS (SELECT 1 FROM role_grant) OR EXISTS (SELECT 1 FROM individual_grant))
    AND NOT EXISTS (SELECT 1 FROM individual_revoke);
$$;

REVOKE ALL ON FUNCTION public.has_effective_permission(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_effective_permission(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_effective_permission(TEXT) TO authenticated;

-- "Equipe" = perfis cujo gestor_id aponta pro profile do usuário atual.
CREATE OR REPLACE FUNCTION public.is_own_or_team_lead(created_by UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT created_by = auth.uid()
    OR created_by IN (
      SELECT up.user_id
      FROM public.user_profiles up
      WHERE up.gestor_id = (
        SELECT me.id FROM public.user_profiles me WHERE me.user_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_own_or_team_lead(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_own_or_team_lead(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_own_or_team_lead(UUID) TO authenticated;

DROP POLICY IF EXISTS "Acesso total leads_feira" ON public.leads_feira;

CREATE POLICY "Leitura leads_feira" ON public.leads_feira
  FOR SELECT TO authenticated
  USING (
    public.has_effective_permission('leads.view_all')
    OR (public.has_effective_permission('leads.view_team') AND public.is_own_or_team_lead(created_by))
    OR (public.has_effective_permission('leads.view_own') AND created_by = auth.uid())
  );

-- created_by = auth.uid() (nunca NULL, nunca outro UUID): um usuário
-- authenticated com leads.capture não pode criar um lead sem responsável
-- nem ocultá-lo do próprio escopo. created_by NULL só existe pra leads do
-- totem público, que passam por register_kiosk_lead() (SECURITY DEFINER,
-- bypassa RLS por completo) — nunca por esta policy.
CREATE POLICY "Insercao leads_feira" ON public.leads_feira
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_effective_permission('leads.capture')
    AND created_by = auth.uid()
  );

CREATE POLICY "Atualizacao leads_feira" ON public.leads_feira
  FOR UPDATE TO authenticated
  USING (
    public.has_effective_permission('leads.manage_all')
    OR (public.has_effective_permission('leads.manage_team') AND public.is_own_or_team_lead(created_by))
    OR (public.has_effective_permission('leads.manage_own') AND created_by = auth.uid())
  )
  WITH CHECK (
    public.has_effective_permission('leads.manage_all')
    OR (public.has_effective_permission('leads.manage_team') AND public.is_own_or_team_lead(created_by))
    OR (public.has_effective_permission('leads.manage_own') AND created_by = auth.uid())
  );

CREATE POLICY "Exclusao leads_feira" ON public.leads_feira
  FOR DELETE TO authenticated
  USING (
    public.has_effective_permission('leads.manage_all')
    OR (public.has_effective_permission('leads.manage_team') AND public.is_own_or_team_lead(created_by))
    OR (public.has_effective_permission('leads.manage_own') AND created_by = auth.uid())
  );

REVOKE ALL ON public.leads_feira FROM anon;

CREATE INDEX IF NOT EXISTS idx_user_profiles_gestor_id ON public.user_profiles (gestor_id);

-- ============================================================
-- ETAPA 6.2 — RPCs de gravação do Centro de Permissões
--             + hardening de user_profiles contra auto-escalação/lockout
-- ============================================================
-- Fecha o acesso de escrita direta a role_permissions/user_permissions/
-- permission_change_log (só leitura via RLS, escrita só pelas 4 RPCs
-- SECURITY DEFINER abaixo) e adiciona o guard de lockout administrativo +
-- auditoria transacional. Também endurece user_profiles: a RLS garantia
-- que cada usuário só toca a PRÓPRIA linha, mas não restringia QUAIS
-- COLUNAS podiam mudar — role/ativo/gestor_id eram alteráveis pelo
-- próprio usuário via API direta (fora da UI React). Trigger de coluna +
-- trigger de lockout em UPDATE/DELETE fecham isso, cobrindo o caminho RLS
-- (self-service, admin via UI) e service_role (Edge Function admin-auth,
-- que ignora RLS mas não ignora trigger).
-- ============================================================

ALTER TABLE public.permission_change_log DROP CONSTRAINT IF EXISTS permission_change_log_action_check;
ALTER TABLE public.permission_change_log
  ADD CONSTRAINT permission_change_log_action_check CHECK (action IN ('grant', 'revoke', 'inherit'));

-- count_active_users_with_permissions(codes) — guard de lockout. NÃO
-- reutiliza has_effective_permission() (resolve sempre pra auth.uid());
-- aqui avalia QUALQUER profile_id ativo do sistema. SECURITY DEFINER, sem
-- GRANT EXECUTE pra authenticated/anon — só alcançável de dentro das 4
-- RPCs abaixo.
CREATE OR REPLACE FUNCTION public.count_active_users_with_permissions(codes text[])
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer
  FROM public.user_profiles up
  WHERE up.ativo = true
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(codes) AS wanted(code)
      WHERE
        EXISTS (
          SELECT 1 FROM public.user_permissions rev
          JOIN public.permissions p ON p.id = rev.permission_id
          WHERE rev.profile_id = up.id AND rev.effect = 'revoke' AND p.code = wanted.code
        )
        OR (
          NOT EXISTS (
            SELECT 1 FROM public.roles r
            JOIN public.role_permissions rp ON rp.role_id = r.id
            JOIN public.permissions p ON p.id = rp.permission_id
            WHERE r.code = up.role AND p.code = wanted.code
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.user_permissions grt
            JOIN public.permissions p ON p.id = grt.permission_id
            WHERE grt.profile_id = up.id AND grt.effect = 'grant' AND p.code = wanted.code
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.count_active_users_with_permissions(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_active_users_with_permissions(text[]) FROM anon, authenticated;

-- set_role_permission — concede/remove uma permissão de um PAPEL.
CREATE OR REPLACE FUNCTION public.set_role_permission(
  p_role_code text,
  p_permission_code text,
  p_granted boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id uuid;
  v_role_id uuid;
  v_permission_id uuid;
  v_changed boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);

  SELECT id INTO v_actor_profile_id
  FROM public.user_profiles
  WHERE user_id = auth.uid() AND ativo = true;

  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('permissions.manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar o Centro de Permissões' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_role_id FROM public.roles WHERE code = p_role_code;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Papel % não encontrado', p_role_code USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_permission_id FROM public.permissions WHERE code = p_permission_code;
  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permissão % não encontrada', p_permission_code USING ERRCODE = '22023';
  END IF;

  IF p_granted THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_role_id, v_permission_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    v_changed := FOUND;
  ELSE
    DELETE FROM public.role_permissions
    WHERE role_id = v_role_id AND permission_id = v_permission_id;
    v_changed := FOUND;
  END IF;

  IF v_changed AND NOT p_granted AND p_permission_code IN ('permissions.manage', 'permissions.view') THEN
    IF public.count_active_users_with_permissions(ARRAY['permissions.manage', 'permissions.view']) = 0 THEN
      RAISE EXCEPTION 'Operação bloqueada: nenhum usuário ativo ficaria com permissions.manage e permissions.view ao mesmo tempo (lockout administrativo)'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_changed THEN
    INSERT INTO public.permission_change_log (actor_profile_id, target_type, target_id, permission_id, action)
    VALUES (v_actor_profile_id, 'role', v_role_id, v_permission_id, CASE WHEN p_granted THEN 'grant' ELSE 'revoke' END);
  END IF;

  RETURN jsonb_build_object('changed', v_changed);
END;
$$;

REVOKE ALL ON FUNCTION public.set_role_permission(text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_role_permission(text, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_role_permission(text, text, boolean) TO authenticated;

-- set_user_permission_grant — override individual: concede.
CREATE OR REPLACE FUNCTION public.set_user_permission_grant(
  p_profile_id uuid,
  p_permission_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id uuid;
  v_permission_id uuid;
  v_previous_effect text;
  v_changed boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);

  SELECT id INTO v_actor_profile_id
  FROM public.user_profiles WHERE user_id = auth.uid() AND ativo = true;
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('permissions.manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar o Centro de Permissões' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_profile_id AND ativo = true) THEN
    RAISE EXCEPTION 'Usuário alvo não encontrado ou inativo' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_permission_id FROM public.permissions WHERE code = p_permission_code;
  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permissão % não encontrada', p_permission_code USING ERRCODE = '22023';
  END IF;

  SELECT effect INTO v_previous_effect FROM public.user_permissions
  WHERE profile_id = p_profile_id AND permission_id = v_permission_id;

  IF v_previous_effect IS DISTINCT FROM 'grant' THEN
    INSERT INTO public.user_permissions (profile_id, permission_id, effect, created_by)
    VALUES (p_profile_id, v_permission_id, 'grant', v_actor_profile_id)
    ON CONFLICT (profile_id, permission_id)
    DO UPDATE SET effect = 'grant', created_by = v_actor_profile_id, created_at = now();
    v_changed := true;
  END IF;

  IF v_changed THEN
    INSERT INTO public.permission_change_log (actor_profile_id, target_type, target_id, permission_id, action)
    VALUES (v_actor_profile_id, 'user', p_profile_id, v_permission_id, 'grant');
  END IF;

  RETURN jsonb_build_object('changed', v_changed);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_permission_grant(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_permission_grant(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_permission_grant(uuid, text) TO authenticated;

-- set_user_permission_revoke — override individual: revoga.
CREATE OR REPLACE FUNCTION public.set_user_permission_revoke(
  p_profile_id uuid,
  p_permission_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id uuid;
  v_permission_id uuid;
  v_previous_effect text;
  v_changed boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);

  SELECT id INTO v_actor_profile_id
  FROM public.user_profiles WHERE user_id = auth.uid() AND ativo = true;
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('permissions.manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar o Centro de Permissões' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_profile_id AND ativo = true) THEN
    RAISE EXCEPTION 'Usuário alvo não encontrado ou inativo' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_permission_id FROM public.permissions WHERE code = p_permission_code;
  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permissão % não encontrada', p_permission_code USING ERRCODE = '22023';
  END IF;

  SELECT effect INTO v_previous_effect FROM public.user_permissions
  WHERE profile_id = p_profile_id AND permission_id = v_permission_id;

  IF v_previous_effect IS DISTINCT FROM 'revoke' THEN
    INSERT INTO public.user_permissions (profile_id, permission_id, effect, created_by)
    VALUES (p_profile_id, v_permission_id, 'revoke', v_actor_profile_id)
    ON CONFLICT (profile_id, permission_id)
    DO UPDATE SET effect = 'revoke', created_by = v_actor_profile_id, created_at = now();
    v_changed := true;
  END IF;

  IF v_changed AND p_permission_code IN ('permissions.manage', 'permissions.view') THEN
    IF public.count_active_users_with_permissions(ARRAY['permissions.manage', 'permissions.view']) = 0 THEN
      RAISE EXCEPTION 'Operação bloqueada: nenhum usuário ativo ficaria com permissions.manage e permissions.view ao mesmo tempo (lockout administrativo)'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_changed THEN
    INSERT INTO public.permission_change_log (actor_profile_id, target_type, target_id, permission_id, action)
    VALUES (v_actor_profile_id, 'user', p_profile_id, v_permission_id, 'revoke');
  END IF;

  RETURN jsonb_build_object('changed', v_changed);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_permission_revoke(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_permission_revoke(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_permission_revoke(uuid, text) TO authenticated;

-- clear_user_permission_override — remove o override, restaura herança.
CREATE OR REPLACE FUNCTION public.clear_user_permission_override(
  p_profile_id uuid,
  p_permission_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id uuid;
  v_permission_id uuid;
  v_previous_effect text;
  v_changed boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);

  SELECT id INTO v_actor_profile_id
  FROM public.user_profiles WHERE user_id = auth.uid() AND ativo = true;
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('permissions.manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar o Centro de Permissões' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_permission_id FROM public.permissions WHERE code = p_permission_code;
  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permissão % não encontrada', p_permission_code USING ERRCODE = '22023';
  END IF;

  SELECT effect INTO v_previous_effect FROM public.user_permissions
  WHERE profile_id = p_profile_id AND permission_id = v_permission_id;

  IF v_previous_effect IS NOT NULL THEN
    DELETE FROM public.user_permissions
    WHERE profile_id = p_profile_id AND permission_id = v_permission_id;
    v_changed := true;
  END IF;

  IF v_changed AND p_permission_code IN ('permissions.manage', 'permissions.view') THEN
    IF public.count_active_users_with_permissions(ARRAY['permissions.manage', 'permissions.view']) = 0 THEN
      RAISE EXCEPTION 'Operação bloqueada: nenhum usuário ativo ficaria com permissions.manage e permissions.view ao mesmo tempo (lockout administrativo)'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_changed THEN
    INSERT INTO public.permission_change_log (actor_profile_id, target_type, target_id, permission_id, action)
    VALUES (v_actor_profile_id, 'user', p_profile_id, v_permission_id, 'inherit');
  END IF;

  RETURN jsonb_build_object('changed', v_changed);
END;
$$;

REVOKE ALL ON FUNCTION public.clear_user_permission_override(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_user_permission_override(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_user_permission_override(uuid, text) TO authenticated;

-- RLS: fecha escrita direta, amplia leitura pro PBAC efetivo (aditivo).
DROP POLICY IF EXISTS "Gestao role_permissions" ON public.role_permissions;

DROP POLICY IF EXISTS "Gestao user_permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Leitura propria user_permissions" ON public.user_permissions;
CREATE POLICY "Leitura user_permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    public.is_permissions_admin()
    OR public.has_effective_permission('permissions.view')
    OR public.has_effective_permission('permissions.manage')
    OR profile_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Leitura permission_change_log via audit_view" ON public.permission_change_log
  FOR SELECT TO authenticated
  USING (public.has_effective_permission('permissions.audit_view'));

-- Privilégios de tabela: resultado explícito — escrita só pelas 4 RPCs.
REVOKE ALL ON public.role_permissions FROM anon, authenticated;
REVOKE ALL ON public.user_permissions FROM anon, authenticated;
REVOKE ALL ON public.permission_change_log FROM anon, authenticated;

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT ON public.user_permissions TO authenticated;
GRANT SELECT ON public.permission_change_log TO authenticated;

-- HARDENING — user_profiles: RLS garante que a linha pertence ao próprio
-- usuário, mas não restringia QUAIS COLUNAS podiam mudar
-- (role/ativo/gestor_id eram alteráveis via API direta). Trigger cobre
-- todo caminho de escrita (RLS-permitido OU service_role, que ignora RLS
-- mas não trigger).
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Conexão direta ao banco (SQL Editor, `supabase db query`, migrations)
  -- nunca passa pelo PostgREST — auth.role()/auth.uid() vêm NULL
  -- (confirmado: current_user='postgres' nesse caminho). Superusuário já
  -- é confiado por definição, igual service_role.
  IF auth.role() IS NULL AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- user_id imutável pra qualquer caminho que não seja service_role —
  -- nem admin comum troca esse vínculo pela UI. Antes do check de admin
  -- de propósito: não é uma exceção que is_permissions_admin() destrava.
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

DROP TRIGGER IF EXISTS trg_protect_sensitive_profile_fields ON public.user_profiles;
CREATE TRIGGER trg_protect_sensitive_profile_fields
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

CREATE OR REPLACE FUNCTION public.lockout_guard_user_profiles_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (OLD.ativo = true AND NEW.ativo = false) THEN
    PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);
    IF public.count_active_users_with_permissions(ARRAY['permissions.manage', 'permissions.view']) = 0 THEN
      RAISE EXCEPTION 'Operação bloqueada: esta alteração deixaria o sistema sem nenhum usuário ativo com permissions.manage e permissions.view ao mesmo tempo (lockout administrativo)'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lockout_guard_user_profiles_update ON public.user_profiles;
CREATE TRIGGER trg_lockout_guard_user_profiles_update
  AFTER UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.lockout_guard_user_profiles_update();

-- user_id -> auth.users.id é ON DELETE CASCADE: apagar auth.users dispara
-- um DELETE real em user_profiles, que passa por este MESMO trigger.
CREATE OR REPLACE FUNCTION public.lockout_guard_user_profiles_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.ativo THEN
    PERFORM pg_advisory_xact_lock(hashtext('centro_permissoes:lockout_guard')::bigint);
    IF public.count_active_users_with_permissions(ARRAY['permissions.manage', 'permissions.view']) = 0 THEN
      RAISE EXCEPTION 'Operação bloqueada: excluir este perfil deixaria o sistema sem nenhum usuário ativo com permissions.manage e permissions.view ao mesmo tempo (lockout administrativo)'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_lockout_guard_user_profiles_delete ON public.user_profiles;
CREATE TRIGGER trg_lockout_guard_user_profiles_delete
  AFTER DELETE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.lockout_guard_user_profiles_delete();

REVOKE DELETE ON public.user_profiles FROM authenticated, anon;


-- ============================================================
-- SPRINT 4.1 -- MODULO DE CHAMADOS DE TI, FUNDACAO DO BANCO
-- ============================================================
-- Cria a estrutura de dados completa para o módulo de Chamados de TI
-- (14 tabelas `ti_*`), reaproveitando o PBAC já existente (Sprint 3.8) sem
-- nenhuma alteração estrutural nele — apenas um novo `resource: tickets` no
-- catálogo de permissões.
--
-- Ver docs/architecture/engineering/sprint-4-chamados-ti.md para a
-- arquitetura completa que fundamenta esta migration.
--
-- ESCOPO DESTA MIGRATION (Sprint 4.1 — "fundação"):
--   - Tabelas, índices, RLS e seeds das 14 tabelas do módulo.
--   - RPCs SECURITY DEFINER do ciclo de vida central do chamado: criar,
--     triagem, atribuir, mudar status (máquina de estados + pausa/retomada
--     de SLA + reabertura), comentar, cronômetro (iniciar/encerrar/lançar
--     manual) e marcar notificação como lida.
--   - Catálogo `tickets.*` no PBAC + matriz inicial de role_permissions.
--
-- DELIBERADAMENTE FORA DESTA MIGRATION (cada um é sub-sprint própria no
-- roadmap — ver seção "Estrutura da Sprint" do doc):
--   - RPCs de escrita da Base de Conhecimento (busca, vínculo de solução,
--     transformar resolução em artigo) — Sprint 4.9. As tabelas
--     `ti_kb_artigos`/`ti_chamado_kb_artigos` já existem aqui (fundação),
--     mas ficam só-leitura até a 4.9 implementar as RPCs de escrita.
--   - Upload/gestão de anexos (storage) — Sprint 4.6. `ti_chamado_anexos`
--     já existe aqui, só-leitura.
--   - Job periódico de SLA (sla_proximo_vencimento/sla_vencido) e envio de
--     e-mail — Sprints 4.7/4.8. `ti_notificacoes_envios` já existe, sem
--     nenhum processo escrevendo nela ainda.
--   - RPCs de administração do catálogo (equipes/categorias/regras de SLA)
--     — Sprint 4.10. Essas tabelas são seedadas aqui e ficam só-leitura.
--   - Nenhuma tela/rota nova — só banco.
--
-- Nenhuma migration é aplicada no Supabase por esta tarefa: fica em
-- rascunho local até confirmação explícita (mesma regra da Sprint 3.8).
-- ============================================================

-- ============================================================
-- PARTE 0 — user_profiles.tipo_vinculo (seção 7 do doc)
-- ============================================================
-- Vendedor externo é um usuário autenticado normal, sem role novo — só um
-- campo descritivo. Default 'interno' preenche todas as linhas existentes
-- (todo mundo hoje é interno), mesmo princípio de default seguro já usado
-- no PBAC. RLS de leads_feira/user_profiles/PBAC não referencia este campo
-- (impacto zero nelas, seção 7 do doc).
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS tipo_vinculo TEXT NOT NULL DEFAULT 'interno'
    CHECK (tipo_vinculo IN ('interno', 'externo'));

-- Redefine protect_sensitive_profile_fields() (criada na Sprint 3.8/Etapa
-- 6.2, migration 20260721120000) para também travar tipo_vinculo: só
-- is_permissions_admin() ou service_role podem alterá-lo — auto-serviço e
-- autoprovisionamento sempre forçam 'interno', igual role/ativo/gestor_id.
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
    NEW.tipo_vinculo := 'interno';
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.role := OLD.role;
    NEW.ativo := OLD.ativo;
    NEW.gestor_id := OLD.gestor_id;
    NEW.tipo_vinculo := OLD.tipo_vinculo;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- PARTE 1 — TABELAS (ordem de dependência de FK)
-- ============================================================

-- ── TABELA: ti_equipes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ti_equipes (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  nome        TEXT NOT NULL,
  codigo      TEXT NOT NULL UNIQUE,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABELA: ti_categorias ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ti_categorias (
  id                UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  nome              TEXT NOT NULL UNIQUE,
  equipe_padrao_id  UUID NULL REFERENCES public.ti_equipes(id),
  ativo             BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ti_categorias_equipe_padrao ON public.ti_categorias (equipe_padrao_id);

-- ── TABELA: ti_equipe_membros ────────────────────────────────────
-- "Fila que o agente enxerga" = esta tabela. "O que ele pode fazer" = PBAC.
-- Chave composta, mesmo padrão de role_permissions/user_permissions.
CREATE TABLE IF NOT EXISTS public.ti_equipe_membros (
  equipe_id    UUID NOT NULL REFERENCES public.ti_equipes(id) ON DELETE CASCADE,
  profile_id   UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  coordenador  BOOLEAN NOT NULL DEFAULT false,
  ativo        BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (equipe_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_ti_equipe_membros_profile ON public.ti_equipe_membros (profile_id);

-- ── TABELA: ti_sla_regras ────────────────────────────────────────
-- Catálogo por prioridade, sem FK de/para chamados — lido na criação/triagem.
CREATE TABLE IF NOT EXISTS public.ti_sla_regras (
  prioridade                 TEXT PRIMARY KEY CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  minutos_primeira_resposta  INTEGER NOT NULL CHECK (minutos_primeira_resposta > 0),
  minutos_resolucao          INTEGER NOT NULL CHECK (minutos_resolucao > 0),
  ativo                      BOOLEAN NOT NULL DEFAULT true
);

-- ── TABELA: ti_chamados ──────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.ti_chamados_numero_seq;

CREATE TABLE IF NOT EXISTS public.ti_chamados (
  id                          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  numero_sequencial           INTEGER NOT NULL DEFAULT nextval('public.ti_chamados_numero_seq'),
  -- Número amigável gerado no banco — nunca calculado no frontend. Nome
  -- "codigo_chamado" (não só "codigo") pra não colidir semanticamente com
  -- ti_equipes.codigo (slug de equipe, ex. 'infraestrutura' — coisa diferente).
  codigo_chamado              TEXT GENERATED ALWAYS AS ('TI-' || lpad(numero_sequencial::text, 6, '0')) STORED,
  titulo                      TEXT NOT NULL,
  descricao                   TEXT,
  categoria_id                UUID NOT NULL REFERENCES public.ti_categorias(id),
  equipe_id                   UUID NULL REFERENCES public.ti_equipes(id),
  -- prioridade_sugerida: preenchida pelo solicitante na abertura, nunca mais
  -- alterada — puramente informativa. prioridade: a oficial, ajustável pela
  -- triagem/quem tiver permissão, única usada em cálculo de SLA (seção 4).
  prioridade_sugerida         TEXT NULL CHECK (prioridade_sugerida IN ('baixa', 'media', 'alta', 'urgente')),
  prioridade                  TEXT NOT NULL CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  status                      TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN (
                                 'aberto', 'em_triagem', 'atribuido', 'em_atendimento',
                                 'aguardando_solicitante', 'resolvido', 'fechado', 'reaberto', 'cancelado'
                               )),
  solicitante_profile_id      UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  responsavel_profile_id      UUID NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  -- Aponta para o chamado anterior quando este nasce da reabertura de um
  -- chamado já Fechado (seção 1, item 11; seção 3) — sem cascade, informativo.
  -- REGRA OBRIGATÓRIA DA FUTURA RPC (ti_criar_chamado, Checkpoint 3): validar
  -- não só que o chamado apontado existe, mas que seu status = 'fechado' —
  -- o schema sozinho não consegue expressar essa regra de estado (só a FK
  -- básica e o CHECK anti-autorreferência abaixo), fica registrado aqui para
  -- não ser esquecido quando as RPCs forem revisadas.
  chamado_relacionado_id      UUID NULL REFERENCES public.ti_chamados(id),
  primeira_resposta_em        TIMESTAMPTZ,
  prazo_primeira_resposta_em  TIMESTAMPTZ,
  prazo_resolucao_em          TIMESTAMPTZ,
  sla_pausado_em              TIMESTAMPTZ,
  sla_tempo_pausado_segundos  INTEGER NOT NULL DEFAULT 0,
  -- SEMÂNTICA (decidida no Checkpoint 1, a implementar em ti_mudar_status no
  -- Checkpoint 3): resolved_at representa a resolução ATUAL/mais recente —
  -- volta a NULL ao reabrir (transição 'reaberto') e recebe now() de novo ao
  -- resolver pela 2ª vez ou mais. NÃO é "primeira resolução" — esse histórico
  -- fica só em ti_chamado_historico (evento 'status_alterado'), nunca nesta
  -- coluna. A RPC hoje neste arquivo ainda NÃO implementa o reset para NULL
  -- — pendência explícita para quando as RPCs forem revisadas.
  resolved_at                 TIMESTAMPTZ,
  closed_at                   TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (numero_sequencial),
  -- Um chamado nunca pode ser "relacionado" a si mesmo. id já está resolvido
  -- (DEFAULT aplicado) no momento em que o CHECK é avaliado, então isto
  -- funciona corretamente mesmo com id gerado na mesma inserção.
  CONSTRAINT ti_chamados_relacionado_nao_e_proprio CHECK (chamado_relacionado_id IS NULL OR chamado_relacionado_id <> id)
);

ALTER SEQUENCE public.ti_chamados_numero_seq OWNED BY public.ti_chamados.numero_sequencial;

CREATE INDEX IF NOT EXISTS idx_ti_chamados_solicitante ON public.ti_chamados (solicitante_profile_id);
CREATE INDEX IF NOT EXISTS idx_ti_chamados_responsavel ON public.ti_chamados (responsavel_profile_id);
CREATE INDEX IF NOT EXISTS idx_ti_chamados_equipe ON public.ti_chamados (equipe_id);
CREATE INDEX IF NOT EXISTS idx_ti_chamados_status ON public.ti_chamados (status);
CREATE INDEX IF NOT EXISTS idx_ti_chamados_relacionado ON public.ti_chamados (chamado_relacionado_id);
-- Busca pela interface por valores como "TI-000123" — codigo_chamado é
-- coluna GERADA (não indexada automaticamente pelo Postgres), então o índice
-- precisa ser explícito. UNIQUE porque é 1:1 com numero_sequencial (já único).
CREATE UNIQUE INDEX IF NOT EXISTS idx_ti_chamados_codigo_chamado ON public.ti_chamados (codigo_chamado);

-- ── TABELA: ti_chamado_tempos ────────────────────────────────────
-- Criada ANTES de ti_chamado_historico de propósito (nota da seção 11 do
-- doc): historico.tempo_id referencia esta tabela.
CREATE TABLE IF NOT EXISTS public.ti_chamado_tempos (
  id                 UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  chamado_id         UUID NOT NULL REFERENCES public.ti_chamados(id) ON DELETE CASCADE,
  agente_profile_id  UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  iniciado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizado_em      TIMESTAMPTZ NULL,
  duracao_segundos   INTEGER NULL,
  tipo               TEXT NOT NULL CHECK (tipo IN ('automatico', 'manual')),
  descricao          TEXT NULL,
  criado_por         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Regra real (não CHECK sempre-verdadeiro): manual exige duração > 0,
  -- descrição não vazia e não pode ser sessão aberta.
  CONSTRAINT ti_chamado_tempos_manual_valido CHECK (
    tipo <> 'manual'
    OR (finalizado_em IS NOT NULL AND duracao_segundos > 0 AND btrim(coalesce(descricao, '')) <> '')
  ),
  -- Suporte à FK composta de ti_chamado_historico.tempo_id abaixo — id já é
  -- globalmente único (PK), este UNIQUE não permite duplicata nova nenhuma,
  -- só dá ao Postgres uma chave (chamado_id, id) referenciável.
  UNIQUE (chamado_id, id)
);

CREATE INDEX IF NOT EXISTS idx_ti_chamado_tempos_chamado ON public.ti_chamado_tempos (chamado_id);
CREATE INDEX IF NOT EXISTS idx_ti_chamado_tempos_agente ON public.ti_chamado_tempos (agente_profile_id);

-- No máximo uma sessão AUTOMÁTICA aberta por agente em todo o sistema.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ti_chamado_tempos_automatico_aberto
  ON public.ti_chamado_tempos (agente_profile_id)
  WHERE tipo = 'automatico' AND finalizado_em IS NULL;

-- ── TABELA: ti_chamado_historico ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ti_chamado_historico (
  id                UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  chamado_id        UUID NOT NULL REFERENCES public.ti_chamados(id) ON DELETE CASCADE,
  autor_profile_id  UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  origem            TEXT NOT NULL CHECK (origem IN ('usuario', 'sistema')),
  evento            TEXT NOT NULL,
  valor_anterior    JSONB,
  valor_novo        JSONB,
  tempo_id          UUID NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Eventos automáticos usam origem='sistema' e autor_profile_id=NULL — real,
  -- não convenção de aplicação.
  CONSTRAINT ti_chamado_historico_origem_autor CHECK (
    (origem = 'sistema' AND autor_profile_id IS NULL) OR (origem = 'usuario' AND autor_profile_id IS NOT NULL)
  ),
  -- FK COMPOSTA (não mais só tempo_id -> id): garante que a sessão de tempo
  -- referenciada pertence ao MESMO chamado_id deste evento de histórico —
  -- sem isso, seria possível (por bug de RPC futura ou acesso direto) gravar
  -- um evento de chamado A apontando para uma sessão de tempo de chamado B.
  -- MATCH SIMPLE (padrão): se tempo_id for NULL, a constraint não é avaliada
  -- (evento sem tempo associado passa livre). ON DELETE NO ACTION (padrão,
  -- explícito aqui de propósito): a versão real do Postgres do projeto não
  -- foi confirmada (sem credencial de conexão neste ambiente para checar) —
  -- "ON DELETE SET NULL (tempo_id)" com lista de coluna só existe a partir do
  -- Postgres 15, e um SET NULL genérico numa FK composta zeraria também
  -- chamado_id (NOT NULL aqui), quebrando a inserção. NO ACTION é seguro em
  -- qualquer versão e, na prática, nunca é acionado hoje — não existe nenhum
  -- caminho de escrita que apague uma sessão de ti_chamado_tempos sem apagar
  -- o chamado inteiro junto (que já cascade-apaga este histórico primeiro).
  CONSTRAINT ti_chamado_historico_tempo_mesmo_chamado
    FOREIGN KEY (chamado_id, tempo_id)
    REFERENCES public.ti_chamado_tempos (chamado_id, id)
    ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_ti_chamado_historico_chamado ON public.ti_chamado_historico (chamado_id);
CREATE INDEX IF NOT EXISTS idx_ti_chamado_historico_tempo ON public.ti_chamado_historico (tempo_id);

-- ── TABELA: ti_chamado_comentarios ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.ti_chamado_comentarios (
  id                UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  chamado_id        UUID NOT NULL REFERENCES public.ti_chamados(id) ON DELETE CASCADE,
  autor_profile_id  UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  mensagem          TEXT NOT NULL,
  interno           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Suporte à FK composta de ti_chamado_anexos.comentario_id abaixo — mesmo
  -- raciocínio do UNIQUE(chamado_id, id) em ti_chamado_tempos.
  UNIQUE (chamado_id, id)
);

CREATE INDEX IF NOT EXISTS idx_ti_chamado_comentarios_chamado ON public.ti_chamado_comentarios (chamado_id);

-- ── TABELA: ti_chamado_anexos ────────────────────────────────────
-- Sem upload nesta migration (Sprint 4.6) — só a estrutura. Quando
-- comentario_id aponta para um comentário interno, o anexo herda a mesma
-- invisibilidade ao solicitante (RLS abaixo, JOIN com ti_chamado_comentarios
-- — sem flag `interno` duplicada aqui).
CREATE TABLE IF NOT EXISTS public.ti_chamado_anexos (
  id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  chamado_id      UUID NOT NULL REFERENCES public.ti_chamados(id) ON DELETE CASCADE,
  comentario_id   UUID NULL,
  storage_path    TEXT NOT NULL,
  nome_arquivo    TEXT NOT NULL,
  tamanho_bytes   INTEGER NOT NULL CHECK (tamanho_bytes > 0),
  tipo_mime       TEXT,
  criado_por      UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- FK COMPOSTA (não mais só comentario_id -> id): sem isso seria possível
  -- vincular um anexo do chamado A a um comentário do chamado B — o que
  -- também quebraria a regra de invisibilidade herdada (RLS confiaria que
  -- comentario_id pertence ao mesmo chamado_id do anexo, premissa que só a
  -- RPC garantia antes). MATCH SIMPLE: comentario_id NULL não é avaliado
  -- (anexo solto no chamado, sem vínculo a comentário). ON DELETE CASCADE
  -- não tem ambiguidade de coluna (apaga a linha inteira do anexo).
  CONSTRAINT ti_chamado_anexos_comentario_mesmo_chamado
    FOREIGN KEY (chamado_id, comentario_id)
    REFERENCES public.ti_chamado_comentarios (chamado_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ti_chamado_anexos_chamado ON public.ti_chamado_anexos (chamado_id);
CREATE INDEX IF NOT EXISTS idx_ti_chamado_anexos_comentario ON public.ti_chamado_anexos (comentario_id);

-- ── TABELA: ti_kb_artigos (seção 14 — Base de Conhecimento, Sprint 4.9) ──
-- Estrutura pronta nesta fundação; RPCs de escrita (criar/editar/publicar,
-- transformar resolução em artigo) ficam para a 4.9 — até lá, só-leitura.
CREATE TABLE IF NOT EXISTS public.ti_kb_artigos (
  id                 UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  titulo             TEXT NOT NULL,
  conteudo           TEXT NOT NULL,
  categoria_id       UUID NULL REFERENCES public.ti_categorias(id),
  status             TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  autor_profile_id   UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  chamado_origem_id  UUID NULL REFERENCES public.ti_chamados(id) ON DELETE SET NULL,
  busca              TSVECTOR GENERATED ALWAYS AS (
                        to_tsvector('portuguese', coalesce(titulo, '') || ' ' || coalesce(conteudo, ''))
                      ) STORED,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ti_kb_artigos_categoria ON public.ti_kb_artigos (categoria_id);
CREATE INDEX IF NOT EXISTS idx_ti_kb_artigos_status ON public.ti_kb_artigos (status);
CREATE INDEX IF NOT EXISTS idx_ti_kb_artigos_busca ON public.ti_kb_artigos USING GIN (busca);

-- ── TABELA: ti_chamado_kb_artigos (vínculo de solução — seção 14) ───────
CREATE TABLE IF NOT EXISTS public.ti_chamado_kb_artigos (
  chamado_id  UUID NOT NULL REFERENCES public.ti_chamados(id) ON DELETE CASCADE,
  artigo_id   UUID NOT NULL REFERENCES public.ti_kb_artigos(id) ON DELETE CASCADE,
  criado_por  UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chamado_id, artigo_id)
);

CREATE INDEX IF NOT EXISTS idx_ti_chamado_kb_artigos_artigo ON public.ti_chamado_kb_artigos (artigo_id);

-- ── TABELA: ti_notificacoes ──────────────────────────────────────
-- Escrita só via RPC (seção 9 do doc) — nunca INSERT direto do cliente.
CREATE TABLE IF NOT EXISTS public.ti_notificacoes (
  id                       UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  destinatario_profile_id  UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  chamado_id               UUID NOT NULL REFERENCES public.ti_chamados(id) ON DELETE CASCADE,
  evento                   TEXT NOT NULL CHECK (evento IN (
                              'novo_chamado', 'direcionado_equipe', 'atribuicao', 'reatribuicao',
                              'novo_comentario', 'prioridade_alterada', 'chamado_reaberto',
                              'sla_proximo_vencimento', 'sla_vencido', 'chamado_resolvido'
                            )),
  lida                     BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ti_notificacoes_chamado ON public.ti_notificacoes (chamado_id);
CREATE INDEX IF NOT EXISTS idx_ti_notificacoes_nao_lidas
  ON public.ti_notificacoes (destinatario_profile_id) WHERE lida = false;

-- ── TABELA: ti_preferencias_notificacao ──────────────────────────
CREATE TABLE IF NOT EXISTS public.ti_preferencias_notificacao (
  id           UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  profile_id   UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  -- NULL = preferência geral (todos os eventos); preenchido = preferência
  -- específica, mas só para um dos eventos oficiais de ti_notificacoes.evento
  -- (mesma lista, mantida em dois lugares — mesma duplicação já aceita para
  -- prioridade; se a lista de eventos mudar, os dois CHECKs mudam juntos).
  tipo_evento  TEXT NULL CHECK (tipo_evento IS NULL OR tipo_evento IN (
                 'novo_chamado', 'direcionado_equipe', 'atribuicao', 'reatribuicao',
                 'novo_comentario', 'prioridade_alterada', 'chamado_reaberto',
                 'sla_proximo_vencimento', 'sla_vencido', 'chamado_resolvido'
               )),
  som_ativo    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UNIQUE simples permite múltiplas linhas NULL no Postgres — índices
-- parciais fecham isso (seção 9 do doc).
CREATE UNIQUE INDEX IF NOT EXISTS uq_ti_preferencias_geral
  ON public.ti_preferencias_notificacao (profile_id) WHERE tipo_evento IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ti_preferencias_especifica
  ON public.ti_preferencias_notificacao (profile_id, tipo_evento) WHERE tipo_evento IS NOT NULL;

-- ── TABELA: ti_notificacoes_envios ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.ti_notificacoes_envios (
  id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  notificacao_id  UUID NOT NULL REFERENCES public.ti_notificacoes(id) ON DELETE CASCADE,
  canal           TEXT NOT NULL CHECK (canal IN ('email', 'push')),
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'falhou')),
  tentativas      INTEGER NOT NULL DEFAULT 0,
  enviado_em      TIMESTAMPTZ NULL,
  ultimo_erro     TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notificacao_id, canal)
);

CREATE INDEX IF NOT EXISTS idx_ti_notificacoes_envios_pendentes
  ON public.ti_notificacoes_envios (status) WHERE status = 'pendente';

-- ============================================================
-- PARTE 2 — FUNÇÕES AUXILIARES
-- ============================================================

-- ti_perfil_ativo_id: checagem CENTRAL de usuário ativo — única fonte de
-- verdade pra "qual é o profile_id do chamador, SE ele estiver ativo".
-- Retorna NULL se o perfil não existir OU estiver ativo=false — qualquer
-- comparação de igualdade contra NULL (ex: coluna = ti_perfil_ativo_id())
-- nunca é verdadeira em SQL, então usar esta função em vez de comparar
-- direto com auth.uid() fecha, de uma vez só, todo lugar que antes só
-- checava "é o meu user_id" sem checar "e eu ainda estou ativo".
CREATE OR REPLACE FUNCTION public.ti_perfil_ativo_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.user_profiles WHERE user_id = auth.uid() AND ativo = true;
$$;

REVOKE ALL ON FUNCTION public.ti_perfil_ativo_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_perfil_ativo_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_perfil_ativo_id() TO authenticated;

-- ti_is_own_equipe: o usuário autenticado (E ATIVO) é membro ativo da
-- equipe dada? Antes só checava tem.ativo (vínculo ativo) sem checar se o
-- PRÓPRIO PERFIL do chamador está ativo — corrigido usando
-- ti_perfil_ativo_id() (retorna NULL se inativo, o que faz
-- tem.profile_id = NULL nunca casar). Invoker-rights: ti_equipe_membros
-- agora só expõe a própria linha via RLS (ver Parte 3), suficiente pra
-- esta consulta (ela só olha o profile_id do próprio chamador).
CREATE OR REPLACE FUNCTION public.ti_is_own_equipe(p_equipe_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ti_equipe_membros tem
    WHERE tem.equipe_id = p_equipe_id AND tem.ativo = true AND tem.profile_id = public.ti_perfil_ativo_id()
  );
$$;

REVOKE ALL ON FUNCTION public.ti_is_own_equipe(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_is_own_equipe(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_is_own_equipe(UUID) TO authenticated;

-- ti_e_solicitante: o usuário autenticado (E ATIVO) é o solicitante deste
-- chamado? Corrigido para usar ti_perfil_ativo_id() (antes não checava
-- ativo). Continua invoker-rights: consulta ti_chamados sob a RLS do
-- próprio chamador — funciona porque quem É o solicitante sempre enxerga
-- o próprio chamado via view_own (seção 5 do Checkpoint 2).
CREATE OR REPLACE FUNCTION public.ti_e_solicitante(p_chamado_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ti_chamados c
    WHERE c.id = p_chamado_id AND c.solicitante_profile_id = public.ti_perfil_ativo_id()
  );
$$;

REVOKE ALL ON FUNCTION public.ti_e_solicitante(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_e_solicitante(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_e_solicitante(UUID) TO authenticated;

-- ti_pode_ver_chamado: "eu enxergo este chamado, em QUALQUER papel"
-- (view_all / triagem de não-triados / view_team / view_own) — usada pelas
-- policies das tabelas filhas quando a regra é "mesma visibilidade do
-- chamado". Corrigida para usar ti_perfil_ativo_id() no lugar do JOIN com
-- user_profiles sem checar ativo.
CREATE OR REPLACE FUNCTION public.ti_pode_ver_chamado(p_chamado_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ti_chamados c
    WHERE c.id = p_chamado_id
      AND (
        public.has_effective_permission('tickets.view_all')
        OR (public.has_effective_permission('tickets.triage') AND c.equipe_id IS NULL)
        OR (public.has_effective_permission('tickets.view_team') AND public.ti_is_own_equipe(c.equipe_id))
        OR (public.has_effective_permission('tickets.view_own') AND c.solicitante_profile_id = public.ti_perfil_ativo_id())
      )
  );
$$;

REVOKE ALL ON FUNCTION public.ti_pode_ver_chamado(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_pode_ver_chamado(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_pode_ver_chamado(UUID) TO authenticated;

-- ti_pode_ver_interno_chamado: SEPARA "poder ver o chamado" (função acima,
-- inclui a visão do PRÓPRIO solicitante) de "poder ver conteúdo TÉCNICO/
-- INTERNO do chamado" (só quem enxerga via capacidade profissional — agente
-- da equipe, triagem, ou visão total — NUNCA via o ramo view_own). Mesma
-- estrutura de ti_pode_ver_chamado, só que sem a cláusula view_own — não é
-- "NOT ti_e_solicitante" (isso seria frágil: se um agente abrir chamado
-- pra si mesmo, ele continua enxergando o técnico via view_team/view_all,
-- e "NOT ti_e_solicitante" erraria ao negar isso). Sem recursão: chama
-- has_effective_permission/ti_is_own_equipe, nunca ti_pode_ver_chamado.
CREATE OR REPLACE FUNCTION public.ti_pode_ver_interno_chamado(p_chamado_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ti_chamados c
    WHERE c.id = p_chamado_id
      AND (
        public.has_effective_permission('tickets.view_all')
        OR (public.has_effective_permission('tickets.triage') AND c.equipe_id IS NULL)
        OR (public.has_effective_permission('tickets.view_team') AND public.ti_is_own_equipe(c.equipe_id))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.ti_pode_ver_interno_chamado(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_pode_ver_interno_chamado(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_pode_ver_interno_chamado(UUID) TO authenticated;

-- ── SCHEMA private: nunca exposto pela API do Supabase ──────────────────
-- PostgREST só expõe os schemas listados em Project Settings > API >
-- Exposed schemas (default: `public`, `graphql_public`) — `private` NÃO
-- entra nessa lista por padrão, e nenhuma migration SQL consegue alterar
-- essa configuração (é ajuste de plataforma/dashboard, não objeto de
-- banco). Resultado prático: nada dentro de `private` é alcançável via
-- `/rest/v1/...` nem `/rest/v1/rpc/...` — só via SQL direto (migrations,
-- `service_role` conectando direto, ou o próprio motor de RLS avaliando
-- policies, que roda dentro do Postgres e não passa pelo PostgREST).
-- É exatamente por isso que uma função aqui dentro pode ser referenciada
-- por uma policy (avaliação interna do banco) sem nunca virar um endpoint
-- chamável por um cliente autenticado comum.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- private.ti_comentario_interno_raw: lê o valor BRUTO de `interno`,
-- contornando de propósito a RLS de ti_chamado_comentarios (SECURITY
-- DEFINER). Existe pra corrigir o bug encontrado no Checkpoint 2: uma
-- policy que faz "NOT EXISTS (SELECT ... FROM ti_chamado_comentarios
-- WHERE ...)" pra decidir visibilidade de OUTRA tabela roda essa
-- subconsulta sob a RLS do chamador — se o comentário referenciado já está
-- oculto pra ele (porque é interno e ele é o solicitante), o NOT EXISTS
-- erroneamente vira verdadeiro. Movida do schema public pro private
-- (revisão do Checkpoint 2): mesmo com REVOKE de PUBLIC/anon, uma função
-- em `public` com GRANT EXECUTE a `authenticated` ainda é um endpoint
-- `/rest/v1/rpc/...` chamável por qualquer usuário autenticado comum — em
-- `private` isso deixa de existir (ver bloco acima). `SET search_path = ''`
-- (vazio, não mais "public, pg_temp"): forma mais estrita ainda de travar
-- contra search_path hijacking — toda referência precisa vir com schema
-- explícito (só `pg_catalog` continua implícito, é especial no Postgres).
-- Recebe p_chamado_id também (antes só p_comentario_id) e confere que o
-- comentário pertence a ESSE chamado — defesa adicional, redundante com a
-- FK composta do Checkpoint 1, mas explícita na própria função. Devolve só
-- o booleano (não mensagem, não autor, não chamado).
CREATE OR REPLACE FUNCTION private.ti_comentario_interno_raw(p_chamado_id UUID, p_comentario_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT cc.interno
     FROM public.ti_chamado_comentarios cc
     WHERE cc.id = p_comentario_id AND cc.chamado_id = p_chamado_id),
    false
  );
$$;

REVOKE ALL ON FUNCTION private.ti_comentario_interno_raw(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.ti_comentario_interno_raw(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION private.ti_comentario_interno_raw(UUID, UUID) TO authenticated;

-- ti_profiles_in_equipe: membros ATIVOS (equipe E perfil) de uma equipe —
-- usado pelas RPCs pra disparar notificação de equipe (direcionado_equipe,
-- chamado_reaberto pro coordenador). Corrigida para também exigir
-- user_profiles.ativo = true (antes só checava ti_equipe_membros.ativo,
-- deixando passar destinatário cujo PERFIL já foi desativado). Só
-- alcançável de dentro de outras funções (sem GRANT).
CREATE OR REPLACE FUNCTION public.ti_profiles_in_equipe(p_equipe_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT tem.profile_id
  FROM public.ti_equipe_membros tem
  JOIN public.user_profiles up ON up.id = tem.profile_id AND up.ativo = true
  WHERE tem.equipe_id = p_equipe_id AND tem.ativo = true;
$$;

REVOKE ALL ON FUNCTION public.ti_profiles_in_equipe(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_profiles_in_equipe(UUID) FROM anon, authenticated;

-- ti_profiles_with_permission: perfis ATIVOS cujo conjunto efetivo (papel OU
-- grant individual, MENOS revoke individual — mesma regra de
-- has_effective_permission) contém o código dado. Diferente de
-- has_effective_permission() (que resolve só pra auth.uid()), aqui
-- enumeramos QUALQUER perfil — usado pra disparar novo_chamado pra todo
-- mundo com tickets.triage. Só alcançável de dentro de outras funções.
CREATE OR REPLACE FUNCTION public.ti_profiles_with_permission(p_code TEXT)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT up.id
  FROM public.user_profiles up
  WHERE up.ativo = true
    AND (
      EXISTS (
        SELECT 1 FROM public.roles r
        JOIN public.role_permissions rp ON rp.role_id = r.id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE r.code = up.role AND p.code = p_code
      )
      OR EXISTS (
        SELECT 1 FROM public.user_permissions grt
        JOIN public.permissions p ON p.id = grt.permission_id
        WHERE grt.profile_id = up.id AND grt.effect = 'grant' AND p.code = p_code
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_permissions rev
      JOIN public.permissions p ON p.id = rev.permission_id
      WHERE rev.profile_id = up.id AND rev.effect = 'revoke' AND p.code = p_code
    );
$$;

REVOKE ALL ON FUNCTION public.ti_profiles_with_permission(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_profiles_with_permission(TEXT) FROM anon, authenticated;

-- ti_calcular_prazo_sla: única função que calcula prazos — permite trocar a
-- lógica (corrido vs. horário comercial) no futuro sem mudar schema/RPCs
-- (seção 6 do doc). Só alcançável de dentro das RPCs abaixo.
CREATE OR REPLACE FUNCTION public.ti_calcular_prazo_sla(p_prioridade TEXT, p_desde TIMESTAMPTZ)
RETURNS TABLE (prazo_primeira_resposta TIMESTAMPTZ, prazo_resolucao TIMESTAMPTZ)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    p_desde + make_interval(mins => r.minutos_primeira_resposta),
    p_desde + make_interval(mins => r.minutos_resolucao)
  FROM public.ti_sla_regras r
  WHERE r.prioridade = p_prioridade AND r.ativo = true;
$$;

REVOKE ALL ON FUNCTION public.ti_calcular_prazo_sla(TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_calcular_prazo_sla(TEXT, TIMESTAMPTZ) FROM anon, authenticated;

-- ============================================================
-- PARTE 3 — RLS
-- ============================================================
-- Catálogos (equipes/categorias/regras de SLA): leitura liberada pra
-- QUALQUER PERFIL ATIVO (não mais "true" solto) — perfil com ativo=false
-- deixa de enxergar até o catálogo mais inofensivo do módulo. Sem policy de
-- escrita — administração fica pra Sprint 4.10. Privilégios de tabela
-- explícitos: REVOKE ALL de anon E authenticated, depois GRANT SELECT só
-- pra authenticated — sem depender do privilégio default do projeto.

ALTER TABLE public.ti_equipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_equipes" ON public.ti_equipes;
CREATE POLICY "Leitura ti_equipes" ON public.ti_equipes
  FOR SELECT TO authenticated USING (public.ti_perfil_ativo_id() IS NOT NULL);
REVOKE ALL ON public.ti_equipes FROM anon, authenticated;
GRANT SELECT ON public.ti_equipes TO authenticated;

ALTER TABLE public.ti_categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_categorias" ON public.ti_categorias;
CREATE POLICY "Leitura ti_categorias" ON public.ti_categorias
  FOR SELECT TO authenticated USING (public.ti_perfil_ativo_id() IS NOT NULL);
REVOKE ALL ON public.ti_categorias FROM anon, authenticated;
GRANT SELECT ON public.ti_categorias TO authenticated;

-- ti_equipe_membros: ESCOPO MÍNIMO — cada perfil ativo só enxerga a PRÓPRIA
-- linha de vínculo (profile_id = ti_perfil_ativo_id()), não mais "todo
-- mundo vê todo mundo". Suficiente pra ti_is_own_equipe() funcionar (ela só
-- consulta o vínculo do PRÓPRIO chamador) — sem recursão, porque a policy
-- chama ti_perfil_ativo_id() (não ti_is_own_equipe nem nenhuma função que
-- leia esta mesma tabela). "Listar quem mais está na equipe" (ex.: combo de
-- atribuição de responsável) fica registrado como pendência — Sprint 4.2/
-- 4.3 precisa de RPC própria (SECURITY DEFINER, valida permissão antes de
-- devolver a lista) ou de uma policy controlada nova, nunca leitura aberta.
ALTER TABLE public.ti_equipe_membros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_equipe_membros" ON public.ti_equipe_membros;
DROP POLICY IF EXISTS "Leitura propria ti_equipe_membros" ON public.ti_equipe_membros;
CREATE POLICY "Leitura propria ti_equipe_membros" ON public.ti_equipe_membros
  FOR SELECT TO authenticated
  USING (profile_id = public.ti_perfil_ativo_id());
REVOKE ALL ON public.ti_equipe_membros FROM anon, authenticated;
GRANT SELECT ON public.ti_equipe_membros TO authenticated;

ALTER TABLE public.ti_sla_regras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_sla_regras" ON public.ti_sla_regras;
CREATE POLICY "Leitura ti_sla_regras" ON public.ti_sla_regras
  FOR SELECT TO authenticated USING (public.ti_perfil_ativo_id() IS NOT NULL);
REVOKE ALL ON public.ti_sla_regras FROM anon, authenticated;
GRANT SELECT ON public.ti_sla_regras TO authenticated;

-- ti_chamados: leitura escopada por PBAC; ESCRITA SÓ VIA RPC (nenhuma
-- policy de INSERT/UPDATE/DELETE) — a lógica de máquina de estados, cálculo
-- de SLA e numeração sequencial não pode ser contornada por um INSERT/
-- UPDATE direto do cliente.
ALTER TABLE public.ti_chamados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_chamados" ON public.ti_chamados;
CREATE POLICY "Leitura ti_chamados" ON public.ti_chamados
  FOR SELECT TO authenticated
  USING (
    public.has_effective_permission('tickets.view_all')
    OR (public.has_effective_permission('tickets.triage') AND equipe_id IS NULL)
    OR (public.has_effective_permission('tickets.view_team') AND public.ti_is_own_equipe(equipe_id))
    OR (public.has_effective_permission('tickets.view_own')
        AND solicitante_profile_id = public.ti_perfil_ativo_id())
  );
REVOKE ALL ON public.ti_chamados FROM anon, authenticated;
GRANT SELECT ON public.ti_chamados TO authenticated;

-- ti_chamado_tempos: conteúdo TÉCNICO/interno — quem trabalhou, quanto
-- tempo, e a descrição do lançamento manual não são informação pro
-- solicitante (ele não tem "conteúdo técnico interno", só "ver o
-- chamado"). Visível a quem vê o INTERNO do chamado (agente/coordenador da
-- equipe, triagem, view_all) OU ao próprio agente que lançou aquele tempo
-- especificamente (mesmo fora do escopo de equipe atual — ver seus
-- próprios lançamentos nunca deve depender de permissão de terceiro).
-- `= ti_perfil_ativo_id()` (não mais IN (...) sem checar ativo): agente
-- desativado perde a visão até dos próprios lançamentos antigos. Escrita
-- só via RPC (ti_iniciar_tempo/ti_encerrar_tempo/ti_lancar_tempo_manual).
ALTER TABLE public.ti_chamado_tempos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_chamado_tempos" ON public.ti_chamado_tempos;
CREATE POLICY "Leitura ti_chamado_tempos" ON public.ti_chamado_tempos
  FOR SELECT TO authenticated
  USING (
    public.ti_pode_ver_interno_chamado(chamado_id)
    OR agente_profile_id = public.ti_perfil_ativo_id()
  );
REVOKE ALL ON public.ti_chamado_tempos FROM anon, authenticated;
GRANT SELECT ON public.ti_chamado_tempos TO authenticated;

-- ti_chamado_historico: auditoria TÉCNICA (triagem, recálculo de SLA,
-- tempo trabalhado, mudança de status) — é rastro interno de operação, não
-- um feed pro solicitante (esse já existe, é ti_notificacoes). Visível só a
-- quem vê o INTERNO do chamado — solicitante perde 100% desta tabela, não
-- só uma parte dela. Escrita só via RPC (nunca INSERT direto).
ALTER TABLE public.ti_chamado_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_chamado_historico" ON public.ti_chamado_historico;
CREATE POLICY "Leitura ti_chamado_historico" ON public.ti_chamado_historico
  FOR SELECT TO authenticated
  USING (public.ti_pode_ver_interno_chamado(chamado_id));
REVOKE ALL ON public.ti_chamado_historico FROM anon, authenticated;
GRANT SELECT ON public.ti_chamado_historico TO authenticated;

-- ti_chamado_comentarios: CORRIGIDO no Checkpoint 2 (revisão) — a condição
-- anterior ("NOT interno OR NOT ti_e_solicitante(chamado_id)") escondia
-- comentário interno de um agente/admin que TAMBÉM fosse o solicitante do
-- próprio chamado (ex.: agente abre chamado pra si mesmo) — "NOT
-- ti_e_solicitante" nega mesmo quando a pessoa deveria ver o técnico por
-- capacidade profissional, não por ser ou não solicitante. Corrigido para
-- "NOT interno OR ti_pode_ver_interno_chamado(chamado_id)" — a mesma
-- separação usada em histórico/tempos/anexos: interno só é liberado pra
-- quem vê o INTERNO do chamado (agente/coordenador/triagem/view_all),
-- nunca por causa de "não ser" o solicitante. Escrita só via
-- ti_comentar_chamado.
ALTER TABLE public.ti_chamado_comentarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_chamado_comentarios" ON public.ti_chamado_comentarios;
CREATE POLICY "Leitura ti_chamado_comentarios" ON public.ti_chamado_comentarios
  FOR SELECT TO authenticated
  USING (
    public.ti_pode_ver_chamado(chamado_id)
    AND (NOT interno OR public.ti_pode_ver_interno_chamado(chamado_id))
  );
REVOKE ALL ON public.ti_chamado_comentarios FROM anon, authenticated;
GRANT SELECT ON public.ti_chamado_comentarios TO authenticated;

-- ti_chamado_anexos: CORRIGIDO no Checkpoint 2 (revisão) — a versão
-- anterior fazia "NOT EXISTS (SELECT ... FROM ti_chamado_comentarios WHERE
-- id = comentario_id AND interno = true)", uma subconsulta que roda sob a
-- RLS do PRÓPRIO chamador. Pra um solicitante, a RLS de
-- ti_chamado_comentarios já oculta o comentário interno — então a
-- subconsulta "não encontra" a linha e o NOT EXISTS vira falsamente
-- verdadeiro, liberando o anexo interno. Corrigido usando
-- private.ti_comentario_interno_raw() (SECURITY DEFINER, schema private —
-- não exposto pela API, ver bloco na Parte 2 — ignora a RLS de
-- ti_chamado_comentarios de propósito, devolve só o booleano bruto) — ver
-- teste mental completo no Checkpoint 2 (revisão). Quem vê o INTERNO do
-- chamado (agente/coordenador/triagem/view_all) continua vendo qualquer
-- anexo, independente do comentário vinculado.
ALTER TABLE public.ti_chamado_anexos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_chamado_anexos" ON public.ti_chamado_anexos;
CREATE POLICY "Leitura ti_chamado_anexos" ON public.ti_chamado_anexos
  FOR SELECT TO authenticated
  USING (
    public.ti_pode_ver_chamado(chamado_id)
    AND (
      comentario_id IS NULL
      OR public.ti_pode_ver_interno_chamado(chamado_id)
      OR NOT private.ti_comentario_interno_raw(chamado_id, comentario_id)
    )
  );
REVOKE ALL ON public.ti_chamado_anexos FROM anon, authenticated;
GRANT SELECT ON public.ti_chamado_anexos TO authenticated;

-- ⚠️ REQUISITO OBRIGATÓRIO DA SPRINT 4.6 (registrado aqui, nada disto
-- existe ainda): esta RLS protege só a LINHA de metadado (storage_path,
-- nome_arquivo etc.) — ela NÃO protege o ARQUIVO FÍSICO no Storage. Quando
-- o upload for implementado, o bucket usado precisa ser PRIVADO (nunca
-- público), com policies próprias em `storage.objects` (nome do objeto
-- prefixado por chamado, ex. `chamados-ti/<chamado_id>/...`), e o download
-- só pode acontecer via URL assinada (signed URL) emitida sob demanda por
-- uma RPC/Edge Function que REVALIDA a mesma regra de visibilidade desta
-- policy antes de assinar — nunca emitir signed URL de vida longa nem
-- confiar que "a linha de metadado está oculta" impede alguém de acessar o
-- objeto direto pelo path, se o bucket permitisse leitura pública.

-- ti_kb_artigos: publicado é visível a quem tem kb_view (baseline de todos
-- os papéis); rascunho/arquivado só pra quem tem kb_manage. Sem policy de
-- escrita — RPCs de criar/editar/publicar ficam pra Sprint 4.9.
ALTER TABLE public.ti_kb_artigos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_kb_artigos" ON public.ti_kb_artigos;
CREATE POLICY "Leitura ti_kb_artigos" ON public.ti_kb_artigos
  FOR SELECT TO authenticated
  USING (
    (status = 'publicado' AND public.has_effective_permission('tickets.kb_view'))
    OR public.has_effective_permission('tickets.kb_manage')
  );
REVOKE ALL ON public.ti_kb_artigos FROM anon, authenticated;
GRANT SELECT ON public.ti_kb_artigos TO authenticated;

-- ti_chamado_kb_artigos: vínculo de solução. CORRIGIDO — antes bastava
-- "ti_pode_ver_chamado" pra ver o vínculo, sem checar o STATUS do artigo
-- vinculado nem a permissão de KB do chamador. Agora: quem vê o INTERNO do
-- chamado (agente/coordenador/triagem/view_all) vê qualquer vínculo,
-- inclusive a artigos em rascunho usados como referência de trabalho;
-- solicitante só vê vínculo a artigo já PUBLICADO e com tickets.kb_view
-- (mesma regra de visibilidade de ti_kb_artigos — não duplica a policy,
-- consulta a mesma condição via EXISTS). Sem policy de escrita — RPC de
-- vínculo fica pra Sprint 4.9.
ALTER TABLE public.ti_chamado_kb_artigos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_chamado_kb_artigos" ON public.ti_chamado_kb_artigos;
CREATE POLICY "Leitura ti_chamado_kb_artigos" ON public.ti_chamado_kb_artigos
  FOR SELECT TO authenticated
  USING (
    public.ti_pode_ver_interno_chamado(chamado_id)
    OR (
      public.ti_pode_ver_chamado(chamado_id)
      AND public.has_effective_permission('tickets.kb_view')
      AND EXISTS (
        SELECT 1 FROM public.ti_kb_artigos a
        WHERE a.id = artigo_id AND a.status = 'publicado'
      )
    )
  );
REVOKE ALL ON public.ti_chamado_kb_artigos FROM anon, authenticated;
GRANT SELECT ON public.ti_chamado_kb_artigos TO authenticated;

-- ti_notificacoes: cada um só lê a própria (E SÓ SE ATIVO — antes checava
-- só user_id, sem ativo); sem policy de INSERT/UPDATE/DELETE (dispatch e
-- marcar-como-lida só via RPC, seção 9 do doc).
ALTER TABLE public.ti_notificacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura propria ti_notificacoes" ON public.ti_notificacoes;
CREATE POLICY "Leitura propria ti_notificacoes" ON public.ti_notificacoes
  FOR SELECT TO authenticated
  USING (destinatario_profile_id = public.ti_perfil_ativo_id());
REVOKE ALL ON public.ti_notificacoes FROM anon, authenticated;
GRANT SELECT ON public.ti_notificacoes TO authenticated;

-- ti_preferencias_notificacao: auto-serviço genuíno (preferência pessoal de
-- som/tipo de evento) — RLS direta é suficiente, sem necessidade de RPC.
-- Corrigido para exigir ativo (ti_perfil_ativo_id()) e privilégios de
-- tabela explícitos (não mais só REVOKE de anon — REVOKE de authenticated
-- também, com GRANT explícito das 4 operações de volta).
ALTER TABLE public.ti_preferencias_notificacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestao propria ti_preferencias_notificacao" ON public.ti_preferencias_notificacao;
CREATE POLICY "Gestao propria ti_preferencias_notificacao" ON public.ti_preferencias_notificacao
  FOR ALL TO authenticated
  USING (profile_id = public.ti_perfil_ativo_id())
  WITH CHECK (profile_id = public.ti_perfil_ativo_id());
REVOKE ALL ON public.ti_preferencias_notificacao FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ti_preferencias_notificacao TO authenticated;

-- ti_notificacoes_envios: log interno de canais externos — leitura restrita
-- a quem administra o módulo; sem policy de escrita (Sprint 4.8 escreve via
-- RPC/service_role quando o envio de e-mail for implementado).
ALTER TABLE public.ti_notificacoes_envios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura ti_notificacoes_envios via settings" ON public.ti_notificacoes_envios;
CREATE POLICY "Leitura ti_notificacoes_envios via settings" ON public.ti_notificacoes_envios
  FOR SELECT TO authenticated
  USING (public.has_effective_permission('tickets.settings_manage'));
REVOKE ALL ON public.ti_notificacoes_envios FROM anon, authenticated;
GRANT SELECT ON public.ti_notificacoes_envios TO authenticated;

-- ============================================================
-- PARTE 4 — RPCs do ciclo de vida do chamado
-- ============================================================

-- ── ti_criar_chamado ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ti_criar_chamado(
  p_titulo TEXT,
  p_descricao TEXT,
  p_categoria_id UUID,
  p_prioridade_sugerida TEXT DEFAULT NULL,
  p_chamado_relacionado_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_solicitante_profile_id UUID;
  v_categoria_ativa BOOLEAN;
  v_prioridade_inicial TEXT;
  v_prazos RECORD;
  v_chamado_id UUID;
BEGIN
  v_solicitante_profile_id := public.ti_perfil_ativo_id();

  IF v_solicitante_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('tickets.create') THEN
    RAISE EXCEPTION 'Sem permissão para abrir chamados' USING ERRCODE = '42501';
  END IF;

  IF p_titulo IS NULL OR btrim(p_titulo) = '' THEN
    RAISE EXCEPTION 'Título é obrigatório' USING ERRCODE = '22023';
  END IF;

  SELECT ativo INTO v_categoria_ativa FROM public.ti_categorias WHERE id = p_categoria_id;
  IF v_categoria_ativa IS NULL OR NOT v_categoria_ativa THEN
    RAISE EXCEPTION 'Categoria % não encontrada ou inativa', p_categoria_id USING ERRCODE = '22023';
  END IF;

  IF p_prioridade_sugerida IS NOT NULL AND p_prioridade_sugerida NOT IN ('baixa', 'media', 'alta', 'urgente') THEN
    RAISE EXCEPTION 'Prioridade sugerida inválida: %', p_prioridade_sugerida USING ERRCODE = '22023';
  END IF;

  -- Checkpoint 3: agora valida também que o chamado relacionado está
  -- FECHADO (seção 11/13 do doc, pendência registrada no Checkpoint 1) —
  -- antes só checava existência. Reabertura pós-Fechado é o único cenário
  -- em que este parâmetro deve ser usado.
  IF p_chamado_relacionado_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.ti_chamados WHERE id = p_chamado_relacionado_id AND status = 'fechado') THEN
    RAISE EXCEPTION 'Chamado relacionado % não encontrado ou não está com status fechado', p_chamado_relacionado_id
      USING ERRCODE = '22023';
  END IF;

  -- Prioridade oficial nasce igual à sugerida (ou 'media' se o solicitante
  -- não sugeriu nenhuma) — é só o valor de partida que já permite o SLA
  -- começar a contar imediatamente (seção 1, item 2); a triagem confirma/
  -- ajusta depois (item 3, RPC ti_triagem_chamado).
  v_prioridade_inicial := COALESCE(p_prioridade_sugerida, 'media');

  SELECT * INTO v_prazos FROM public.ti_calcular_prazo_sla(v_prioridade_inicial, now());
  IF v_prazos.prazo_resolucao IS NULL THEN
    RAISE EXCEPTION 'Nenhuma regra de SLA ativa para a prioridade %', v_prioridade_inicial USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ti_chamados (
    titulo, descricao, categoria_id, prioridade_sugerida, prioridade, status,
    solicitante_profile_id, chamado_relacionado_id,
    prazo_primeira_resposta_em, prazo_resolucao_em
  ) VALUES (
    p_titulo, p_descricao, p_categoria_id, p_prioridade_sugerida, v_prioridade_inicial, 'aberto',
    v_solicitante_profile_id, p_chamado_relacionado_id,
    v_prazos.prazo_primeira_resposta, v_prazos.prazo_resolucao
  ) RETURNING id INTO v_chamado_id;

  INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, valor_novo)
  VALUES (v_chamado_id, v_solicitante_profile_id, 'usuario', 'chamado_criado',
    jsonb_build_object('prioridade', v_prioridade_inicial));

  -- CORRIGIDO (achado no 1º teste manual em HML): ti_profiles_with_permission
  -- retorna SETOF UUID (escalar) — sem alias, a única coluna herda o NOME
  -- DA PRÓPRIA FUNÇÃO, nunca "id". "column "id" does not exist" era o erro
  -- real. Alias explícito de coluna resolve sem ambiguidade.
  INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
  SELECT destinatarios.profile_id, v_chamado_id, 'novo_chamado'
  FROM public.ti_profiles_with_permission('tickets.triage') AS destinatarios(profile_id);

  RETURN v_chamado_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ti_criar_chamado(TEXT, TEXT, UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_criar_chamado(TEXT, TEXT, UUID, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_criar_chamado(TEXT, TEXT, UUID, TEXT, UUID) TO authenticated;

-- ── ti_triagem_chamado ───────────────────────────────────────────
-- CORRIGIDA na revisão pós-teste manual: v_prazos era um RECORD genérico,
-- atribuído só dentro do "IF v_prioridade_mudou" — quando a triagem mantinha
-- a MESMA prioridade (1ª triagem sem trocar, ou edição sem trocar), v_prazos
-- nunca era atribuído, e o UPDATE mais abaixo (que referencia
-- v_prazos.prazo_primeira_resposta/prazo_resolucao dentro de um CASE)
-- estourava "record "v_prazos" is not assigned yet" — acessar campo de
-- RECORD nunca atribuído falha ao montar a instrução SQL, independente do
-- CASE nunca "escolher" esse ramo em teoria. Substituído por duas variáveis
-- escalares tipadas (TIMESTAMPTZ) — ficam NULL até serem atribuídas, e NULL
-- é valor válido pra elas, sem erro.
CREATE OR REPLACE FUNCTION public.ti_triagem_chamado(
  p_chamado_id UUID,
  p_equipe_id UUID,
  p_prioridade TEXT,
  p_categoria_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id UUID;
  v_chamado public.ti_chamados;
  v_prazo_primeira_resposta TIMESTAMPTZ;
  v_prazo_resolucao TIMESTAMPTZ;
  v_prioridade_mudou BOOLEAN;
BEGIN
  v_actor_profile_id := public.ti_perfil_ativo_id();
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('tickets.triage') THEN
    RAISE EXCEPTION 'Sem permissão para triagem de chamados' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_chamado FROM public.ti_chamados WHERE id = p_chamado_id FOR UPDATE;
  IF v_chamado.id IS NULL THEN
    RAISE EXCEPTION 'Chamado % não encontrado', p_chamado_id USING ERRCODE = '22023';
  END IF;

  IF v_chamado.status NOT IN ('aberto', 'em_triagem') THEN
    RAISE EXCEPTION 'Chamado no status "%" não admite triagem', v_chamado.status USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ti_equipes WHERE id = p_equipe_id AND ativo = true) THEN
    RAISE EXCEPTION 'Equipe % não encontrada ou inativa', p_equipe_id USING ERRCODE = '22023';
  END IF;

  IF p_prioridade NOT IN ('baixa', 'media', 'alta', 'urgente') THEN
    RAISE EXCEPTION 'Prioridade inválida: %', p_prioridade USING ERRCODE = '22023';
  END IF;

  IF p_categoria_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.ti_categorias WHERE id = p_categoria_id AND ativo = true) THEN
    RAISE EXCEPTION 'Categoria % não encontrada ou inativa', p_categoria_id USING ERRCODE = '22023';
  END IF;

  v_prioridade_mudou := (p_prioridade IS DISTINCT FROM v_chamado.prioridade);

  IF v_prioridade_mudou THEN
    SELECT prazo_primeira_resposta, prazo_resolucao
    INTO v_prazo_primeira_resposta, v_prazo_resolucao
    FROM public.ti_calcular_prazo_sla(p_prioridade, v_chamado.created_at);

    IF NOT FOUND OR v_prazo_resolucao IS NULL THEN
      RAISE EXCEPTION 'Nenhuma regra de SLA ativa para a prioridade %', p_prioridade USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.ti_chamados SET
    categoria_id = COALESCE(p_categoria_id, categoria_id),
    equipe_id = p_equipe_id,
    prioridade = p_prioridade,
    status = 'em_triagem',
    prazo_primeira_resposta_em = CASE WHEN v_prioridade_mudou THEN v_prazo_primeira_resposta ELSE prazo_primeira_resposta_em END,
    prazo_resolucao_em = CASE WHEN v_prioridade_mudou THEN v_prazo_resolucao ELSE prazo_resolucao_em END,
    updated_at = now()
  WHERE id = p_chamado_id;

  INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, valor_anterior, valor_novo)
  VALUES (
    p_chamado_id, v_actor_profile_id, 'usuario', 'triagem',
    jsonb_build_object('equipe_id', v_chamado.equipe_id, 'prioridade', v_chamado.prioridade, 'categoria_id', v_chamado.categoria_id),
    jsonb_build_object('equipe_id', p_equipe_id, 'prioridade', p_prioridade, 'categoria_id', COALESCE(p_categoria_id, v_chamado.categoria_id))
  );

  IF v_prioridade_mudou THEN
    INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, valor_anterior, valor_novo)
    VALUES (p_chamado_id, v_actor_profile_id, 'usuario', 'sla_recalculado',
      jsonb_build_object('prazo_resolucao_em', v_chamado.prazo_resolucao_em),
      jsonb_build_object('prazo_resolucao_em', v_prazo_resolucao));

    -- Checkpoint 3: faltava notificar 'prioridade_alterada' quando a
    -- triagem muda a prioridade (seção 1, item 7, do doc — "responsável +
    -- solicitante"; nesta etapa ainda não há responsável, então só
    -- solicitante). Sem isso, o solicitante nunca sabia que sua prioridade
    -- sugerida foi ajustada.
    INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
    VALUES (v_chamado.solicitante_profile_id, p_chamado_id, 'prioridade_alterada');
  END IF;

  INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
  SELECT profile_id, p_chamado_id, 'direcionado_equipe'
  FROM public.ti_profiles_in_equipe(p_equipe_id) AS profile_id;

  RETURN jsonb_build_object('changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.ti_triagem_chamado(UUID, UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_triagem_chamado(UUID, UUID, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_triagem_chamado(UUID, UUID, TEXT, UUID) TO authenticated;

-- ── ti_atribuir_chamado ──────────────────────────────────────────
-- CORRIGIDA na revisão da Sprint 4.3: reatribuir um chamado que JÁ tem
-- responsável para OUTRO agora é bloqueado no próprio banco (antes
-- reatribuía livremente, gerando evento 'reatribuicao') — reatribuição
-- segura com aceite fica para sprint futura. Três cenários: (1)
-- responsavel_profile_id IS NULL → 1ª atribuição, comportamento original
-- (cobre também "Assumir chamado"); (2) mesmo responsável informado →
-- idempotente, {changed:false}, sem duplicar histórico/notificação; (3)
-- responsável diferente do já definido → exceção clara (23514). Validação
-- de membro ativo da equipe e checagem de permissão continuam
-- inalteradas; nenhuma sessão de ti_chamado_tempos é tocada.
CREATE OR REPLACE FUNCTION public.ti_atribuir_chamado(
  p_chamado_id UUID,
  p_responsavel_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id UUID;
  v_chamado public.ti_chamados;
BEGIN
  v_actor_profile_id := public.ti_perfil_ativo_id();
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_chamado FROM public.ti_chamados WHERE id = p_chamado_id FOR UPDATE;
  IF v_chamado.id IS NULL THEN
    RAISE EXCEPTION 'Chamado % não encontrado', p_chamado_id USING ERRCODE = '22023';
  END IF;

  IF v_chamado.equipe_id IS NULL THEN
    RAISE EXCEPTION 'Chamado precisa passar pela triagem antes de ser atribuído' USING ERRCODE = '23514';
  END IF;

  IF v_chamado.status NOT IN ('em_triagem', 'atribuido', 'em_atendimento') THEN
    RAISE EXCEPTION 'Chamado no status "%" não admite atribuição', v_chamado.status USING ERRCODE = '23514';
  END IF;

  IF NOT (
    public.has_effective_permission('tickets.manage_all')
    OR (public.has_effective_permission('tickets.manage_team') AND public.ti_is_own_equipe(v_chamado.equipe_id))
  ) THEN
    RAISE EXCEPTION 'Sem permissão para atribuir este chamado' USING ERRCODE = '42501';
  END IF;

  -- Checkpoint 3: passa a exigir também user_profiles.ativo=true do
  -- responsável — antes só checava ti_equipe_membros.ativo (vínculo de
  -- equipe), deixando possível atribuir a alguém cujo PERFIL já foi
  -- desativado (desativar um usuário não desativa automaticamente as
  -- linhas de ti_equipe_membros dele).
  IF NOT EXISTS (
    SELECT 1
    FROM public.ti_equipe_membros tem
    JOIN public.user_profiles up ON up.id = tem.profile_id AND up.ativo = true
    WHERE tem.equipe_id = v_chamado.equipe_id AND tem.profile_id = p_responsavel_profile_id AND tem.ativo = true
  ) THEN
    RAISE EXCEPTION 'Responsável precisa ser membro ativo (perfil e vínculo) da equipe do chamado' USING ERRCODE = '22023';
  END IF;

  -- Sprint 4.3: trocar de um responsável JÁ DEFINIDO para outro é
  -- bloqueado nesta sprint — reatribuição segura com aceite é item de
  -- sprint futura.
  IF v_chamado.responsavel_profile_id IS NOT NULL
     AND v_chamado.responsavel_profile_id <> p_responsavel_profile_id THEN
    RAISE EXCEPTION 'Chamado já está atribuído a outro responsável — reatribuição não é permitida nesta sprint'
      USING ERRCODE = '23514';
  END IF;

  -- Idempotente: já está atribuído a esta mesma pessoa — nada a fazer,
  -- sem duplicar histórico/notificação.
  IF v_chamado.responsavel_profile_id = p_responsavel_profile_id THEN
    RETURN jsonb_build_object('changed', false);
  END IF;

  -- A partir daqui, só resta o caso responsavel_profile_id IS NULL
  -- (primeira atribuição — inclui "Assumir chamado").
  UPDATE public.ti_chamados SET
    responsavel_profile_id = p_responsavel_profile_id,
    status = 'atribuido',
    updated_at = now()
  WHERE id = p_chamado_id;

  INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, valor_anterior, valor_novo)
  VALUES (p_chamado_id, v_actor_profile_id, 'usuario', 'atribuicao',
    jsonb_build_object('responsavel_profile_id', NULL),
    jsonb_build_object('responsavel_profile_id', p_responsavel_profile_id));

  INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
  VALUES (p_responsavel_profile_id, p_chamado_id, 'atribuicao');

  RETURN jsonb_build_object('changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.ti_atribuir_chamado(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_atribuir_chamado(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_atribuir_chamado(UUID, UUID) TO authenticated;

-- ── ti_mudar_status — máquina de estados (seção 3 do doc) ───────────────
-- Reabertura: só a partir de Resolvido, dentro do prazo (seção 1, item 11).
-- Fechado é terminal (nenhuma transição de saída na tabela abaixo). Depois
-- de Fechado, o cliente deve chamar ti_criar_chamado com
-- p_chamado_relacionado_id apontando pra este.
--
-- CORRIGIDA na revisão de UX operacional da Sprint 4.3 (dois ajustes,
-- nenhuma tabela/coluna nova):
--   1. atribuido → em_atendimento agora é uma transição manual válida,
--      SEM depender de ti_iniciar_tempo (que continua reservada só pra
--      Sprint 4.4 — cronômetro). "Em atendimento" e "aguardando_solicitante"
--      já existiam no CHECK de status e nesta própria máquina de estados
--      (em_atendimento já tinha suas transições de SAÍDA modeladas, só
--      faltava uma via de ENTRADA que não fosse o cronômetro). Isso separa
--      "iniciar atendimento" (ação manual, sem cronômetro) de "iniciar
--      tempo" (Sprint 4.4), como pedido na revisão de fluxo.
--   2. Reaberto → atribuido (era → em_triagem): reabrir um chamado
--      resolvido NÃO deve forçar nova triagem — categoria, equipe e
--      responsável continuam válidos (nenhum deles é limpo por nenhuma
--      transição desta função), só o status "esfriou". Reaberto → em_triagem
--      era um placeholder assumido no Checkpoint 1, nunca implementado no
--      frontend — este ajuste fecha essa lacuna com a semântica correta.
CREATE OR REPLACE FUNCTION public.ti_mudar_status(
  p_chamado_id UUID,
  p_novo_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id UUID;
  v_chamado public.ti_chamados;
  v_transicoes_validas TEXT[];
  -- 7 dias — valor do doc (seção 1, item 11), a confirmar com o time de TI
  -- (seção 13: "valores propostos, não validados").
  v_prazo_reabertura_minutos INTEGER := 7 * 24 * 60;
BEGIN
  v_actor_profile_id := public.ti_perfil_ativo_id();
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_chamado FROM public.ti_chamados WHERE id = p_chamado_id FOR UPDATE;
  IF v_chamado.id IS NULL THEN
    RAISE EXCEPTION 'Chamado % não encontrado', p_chamado_id USING ERRCODE = '22023';
  END IF;

  v_transicoes_validas := CASE v_chamado.status
    WHEN 'em_atendimento'         THEN ARRAY['aguardando_solicitante', 'resolvido', 'cancelado']
    WHEN 'aguardando_solicitante' THEN ARRAY['em_atendimento', 'resolvido', 'cancelado']
    WHEN 'atribuido'              THEN ARRAY['em_atendimento', 'resolvido', 'cancelado']
    WHEN 'aberto'                 THEN ARRAY['cancelado']
    WHEN 'em_triagem'             THEN ARRAY['cancelado']
    WHEN 'resolvido'              THEN ARRAY['reaberto', 'fechado']
    WHEN 'reaberto'               THEN ARRAY['atribuido']
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (p_novo_status = ANY (v_transicoes_validas)) THEN
    RAISE EXCEPTION 'Transição de "%" para "%" não é permitida', v_chamado.status, p_novo_status
      USING ERRCODE = '23514';
  END IF;

  -- ── Autorização por operação ──
  -- 'atribuido' entra aqui pela transição reaberto → atribuido (item 1
  -- acima) — mesma régua de manage_all/manage_team das demais transições
  -- operacionais.
  IF p_novo_status IN ('resolvido', 'cancelado', 'aguardando_solicitante', 'em_atendimento', 'em_triagem', 'atribuido') THEN
    IF NOT (
      public.has_effective_permission('tickets.manage_all')
      OR (public.has_effective_permission('tickets.manage_team') AND public.ti_is_own_equipe(v_chamado.equipe_id))
    ) THEN
      RAISE EXCEPTION 'Sem permissão para alterar o status deste chamado' USING ERRCODE = '42501';
    END IF;
  ELSIF p_novo_status = 'reaberto' THEN
    IF NOT (v_chamado.solicitante_profile_id = v_actor_profile_id OR public.has_effective_permission('tickets.manage_all')) THEN
      RAISE EXCEPTION 'Apenas o solicitante (ou quem gerencia todos os chamados) pode reabrir' USING ERRCODE = '42501';
    END IF;
  ELSIF p_novo_status = 'fechado' THEN
    IF NOT public.has_effective_permission('tickets.manage_all') THEN
      RAISE EXCEPTION 'Sem permissão para fechar chamados manualmente' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── Regras específicas por transição ──
  IF p_novo_status = 'resolvido' AND EXISTS (
    SELECT 1 FROM public.ti_chamado_tempos
    WHERE chamado_id = p_chamado_id AND tipo = 'automatico' AND finalizado_em IS NULL
  ) THEN
    RAISE EXCEPTION 'Encerre o cronômetro ativo antes de resolver o chamado' USING ERRCODE = '23514';
  END IF;

  IF p_novo_status = 'reaberto'
     AND now() > v_chamado.resolved_at + make_interval(mins => v_prazo_reabertura_minutos) THEN
    RAISE EXCEPTION 'Prazo de reabertura expirado — abra um novo chamado vinculado a este (chamado_relacionado_id)'
      USING ERRCODE = '23514';
  END IF;

  -- ── Pausa/retomada de SLA (seção 6 do doc) ──
  IF p_novo_status = 'aguardando_solicitante' THEN
    UPDATE public.ti_chamados SET sla_pausado_em = now() WHERE id = p_chamado_id;

    -- Checkpoint 3: o fechamento automático de sessão(ões) de tempo aqui
    -- não gerava entrada em ti_chamado_historico — inconsistente com "toda
    -- mudança de tempo é gravada em ti_chamado_historico" (seção 1, item 7
    -- do doc) e com o que ti_encerrar_tempo já fazia manualmente. Usa
    -- WITH...RETURNING pra cobrir corretamente 0, 1 ou N sessões fechadas
    -- (nada impede dois agentes diferentes terem sessão automática aberta
    -- no MESMO chamado simultaneamente — o índice único é por agente, não
    -- por chamado).
    WITH fechadas AS (
      UPDATE public.ti_chamado_tempos SET
        finalizado_em = now(),
        duracao_segundos = EXTRACT(EPOCH FROM (now() - iniciado_em))::INTEGER,
        updated_at = now()
      WHERE chamado_id = p_chamado_id AND tipo = 'automatico' AND finalizado_em IS NULL
      RETURNING id, duracao_segundos
    )
    INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, tempo_id, valor_novo)
    SELECT p_chamado_id, v_actor_profile_id, 'usuario', 'tempo_trabalhado', fechadas.id,
      jsonb_build_object('duracao_segundos', fechadas.duracao_segundos, 'motivo', 'aguardando_solicitante')
    FROM fechadas;
  ELSIF v_chamado.status = 'aguardando_solicitante' THEN
    -- Saindo de "aguardando solicitante" (retomando ou resolvendo): acumula
    -- o tempo pausado, nunca recalcula o prazo do zero (seção 6).
    UPDATE public.ti_chamados SET
      sla_tempo_pausado_segundos = sla_tempo_pausado_segundos + EXTRACT(EPOCH FROM (now() - sla_pausado_em))::INTEGER,
      sla_pausado_em = NULL
    WHERE id = p_chamado_id;
  END IF;

  -- Checkpoint 1/3: resolved_at representa a resolução ATUAL/mais recente —
  -- volta a NULL ao reabrir (antes ficava com a data da resolução antiga
  -- pra sempre) e recebe now() de novo ao resolver outra vez. Resoluções
  -- anteriores continuam só em ti_chamado_historico (evento
  -- 'status_alterado'), nunca nesta coluna.
  UPDATE public.ti_chamados SET
    status = p_novo_status,
    resolved_at = CASE
      WHEN p_novo_status = 'resolvido' THEN now()
      WHEN p_novo_status = 'reaberto' THEN NULL
      ELSE resolved_at
    END,
    closed_at = CASE WHEN p_novo_status = 'fechado' THEN now() ELSE closed_at END,
    updated_at = now()
  WHERE id = p_chamado_id;

  INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, valor_anterior, valor_novo)
  VALUES (p_chamado_id, v_actor_profile_id, 'usuario', 'status_alterado',
    jsonb_build_object('status', v_chamado.status), jsonb_build_object('status', p_novo_status));

  IF p_novo_status = 'resolvido' THEN
    INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
    VALUES (v_chamado.solicitante_profile_id, p_chamado_id, 'chamado_resolvido');
  END IF;

  IF p_novo_status = 'reaberto' THEN
    INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
    SELECT profile_id, p_chamado_id, 'chamado_reaberto'
    FROM (
      SELECT v_chamado.responsavel_profile_id AS profile_id
      WHERE v_chamado.responsavel_profile_id IS NOT NULL
      UNION
      SELECT profile_id FROM public.ti_equipe_membros
      WHERE equipe_id = v_chamado.equipe_id AND coordenador = true AND ativo = true
    ) destinatarios;
  END IF;

  RETURN jsonb_build_object('changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.ti_mudar_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_mudar_status(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_mudar_status(UUID, TEXT) TO authenticated;

-- ── ti_iniciar_tempo ─────────────────────────────────────────────
-- "Iniciar atendimento" (seção 1, item 5): abre a sessão E transiciona
-- Atribuído → Em atendimento, se ainda não estava.
CREATE OR REPLACE FUNCTION public.ti_iniciar_tempo(p_chamado_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_agente_profile_id UUID;
  v_chamado public.ti_chamados;
  v_tempo_id UUID;
BEGIN
  v_agente_profile_id := public.ti_perfil_ativo_id();
  IF v_agente_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_effective_permission('tickets.time_start') THEN
    RAISE EXCEPTION 'Sem permissão para iniciar cronômetro' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_chamado FROM public.ti_chamados WHERE id = p_chamado_id FOR UPDATE;
  IF v_chamado.id IS NULL THEN
    RAISE EXCEPTION 'Chamado % não encontrado', p_chamado_id USING ERRCODE = '22023';
  END IF;

  IF v_chamado.status NOT IN ('atribuido', 'em_atendimento') THEN
    RAISE EXCEPTION 'Chamado no status "%" não admite iniciar cronômetro', v_chamado.status USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ti_chamado_tempos
    WHERE agente_profile_id = v_agente_profile_id AND tipo = 'automatico' AND finalizado_em IS NULL
  ) THEN
    RAISE EXCEPTION 'Você já tem uma sessão de cronômetro automática aberta em outro chamado' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.ti_chamado_tempos (chamado_id, agente_profile_id, tipo, criado_por)
  VALUES (p_chamado_id, v_agente_profile_id, 'automatico', v_agente_profile_id)
  RETURNING id INTO v_tempo_id;

  IF v_chamado.status = 'atribuido' THEN
    UPDATE public.ti_chamados SET status = 'em_atendimento', updated_at = now() WHERE id = p_chamado_id;

    INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, valor_anterior, valor_novo)
    VALUES (p_chamado_id, v_agente_profile_id, 'usuario', 'status_alterado',
      jsonb_build_object('status', 'atribuido'), jsonb_build_object('status', 'em_atendimento'));
  END IF;

  RETURN v_tempo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ti_iniciar_tempo(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_iniciar_tempo(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_iniciar_tempo(UUID) TO authenticated;

-- ── ti_encerrar_tempo ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ti_encerrar_tempo(p_tempo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_agente_profile_id UUID;
  v_tempo public.ti_chamado_tempos;
  v_duracao INTEGER;
BEGIN
  v_agente_profile_id := public.ti_perfil_ativo_id();
  IF v_agente_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_tempo FROM public.ti_chamado_tempos WHERE id = p_tempo_id FOR UPDATE;
  IF v_tempo.id IS NULL THEN
    RAISE EXCEPTION 'Sessão de tempo % não encontrada', p_tempo_id USING ERRCODE = '22023';
  END IF;

  IF v_tempo.tipo <> 'automatico' OR v_tempo.finalizado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Sessão não é uma sessão automática em aberto' USING ERRCODE = '23514';
  END IF;

  IF v_tempo.agente_profile_id <> v_agente_profile_id AND NOT public.has_effective_permission('tickets.time_edit') THEN
    RAISE EXCEPTION 'Sem permissão para encerrar cronômetro de outro agente' USING ERRCODE = '42501';
  END IF;

  -- Duração SEMPRE recalculada no banco a partir de iniciado_em/now() —
  -- nunca aceita do cliente (seção 11 do doc).
  v_duracao := EXTRACT(EPOCH FROM (now() - v_tempo.iniciado_em))::INTEGER;

  UPDATE public.ti_chamado_tempos SET
    finalizado_em = now(),
    duracao_segundos = v_duracao,
    updated_at = now()
  WHERE id = p_tempo_id;

  INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, tempo_id, valor_novo)
  VALUES (v_tempo.chamado_id, v_agente_profile_id, 'usuario', 'tempo_trabalhado', p_tempo_id,
    jsonb_build_object('duracao_segundos', v_duracao));

  RETURN jsonb_build_object('changed', true, 'duracao_segundos', v_duracao);
END;
$$;

REVOKE ALL ON FUNCTION public.ti_encerrar_tempo(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_encerrar_tempo(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_encerrar_tempo(UUID) TO authenticated;

-- ── ti_lancar_tempo_manual ───────────────────────────────────────
-- tickets.time_log sozinho só lança pro próprio agente; lançar em nome de
-- outro exige tickets.time_edit + justificativa obrigatória (seção 11).
CREATE OR REPLACE FUNCTION public.ti_lancar_tempo_manual(
  p_chamado_id UUID,
  p_agente_profile_id UUID,
  p_duracao_segundos INTEGER,
  p_descricao TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id UUID;
  v_tempo_id UUID;
  v_chamado public.ti_chamados;
BEGIN
  v_actor_profile_id := public.ti_perfil_ativo_id();
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_chamado FROM public.ti_chamados WHERE id = p_chamado_id;
  IF v_chamado.id IS NULL THEN
    RAISE EXCEPTION 'Chamado % não encontrado', p_chamado_id USING ERRCODE = '22023';
  END IF;

  IF p_duracao_segundos IS NULL OR p_duracao_segundos <= 0 THEN
    RAISE EXCEPTION 'Duração manual precisa ser maior que zero' USING ERRCODE = '22023';
  END IF;

  IF p_descricao IS NULL OR btrim(p_descricao) = '' THEN
    RAISE EXCEPTION 'Descrição é obrigatória para lançamento manual' USING ERRCODE = '22023';
  END IF;

  IF p_agente_profile_id = v_actor_profile_id THEN
    IF NOT public.has_effective_permission('tickets.time_log') THEN
      RAISE EXCEPTION 'Sem permissão para lançar tempo' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT public.has_effective_permission('tickets.time_edit') THEN
      RAISE EXCEPTION 'Lançar tempo em nome de outro agente exige tickets.time_edit' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Checkpoint 3: antes não validava NADA sobre p_agente_profile_id além da
  -- FK (que só garante que o perfil existe) — dava pra lançar tempo em nome
  -- de qualquer perfil, inclusive desativado ou de outro módulo (vendedor,
  -- por exemplo). Agora exige perfil ativo e, se o chamado já foi triado
  -- (equipe_id preenchido), exige também que o agente seja membro ativo
  -- DESSA equipe — mesma régua de ti_atribuir_chamado.
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_agente_profile_id AND ativo = true) THEN
    RAISE EXCEPTION 'Agente do lançamento precisa ser um perfil ativo' USING ERRCODE = '22023';
  END IF;

  IF v_chamado.equipe_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.ti_equipe_membros
    WHERE equipe_id = v_chamado.equipe_id AND profile_id = p_agente_profile_id AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Agente do lançamento precisa ser membro ativo da equipe do chamado' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ti_chamado_tempos (
    chamado_id, agente_profile_id, iniciado_em, finalizado_em, duracao_segundos, tipo, descricao, criado_por
  ) VALUES (
    p_chamado_id, p_agente_profile_id, now() - make_interval(secs => p_duracao_segundos), now(),
    p_duracao_segundos, 'manual', p_descricao, v_actor_profile_id
  ) RETURNING id INTO v_tempo_id;

  INSERT INTO public.ti_chamado_historico (chamado_id, autor_profile_id, origem, evento, tempo_id, valor_novo)
  VALUES (p_chamado_id, v_actor_profile_id, 'usuario', 'tempo_trabalhado', v_tempo_id,
    jsonb_build_object('duracao_segundos', p_duracao_segundos, 'descricao', p_descricao, 'agente_profile_id', p_agente_profile_id));

  RETURN v_tempo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ti_lancar_tempo_manual(UUID, UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_lancar_tempo_manual(UUID, UUID, INTEGER, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_lancar_tempo_manual(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- ── ti_comentar_chamado ──────────────────────────────────────────
-- Solicitante NUNCA cria comentário interno (seção 3) — sem exceção via
-- parâmetro, ignorado silenciosamente pro próprio solicitante.
CREATE OR REPLACE FUNCTION public.ti_comentar_chamado(
  p_chamado_id UUID,
  p_mensagem TEXT,
  p_interno BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id UUID;
  v_chamado public.ti_chamados;
  v_e_solicitante BOOLEAN;
  v_comentario_id UUID;
  v_interno_final BOOLEAN;
BEGIN
  v_actor_profile_id := public.ti_perfil_ativo_id();
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF p_mensagem IS NULL OR btrim(p_mensagem) = '' THEN
    RAISE EXCEPTION 'Mensagem é obrigatória' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_chamado FROM public.ti_chamados WHERE id = p_chamado_id;
  IF v_chamado.id IS NULL THEN
    RAISE EXCEPTION 'Chamado % não encontrado', p_chamado_id USING ERRCODE = '22023';
  END IF;

  v_e_solicitante := (v_chamado.solicitante_profile_id = v_actor_profile_id);

  IF v_e_solicitante THEN
    IF NOT public.has_effective_permission('tickets.comment_own') THEN
      RAISE EXCEPTION 'Sem permissão para comentar no próprio chamado' USING ERRCODE = '42501';
    END IF;
    v_interno_final := false;
  ELSE
    -- Checkpoint 3: faltava o ramo "triagem em chamado não-triado" — sem
    -- ele, alguém que só tem tickets.triage (nada de view_team/view_all)
    -- conseguia VER um chamado ainda não-triado via RLS
    -- (ti_pode_ver_chamado já cobre esse ramo), mas não conseguia comentar
    -- nele por aqui — RLS e RPC desalinhados. Corrigido pra espelhar
    -- exatamente os mesmos ramos "profissionais" de ti_pode_ver_chamado.
    IF NOT (
      public.has_effective_permission('tickets.view_all')
      OR public.has_effective_permission('tickets.manage_all')
      OR (public.has_effective_permission('tickets.triage') AND v_chamado.equipe_id IS NULL)
      OR (public.has_effective_permission('tickets.view_team') AND public.ti_is_own_equipe(v_chamado.equipe_id))
      OR (public.has_effective_permission('tickets.manage_team') AND public.ti_is_own_equipe(v_chamado.equipe_id))
    ) THEN
      RAISE EXCEPTION 'Sem permissão para comentar neste chamado' USING ERRCODE = '42501';
    END IF;
    v_interno_final := COALESCE(p_interno, false);
  END IF;

  INSERT INTO public.ti_chamado_comentarios (chamado_id, autor_profile_id, mensagem, interno)
  VALUES (p_chamado_id, v_actor_profile_id, p_mensagem, v_interno_final)
  RETURNING id INTO v_comentario_id;

  IF NOT v_interno_final THEN
    INSERT INTO public.ti_notificacoes (destinatario_profile_id, chamado_id, evento)
    SELECT destinatario, p_chamado_id, 'novo_comentario'
    FROM (
      SELECT v_chamado.responsavel_profile_id AS destinatario WHERE v_e_solicitante AND v_chamado.responsavel_profile_id IS NOT NULL
      UNION
      SELECT v_chamado.solicitante_profile_id WHERE NOT v_e_solicitante
    ) destinatarios
    WHERE destinatario IS NOT NULL;
  END IF;

  RETURN v_comentario_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ti_comentar_chamado(UUID, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_comentar_chamado(UUID, TEXT, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_comentar_chamado(UUID, TEXT, BOOLEAN) TO authenticated;

-- ── ti_marcar_notificacao_lida ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.ti_marcar_notificacao_lida(p_notificacao_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_profile_id UUID;
  v_changed BOOLEAN := false;
BEGIN
  v_actor_profile_id := public.ti_perfil_ativo_id();
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  UPDATE public.ti_notificacoes SET lida = true
  WHERE id = p_notificacao_id AND destinatario_profile_id = v_actor_profile_id AND lida = false;
  v_changed := FOUND;

  RETURN jsonb_build_object('changed', v_changed);
END;
$$;

REVOKE ALL ON FUNCTION public.ti_marcar_notificacao_lida(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_marcar_notificacao_lida(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_marcar_notificacao_lida(UUID) TO authenticated;

-- ============================================================
-- PARTE 4.1 — RPCs de leitura para a Central de Atendimento (Sprint 4.3)
-- ============================================================
-- Fecham duas lacunas identificadas na revisão da Sprint 4.3 (nenhuma
-- tabela/coluna nova, só leitura adicional via SECURITY DEFINER):
--   1. ti_equipe_membros só expõe a PRÓPRIA linha via RLS (Parte 3) — não
--      dá pra montar o combo de "Atribuir responsável" com uma query direta.
--      Já estava sinalizado como pendência no comentário da RLS daquela
--      tabela: "Sprint 4.2/4.3 precisa de RPC própria".
--   2. user_profiles só expõe a PRÓPRIA linha (RLS da Sprint 2.2) — a fila
--      operacional (ti_chamados) não consegue exibir nome do solicitante/
--      responsável com um JOIN direto. Deliberadamente NÃO ampliamos a RLS
--      de user_profiles (isso abriria o diretório inteiro de usuários pra
--      qualquer perfil de TI) — em vez disso, a RPC abaixo devolve só os
--      nomes estritamente necessários, já filtrados pelo mesmo escopo de
--      autorização que ti_chamados usa.

-- ── ti_listar_membros_equipe ─────────────────────────────────────
-- Só profile_id, nome e a função na equipe (coordenador) — nunca e-mail,
-- telefone ou outra coluna de user_profiles. Autorização: view_all/
-- manage_all (qualquer equipe), view_team/manage_team (só a própria
-- equipe, via ti_is_own_equipe) e tickets.triage (qualquer equipe ativa —
-- precisa avaliar a composição de times durante a triagem, antes de haver
-- vínculo de equipe com o chamado).
CREATE OR REPLACE FUNCTION public.ti_listar_membros_equipe(p_equipe_id UUID)
RETURNS TABLE (profile_id UUID, nome TEXT, coordenador BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.ti_perfil_ativo_id() IS NULL THEN
    RAISE EXCEPTION 'Perfil ativo não encontrado para o usuário autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ti_equipes WHERE id = p_equipe_id AND ativo = true) THEN
    RAISE EXCEPTION 'Equipe % não encontrada ou inativa', p_equipe_id USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.has_effective_permission('tickets.view_all')
    OR public.has_effective_permission('tickets.manage_all')
    OR public.has_effective_permission('tickets.triage')
    OR (
      (public.has_effective_permission('tickets.view_team') OR public.has_effective_permission('tickets.manage_team'))
      AND public.ti_is_own_equipe(p_equipe_id)
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para listar membros desta equipe' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT tem.profile_id, up.nome, tem.coordenador
  FROM public.ti_equipe_membros tem
  JOIN public.user_profiles up ON up.id = tem.profile_id AND up.ativo = true
  WHERE tem.equipe_id = p_equipe_id AND tem.ativo = true
  ORDER BY up.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.ti_listar_membros_equipe(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_listar_membros_equipe(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_listar_membros_equipe(UUID) TO authenticated;

-- ── ti_fila_atendimento ──────────────────────────────────────────
-- Fila operacional: mesmos chamados que "Leitura ti_chamados" (Parte 3) já
-- libera para view_all/manage_all/view_team/manage_team/triage — reproduz
-- EXATAMENTE a mesma condição de autorização (sem o ramo view_own, que é
-- do Portal do Solicitante, não da Central de Atendimento), e adiciona só
-- nome do solicitante e do responsável via JOIN com user_profiles — nunca
-- e-mail, telefone ou qualquer outra coluna. Sem nenhuma permissão de
-- tickets.*, a condição inteira é falsa e a função devolve zero linhas.
-- Filtros são todos opcionais (NULL = não filtra); busca cobre código,
-- título e nome do solicitante. Paginação (p_limit/p_offset) com limites
-- de sanidade (1–200 linhas por página) e ordenação estável (created_at
-- DESC, id DESC como desempate — sem ele, chamados criados no mesmo
-- instante poderiam mudar de posição entre páginas).
CREATE OR REPLACE FUNCTION public.ti_fila_atendimento(
  p_equipe_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_prioridade TEXT DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_responsavel_profile_id UUID DEFAULT NULL,
  p_sem_responsavel BOOLEAN DEFAULT NULL,
  p_busca TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                      UUID,
  codigo_chamado          TEXT,
  titulo                  TEXT,
  categoria_id            UUID,
  categoria_nome          TEXT,
  equipe_id               UUID,
  equipe_nome             TEXT,
  status                  TEXT,
  prioridade              TEXT,
  prioridade_sugerida     TEXT,
  solicitante_profile_id  UUID,
  solicitante_nome        TEXT,
  responsavel_profile_id  UUID,
  responsavel_nome        TEXT,
  created_at              TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ,
  prazo_resolucao_em      TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id, c.codigo_chamado, c.titulo,
    c.categoria_id, cat.nome,
    c.equipe_id, eq.nome,
    c.status, c.prioridade, c.prioridade_sugerida,
    c.solicitante_profile_id, sol.nome,
    c.responsavel_profile_id, resp.nome,
    c.created_at, c.updated_at, c.prazo_resolucao_em
  FROM public.ti_chamados c
  LEFT JOIN public.ti_categorias cat ON cat.id = c.categoria_id
  LEFT JOIN public.ti_equipes eq ON eq.id = c.equipe_id
  LEFT JOIN public.user_profiles sol ON sol.id = c.solicitante_profile_id
  LEFT JOIN public.user_profiles resp ON resp.id = c.responsavel_profile_id
  WHERE (
    public.has_effective_permission('tickets.view_all')
    OR public.has_effective_permission('tickets.manage_all')
    OR (public.has_effective_permission('tickets.triage') AND c.equipe_id IS NULL)
    OR (
      (public.has_effective_permission('tickets.view_team') OR public.has_effective_permission('tickets.manage_team'))
      AND public.ti_is_own_equipe(c.equipe_id)
    )
  )
  AND (p_equipe_id IS NULL OR c.equipe_id = p_equipe_id)
  AND (p_status IS NULL OR c.status = p_status)
  AND (p_prioridade IS NULL OR c.prioridade = p_prioridade)
  AND (p_categoria_id IS NULL OR c.categoria_id = p_categoria_id)
  AND (p_responsavel_profile_id IS NULL OR c.responsavel_profile_id = p_responsavel_profile_id)
  AND (p_sem_responsavel IS NOT TRUE OR c.responsavel_profile_id IS NULL)
  AND (
    p_busca IS NULL OR btrim(p_busca) = ''
    OR c.codigo_chamado ILIKE '%' || p_busca || '%'
    OR c.titulo ILIKE '%' || p_busca || '%'
    OR sol.nome ILIKE '%' || p_busca || '%'
  )
  ORDER BY c.created_at DESC, c.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.ti_fila_atendimento(UUID, TEXT, TEXT, UUID, UUID, BOOLEAN, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ti_fila_atendimento(UUID, TEXT, TEXT, UUID, UUID, BOOLEAN, TEXT, INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.ti_fila_atendimento(UUID, TEXT, TEXT, UUID, UUID, BOOLEAN, TEXT, INTEGER, INTEGER) TO authenticated;

-- ============================================================
-- PARTE 5 — SEEDS
-- ============================================================

-- ── SEED: ti_equipes (seção 8 do doc) ────────────────────────────
INSERT INTO public.ti_equipes (nome, codigo) VALUES
  ('Infraestrutura', 'infraestrutura'),
  ('Sistemas',        'sistemas')
ON CONFLICT (codigo) DO NOTHING;

-- ── SEED: ti_categorias (seção 5 do doc) ─────────────────────────
INSERT INTO public.ti_categorias (nome, equipe_padrao_id)
SELECT v.nome, e.id
FROM (VALUES
  ('Computador/Notebook',                        'infraestrutura'),
  ('Impressora',                                 'infraestrutura'),
  ('Rede/Internet/Wi-Fi',                        'infraestrutura'),
  ('Sistema/Software (inclusive o próprio Hub)', 'sistemas'),
  ('Acesso/Senha',                                'sistemas'),
  ('E-mail',                                      'sistemas'),
  ('Telefonia',                                   'infraestrutura'),
  ('Outro',                                       NULL)
) AS v(nome, equipe_codigo)
LEFT JOIN public.ti_equipes e ON e.codigo = v.equipe_codigo
ON CONFLICT (nome) DO NOTHING;

-- ── SEED: ti_sla_regras (seção 4 do doc) ──────────────────────────
-- Valores propostos, NÃO validados com o time de TI (seção 13: risco
-- pendente, confirmar antes de operar em produção).
INSERT INTO public.ti_sla_regras (prioridade, minutos_primeira_resposta, minutos_resolucao) VALUES
  ('baixa',   480, 4320), -- 8h úteis de 1ª resposta / 3 dias corridos de resolução
  ('media',   240, 1440), -- 4h / 1 dia
  ('alta',    60,  480),  -- 1h / 8h
  ('urgente', 15,  120)   -- 15min / 2h
ON CONFLICT (prioridade) DO NOTHING;

-- ── SEED: permissions (catálogo tickets.* — seção 10 do doc) ──────
INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('tickets.create',               'tickets', 'create',               'Abrir chamado de TI'),
  ('tickets.view_own',             'tickets', 'view_own',             'Visualizar os próprios chamados'),
  ('tickets.comment_own',          'tickets', 'comment_own',          'Comentar nos próprios chamados'),
  ('tickets.view_team',            'tickets', 'view_team',            'Visualizar chamados da própria equipe de TI'),
  ('tickets.manage_team',          'tickets', 'manage_team',          'Gerenciar chamados da própria equipe de TI'),
  ('tickets.triage',               'tickets', 'triage',               'Fazer triagem de chamados novos'),
  ('tickets.view_all',             'tickets', 'view_all',             'Visualizar todos os chamados'),
  ('tickets.manage_all',           'tickets', 'manage_all',           'Gerenciar todos os chamados'),
  ('tickets.reports_view',         'tickets', 'reports_view',         'Visualizar relatórios de chamados'),
  ('tickets.settings_manage',      'tickets', 'settings_manage',      'Gerenciar configurações do módulo (equipes, categorias, SLA)'),
  ('tickets.notifications_view',   'tickets', 'notifications_view',   'Visualizar notificações de chamados'),
  ('tickets.notifications_manage', 'tickets', 'notifications_manage', 'Gerenciar preferências de notificação de terceiros'),
  ('tickets.time_start',           'tickets', 'time_start',           'Iniciar cronômetro de atendimento'),
  ('tickets.time_log',             'tickets', 'time_log',             'Lançar tempo manual no próprio nome'),
  ('tickets.time_edit',            'tickets', 'time_edit',            'Lançar/editar tempo em nome de outro agente'),
  ('tickets.time_view_team',       'tickets', 'time_view_team',       'Visualizar tempo trabalhado da própria equipe'),
  ('tickets.time_reports_view',    'tickets', 'time_reports_view',    'Visualizar relatórios de tempo trabalhado'),
  ('tickets.kb_view',              'tickets', 'kb_view',              'Ler artigos publicados da Base de Conhecimento de TI'),
  ('tickets.kb_manage',            'tickets', 'kb_manage',            'Criar, editar e publicar artigos da Base de Conhecimento de TI')
ON CONFLICT (code) DO NOTHING;

-- ── SEED: role_permissions (matriz inicial — seção 10 do doc) ─────
-- Baseline (create/view_own/comment_own/notifications_view/kb_view) pra
-- todos os 4 papéis. admin recebe todas as tickets.*. Permissões
-- operacionais (triagem, gestão de equipe, tempo de terceiros, relatórios,
-- kb_manage, settings_manage) NÃO entram aqui pra marketing/gestor/vendedor
-- — ficam disponíveis só via overrides individuais no Centro de Permissões,
-- exatamente como o doc especifica.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  -- ===== admin: todas =====
  ('admin', 'tickets.create'), ('admin', 'tickets.view_own'), ('admin', 'tickets.comment_own'),
  ('admin', 'tickets.notifications_view'), ('admin', 'tickets.kb_view'),
  ('admin', 'tickets.view_team'), ('admin', 'tickets.manage_team'), ('admin', 'tickets.triage'),
  ('admin', 'tickets.view_all'), ('admin', 'tickets.manage_all'), ('admin', 'tickets.reports_view'),
  ('admin', 'tickets.settings_manage'), ('admin', 'tickets.notifications_manage'),
  ('admin', 'tickets.time_start'), ('admin', 'tickets.time_log'), ('admin', 'tickets.time_edit'),
  ('admin', 'tickets.time_view_team'), ('admin', 'tickets.time_reports_view'), ('admin', 'tickets.kb_manage'),

  -- ===== marketing: baseline =====
  ('marketing', 'tickets.create'), ('marketing', 'tickets.view_own'), ('marketing', 'tickets.comment_own'),
  ('marketing', 'tickets.notifications_view'), ('marketing', 'tickets.kb_view'),

  -- ===== gestor: baseline =====
  ('gestor', 'tickets.create'), ('gestor', 'tickets.view_own'), ('gestor', 'tickets.comment_own'),
  ('gestor', 'tickets.notifications_view'), ('gestor', 'tickets.kb_view'),

  -- ===== vendedor: baseline =====
  ('vendedor', 'tickets.create'), ('vendedor', 'tickets.view_own'), ('vendedor', 'tickets.comment_own'),
  ('vendedor', 'tickets.notifications_view'), ('vendedor', 'tickets.kb_view')
) AS seed(role_code, permission_code)
JOIN public.roles r ON r.code = seed.role_code
JOIN public.permissions p ON p.code = seed.permission_code
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Recarrega o schema cache do PostgREST/Supabase apos criar novas tabelas/funcoes.
NOTIFY pgrst, 'reload schema';
