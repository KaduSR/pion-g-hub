# Rollout progressivo do Controle de Acesso Setorial (PR A)

GATE 5.2G.3B. Documenta a decisão arquitetural de repartir o PR #35 em
entregas menores e seguras, e o estado desta primeira parte (PR A —
fundação).

## PR #35 — estado e propósito

O PR #35 (`hotfix/access-control-organizational-roles-v2` → `main`)
**permanece aberto e intocado**, como referência de integração. Ele
**não será mesclado no formato atual** — decisão explícita de Nícolas
(GATE 5.2G.3B). Contém, validado e testado localmente e em HML:
Controle de Acesso Organizacional V2, Setor-Driven V3 (incluindo o
cutover destrutivo de permissões globais de `gestor`/`executivo`), dois
hotfixes, Grupos de Acesso V1, fundação de Customer Success, a ponte de
compatibilidade de deploy, e o backup read-only da Edge Function
`admin-auth` operacional.

Ele continua sendo a fonte de VERDADE do desenho já aprovado — nada da
lógica ali foi invalidado. O que mudou foi a estratégia de ENTREGA: em
vez de um único merge que aplica 7 migrations de uma vez (incluindo um
cutover destrutivo sem backfill de usuário real, achado no GATE
5.2G.3A), a entrega é repartida em 4 partes independentes,
sequenciadas.

## Separação em 4 entregas

1. **PR A — Fundação compatível e não disruptiva** (este documento).
   Branch local `refactor/access-control-staged-rollout-v1`, worktree
   isolado, a partir de `origin/main` (`73c2cb5`). Migration nova
   (`20260901000000_sector_access_foundation_staged.sql`), sem tocar em
   nenhum objeto pré-existente além de 2 linhas novas em `roles`.
2. **Gate operacional — inventário e mapeamento nominal dos usuários.**
   Depende do PR A já aplicado (a RPC de preparação só existe depois
   dele). Executa `admin_prepare_user_sector_access_v1` para os 33
   usuários reais de PROD, popula `user_setor_vinculos`/
   `user_role_staging` — sem alterar `user_profiles` e sem alterar
   nenhum acesso efetivo (ver invariante abaixo). Consome o inventário
   somente-leitura (`supabase/preflight/legacy_prod_inventory_readonly.sql`)
   e a matriz de conversão (GATE 5.2G.3A, Etapa 6).
3. **PR B — Cutover setorial protegido por precondições.** Só
   autorizado depois que `admin_validate_sector_cutover_readiness()`
   retornar `ready=true` para 100% dos usuários reais. Contém: o
   cutover destrutivo (as 2 `DELETE FROM role_permissions` da V3,
   agora precedidos por `RAISE EXCEPTION` se `ready=false`), a migração
   de `user_role_staging`→`user_profiles.role` real, `has_effective_permission()`
   passando a consultar `setor_role_permissions`, o hardening final
   (`atendimento.access`, `permissions.universal`), e o deploy da Edge
   Function nova (contrato `setorPrincipalId`/`setorIdsAdicionais`).
4. **CS separado.** `cs_foundation.sql`/`cs_foundation_hardening.sql`
   podem ser aplicadas em qualquer momento deste runbook, isoladamente
   — comprovado no GATE 5.2G.3A que não há dependência em nenhuma
   direção entre CS e Controle de Acesso.

## Estado de HML

**Atualizado no GATE 5.2G.4B — PR A já foi aplicada em HML.** HML
recebeu primeiro a V3 combinada (V2+V3+hotfixes+Grupos de Acesso, a
implementação ORIGINAL/integrada que o PR #35 representa) e, depois,
em 2026-09-01 (GATE 5.2G.4B), a migration
`20260901000000_sector_access_foundation_staged.sql` (SHA-256
`46f54a6cf26c31b9303cc4dbe3bad7f1bf62b88684dbbbdb64af990e6219b013`,
congelado — nunca editar este arquivo) foi aplicada **sobre** essa base
já adiantada, via `supabase db push --linked` a partir de um diretório
temporário isolado contendo as 24 migrations (as 23 já aplicadas +
esta). Resultado real, comprovado por `diff` completo do schema antes/
depois: 3 tabelas novas (`user_role_staging`,
`user_sector_access_preparation_log`, `private.staged_foundation_delta`)
e 3 RPCs novas criadas; zero linha inserida em qualquer uma das 5
tabelas compartilhadas com V2/V3; zero função/policy V2/V3 alterada;
delta de ACL intencional já registrado na seção anterior.

Isso significa que o "cenário adiantado" testado localmente em Docker
(GATE 5.2G.3B/3C/3D) **deixou de ser hipotético** — é, agora, o estado
real de HML. Não presumir mais que HML precisa ser "reconciliado" para
representar essa sequência: ele já a representa.

**Gate operacional (mapeamento nominal dos 33 usuários reais) e PR B
(cutover) permanecem não autorizados e não executados** — a fundação
aplicada é puramente estrutural/inerte, sem nenhum vínculo nominal real
criado por ela (só o 1 vínculo pré-existente de V2/V3, intocado).

## Invariante de delta zero da fundação (PR A)

**GATE 5.2G.4C — precisão sobre o que "delta zero" significa.** Desde a
aplicação real da migration em HML (GATE 5.2G.4B), esta seção não
afirma mais "zero delta" de forma absoluta — afirma **zero delta
funcional/operacional de acesso**, distinto de um **delta de segurança
de banco (ACL) intencional**, documentado na seção seguinte. A frase
anterior ("delta zero", sem qualificação) presumia que `REVOKE ALL`/
`GRANT` nas 5 tabelas compartilhadas com V2/V3 convergiam sempre para o
mesmo estado que já existia — essa suposição não foi verificada contra
o HML real antes da aplicação e se mostrou parcialmente incorreta (ver
"Delta de segurança do banco (ACL)", abaixo). Nenhum dos itens abaixo
(permissão efetiva, papel, vínculo, policy ou função de negócio) deixou
de ser verdadeiro — a ressalva é exclusivamente sobre grants de
manutenção (`REFERENCES`/`TRIGGER`/`TRUNCATE`/`MAINTAIN`), nunca
exercidos pela aplicação.

**Aplicar `20260901000000_sector_access_foundation_staged.sql`, sem
chamar `admin_prepare_user_sector_access_v1()`, produz zero alteração
funcional/operacional de acesso efetivo de qualquer usuário
existente.** Comprovado (não
presumido) via `supabase/tests/sector_access_foundation_staged_test.sql`,
rodado num container Docker descartável (`public.ecr.aws/supabase/postgres:15.8.1.049`):
snapshot de permissões efetivas de 4 papéis legados simulados
(admin/gestor/marketing/vendedor) antes e depois da migration — 26
asserções, todas passando, incluindo:

- Contagem e conjunto exato de códigos de permissão de cada papel
  legado, idênticos antes/depois.
- `total_roles` aumenta em exatamente 2 (`executivo`/`operador`),
  nenhum usuário real assume nenhuma delas.
- Policies e grants de `user_profiles` para `authenticated`,
  idênticos antes/depois.
- Corpo de `is_permissions_admin()`/`has_effective_permission()`
  byte-a-byte idêntico antes/depois (nenhuma das duas é tocada pela
  migration).
- `user_setor_vinculos` nasce vazia (nenhum vínculo nominal criado
  pela migration em si).
- Chamar a RPC de preparação num perfil real simulado (staging +
  vínculo) não altera NENHUMA permissão efetiva desse perfil, e
  `user_profiles.role` permanece exatamente como estava.

Por que isso é garantido por construção, não por sorte: toda tabela
nova (`setores`, `user_setor_vinculos`, `setor_modulos`, `modulos`,
`setor_role_permissions`, `user_role_staging`,
`user_sector_access_preparation_log`) é nova, e nenhuma delas é lida
por `has_effective_permission()`/`is_permissions_admin()`/
`is_own_or_team_lead()` — confirmado por busca textual antes de
escrever a migration. As 2 roles novas (`executivo`/`operador`) não
correspondem a nenhum `user_profiles.role` existente hoje, porque o
CHECK constraint de `user_profiles.role` **não é alterado** por esta
migration (permanece `admin`/`marketing`/`gestor`/`vendedor`) — só o PR
B, no cutover, amplia esse CHECK.

### Delta operacional (permanece zero)

Confirmado por leitura de código e por aplicação real em HML (GATE
5.2G.4B):

- Nenhum perfil alterado.
- Nenhuma role atribuída a um usuário real.
- Nenhum vínculo setorial criado.
- Nenhuma permissão efetiva alterada, para ninguém.
- Nenhuma policy V2/V3 alterada (comprovado por `diff` completo do
  schema de HML antes/depois da aplicação — zero linha de policy nas
  500 linhas de diferença).
- Nenhuma função V2/V3 alterada (mesma prova).
- Nenhum registro de negócio alterado — `user_setor_vinculos` (1 linha
  real pré-existente), `access_groups`, `cs_clientes`, feiras, leads,
  brindes: contagens idênticas antes/depois.
- Nenhuma mudança de menu ou módulo (a fundação não altera
  `list_visible_modules_v3`, nunca chamada por ela).

### Delta de segurança do banco (ACL) — intencional (GATE 5.2G.4C)

**Existe e é mantido deliberadamente**, decisão expressa de Nícolas
após o achado do GATE 5.2G.4B: a aplicação em HML revelou que
`REVOKE ALL ... FROM anon` (nas 5 tabelas compartilhadas com V2/V3:
`setores`/`modulos`/`setor_modulos`/`setor_role_permissions`/
`user_setor_vinculos`) e `REVOKE ALL ... FROM anon, authenticated`
(especificamente em `setor_role_permissions`/`user_setor_vinculos`)
removeram privilégios de manutenção que V2/V3 haviam concedido:

- `anon` perdeu `REFERENCES`, `TRIGGER`, `TRUNCATE`, `MAINTAIN` nas 5
  tabelas.
- `authenticated` perdeu os mesmos 4 privilégios em
  `setor_role_permissions`/`user_setor_vinculos` especificamente
  (manteve `SELECT`).

**Não restaurados.** Justificativa (aprovada expressamente): nenhum
desses 4 privilégios é necessário ao frontend, usado pelo PostgREST no
fluxo normal da aplicação, necessário para `SELECT`/`INSERT`/`UPDATE`/
`DELETE` sob RLS, ou utilizado por qualquer função/fluxo identificado —
eles apenas ampliavam a superfície de banco sem necessidade,
incluindo `TRUNCATE` para `anon` (que nunca deveria fazer parte da
postura de segurança do sistema). `service_role`, policies, funções
V2/V3, dados e contagens não foram afetados. Escrita administrativa
nas tabelas internas continua ocorrendo exclusivamente pelas RPCs
`SECURITY DEFINER` desta fundação, com validação administrativa,
search path fixo e auditoria.

A frase "zero delta de grants" não deve mais ser usada para descrever
esta migration — a formulação correta é:

> Zero alteração funcional/operacional de acesso; ACLs de banco
> convergidas intencionalmente para privilégio mínimo.

## Diferença deliberada em relação a V2/V3

A fundação vai direto ao modelo canônico FINAL da V3
(`admin`/`executivo`/`gestor`/`operador`), sem recriar o desvio
intermediário do V2 (`admin_ti`/`coordenador`), porque nenhuma das duas
foi jamais aplicada em PROD (GATE 5.2G.3A) — não existe usuário real a
preservar nesse desvio. O catálogo de 22 setores é semeado diretamente
(sem a reconciliação de duas fases que V2→V3 precisou fazer, porque
aqui não há seed intermediário de V2 já aplicado a reconciliar).

## Achado crítico de atomicidade (Etapa 10, cenário 4)

Nenhuma das 7 migrations do PR #35 tem `BEGIN`/`COMMIT` explícito —
presumia-se que o runner (`supabase db push`) as envelopa numa
transação implícita por arquivo. **Testado agora, diretamente**: `psql
-f arquivo.sql` sem `BEGIN`/`COMMIT` explícito **não é atômico** — uma
falha no meio do arquivo deixa os objetos criados antes dela intactos
(reproduzido isolando uma migration com uma falha injetada
deliberadamente). Um teste complementar confirmou que múltiplos
statements enviados como **uma única mensagem de protocolo** (`psql -c
"stmt1; stmt2_falha; stmt3"`) SÃO tratados pelo Postgres como uma
transação implícita — a diferença está em como o arquivo é
transmitido ao servidor, não numa regra do Postgres em si.

**Não foi possível verificar, dentro do escopo deste gate, se
`supabase db push` transmite o arquivo inteiro como uma única
mensagem (atômico) ou statement-a-statement como `psql -f` (não
atômico).** Em vez de presumir, a nova migration desta fundação
(`20260901000000_sector_access_foundation_staged.sql`) foi tornada
explicitamente atômica (`BEGIN;`/`COMMIT;` no próprio arquivo),
eliminando a dependência dessa suposição não verificada — reproduzido
com sucesso: uma falha injetada deliberadamente agora resulta em
`ROLLBACK` real, zero objeto novo remanescente.

**As 7 migrations existentes do PR #35 não foram alteradas por este
achado** (congeladas, fora do escopo deste gate). Fica registrado como
risco a investigar antes de autorizar a aplicação delas a PROD —
recomendação: verificar o código-fonte do `supabase db push` (ou
testar deliberadamente, num Docker isolado, uma falha induzida no meio
de uma dessas 7 migrations) antes do gate de aplicação real.

## Compatibilidade de `setor_modulos` com V2/V3 — achado crítico (GATE 5.2G.4D)

A Parte 3 da migration congelada insere em `public.setor_modulos` só
`(setor_id, modulo_id)` — nunca a coluna legada `modulo` (`TEXT NOT
NULL` na estrutura real de V2/V3, confirmada via `git show
hotfix/access-control-organizational-roles-v2:supabase/migrations/20260827000000_sector_driven_access_v3.sql`
e via dump real de HML). Isso é seguro em 3 dos 4 estados possíveis do
ambiente-alvo e quebra atomicamente (sem corrupção) no quarto:

| Estado do ambiente                  | Aplicação da migration frozen  |
| ------------------------------------ | ------------------------------ |
| Tabelas V2/V3 ausentes (`SAFE_CLEAN_BASELINE`) | Permitida |
| Estrutura da própria fundação já criada (`SAFE_FOUNDATION_SCHEMA`) | Permitida/idempotente |
| V2/V3 completo, 9 pares presentes (`SAFE_ADVANCED_COMPLETE`) | Permitida/idempotente (zero INSERT novo) |
| V2/V3 parcial, `modulo` `NOT NULL`, falta ≥1 par (`BLOCKED_PARTIAL_ADVANCED`) | **Bloqueada pelo preflight** |

**HML (`tljscgsaqofgrfbjuyif`) estava em `SAFE_ADVANCED_COMPLETE`** no
momento da aplicação real (GATE 5.2G.4B) — por isso o `INSERT` da Parte
3 executou zero linha nova ali (confirmado: `setor_modulos` permaneceu
com a mesma contagem antes/depois), e a migration nunca chegou a
violar a constraint. **PROD (`uginlvintfslfbsfgugq`), pelo preflight já
realizado (GATE 5.2G.3A/GATE 5.2G.4D), está em `SAFE_CLEAN_BASELINE`**
— nenhuma das tabelas (`setores`/`modulos`/`setor_modulos`/
`setor_role_permissions`/`user_setor_vinculos`) existe lá hoje, então a
mesma classe de falha não pode ocorrer numa eventual aplicação futura a
PROD no estado atual dele.

A limitação **não causou, e não pode causar, corrupção ou estado
parcial**: o `INSERT` que violaria `NOT NULL` está dentro da mesma
transação `BEGIN;`/`COMMIT;` de toda a migration (atomicidade já
comprovada, ver achado acima) — uma violação aborta a migration
inteira, o ambiente permanece exatamente como estava antes de qualquer
tentativa de aplicação, nunca em estado intermediário.

**GATE 5.2G.4D, Etapa 6 — nenhum rollback é acionado por este
cenário.** Se a violação `NOT NULL` ocorrer (ambiente
`BLOCKED_PARTIAL_ADVANCED` não barrado a tempo pelo preflight), o
próprio `ROLLBACK` implícito do Postgres ao abortar a transação já
desfaz tudo — nenhum dos 2 scripts de rollback desta fundação
(`sector_access_foundation_staged_rollback_empty.sql`/
`sector_access_foundation_staged_contingency_with_data.sql`) precisa ou
deve ser executado nesse caso (não há nada a reverter: a migration
nunca chegou a `COMMIT`). A correção do próprio ambiente (completar as
combinações faltantes de `setor_modulos`, ou decidir uma estratégia
diferente) exige um gate de segurança próprio e explícito — nunca deve
ser feita por improviso preenchendo dados, relaxando a constraint `NOT
NULL` ou alterando a migration congelada. Por esse motivo, a lógica dos
2 arquivos de rollback desta fundação não precisou (e não deve) ser
alterada por causa deste achado.

**Qualquer ambiente futuro (incluindo uma eventual reaplicação a um
HML recriado, ou a um PROD que já tenha adquirido V2/V3 por outro
caminho antes do cutover) deve rodar o preflight
`supabase/preflight/legacy_prod_inventory_readonly.sql` antes desta
migration** — a seção "COMPATIBILIDADE SETOR_MODULOS — FUNDAÇÃO
STAGED" adicionada nele (GATE 5.2G.4D) classifica o ambiente nos 4
estados acima e bloqueia com `RAISE EXCEPTION` (código de saída
não-zero via `psql -v ON_ERROR_STOP=1`) quando `BLOCKED_PARTIAL_ADVANCED`
— sem nunca inserir a combinação faltante, preencher `modulo`, relaxar
a constraint ou criar a tabela por conta própria.

**A migration congelada (SHA-256
`46f54a6cf26c31b9303cc4dbe3bad7f1bf62b88684dbbbdb64af990e6219b013`) não
foi, e não deve ser, editada para ampliar essa compatibilidade** — a
mitigação é o preflight bloqueando a aplicação num ambiente incompatível,
nunca uma alteração retroativa no arquivo já aplicado em HML.

## Smoke manual em HML (GATE 5.2G.4E)

Smoke manual executado por Nícolas, direto no navegador, sessão própria
(nenhum token/JWT compartilhado com o agente). Ambiente: `piong-hub-hml`
(project ref `tljscgsaqofgrfbjuyif`), 2026-09-02. Nenhuma senha, e-mail,
UUID ou credencial registrada aqui.

| # | Item | Resultado |
| - | ---- | --------- |
| 1 | Login administrativo / `/areas` | PASS |
| 2 | Centro de Permissões | PASS |
| 3 | Captação | PASS |
| 4 | Autoatendimento | PASS |
| 5 | Operador restrito (só áreas autorizadas, sem Administração) | PASS |
| 6 | Erro ou comportamento estranho | Nenhum encontrado — PASS |

Nenhum formulário de escrita foi utilizado durante o smoke (só
navegação/leitura). Confirmado por leitura somente-leitura pós-smoke
(`supabase inspect db table-stats --linked`, GATE 5.2G.4E): todas as
contagens permaneceram bit-a-bit idênticas às de antes do smoke —
`user_role_staging=0`, `user_sector_access_preparation_log=0`,
`private.staged_foundation_delta=2`, `user_setor_vinculos=1`,
`roles=8`, `setores=26`, `modulos=9`, `setor_modulos=10`,
`setor_role_permissions=87`, `user_profiles=4`, `permissions=72`,
`role_permissions=224`. Só os contadores de leitura (`seq_scans`)
subiram nas tabelas navegadas — evidência de que o smoke realmente
exercitou consultas reais, sem gravar nada novo. Nenhuma preparação
(`user_role_staging`/`user_sector_access_preparation_log`) foi
registrada durante o smoke.

**Dados preexistentes no HML** — usuários, grupos, feiras, vínculos e
dados de CS de teste encontrados no HML são anteriores à Fundação
Staged. Permanecem intactos e não fazem parte da limpeza desta PR.
Qualquer revisão dessas fixtures deverá ocorrer em gate próprio e
separado. As 2 linhas de `private.staged_foundation_delta` não são
dado de teste/seed a limpar — são metadados técnicos obrigatórios de
propriedade e rollback desta fundação, e devem permanecer.

## Precondições do futuro cutover (PR B)

`admin_validate_sector_cutover_readiness()` (criada por esta
fundação, nunca chamada por ela) precisa retornar `ready=true` antes
de o PR B poder conter o `DELETE FROM role_permissions`. Critérios
(replicados da função, comprovados por teste):

- Cobertura de 100% dos usuários ativos não-administradores com
  vínculo setorial ativo.
- Zero vínculo órfão.
- Zero gestor/operador preparado sem setor principal.
- Zero papel legado pendente de preparação (toda linha ativa
  não-admin tem uma linha em `user_role_staging`).
- Zero usuário que ficaria sem nenhum módulo funcional após o
  cutover.
- Zero ganho indevido de privilégio (campo presente na função,
  reavaliado com lógica própria pelo PR B — nesta fundação é sempre
  vazio por construção, já que nada aqui altera acesso efetivo).

A migration de cutover (PR B) deve consultar esta função e emitir
`RAISE EXCEPTION` antes de qualquer `DELETE`/`REVOKE` se `ready=false`
— não implementado neste gate (fora do escopo).

## Contrato frontend × banco × Edge Function

Confirmado (GATE 5.2G.3A) que os três componentes formam um contrato
de 3 pontas, não revertíveis independentemente. Para esta fundação
especificamente: **nenhuma mudança de frontend é necessária.** O
frontend de `origin/main` (`73c2cb5`) não chama nenhuma RPC nova (usa
consulta direta a `roles`/`role_permissions`/`user_permissions` via
`permissionService.js` legado, confirmado por leitura de código) — a
migration desta fundação não altera nenhum objeto que esse frontend
consulta. A ordem segura para o PR B (deploy da Edge Function nova
só depois das migrations que introduzem seu novo contrato) permanece
válida e documentada no GATE 5.2G.3A, §9 (Fase 6 do runbook).

## Impacto para a futura extração em microserviços

`setor_role_permissions`/`user_setor_vinculos`/`modulos` seguem o
mesmo padrão de tabela de domínio já usado pelo restante do PBAC
(`role_permissions`/`user_permissions`) — nenhuma acoplagem nova a
`cs-service`/`api-gateway` foi introduzida (confirmado: zero
referência cruzada). `admin_prepare_user_sector_access_v1`/
`admin_validate_sector_cutover_readiness` são RPCs Postgres puras,
sem dependência de Edge Function — consistente com o padrão já
estabelecido de que a Edge Function `admin-auth` é um eixo de deploy
independente (documentado desde a ponte de compatibilidade, GATE
5.2G.1).

## Decisão final de privilégios das 3 funções (GATE 5.2G.3D)

`SECURITY DEFINER` nunca é justificado por "proteção contra mudança
futura de RLS" — essa framing (usada num relatório de gate anterior,
nunca persistida em nenhum arquivo) foi rejeitada explicitamente.
Decisão final, função a função, com a dependência concreta que a
sustenta:

| Função | Modo | Justificativa |
|---|---|---|
| `preview_effective_access_staged_v1` | **INVOKER** | Todas as tabelas lidas (`roles`/`role_permissions`/`permissions`/`setores`) são abertas a qualquer `authenticated`, ou (`setor_role_permissions`) exigem exatamente a mesma checagem `is_permissions_admin()` que a função já faz internamente antes de qualquer leitura. Nenhuma elevação é necessária — comprovado com admin (sucesso) e não-admin (rejeitado) reais, `pg_proc.prosecdef = false`. |
| `admin_prepare_user_sector_access_v1` | **DEFINER** | Escreve em `user_setor_vinculos`/`user_role_staging`/`user_sector_access_preparation_log`, todas com `REVOKE ALL FROM anon, authenticated` — nenhuma policy de escrita existe para `authenticated`. Como invoker, a escrita falharia por falta de privilégio de tabela mesmo para um admin genuíno. |
| `admin_validate_sector_cutover_readiness` | **DEFINER** | Precisa agregar contagens sobre TODAS as linhas de `public.user_profiles`. A RLS legada de `user_profiles` só permite SELECT da própria linha (`perfil_select_proprio`) ou de qualquer linha se o chamador satisfizer `is_gifts_deliverer()` (policy de uma feature não relacionada, "Leitura nomes brindes") — não existe nenhuma policy "admin vê todos os perfis" no schema legado (só a migration V2 cria isso, e esta fundação não depende de V2). Como invoker, um admin sem `gifts.deliver` só veria a própria linha, produzindo agregados incorretos. |

Em nenhum caso foi concedido `GRANT` amplo a `authenticated` em
`user_profiles`/`user_setor_vinculos`/`user_role_staging` só para
viabilizar a remoção do `DEFINER` — a elevação, onde mantida, permanece
estritamente limitada pela validação administrativa interna
(`is_permissions_admin()`, checada antes de qualquer leitura/escrita
privilegiada), pelo `search_path` fixo e pelos grants mínimos já
existentes.

## Lacuna registrada, não bloqueante nesta PR

A auditoria de preparação (`user_sector_access_preparation_log`) não
captura `cargo_futuro`/`gestor_id_futuro` antes/depois — só
`papel_futuro`/`setores`. Isso **não bloqueia esta fundação**, porque
nenhum cutover operacional ocorre nela (nenhuma mudança de acesso
efetivo depende desse histórico ainda). **Será bloqueante antes do
futuro PR B/cutover**, quando a auditoria completa de "o que mudou"
passa a ter valor operacional real — deverá ser resolvida como parte
daquele gate, não retroativamente nesta fundação.
