# Plano formal — reconciliação do histórico de migrations em HML

## Status deste documento

Este documento nasceu como um **plano**, não uma execução — nenhum comando
listado abaixo foi rodado contra HML no momento em que foi escrito. Desde
então, a execução foi aprovada e concluída, uma versão por vez, cada uma com
seus próprios prechecks/validações/checkpoint: as 11 versões históricas
foram marcadas `applied` via `supabase migration repair --linked --status
applied <versão>` (bootstrap + 10 chamadas subsequentes, todas bem-sucedidas
na primeira tentativa, nenhum uso de `--status reverted`), seguidas pela
aplicação real da Fatia C (`20260806120000`) via `supabase db push`. O CLI
foi restaurado para Produção ao final de cada rodada. Ver
`docs/deployments/2026-08-06-sprint-5.1.1-gifts-data-hardening-runbook.md`
(seção "Status — 2026-08-06") para o resultado consolidado do fechamento.
O texto abaixo é mantido como registro do planejamento original — os
comandos e a sintaxe documentados correspondem exatamente ao que foi
executado.

## Ambiente e escopo

- **Ambiente alvo desta reconciliação: exclusivamente HML.**
  `project-ref` HML: `tljscgsaqofgrfbjuyif`.
- `project-ref` Produção (nunca tocado por este plano):
  `uginlvintfslfbsfgugq`.
- Este plano **não autoriza nenhuma ação em Produção**, em nenhuma etapa.

## Motivo da reconciliação

A auditoria completa, migration por migration, documentada em
`docs/deployments/2026-08-06-hml-migration-history-reconciliation-audit.md`,
provou por evidência read-only (catálogos do Postgres, sem SQL mutável) que:

- a tabela `supabase_migrations.schema_migrations` **atualmente não existe**
  em HML (achado do diagnóstico que precedeu a auditoria — schema
  `supabase_migrations` com zero tabelas, consulta direta retorna `42P01`);
- apesar disso, o **schema de aplicação já está integralmente comprovado**
  pelas 11 migrations históricas — todo objeto (tabela, coluna, constraint,
  índice, função, corpo de função, trigger, policy, grant/revoke, seed
  estrutural) de cada uma das 11 migrations foi verificado presente e
  correto em HML, sem nenhuma pendência;
- a Fatia C (`20260806120000_harden_gifts_delivery_read_access.sql`)
  continua **genuinamente pendente** — nenhum dos seus objetos (DROP das 2
  policies amplas, REVOKE de `anon` em `confirmar_entrega_brinde`) foi
  encontrado aplicado durante a auditoria.

Ou seja: o problema é **só de bookkeeping** (a tabela que o Supabase CLI usa
para saber "o que já rodou" nunca foi criada — provavelmente porque as
migrations históricas foram aplicadas por SQL direto/dashboard, não por
`supabase db push`), não de schema desatualizado. `supabase migration
repair` existe exatamente para este cenário: ele **só escreve linhas na
tabela de bookkeeping** (`supabase_migrations.schema_migrations`),
registrando que uma versão já foi aplicada — ele **não executa o SQL da
migration**, não recria objetos, não altera dados. Nenhuma das 11 migrations
SQL antigas deve ser reaplicada — o objetivo é só fazer o `supabase migration
list`/`db push` "verem" o que já está lá, para que a Fatia C possa ser
empurrada normalmente por `supabase db push` sem exigir `--include-all`
sobre as 11 antigas também.

## Estado local confirmado (comandos read-only, sem tocar em nenhum banco)

| Item | Valor observado |
|---|---|
| Branch atual | `fix/gifts-self-service-access` |
| `git status --short` | 5 arquivos untracked (os 5 artefatos já aprovados desta sprint — ver lista abaixo) |
| `git log -3 --oneline` | `2f510cc` feat(gifts): permite entrega de kits no autoatendimento · `b779bb0` fix(gifts): restringe gestão de brindes a gestores · `f98a9bf` Merge pull request #5 |
| `project-ref` atual | `uginlvintfslfbsfgugq` (Produção) |
| `git stash list -3` | `stash@{0}`: On feat/hub-department-areas-foundation: wip: AuthContext alteração não identificada antes da Etapa 5 |
| `supabase --version` | `2.109.1` |

Os 5 arquivos untracked no momento da elaboração deste plano:

1. `docs/deployments/2026-08-06-hml-migration-history-reconciliation-audit.md`
2. `docs/deployments/2026-08-06-sprint-5.1.1-gifts-data-hardening-runbook.md`
3. `supabase/checks/2026-08-06-migration-history-audit-checks.sql`
4. `supabase/migrations/20260806120000_harden_gifts_delivery_read_access.sql`
5. `supabase/rollbacks/sprint_5_1_1_gifts_delivery_access_rollback.sql`

## Sintaxe exata do CLI local (extraída de `--help`, nada presumido)

### `supabase migration repair --help`

```
USAGE
  supabase migration repair [flags] <version...>

ARGUMENTS
  version... string    Migration version(s) to repair.

FLAGS
  --status choice          Version status to update. (choices: applied, reverted)
  --db-url string          Repairs migrations of the database specified by the connection string (must be percent-encoded).
  --linked                 Repairs the migration history of the linked project.
  --local                  Repairs the migration history of the local database.
  --password, -p string    Password to your remote Postgres database.
```

Achados relevantes para este plano:

- **`<version...>` é variádico** — o CLI local aceita, sintaticamente, mais
  de uma versão na mesma chamada (`supabase migration repair --status
  applied <v1> <v2> ... <v11>` seria aceito pelo parser). **Mesmo assim, este
  plano opta por 11 chamadas individuais** (uma versão por comando), não por
  economia de digitação, mas porque a Seção 6 exige registrar sucesso/falha
  **por versão** e parar imediatamente na primeira falha sem tocar nas
  versões restantes — uma chamada agrupada não permite esse controle
  granular (se uma das 11 falhar dentro de uma chamada em lote, o
  comportamento de commit parcial do restante não é claramente documentado
  pelo `--help`, e não será presumido). **Este plano não afirma que uma
  chamada com múltiplas versões seria, ou não seria, transacional/atômica —
  isso não foi comprovado pelo `--help` local e não será tratado como fato
  em nenhuma direção.**
- **`--status` aceita exatamente dois valores: `applied` ou `reverted`.**
  Este plano usa somente `applied`. `reverted` não é usado em nenhuma etapa
  planejada (ver Seção "Plano de contingência").
- **Não existe flag `--dry-run` para `migration repair`** (ausente da lista
  de flags, ao contrário de `db push`, que tem `--dry-run` explícito). Ou
  seja, **`migration repair` não tem modo de simulação** — cada chamada
  grava de fato uma linha em `supabase_migrations.schema_migrations` no
  momento em que roda. É por isso que os prechecks (Seção "Prechecks") e a
  parada em caso de falha (Seção "Estratégia de execução") são a única rede
  de segurança disponível — não há como "testar antes" no próprio comando.
- `--linked` aplica a reparação ao projeto atualmente linkado pelo CLI —
  por isso o link explícito a HML (`tljscgsaqofgrfbjuyif`) antes de cada
  chamada é obrigatório e verificado nos prechecks.

### `supabase migration list --help`

```
USAGE
  supabase migration list [flags]

FLAGS
  --db-url string          Lists migrations of the database specified by the connection string (must be percent-encoded).
  --linked                 Lists migrations applied to the linked project.
  --local                  Lists migrations applied to the local database.
  --password, -p string    Password to your remote Postgres database.
```

Não há flag de filtro por status nesta subcomando — `migration list` sempre
lista todas as migrations locais e, para cada uma, mostra as colunas
`Local`/`Remote` (versão presente localmente vs. registrada no bookkeeping
remoto). É esta a saída usada nos passos de validação (Seções "Validação
após as 11 versões").

### `supabase db push --help`

```
USAGE
  supabase db push [flags]

FLAGS
  --include-all            Include all migrations not found on remote history table.
  --include-roles          Include custom roles from supabase/roles.sql.
  --include-seed           Include seed data from your config.
  --dry-run                Print the migrations that would be applied, but don't actually apply them.
  --db-url string          Pushes to the database specified by the connection string (must be percent-encoded).
  --linked                 Pushes to the linked project.
  --local                  Pushes to the local database.
  --password, -p string    Password to your remote Postgres database.
```

`--dry-run` confirmado disponível (já usado durante a auditoria, sem
aplicar nada). `--include-all` **não é usado neste plano** — depois da
reconciliação, `db push` sem `--include-all` deve enxergar as 11 versões
como já aplicadas (via bookkeeping reparado) e listar somente a Fatia C.

## Versões a marcar como `applied` (ordem cronológica, exclui a Fatia C)

Exatamente estas 11, nesta ordem — nenhuma outra:

1. `20260716120000`
2. `20260716120100`
3. `20260717090000`
4. `20260717100000`
5. `20260721120000`
6. `20260722100000`
7. `20260722150000`
8. `20260729120000`
9. `20260729143000`
10. `20260730110000`
11. `20260730130000`

**`20260806120000` (Fatia C) NÃO entra nesta lista.** Deve permanecer
pendente, para ser aplicada depois, separadamente, por `supabase db push`
real (sem `--dry-run`), em uma etapa futura e distinta desta reconciliação.

## Comandos planejados (não executados)

Sintaxe derivada exclusivamente do `--help` acima. Um comando por versão,
em ordem cronológica, todos com `--linked` explícito (projeto HML deve já
estar linkado nesse ponto — ver prechecks) e `--status applied`:

```
supabase migration repair --linked --status applied 20260716120000
supabase migration repair --linked --status applied 20260716120100
supabase migration repair --linked --status applied 20260717090000
supabase migration repair --linked --status applied 20260717100000
supabase migration repair --linked --status applied 20260721120000
supabase migration repair --linked --status applied 20260722100000
supabase migration repair --linked --status applied 20260722150000
supabase migration repair --linked --status applied 20260729120000
supabase migration repair --linked --status applied 20260729143000
supabase migration repair --linked --status applied 20260730110000
supabase migration repair --linked --status applied 20260730130000
```

Nenhum destes comandos foi executado nesta tarefa. Nenhuma versão fora
desta lista (em particular `20260806120000`) deve ser passada a
`migration repair` em nenhuma etapa desta reconciliação. **Todo comando
remoto deste plano — `migration repair`, `migration list`, `db push
--dry-run` — usa `--linked` de forma explícita em todas as ocorrências
abaixo; nenhuma etapa depende do link implícito do diretório.**

## O primeiro repair é um checkpoint especial de bootstrap (na execução futura)

Como `supabase_migrations.schema_migrations` **não existe hoje** em HML, o
primeiro `migration repair` não é "mais um dos onze" — é o comando que, na
prática, **cria a tabela de bookkeeping do zero** (o Supabase CLI a cria se
necessário no momento em que precisa gravar a primeira linha). Por isso ele
recebe uma validação própria, mais rigorosa que as demais, antes de
prosseguir para as 10 versões seguintes.

**Comando (não executado agora):**

```
supabase migration repair --linked --status applied 20260716120000
```

**Imediatamente depois** deste comando — e antes de qualquer outro
`migration repair` — a execução futura deve **parar e validar**:

```
supabase migration list --linked
```

E, com consultas read-only (só `SELECT`, mesmo padrão do script de checks
já usado na auditoria):

```sql
select to_regclass('supabase_migrations.schema_migrations') is not null as tabela_existe;

select count(*) as total_registradas from supabase_migrations.schema_migrations;

select version from supabase_migrations.schema_migrations order by version;
```

**Resultado obrigatório após este primeiro comando:**

- `tabela_existe` = `true`;
- `total_registradas` = `1`;
- única versão registrada = `20260716120000`;
- nenhuma outra versão registrada (nem nenhuma das outras 10 históricas,
  nem `20260806120000`);
- `20260806120000` ausente da tabela.

**Se qualquer um desses resultados divergir:**

1. parar — não executar os outros dez `migration repair`;
2. não usar `--status reverted` automaticamente para tentar corrigir;
3. restaurar o CLI para Produção (`supabase link --project-ref
   uginlvintfslfbsfgugq`), confirmando via `cat supabase/.temp/project-ref`;
4. abrir uma análise específica deste bootstrap parcial/divergente antes de
   qualquer nova tentativa — não repetir o comando por conta própria.

## Validar progressão após cada um dos dez repairs seguintes (na execução futura)

As dez versões restantes (`20260716120100` até `20260730130000`, na ordem
já listada) continuam sendo **comandos individuais**, um por vez — nenhuma
mudança na Seção "Comandos planejados" acima. A diferença é que, depois de
**cada** comando bem-sucedido (incluindo o bootstrap, que já conta como a
1ª versão), a execução futura roda:

```
supabase migration list --linked
```

E a seguinte consulta read-only consolidada:

```sql
select
  count(*) as total_registradas,
  min(version) as primeira_versao,
  max(version) as ultima_versao,
  bool_or(version = '20260806120000') as fatia_c_registrada
from supabase_migrations.schema_migrations;
```

**O total deve crescer exatamente de um em um, nesta ordem:**

| Após a versão nº | `total_registradas` esperado |
|---|---|
| 1ª (`20260716120000`, bootstrap) | 1 |
| 2ª (`20260716120100`) | 2 |
| 3ª (`20260717090000`) | 3 |
| 4ª (`20260717100000`) | 4 |
| 5ª (`20260721120000`) | 5 |
| 6ª (`20260722100000`) | 6 |
| 7ª (`20260722150000`) | 7 |
| 8ª (`20260729120000`) | 8 |
| 9ª (`20260729143000`) | 9 |
| 10ª (`20260730110000`) | 10 |
| 11ª (`20260730130000`) | 11 |

Em **todas** as etapas da tabela acima, também é obrigatório:

- `fatia_c_registrada` = `false` (nunca `true` até a Fatia C ser aplicada
  de verdade por `db push`, fora desta reconciliação);
- nenhuma versão inesperada aparece em `supabase_migrations.schema_migrations`
  além das já processadas até aquele ponto;
- em `supabase migration list --linked`: as versões já processadas mostram
  `Local` e `Remote` preenchidos; as versões ainda não processadas continuam
  mostrando somente `Local` (sem `Remote`).

**Se houver salto na contagem (ex.: pular de 3 para 5), versão inesperada
registrada, ou `fatia_c_registrada = true` em qualquer ponto antes da etapa
final:**

1. parar imediatamente — não executar a próxima versão da lista;
2. não usar `--status reverted` automaticamente;
3. restaurar o CLI para Produção (`supabase link --project-ref
   uginlvintfslfbsfgugq`), confirmando via `cat supabase/.temp/project-ref`;
4. registrar o ponto exato da divergência (qual foi a última versão
   confirmada correta antes do desvio, e o que foi observado no lugar do
   esperado) para análise específica antes de qualquer nova tentativa.

## Prechecks obrigatórios antes do primeiro `repair` (na execução futura)

Todos read-only até o item 5 (link é uma operação local de arquivo, não
uma alteração em HML — já usada e documentada como de baixo risco durante a
auditoria). Ordem obrigatória:

1. Confirmar branch correta: `git branch --show-current` deve mostrar
   `fix/gifts-self-service-access`.
2. Confirmar `git status --short` com **somente os 5 arquivos conhecidos**
   (lista na seção "Estado local confirmado" acima) — nenhum arquivo extra,
   nenhum arquivo dos 5 ausente.
3. Confirmar `git stash list -3` ainda mostra `stash@{0}` intacto.
4. Confirmar que o CLI está inicialmente em Produção:
   `cat supabase/.temp/project-ref` deve mostrar `uginlvintfslfbsfgugq`
   antes de qualquer `link` desta execução.
5. Link explícito para HML: `supabase link --project-ref tljscgsaqofgrfbjuyif`.
6. Confirmar o link: `cat supabase/.temp/project-ref` deve mostrar
   `tljscgsaqofgrfbjuyif`. Se mostrar qualquer outro valor — parar.
7. Rodar `supabase migration list --linked` e **conferir que todas as 12 versões
   locais (as 11 + a Fatia C) aparecem só na coluna `Local`, com `Remote`
   vazio** — a mesma divergência de bookkeeping já documentada na
   auditoria. Se alguma versão já mostrar algo em `Remote` neste ponto,
   parar (estado mudou desde a auditoria, precisa de nova investigação).
8. Reexecutar o script read-only:
   `supabase db query --linked -f supabase/checks/2026-08-06-migration-history-audit-checks.sql`.
9. Comparar a saída ponto a ponto com a Seção "Resultado observado" do
   relatório de auditoria (`2026-08-06-hml-migration-history-reconciliation-audit.md`).
   Deve bater exatamente — mesma classificação A, nenhum objeto ausente,
   nenhuma contagem diferente do documentado.
10. Só depois de 1–9 confirmados, prosseguir para a primeira chamada de
    `migration repair`.

**Se qualquer evidência do item 7 ou 9 divergir do que a auditoria
documentou:** parar imediatamente, não executar nenhum `migration repair`,
restaurar o CLI para Produção (`supabase link --project-ref
uginlvintfslfbsfgugq`) e tratar como um novo achado a investigar
separadamente — não prosseguir com a reconciliação neste mesmo ciclo.

## Estratégia de execução (na execução futura)

- As 11 versões são processadas **em ordem cronológica**, uma chamada por
  vez, exatamente na sequência listada acima.
- Após cada chamada bem-sucedida: registrar **somente** a versão e
  sucesso/falha (ex.: `20260716120000 — sucesso`). Não executar o SQL da
  migration correspondente. Não executar `db push` no meio da sequência.
  Não avançar para a próxima versão antes de confirmar que a chamada atual
  retornou sem erro.
- **Se uma versão falhar depois de uma ou mais versões anteriores já terem
  sido registradas com sucesso:**
  1. parar imediatamente — não tentar de novo automaticamente;
  2. não executar as versões restantes da lista;
  3. não usar `--status reverted` para desfazer o que já foi registrado
     como forma automática de "limpar" o estado parcial;
  4. registrar exatamente quais versões foram concluídas com sucesso e
     qual foi a primeira a falhar, com a mensagem de erro completa;
  5. restaurar o CLI para Produção (`supabase link --project-ref
     uginlvintfslfbsfgugq`) e confirmar via `cat supabase/.temp/project-ref`;
  6. abrir uma análise específica do estado parcialmente reconciliado antes
     de qualquer nova tentativa — esse estado (algumas versões marcadas
     `applied`, outras ainda só `Local`) não é coberto por este plano e não
     deve ser resolvido por tentativa e erro.

## Validação após as 11 versões (na execução futura)

Primeiro, `supabase migration list --linked`. Resultado obrigatório:

- as 11 versões históricas aparecem com **`Local` e `Remote` preenchidos**
  (ambas as colunas com a versão, não mais `Remote` vazio);
- `20260806120000` aparece **somente em `Local`** (continua pendente);
- nenhuma versão remota inesperada (nenhuma versão aparecendo em `Remote`
  que não esteja também em `Local`, nenhuma versão fora das 12 conhecidas);
- nenhuma das 11 versões históricas ainda aparece como pendente.

Depois, **somente** `supabase db push --linked --dry-run` (nunca `db push`
real nesta mesma etapa). Saída obrigatória, exatamente:

```
Would push these migrations:
 • 20260806120000_harden_gifts_delivery_read_access.sql
```

Nenhuma outra migration pode aparecer nesta lista. Se qualquer uma das 11
versões históricas ainda aparecer no dry-run, a reconciliação não teve
efeito completo — parar, não prosseguir para a Fatia C, investigar antes de
qualquer nova tentativa.

## Validação do schema após o repair (na execução futura)

Reexecutar, **somente nesta etapa futura de execução** (não nesta tarefa de
planejamento):

```
supabase db query --linked -f supabase/checks/2026-08-06-migration-history-audit-checks.sql
```

Resultado esperado: idêntico ao já registrado na auditoria — as 11
migrations continuam COMPROVADAS, porque `migration repair` **não executa
DDL/DML nenhum**, só escreve bookkeeping. Qualquer diferença neste resultado
em relação à auditoria original seria evidência de que algo além do
bookkeeping mudou — o que não é esperado e deve ser investigado, não
ignorado.

Adicionalmente, verificar (read-only, catálogos apenas) na mesma execução:

- existência de `supabase_migrations.schema_migrations` (agora deve
  existir — o próprio `repair` a cria se necessário);
- quantidade de versões registradas na tabela: deve ser exatamente **11**;
- lista exata das 11 versões registradas, batendo com a lista da Seção
  "Versões a marcar como applied";
- ausência de `20260806120000` na tabela de bookkeeping (deve continuar de
  fora até a Fatia C ser aplicada de verdade por `db push`).

## Plano de contingência

- `migration repair` altera **somente** o histórico
  (`supabase_migrations.schema_migrations`) — nunca o schema, nunca dados
  de aplicação. Isso é o que torna esta reconciliação segura em tese, mas
  não elimina o risco de erro operacional (versão errada, ambiente errado).
- **Não há rollback automático** desta execução — nem no CLI (sem
  `--dry-run` para `repair`), nem neste plano. A única forma de desfazer um
  `--status applied` é uma chamada explícita e deliberada com `--status
  reverted` na mesma versão, e **isso não deve ser feito automaticamente**
  como parte de tratamento de erro — exige decisão e revisão específicas
  (ver "Estratégia de execução" acima).
- Nenhuma migration histórica deve ser apagada ou editada em nenhuma
  hipótese, nesta reconciliação ou em resposta a qualquer falha dela.
- Nenhum registro deve ser criado por `INSERT` manual em
  `supabase_migrations.schema_migrations` — a única via aceita é
  `supabase migration repair`, nunca SQL direto.
- **`migration repair` não deve ser executado em Produção nesta sprint** —
  este plano é exclusivo de HML; Produção não tem o mesmo achado de
  bookkeeping ausente documentado e não faz parte deste escopo.
- Se a reconciliação completa (as 11 chamadas) for aprovada e executada com
  sucesso, o CLI deve ser restaurado para Produção
  (`supabase link --project-ref uginlvintfslfbsfgugq`) ao final, com
  confirmação via `cat supabase/.temp/project-ref`. **Nenhuma query deve
  ser executada depois dessa restauração.**

## Etapas posteriores (fora do escopo desta reconciliação)

Esta reconciliação **não aplica a Fatia C**. Depois de aprovada e validada
(Seções "Validação após as 11 versões" e "Validação do schema após o
repair"), o processo de aplicar a Fatia C continua como um ciclo separado,
com sua própria aprovação:

1. confirmar `supabase migration list --linked` (11 reconciliadas + Fatia C
   só em `Local`);
2. confirmar `supabase db push --linked --dry-run` mostrando somente
   `20260806120000`;
3. aplicar a Fatia C em HML com `supabase db push` (real, não dry-run);
4. executar os post-checks já definidos no runbook da Fatia C
   (`docs/deployments/2026-08-06-sprint-5.1.1-gifts-data-hardening-runbook.md`);
5. aplicar o seed temporário de teste (Fatia B/HML);
6. smoke vendedor/admin;
7. teste de RLS via impersonação de sessão;
8. rollback do seed;
9. comprovar os seis zeros de limpeza;
10. restaurar o CLI para Produção.

Nenhuma dessas 10 etapas faz parte desta reconciliação de histórico — são
listadas aqui só para deixar explícito onde a reconciliação termina e onde
o próximo ciclo (já coberto pelo runbook existente) começa.
