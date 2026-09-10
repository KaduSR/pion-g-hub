-- ============================================================
-- MIGRATION: Sprint 4.1 — Módulo de Chamados de TI, Fundação do banco
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

NOTIFY pgrst, 'reload schema';
