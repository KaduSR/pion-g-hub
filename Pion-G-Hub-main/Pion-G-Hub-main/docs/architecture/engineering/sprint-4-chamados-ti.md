# Sprint 4 — Módulo de Chamados de TI

> Módulo novo, independente do Centro de Permissões.
> **A Sprint 3.8 permanece exclusiva para o Centro de Permissões (PBAC)** — nenhuma decisão,
> arquivo ou migration desta Sprint deve ser misturada com aquela implementação. O módulo de
> Chamados de TI **usa** o PBAC já existente (novo `resource: tickets`), mas não o altera
> estruturalmente.

---

## Estrutura da Sprint

| Sub-sprint | Escopo |
|---|---|
| 4.0 | Arquitetura final e preparação |
| 4.1 | Fundação do banco, RLS, RPCs e permissões |
| 4.2 | Abertura e acompanhamento pelo solicitante |
| 4.3 | Central de atendimento e triagem da TI |
| 4.4 | Cronômetro e tempo trabalhado |
| 4.5 | Notificações in-app |
| 4.6 | Anexos |
| 4.7 | SLA, dashboard e relatórios |
| 4.8 | Notificações por e-mail |
| 4.9 | Base de Conhecimento de TI |
| 4.10 | Catálogo de serviços e refinamentos |

Status geral: 📋 Planejada — nenhuma migration ou arquivo de código criado ainda. Este documento
consolida o checkpoint de arquitetura já aprovado conceitualmente em sessão anterior; a Sprint 4.1
(fundação do banco) é o próximo passo, retomando exatamente daqui.

---

## Sprint 4.0 — Arquitetura final consolidada

### 1. Fluxo completo do chamado

1. **Solicitante** (colaborador interno ou vendedor externo) abre um chamado: título, descrição,
   categoria, prioridade sugerida (`prioridade_sugerida` — é só um insumo para a triagem, nunca usada
   em cálculo de SLA), anexos opcionais.
2. Chamado nasce em **Aberto** → dispara notificação `novo_chamado` para quem tem `tickets.triage`.
   O SLA já começa a contar neste momento (ver seção 6) — não espera a triagem.
3. Um agente de TI faz a **triagem**: confirma/ajusta categoria e define a **prioridade oficial**
   (`prioridade` — a sugestão do solicitante é só referência, quem decide é a triagem), define a
   **equipe** (Infraestrutura ou Sistemas — invisível ao solicitante) → dispara `direcionado_equipe`
   para quem tem `tickets.manage_team`/`view_team` daquela equipe. Se a prioridade oficial mudar aqui
   (ou depois, item 7), os prazos de SLA são recalculados **a partir de `created_at`** — a triagem
   nunca reinicia o relógio.
4. Um agente assume → **Atribuído** → **Em atendimento** → dispara `atribuicao` (ou `reatribuicao`
   se já havia responsável) para o novo responsável e, se houve troca, para o anterior.
5. Agente clica **Iniciar atendimento** → abre uma sessão em `ti_chamado_tempos` (cronômetro roda em
   paralelo ao chamado, sem se misturar ao SLA — seção 6).
6. Comentários bidirecionais → dispara `novo_comentario` para a "outra parte" (comentário interno
   nunca notifica o solicitante).
7. Mudança de prioridade (pela triagem ou por quem tiver `tickets.manage_team`/`tickets.manage_all`)
   → dispara `prioridade_alterada` para responsável + solicitante e **recalcula os prazos de SLA a
   partir de `created_at`** (mesma função `ti_calcular_prazo_sla`, seção 6 — nunca incrementa/decai
   em cima do prazo anterior). Toda mudança (status/responsável/equipe/prioridade/tempo) é gravada em
   `ti_chamado_historico`.
8. Se o agente precisa de algo do solicitante → **Aguardando solicitante**. Isso **encerra/pausa a
   sessão de tempo ativa** automaticamente e **pausa o SLA de resolução** (decisão confirmada —
   seção 6).
9. Job periódico (arquitetura preparada, implementação futura) varre chamados abertos e dispara
   `sla_proximo_vencimento`/`sla_vencido` para responsável + coordenador da equipe.
10. Agente tenta resolver → banco valida que **não há cronômetro ativo** para o chamado (bloqueia
    com mensagem clara se houver, sem auto-encerramento) → **Resolvido** → dispara
    `chamado_resolvido` para o solicitante.
11. Dentro do prazo de reabertura (ex.: 7 dias) **a partir de `Resolvido`**, o solicitante pode
    reabrir → **Reaberto**, dispara `chamado_reaberto` para o responsável anterior + coordenador.
    Passado o prazo sem reabertura, o chamado vira **Fechado** — definitivo, sem transição de volta.
    Chamado **Fechado** não admite reabertura: se o problema persistir, o solicitante abre um
    **novo** chamado, vinculado ao anterior via `chamado_relacionado_id` (seção 11).

### 2. Perfis envolvidos

| Perfil | O que faz |
|---|---|
| Solicitante interno | Abre e acompanha os próprios chamados (qualquer papel: admin/marketing/gestor/vendedor) |
| Solicitante externo (vendedor externo) | Mesma coisa — usuário autenticado normal, `role = vendedor` + `tipo_vinculo = externo` (seção 7) |
| Agente de TI — Infraestrutura | Vê e atende a fila de Infra (via `ti_equipe_membros`) |
| Agente de TI — Sistemas | Vê e atende a fila de Sistemas (via `ti_equipe_membros`) |
| Coordenador de TI | Vê as filas das equipes em que participa como coordenador, faz triagem, reatribui, métricas e SLA |
| Admin do Hub | Todas as permissões `tickets.*`, configura agentes/coordenadores via Centro de Permissões |

Não existem roles `infra`/`sistemas`/`coordenador_ti` — tudo é resolvido por PBAC (o que o usuário
pode fazer) + `ti_equipe_membros` (quais filas ele enxerga).

### 3. Máquina de estados

`Aberto` → `Em triagem` → `Atribuído` → `Em atendimento` ⇄ `Aguardando solicitante` → `Resolvido` →
`Fechado`, com `Reaberto` (**somente a partir de `Resolvido`, dentro do prazo — nunca a partir de
`Fechado`**) e `Cancelado` (duplicado ou desistência) como desvios. `Fechado` é estado terminal: não
há transição de saída; reabertura pós-fechamento nasce como um chamado novo (seção 1, item 11).

`ti_mudar_status` valida explicitamente as transições permitidas — sem saltos arbitrários — usando
`SELECT FOR UPDATE` no chamado antes de alterar, com serialização por chamado para evitar alterações
concorrentes sobre estado antigo. Atribuição valida que o responsável está ativo, pertence à equipe
ativa do chamado, e que a categoria/equipe utilizadas estão ativas. Solicitante nunca consegue criar
comentário interno, nem enxergar anexos vinculados a um comentário interno (seção 11).

### 4. Prioridades

`Baixa` / `Média` (padrão) / `Alta` / `Urgente`. Alvos de SLA por prioridade ficam em
`ti_sla_regras` (seção 11), não hardcoded no frontend — validação final dos valores com o time de TI
fica para a Sprint 4.1.

A prioridade informada pelo solicitante na abertura (`prioridade_sugerida`) é **apenas uma
sugestão** — nunca entra em cálculo de SLA. A prioridade oficial (`prioridade`) só existe a partir da
confirmação da triagem (seção 1, itens 1 e 3) e pode mudar depois disso; toda mudança recalcula o
SLA do zero a partir de `created_at` (nunca soma/decai incrementalmente sobre o prazo anterior) e
gera entrada em `ti_chamado_historico` (seção 1, item 7).

### 5. Categorias iniciais

Visíveis ao solicitante, cada uma com uma equipe sugerida por padrão (a triagem sempre pode
corrigir), via `equipe_padrao_id` (FK — nunca texto livre):

| Categoria | Equipe sugerida |
|---|---|
| Computador/Notebook | Infraestrutura |
| Impressora | Infraestrutura |
| Rede/Internet/Wi-Fi | Infraestrutura |
| Sistema/Software (inclusive o próprio Hub) | Sistemas |
| Acesso/Senha | Sistemas |
| E-mail | Sistemas |
| Telefonia | Infraestrutura |
| Outro | — (só a triagem decide) |

### 6. SLA × tempo trabalhado — não são a mesma coisa

| Métrica | O que mede | Onde vive |
|---|---|---|
| Prazo pra 1ª resposta (alvo) | Definido por prioridade | `ti_sla_regras` |
| Prazo pra resolução (alvo) | Definido por prioridade | `ti_sla_regras` |
| Tempo corrido | `now() - created_at` (ou `closed_at - created_at`) — nunca para | calculado, não armazenado |
| Tempo pausado (SLA) | Acumulado em `Aguardando solicitante` — **pausa confirmada** | `ti_chamados.sla_pausado_em` + `sla_tempo_pausado_segundos` |
| Tempo efetivamente trabalhado | Soma das sessões em `ti_chamado_tempos` | `ti_chamado_tempos` |

Um chamado pode ficar dias corridos aberto e ter só minutos de tempo trabalhado — isso não é uma
violação de SLA por si só. SLA compara tempo corrido (menos pausa) contra o prazo-alvo; tempo
trabalhado é métrica de esforço/produtividade, separada.

Mecanismo de pausa: `sla_pausado_em` marca desde quando está pausado agora; `sla_tempo_pausado_segundos`
acumula pausas já fechadas. Tempo pausado total = acumulado + `(agora − sla_pausado_em)` se ainda
pausado. O prazo nunca é recalculado do zero a partir do histórico — não depender apenas de
`ti_chamado_historico` para isso. Cálculo do prazo isolado em função SQL própria
(`ti_calcular_prazo_sla`), única chamada pelas RPCs, para permitir trocar a lógica (corrido vs.
horário comercial) no futuro sem mudar schema/RPCs — **decisão de calendário comercial (minutos
corridos vs. horário comercial, incluindo tratamento de finais de semana e feriados) fica em
aberto para depois** (pendência futura, ver seção 13).

**Semântica de `resolved_at`**: representa a resolução **atual/mais recente** do chamado, não a
primeira. Ao reabrir (`Resolvido → Reaberto`), `resolved_at` volta para `NULL`; ao resolver de novo
(2ª vez ou mais), recebe uma nova data. Resoluções anteriores não desaparecem — ficam preservadas
em `ti_chamado_historico` (evento `status_alterado`), que é o único lugar que guarda esse
histórico completo; `ti_chamados.resolved_at` nunca é um registro cumulativo.

### 7. Vendedores externos

Vendedor externo é um **usuário autenticado normal**, sem role novo:

- `user_profiles` ganha `tipo_vinculo TEXT NOT NULL DEFAULT 'interno' CHECK (tipo_vinculo IN ('interno','externo'))`.
- Linhas existentes recebem `'interno'` (todo mundo hoje é interno — migração seguindo o mesmo
  princípio de default seguro já usado no PBAC). **Pendência operacional**: a migration não sabe
  quais perfis já cadastrados são, na prática, vendedores externos — todos nascem `'interno'` por
  default seguro, e um admin precisa reclassificar manualmente (via UI, quando existir, ou update
  direto) os que já são externos hoje. Não é um problema de dado incorreto, é trabalho pendente de
  classificação após a migration rodar.
- O vendedor externo continua com `role = vendedor` e recebe permissões de chamados via PBAC (role +
  overrides), igual a qualquer outro usuário.
- **RLS**: nenhum impacto. `tipo_vinculo` é só descritivo — quem pode ver/criar/comentar chamado
  continua 100% governado pelas permissões `tickets.*`. Nenhuma policy de `leads_feira`,
  `user_profiles` ou do Centro de Permissões referencia esse campo.
- **Proteção**: `tipo_vinculo` é campo sensível — `protect_sensitive_profile_fields()` é atualizado
  para que um usuário comum não possa alterar o próprio `tipo_vinculo`; só admin autorizado,
  `service_role` ou conexão administrativa direta podem. Comportamento incluído no rollback.
- Impacto em criação de usuários: `admin-auth` Edge Function (`create_user`) e `CreateUserModal`
  ganham um campo a mais, default `'interno'` se omitido. `UsersPage` ganha aba "Externos".

### 8. Equipes de TI

Sem roles novos (`infra`/`sistemas`) — participação em equipe é dado, não permissão:

- **`ti_equipes`**: `id, nome, codigo (UNIQUE), ativo, created_at`. Seed: Infraestrutura
  (`infraestrutura`), Sistemas (`sistemas`).
- **`ti_equipe_membros`**: chave primária composta `(equipe_id, profile_id)` — mesmo padrão já usado
  em `role_permissions`/`user_permissions`, sem inventar padrão novo. Campos: `equipe_id, profile_id,
  coordenador, ativo, created_at`. Um agente pode pertencer a mais de uma equipe.
- "Fila que o agente enxerga" = JOIN com `ti_equipe_membros` (ativo). "O que ele pode fazer" = PBAC.
- `ti_categorias.equipe_padrao_id` e `ti_chamados.equipe_id` referenciam `ti_equipes(id)` (FK, não
  texto livre).

### 9. Notificações — arquitetura

**Eventos mínimos**: `novo_chamado`, `direcionado_equipe`, `atribuicao`, `reatribuicao`,
`novo_comentario`, `prioridade_alterada`, `chamado_reaberto`, `sla_proximo_vencimento`,
`sla_vencido`, `chamado_resolvido`.

**Quem recebe**: triagem → time de triagem; direcionamento → equipe destino; atribuição/reatribuição
→ responsável (novo e, se aplicável, anterior); comentário → a outra parte (nunca o solicitante em
comentário interno); prioridade/reabertura → responsável + solicitante/coordenador; SLA →
responsável + coordenador; resolução → solicitante.

**Escrita só via função/RPC, nunca INSERT direto** — mesma lição do Centro de Permissões: as
notificações nascem dentro das RPCs `SECURITY DEFINER` que mudam o chamado, nunca por INSERT direto
do cliente. Evita forjar notificação em nome de outro usuário ou marcar leitura de terceiro.

**Sino compartilhado**: `NotificationBell` fica em `shared/components/` — é elemento de cabeçalho,
visível em todo o Hub, não só no módulo de TI. A tabela por trás continua prefixada `ti_` porque hoje
só o módulo de TI gera notificação, mas o desenho já deixa a porta aberta para outros módulos
plugarem depois sem redesenhar o sino. Contador: `count(*) FROM ti_notificacoes WHERE
destinatario_profile_id = eu AND lida = false`. Nesta fundação, **sem realtime** — polling/refetch a
cada ~15s (mesmo princípio já usado no `PermissionService`); realtime fica para checkpoint futuro.
`NotificationToast` complementa o sino, mostrando número/título/prioridade do chamado quando o som
tocar.

**Alerta sonoro**: via `<audio>`/Web Audio — não exige permissão de browser (diferente de
notificação nativa, que usaria `Notification.requestPermission()`, API separada só relevante se
push de verdade for implementado). Respeita preferência do usuário (`som_ativo`) e só toca de forma
confiável após alguma interação prévia na página (autoplay policy dos navegadores).

**Preparação futura para e-mail e push**: e-mail é requisito obrigatório do módulo, mas entra numa
etapa posterior (Sprint 4.8) ao in-app (Sprint 4.5). Push fica preparado na arquitetura
(`ti_notificacoes_envios.canal IN ('email','push')`) sem implementação agora.

Tabelas: `ti_notificacoes`, `ti_preferencias_notificacao` (com atenção ao `UNIQUE` com
`tipo_evento` `NULL` — índices parciais `UNIQUE(profile_id) WHERE tipo_evento IS NULL` e
`UNIQUE(profile_id, tipo_evento) WHERE tipo_evento IS NOT NULL`, já que `UNIQUE` simples permite
múltiplas linhas `NULL` no Postgres), e `ti_notificacoes_envios` (log dos canais externos).

### 10. Permissões PBAC necessárias

Novo `resource: tickets`, mesmo padrão `resource.action` já usado no catálogo atual — nenhuma
mudança estrutural no PBAC:

`tickets.create`, `tickets.view_own`, `tickets.comment_own`, `tickets.view_team`,
`tickets.manage_team`, `tickets.triage`, `tickets.view_all`, `tickets.manage_all`,
`tickets.reports_view`, `tickets.settings_manage`, `tickets.notifications_view`,
`tickets.notifications_manage`, `tickets.time_start`, `tickets.time_log`, `tickets.time_edit`,
`tickets.time_view_team`, `tickets.time_reports_view`, `tickets.kb_view`, `tickets.kb_manage`.

**Matriz inicial**:
- Todos os papéis recebem: `tickets.create`, `tickets.view_own`, `tickets.comment_own`,
  `tickets.notifications_view`, `tickets.kb_view` (leitura da Base de Conhecimento — artigos
  publicados, seção 14).
- `admin` recebe todas as `tickets.*`.
- Permissões operacionais de agentes/coordenadores (triagem, gestão de equipe, tempo de terceiros,
  relatórios, `tickets.kb_manage` — criar/editar/publicar artigos e vincular solução) ficam
  disponíveis para overrides individuais via Centro de Permissões — quem tem cada uma é decidido lá
  (papel + overrides), não hardcoded por role.
- Participação em Infraestrutura/Sistemas continua definida em `ti_equipe_membros`, separada do que
  o usuário pode fazer.

### 11. Tabelas propostas

14 tabelas novas + 1 alteração em tabela existente (`user_profiles.tipo_vinculo`):

`ti_equipes`, `ti_equipe_membros`, `ti_categorias`, `ti_chamados`, `ti_chamado_comentarios`,
`ti_chamado_historico`, `ti_chamado_anexos`, `ti_chamado_tempos`, `ti_sla_regras`,
`ti_notificacoes`, `ti_preferencias_notificacao`, `ti_notificacoes_envios`, `ti_kb_artigos`,
`ti_chamado_kb_artigos`.

**Relacionamentos**:

```text
user_profiles ──< ti_equipe_membros >── ti_equipes
user_profiles ──< ti_chamados (solicitante_profile_id)
user_profiles ──< ti_chamados (responsavel_profile_id, nullable)
ti_equipes    ──< ti_chamados (equipe_id, nullable até triagem)
ti_categorias ──< ti_chamados (categoria_id)
ti_equipes    ──< ti_categorias (equipe_padrao_id)
ti_chamados   ──< ti_chamado_comentarios
ti_chamados   ──< ti_chamado_historico
ti_chamados   ──< ti_chamado_anexos >── ti_chamado_comentarios (nullable)
ti_chamados   ──< ti_chamado_tempos
ti_chamado_tempos ──< ti_chamado_historico (tempo_id, quando evento='tempo_trabalhado')
ti_notificacoes ──< ti_notificacoes_envios
ti_notificacoes ──> ti_chamados (chamado_id)
ti_sla_regras (catálogo por prioridade, sem FK de/para chamados — lido na criação/triagem)
ti_chamados   ──< ti_chamados (chamado_relacionado_id, auto-referência — reabertura pós-Fechado
                vira chamado novo, seção 1 item 11)
ti_categorias ──< ti_kb_artigos (categoria_id, nullable)
ti_chamados   ──< ti_kb_artigos (chamado_origem_id, nullable — proveniência de resolução virada
                artigo, seção 14)
ti_chamados   ──< ti_chamado_kb_artigos >── ti_kb_artigos (vínculo de solução, seção 14)
```

**Campos e constraints principais**:

- **`ti_equipes`**: `id uuid PK, nome text NOT NULL, codigo text NOT NULL, ativo bool NOT NULL
  DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()`. `UNIQUE(codigo)`.
- **`ti_equipe_membros`**: `equipe_id uuid NOT NULL REFERENCES ti_equipes(id), profile_id uuid NOT
  NULL REFERENCES user_profiles(id), coordenador bool NOT NULL DEFAULT false, ativo bool NOT NULL
  DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()`. `PRIMARY KEY (equipe_id,
  profile_id)`. Índice em `(profile_id)`.
- **`ti_categorias`**: `id uuid PK, nome text NOT NULL, equipe_padrao_id uuid NULL REFERENCES
  ti_equipes(id), ativo bool NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()`.
  `UNIQUE(nome)`.
- **`ti_chamados`**: `id uuid PK, numero_sequencial integer NOT NULL DEFAULT
  nextval('ti_chamados_numero_seq'), titulo text NOT NULL, descricao text, categoria_id uuid NOT
  NULL REFERENCES ti_categorias(id), equipe_id uuid NULL REFERENCES ti_equipes(id),
  prioridade_sugerida text NULL, prioridade text NOT NULL, status text NOT NULL DEFAULT 'aberto',
  solicitante_profile_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  responsavel_profile_id uuid NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  chamado_relacionado_id uuid NULL REFERENCES ti_chamados(id), primeira_resposta_em timestamptz,
  prazo_primeira_resposta_em timestamptz, prazo_resolucao_em timestamptz, sla_pausado_em timestamptz,
  sla_tempo_pausado_segundos integer NOT NULL DEFAULT 0, resolved_at timestamptz, closed_at
  timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL
  DEFAULT now()`. `UNIQUE(numero_sequencial)`. `CHECK (prioridade_sugerida IS NULL OR
  prioridade_sugerida IN ('baixa','media','alta','urgente'))`. `CHECK (prioridade IN
  ('baixa','media','alta','urgente'))`. `CHECK (status IN
  ('aberto','em_triagem','atribuido','em_atendimento','aguardando_solicitante','resolvido','fechado','reaberto','cancelado'))`.
  Número amigável formatado como `TI-000001`, gerado no banco via sequence — nunca calculado no
  frontend. `prioridade_sugerida` é preenchida pelo solicitante na abertura e nunca mais alterada —
  puramente informativa; `prioridade` é a oficial (ajustável pela triagem e por quem tiver
  permissão) e a única usada em cálculo de SLA (seção 4). `chamado_relacionado_id` aponta para o
  chamado anterior quando este nasce da reabertura de um chamado já **Fechado** (seção 1, item 11;
  seção 3) — sem cascade, é só referência informativa. `CHECK` no banco impede que um chamado
  aponte para si mesmo. **Regra obrigatória da RPC `ti_criar_chamado`** (a implementar): validar não
  só que o chamado apontado existe, mas que seu `status = 'fechado'` — o schema sozinho não expressa
  regra de estado, só existência e não-autorreferência.
- **`ti_chamado_comentarios`**: `id, chamado_id, autor_profile_id, mensagem, interno bool (nota
  só-TI, nunca visível ao solicitante), created_at`.
- **`ti_chamado_historico`**: `id, chamado_id, autor_profile_id uuid NULL (aceita NULL para eventos
  automáticos), origem text NOT NULL CHECK (origem IN ('usuario','sistema')), evento text NOT NULL,
  valor_anterior jsonb, valor_novo jsonb, tempo_id uuid NULL REFERENCES ti_chamado_tempos(id),
  created_at`. Eventos automáticos usam `origem = 'sistema'` e `autor_profile_id = NULL`. **Ordem na
  migration**: `ti_chamado_tempos` referencia `ti_chamados` e é referenciada por `tempo_id` aqui —
  criar `ti_chamado_tempos` antes de `ti_chamado_historico`, ou adicionar a FK `tempo_id` via `ALTER
  TABLE` depois de ambas existirem, para não travar em referência circular de criação.
- **`ti_chamado_anexos`**: `id, chamado_id, comentario_id NULL, storage_path, nome_arquivo,
  tamanho_bytes, tipo_mime`. Quando `comentario_id` aponta para um comentário com `interno = true`,
  o anexo herda a mesma visibilidade — também fica invisível ao solicitante. Não há flag `interno`
  duplicada nesta tabela: RLS/consulta fazem o JOIN com `ti_chamado_comentarios` para decidir
  visibilidade.
- **`ti_chamado_tempos`**: `id, chamado_id, agente_profile_id, iniciado_em, finalizado_em NULL,
  duracao_segundos, tipo CHECK (tipo IN ('automatico','manual')), descricao, criado_por, created_at,
  updated_at`. Regras reais impostas no banco (não `CHECK` sempre-verdadeiro): manual exige
  `duracao_segundos > 0` e descrição não vazia; manual não pode ser sessão aberta; automático aberto
  tem `finalizado_em NULL`; duração automática **sempre** recalculada no banco
  (`finalizado_em - iniciado_em`) dentro da própria RPC de encerrar — nunca aceita do cliente; índice
  único parcial garante no máximo **uma sessão automática aberta por agente em todo o sistema**.
  Lançamento em nome de outro agente (`criado_por != agente_profile_id`) exige `tickets.time_edit` e
  justificativa obrigatória, registrada no histórico via `tempo_id`; `tickets.time_log` sozinho só
  lança para o próprio agente.
- **`ti_sla_regras`**: `prioridade text PK/UNIQUE, minutos_primeira_resposta integer NOT NULL,
  minutos_resolucao integer NOT NULL, ativo bool NOT NULL DEFAULT true`. Valores configuráveis, não
  hardcoded no frontend.
- **`ti_notificacoes`**: `id, destinatario_profile_id, chamado_id NOT NULL, evento, lida bool NOT
  NULL DEFAULT false, created_at`. Índice parcial para não lidas por destinatário.
- **`ti_preferencias_notificacao`**: `profile_id, tipo_evento NULL (regra geral) ou específico,
  som_ativo bool, ...`. Índices parciais para o `UNIQUE` com `tipo_evento` (seção 9).
- **`ti_notificacoes_envios`**: `id, notificacao_id, canal text CHECK (canal IN
  ('email','push')), status text CHECK (status IN ('pendente','enviado','falhou')), tentativas,
  enviado_em, ultimo_erro, created_at, updated_at`. `UNIQUE(notificacao_id, canal)`.
- **`ti_kb_artigos`** (seção 14): `id uuid PK, titulo text NOT NULL, conteudo text NOT NULL
  (markdown), categoria_id uuid NULL REFERENCES ti_categorias(id) (reaproveita a mesma taxonomia de
  categorias de chamados — sem segunda taxonomia paralela), status text NOT NULL DEFAULT 'rascunho'
  CHECK (status IN ('rascunho','publicado','arquivado')), autor_profile_id uuid NOT NULL REFERENCES
  user_profiles(id) ON DELETE RESTRICT, chamado_origem_id uuid NULL REFERENCES ti_chamados(id) ON
  DELETE SET NULL (proveniência, quando o artigo nasce de uma resolução — seção 14), busca tsvector
  gerada a partir de `titulo`+`conteudo` (`to_tsvector('portuguese', ...)`, coluna `GENERATED ALWAYS
  ... STORED`) com índice GIN, created_at, updated_at`. Apenas `status = 'publicado'` aparece em
  busca/sugestão.
- **`ti_chamado_kb_artigos`**: `chamado_id uuid NOT NULL REFERENCES ti_chamados(id), artigo_id uuid
  NOT NULL REFERENCES ti_kb_artigos(id), criado_por uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()`. `PRIMARY KEY (chamado_id, artigo_id)` — mesmo
  padrão de chave composta já usado em `ti_equipe_membros`. Vínculo de solução: um chamado resolvido
  pode apontar para um ou mais artigos que descrevem a solução aplicada.

### 12. Rotas, componentes e serviços

- **Rotas**: `/ti` (fila — visão muda conforme permissão), `/ti/novo`, `/ti/:id` (detalhe),
  `/ti/relatorios`, `/ti/configuracoes`, `/ti/base-conhecimento` (listagem/busca) e
  `/ti/base-conhecimento/:id` (artigo). Item de **macro módulo próprio** no `moduleRegistry.js` —
  não dentro de Administração, já que atende todos os setores.
- **Serviços**: `ticketsService`, `ticketCommentsService`, `ticketAttachmentsService` (reaproveita o
  padrão de upload já usado em `GiftImageUploader`), `ticketHistoryService`, `ticketReportsService`,
  `ticketKbService` (busca, CRUD de artigo, vínculo de solução, seção 14).
- **Componentes**: `TicketList`, `TicketStatusBadge`, `TicketPriorityBadge`, `TicketDetail`,
  `TicketForm`, `TicketAssignSelector`, `TicketFilters`, `NotificationBell` e `NotificationToast`
  (em `shared/components/`, seção 9), `KbArticleList`, `KbArticleDetail`, `KbArticleForm`,
  `KbSuggestions` (usado dentro de `TicketForm` — seção 14).
- **Hooks**: `useTickets`, `useTicket`, `useTicketComments`, `useKbArticles`, `useKbSuggestions`.
- Segue exatamente a estrutura de pastas já usada em `gifts`/`fairs`/`permissions`.

### 13. Riscos e decisões pendentes

- Calendário de SLA (minutos corridos vs. horário comercial, incluindo finais de semana e
  feriados): decisão adiada — a estrutura (`ti_calcular_prazo_sla` isolada) não pode impedir adotar
  horário comercial/calendário de feriados depois (seção 6).
- Alvos de SLA por prioridade (seção 4): valores propostos, não validados com o time de TI —
  confirmar na Sprint 4.1.
- Preservação de histórico de usuários: `ON DELETE RESTRICT` em referências a `user_profiles` a
  partir de `ti_chamados`/`ti_chamado_comentarios`/`ti_chamado_tempos` — usuários com chamados
  associados não são excluídos fisicamente, apenas desativados. Impacto a documentar no fluxo de
  Administração de Usuários quando a Sprint 4.1 tocar nesse ponto.
- **Requisito obrigatório da Sprint 4.6 (anexos)**: a RLS de `ti_chamado_anexos` protege só a linha
  de metadado — **não protege o arquivo físico no Storage**. O bucket usado precisa ser **privado**
  (nunca público), com policies próprias em `storage.objects`, e o download só pode acontecer via
  **URL assinada (signed URL)** emitida sob demanda por uma RPC/Edge Function que revalida a mesma
  regra de visibilidade da RLS antes de assinar — nunca confiar que a linha de metadado oculta
  impede acesso direto ao objeto pelo `storage_path`.
- **Alteração de prioridade após a triagem** (encontrado no Checkpoint 3 de RPCs, Sprint 4.1): hoje
  só `ti_triagem_chamado` toca `prioridade`, e só funciona em status `aberto`/`em_triagem` — depois
  de atribuído não há como mudar a prioridade, apesar da seção 1 (item 7) descrever isso como ação
  separada, disponível a quem tem `tickets.manage_team`/`manage_all`. Precisa de uma RPC própria
  (`ti_alterar_prioridade` ou similar) — candidata natural da Sprint 4.3 (central de atendimento).
- **Reatribuição com cronômetro aberto** (idem): `ti_atribuir_chamado` reatribui um chamado
  `em_atendimento` sem fechar a sessão de tempo aberta do agente anterior (ela fica órfã, ligada ao
  chamado, não ao responsável atual) — só é pega depois, quando `ti_mudar_status` bloqueia resolver
  com cronômetro aberto. Decisão registrada: **preferir bloquear a reatribuição** enquanto houver
  cronômetro aberto (mesma filosofia já usada pra resolver, seção 1 item 10), em vez de encerrar
  automaticamente — a implementar quando `ti_atribuir_chamado` for revisitado.
- **Notificação de comentário envolvendo terceiros** (idem): `ti_comentar_chamado` hoje só notifica
  em par binário (solicitante ↔ "a outra parte") — se um colega comenta e não é o responsável
  atribuído, o responsável não é notificado diretamente. Melhoria a considerar na Sprint 4.5
  (notificações in-app), não implementada agora.
- **Parametrização do prazo de reabertura** (idem): os 7 dias usados por `ti_mudar_status` (seção 1,
  item 11) continuam hardcoded na RPC, diferente do SLA por prioridade (que já vive em
  `ti_sla_regras`, configurável). Candidato a virar configurável numa sprint futura de
  catálogo/configurações (Sprint 4.10), não decidido agora.

### 14. Base de Conhecimento de TI (Sprint 4.9)

- **Artigos** (`ti_kb_artigos`, seção 11): título, conteúdo em markdown, categoria (reaproveita
  `ti_categorias` — seção 5 — em vez de criar uma segunda taxonomia paralela), status
  (rascunho/publicado/arquivado — só publicado aparece em busca/sugestão), autor e timestamps.
- **Categorias**: as mesmas de `ti_categorias`; `categoria_id` em `ti_kb_artigos` é nullable porque
  um artigo pode ser transversal a mais de uma categoria ou não se encaixar em nenhuma.
- **Busca**: full-text search em português (`to_tsvector` sobre título+conteúdo, coluna gerada,
  índice GIN), exposta via RPC `ti_kb_buscar_artigos(termo, categoria_id opcional)` que só retorna
  artigos `status = 'publicado'`.
- **Sugestão de artigos na abertura**: enquanto o solicitante preenche categoria/título/descrição em
  `TicketForm`, o frontend chama a mesma RPC de busca (ranqueada por `ts_rank`) filtrando pela
  categoria selecionada, exibindo os artigos mais relevantes antes do envio. É só uma sugestão —
  nunca bloqueia a abertura do chamado.
- **Vínculo de solução**: ao resolver um chamado, o agente pode vincular um ou mais artigos
  publicados como a solução aplicada, via `ti_chamado_kb_artigos` (seção 11) — gera evento
  `artigo_vinculado` em `ti_chamado_historico`.
- **Transformação de resolução em artigo**: a partir de um chamado resolvido, o agente pode criar um
  novo artigo pré-preenchido com título/descrição/comentários do chamado, mantendo
  `chamado_origem_id` como proveniência (seção 11). O artigo nasce sempre em **rascunho** — nunca é
  publicado automaticamente a partir da resolução, precisa de publicação explícita.
- **Permissões**: leitura (`tickets.kb_view`) é baseline para todos que podem abrir chamado; escrita
  e publicação (`tickets.kb_manage`) seguem o mesmo modelo de overrides individuais via Centro de
  Permissões usado pelas demais permissões operacionais do módulo (seção 10).
- Sem versionamento de conteúdo nesta fundação — histórico de edições de artigo fica para depois, se
  necessário.

### 15. Próximo passo

Sprint 4.1 — Fundação do banco, RLS, RPCs e permissões: migration de fundação + rollback completo +
atualização planejada do `schema.sql` + seeds de equipes/categorias/SLA/catálogo de permissões, tudo
em rascunho local, sem aplicar no Supabase até confirmação explícita.

### 16. Sprint 4.2 — Portal do Solicitante (MVP)

Aplicada e validada em Supabase HML (branch `feat/ti-tickets-solicitante`). Não enviada para
produção isoladamente — permanece em HML como base para as Sprints 4.3 e 4.4.

**Escopo entregue**: dashboard com contadores por status (aberto/em andamento/concluído), abertura
de chamado, "Minha Lista" com busca e ordenação (mais recentes/mais antigos/prioridade/atualização),
detalhe de chamado com timeline pública e envio de comentário.

**Rotas**: `/ti` (dashboard + lista), `/ti/novo` (abertura), `/ti/:id` (detalhe). Nunca `/tickets` —
só o caminho de pasta do módulo (`src/modules/tickets/`) usa esse nome em inglês.

**Estrutura React** (`src/modules/tickets/`):
- `services/ticketsService.js` — `getCategories`, `createTicket`, `getMyTickets`, `getTicket`,
  `getComments`, `addComment`, `getDashboardStats`.
- `hooks/useTickets.js` — lista + stats + filtro/busca/ordenação, no mesmo padrão de `useFairs.js`.
- `components/` — `TicketStatusBadge` (+ `TicketPriorityBadge`), `TicketCard`, `TicketTimeline`,
  `TicketCommentBox`, `TicketFilters`, `TicketStats`.
- `pages/` — `TicketsDashboard`, `TicketCreate`, `TicketDetails`.
- Permissões novas em `src/modules/permissions/constants/permissions.js`
  (`TICKETS_CREATE`, `TICKETS_VIEW_OWN`, `TICKETS_COMMENT_OWN`, `TICKETS_NOTIFICATIONS_VIEW`,
  `TICKETS_KB_VIEW`) — catálogo `tickets.*` existe só no banco (seed da Sprint 4.1), por isso não
  entram em `ROLE_PERMISSIONS` (fallback estático), mesmo tratamento já dado a
  `PERMISSIONS_VIEW/MANAGE/AUDIT_VIEW`. Módulo registrado em `moduleRegistry.js` como
  `it-tickets` ("Chamados de TI"), ícone `LifeBuoy`.

**Decisões de arquitetura (menor risco, sem alterar schema aprovado na Sprint 4.1)**:
- **Categoria**: reaproveita `ti_categorias` tal como seedada — nenhuma renomeação ou taxonomia
  paralela criada no frontend.
- **Equipamento**: campo pedido na especificação mas sem coluna própria em `ti_chamados`. Em vez de
  nova migration, o frontend embute o valor como as duas primeiras linhas de `descricao`
  (`montarDescricao()` em `ticketsService.js`) — reversível sem custo de schema quando/se a Sprint
  4.3 justificar uma coluna dedicada.
- **Timeline pública**: montada só com dados que o solicitante já pode ler via RLS — criação,
  comentários públicos (`ti_chamado_comentarios` já filtra os internos) e resolução/fechamento. Não
  depende de `ti_chamado_historico` (solicitante não tem permissão de leitura ali) nem de
  `ti_notificacoes` (removido depois do teste manual em HML — ver "Bug encontrado" abaixo); estado
  atual (em andamento, aguardando você etc.) aparece só no badge de status, não como entrada de
  timeline.

**Teste manual em HML — aprovado**: módulo abre e navega normalmente; criação de chamado funciona
fim a fim (RPC corrigida, ver abaixo); toast de sucesso e redirecionamento para `/ti`; contadores
atualizados; chamado listado e detalhe carregado em `/ti/:id`; equipamento exibido corretamente a
partir da descrição; timeline pública mostrando criação; comentário público criado e refletido na
timeline; nenhuma informação interna de TI exposta ao solicitante.

**Bug encontrado e corrigido — `ti_criar_chamado`**: o primeiro teste manual real em HML falhou com
`400 Bad Request` / `column "id" does not exist` ao abrir um chamado. Causa raiz:
`public.ti_profiles_with_permission(p_code TEXT)` retorna `SETOF UUID` (tipo escalar) — usada em
`FROM` sem alias, a única coluna do resultado herda o **nome da própria função**, nunca `id`. A
notificação de novo chamado fazia exatamente isso:
```sql
SELECT id, v_chamado_id, 'novo_chamado' FROM public.ti_profiles_with_permission('tickets.triage');
```
Corrigido com alias explícito de coluna, nos três arquivos (migration de fundação, `schema.sql` e
o patch dedicado):
```sql
SELECT destinatarios.profile_id, v_chamado_id, 'novo_chamado'
FROM public.ti_profiles_with_permission('tickets.triage') AS destinatarios(profile_id);
```
Verificado (grep completo no projeto) que este é o único ponto de chamada afetado: o uso análogo em
`ti_triagem_chamado` (`FROM ti_profiles_in_equipe(p_equipe_id) AS profile_id`) já é válido — pra uma
SRF escalar, `AS profile_id` sem lista de colunas faz o alias da relação dobrar como nome de coluna
(mesmo idioma de `SELECT n FROM generate_series(1,5) AS n`); e `ti_atribuir_chamado`/
`ti_comentar_chamado` não chamam nenhuma das duas funções.

Patch idempotente criado especificamente para a correção:
`supabase/migrations/20260729120000_fix_ti_criar_chamado_notificacao_alias.sql` — contém só o
`CREATE OR REPLACE FUNCTION public.ti_criar_chamado(...)` corrigido (mesma assinatura), os
`REVOKE`/`GRANT` originais e `NOTIFY pgrst, 'reload schema'`. Aplicado e validado **somente em
HML**, dentro de transação, com conferência via `pg_get_functiondef` antes do commit; produção não
foi tocada.

**Pendências**:
- Responsividade ainda não testada em dispositivo móvel real (só breakpoints CSS via
  `@media`/redimensionamento de janela no navegador).
- Isolamento por RLS não testado manualmente com dois usuários solicitantes distintos logados ao
  mesmo tempo (checagem feita, até aqui, por leitura de política + teste com um usuário por vez).
