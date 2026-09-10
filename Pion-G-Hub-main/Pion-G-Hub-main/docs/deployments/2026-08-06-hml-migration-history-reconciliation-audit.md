# Auditoria completa — histórico de migrations em HML (pré-Fatia C)

## Objetivo e escopo

Provar, migration por migration, que as **11 migrations anteriores à Fatia C**
já estão de fato aplicadas em HML (`tljscgsaqofgrfbjuyif`), apesar de
`supabase_migrations.schema_migrations` não existir no banco (achado do
diagnóstico anterior a este documento). Esta auditoria é **read-only**: não
executa `migration repair`, não cria a tabela de bookkeeping, não altera
schema nem dados, e não decide/aplica nenhuma reconciliação — isso fica para
uma etapa futura, condicionada ao resultado aqui.

Escopo exato (nesta ordem), **excluindo explicitamente**
`20260806120000_harden_gifts_delivery_read_access.sql` (Fatia C, deve
permanecer pendente):

1. `20260716120000_sprint_3_7_brindes_feira.sql`
2. `20260716120100_autoatendimento_destinatarios.sql`
3. `20260717090000_sprint_3_8_permissions_pbac.sql`
4. `20260717100000_hardening_revoke_anon.sql`
5. `20260721120000_hardening_leads_feira_rls.sql`
6. `20260722100000_permissions_admin_write_rpcs.sql`
7. `20260722150000_sprint_4_1_chamados_ti_fundacao.sql`
8. `20260729120000_fix_ti_criar_chamado_notificacao_alias.sql`
9. `20260729143000_sprint_4_3_central_atendimento_rpcs.sql`
10. `20260730110000_fix_ti_triagem_chamado_v_prazos.sql`
11. `20260730130000_fix_ti_mudar_status_fluxo_operacional.sql`

## Achado prévio importante: migrations "espelhadas"

Migrations 8, 9, 10 e 11 são patches idempotentes cujo texto final (o mesmo
`CREATE OR REPLACE FUNCTION`) **já está incorporado, palavra por palavra, na
migration 7** (`20260722150000`), conforme os próprios cabeçalhos dessas
migrations documentam ("Mesmo texto já incorporado como espelho local em
...20260722150000..."). Isso foi confirmado por leitura direta: o arquivo
`20260722150000` hoje contém, em seu próprio texto:

- `ti_criar_chamado` já com o alias `AS destinatarios(profile_id)` (fix da
  migration 8);
- `ti_triagem_chamado` já com `v_prazo_primeira_resposta`/`v_prazo_resolucao`
  como escalares `TIMESTAMPTZ` em vez do `RECORD v_prazos` original (fix da
  migration 10);
- `ti_mudar_status` já com a transição `atribuido → em_atendimento` manual e
  `reaberto → atribuido` (fix da migration 11);
- `ti_listar_membros_equipe`, `ti_fila_atendimento` (9 argumentos,
  paginadas) e `ti_atribuir_chamado` já com o bloqueio de reatribuição (todas
  da migration 9).

**Consequência para esta auditoria**: para essas 6 funções, a migration 7
sozinha já prova o estado final esperado pelas migrations 8–11. As migrations
8–11 não introduzem nenhum objeto que não esteja também coberto pela
verificação da migration 7 — cada uma delas é auditada separadamente abaixo
(regra do enunciado: não considerar uma migration comprovada só porque outra
migration cobre o mesmo objeto), mas a **evidência observada é a mesma
consulta de assinatura + corpo da função**, já que o texto é idêntico.

## Metodologia

Para cada migration: (1) inventário extraído por leitura integral do arquivo
local (não apenas o nome do arquivo); (2) consulta read-only construída a
partir desse inventário, usando só catálogos do Postgres
(`pg_class`, `pg_namespace`, `pg_attribute`, `pg_constraint`, `pg_indexes`,
`pg_proc`, `pg_trigger`, `pg_policies`, `information_schema`,
`has_function_privilege`, `has_table_privilege`) e, quando a migration insere
linha estrutural indispensável (catálogo PBAC), `SELECT` simples nas tabelas
`permissions`/`roles`/`role_permissions` (só contagem/código, nunca dado de
usuário); (3) resultado observado e status (COMPROVADA / PARCIAL / NÃO
COMPROVADA).

Todas as consultas estão em
`supabase/checks/2026-08-06-migration-history-audit-checks.sql` (script único,
somente leitura, executado uma vez contra HML).

---

## 01 — `20260716120000_sprint_3_7_brindes_feira.sql`

**Nome:** Sprint 3.7 — Brindes por Feira: Carga, Entrega e Vínculo com Lead

**Objetos criados/alterados (extraídos do arquivo):**
- Função `is_gifts_deliverer()` (SECURITY DEFINER, `GRANT EXECUTE` a
  `anon, authenticated`).
- Policies (`DROP...CREATE`, reaplicáveis): "Leitura nomes brindes"
  (`user_profiles`), "Leitura entrega brindes" (`brindes`), "Leitura entrega
  brinde_kits" (`brinde_kits`), "Leitura entrega brinde_kit_itens"
  (`brinde_kit_itens`), "Leitura entrega brinde_entregas" (`brinde_entregas`
  — recriada na migration 02 com o mesmo texto, não é uma alteração real).
- `brinde_entregas`: coluna `origem` (+ CHECK), constraint
  `chk_brinde_entregas_item` (substitui a antiga via `DROP...ADD`), índice
  único parcial `uq_brinde_entrega_kit_lead_feira_ativo`.
- Tabela nova `brinde_feira_estoque` (PK, FKs, `CHECK`s de quantidade,
  UNIQUE `uq_brinde_feira_estoque_feira_brinde`, índices
  `idx_brinde_feira_estoque_feira`/`_brinde`, RLS habilitada, policies
  "Gestao brinde_feira_estoque" / "Leitura entrega brinde_feira_estoque").
- Tabela nova `brinde_entrega_itens` (PK, FKs, UNIQUE
  `uq_brinde_entrega_itens_entrega_brinde`, índices
  `idx_brinde_entrega_itens_entrega`/`_brinde`, RLS habilitada, policy
  "Gestao brinde_entrega_itens").
- RPC `registrar_carga_feira(UUID,UUID,INTEGER,TEXT,UUID)` — `REVOKE ALL`
  de `PUBLIC`+`anon`, `GRANT EXECUTE` a `authenticated`.
- RPC `registrar_entrega_brinde_feira` **versão de 7 argumentos**
  (`UUID,UUID,TEXT,UUID,JSONB,TEXT,TEXT`) — **DROPADA explicitamente na
  migration 02** e substituída pela versão de 12 argumentos. Objeto
  legitimamente superado; sua ausência em HML não é falha desta migration,
  desde que a versão de 12 argumentos exista (migration 02).

**Dependência:** nenhuma (pré-requisito é a Sprint 3.1, fora do escopo desta
auditoria — tabelas base `brindes`/`brinde_kits`/`brinde_entregas` já
confirmadas existentes no diagnóstico anterior).

## 02 — `20260716120100_autoatendimento_destinatarios.sql`

**Nome:** Autoatendimento interno — `tipo_destinatario` + RPC estendida

**Objetos:**
- `brinde_entregas`: coluna `tipo_destinatario` + constraint
  `brinde_entregas_tipo_destinatario_check`, constraint
  `chk_brinde_entregas_destinatario`, índice
  `idx_brinde_entregas_tipo_destinatario`.
- `CREATE EXTENSION IF NOT EXISTS unaccent`.
- Função `normalize_dedup_text(TEXT)`.
- `DROP FUNCTION registrar_entrega_brinde_feira` (7 args) — ver migration 01.
- RPC `registrar_entrega_brinde_feira` **versão de 12 argumentos**
  (`UUID,UUID,TEXT,UUID,JSONB,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN`) —
  versão final/vigente. `REVOKE ALL` de `PUBLIC`+`anon`, `GRANT EXECUTE` a
  `authenticated`.
- Reaplica (idempotente, mesmo texto) as policies "Leitura entrega
  brinde_entregas" e "Leitura entrega brinde_entrega_itens".

**Bloco de pré-requisito (`DO $$ ... $$`)**: a própria migration falha alto
se `is_gifts_deliverer()`, `brinde_feira_estoque`, `brinde_entrega_itens` ou
a RPC de 7 args não existirem — evidência adicional de que a migration 01
precisa estar aplicada antes desta.

## 03 — `20260717090000_sprint_3_8_permissions_pbac.sql`

**Nome:** Sprint 3.8 — Centro de Permissões (PBAC), Etapa 3: Banco de Dados

**Objetos:**
- Tabelas `permissions`, `roles`, `role_permissions`, `user_permissions`,
  `permission_change_log` (com índices `idx_permissions_resource`,
  `idx_role_permissions_permission`, `idx_user_permissions_profile`,
  `idx_permission_change_log_target`).
- Funções `is_permissions_admin()`, `protect_system_roles()` (trigger).
- Trigger `trg_protect_system_roles` em `roles`.
- RLS + policies: "Leitura permissions" (`permissions`); "Leitura roles" +
  "Gestao roles" (`roles`); "Leitura role_permissions" + "Gestao
  role_permissions" (`role_permissions` — **"Gestao role_permissions" é
  dropada na migration 06**, superação legítima); "Leitura propria
  user_permissions" + "Gestao user_permissions" (`user_permissions` — **ambas
  dropadas/substituídas na migration 06**, superação legítima); "Leitura
  permission_change_log" (`permission_change_log`).
- Seed `roles`: 4 linhas (`admin`, `marketing`, `gestor`, `vendedor`).
- Seed `permissions`: **47 linhas** (todo `resource <> 'tickets'` — contagem
  extraída por grep estrutural do arquivo, não estimada).
- Seed `role_permissions`: **105 linhas** — admin 41, marketing 30, gestor
  24, vendedor 10 (contagem extraída por grep estrutural do arquivo).

## 04 — `20260717100000_hardening_revoke_anon.sql`

**Nome:** Hardening — revoga EXECUTE de `anon` nas RPCs de brindes por feira

**Objetos:** só `REVOKE`/`GRANT`, nenhum objeto novo.
- `REVOKE ALL ON FUNCTION registrar_carga_feira(...) FROM anon` +
  `GRANT EXECUTE ... TO authenticated` (redundante com a migration 01, que já
  fazia o mesmo — reaplicação intencional, não é erro).
- `REVOKE ALL ON FUNCTION registrar_entrega_brinde_feira(12 args) FROM anon`
  + `GRANT EXECUTE ... TO authenticated` (redundante com a migration 02, mesmo
  motivo).

## 05 — `20260721120000_hardening_leads_feira_rls.sql`

**Nome:** Hardening — RLS granular de `leads_feira` via PBAC

**Objetos:**
- Funções `has_effective_permission(TEXT)`, `is_own_or_team_lead(UUID)`.
- `DROP POLICY "Acesso total leads_feira"` (superada) → 4 policies novas:
  "Leitura leads_feira" (SELECT), "Insercao leads_feira" (INSERT),
  "Atualizacao leads_feira" (UPDATE), "Exclusao leads_feira" (DELETE) — todas
  usando `has_effective_permission`.
- `REVOKE ALL ON leads_feira FROM anon`.
- Índice `idx_user_profiles_gestor_id`.

## 06 — `20260722100000_permissions_admin_write_rpcs.sql`

**Nome:** Etapa 6.2 — RPCs de gravação do Centro de Permissões + hardening
de `user_profiles`

**Objetos:**
- `permission_change_log_action_check` redefinida (aceita `'inherit'`).
- Função `count_active_users_with_permissions(text[])` (SECURITY DEFINER,
  sem GRANT a `anon`/`authenticated`).
- RPCs `set_role_permission`, `set_user_permission_grant`,
  `set_user_permission_revoke`, `clear_user_permission_override` — todas
  SECURITY DEFINER, `REVOKE ALL` de `PUBLIC`+`anon`, `GRANT EXECUTE` a
  `authenticated`, todas usando o mesmo advisory lock
  (`hashtext('centro_permissoes:lockout_guard')`).
- `DROP POLICY "Gestao role_permissions"`; `DROP POLICY "Gestao
  user_permissions"` + `DROP POLICY "Leitura propria user_permissions"` →
  `CREATE POLICY "Leitura user_permissions"` (amplia leitura a
  `permissions.view`/`permissions.manage`).
- `CREATE POLICY "Leitura permission_change_log via audit_view"`.
- `REVOKE ALL` + `GRANT SELECT` (só `authenticated`) em
  `role_permissions`/`user_permissions`/`permission_change_log`.
- Função `protect_sensitive_profile_fields()` **versão original** (guarda
  `role`/`ativo`/`gestor_id`/`user_id`) — **redefinida na migration 07** para
  também guardar `tipo_vinculo`. Superação legítima: o texto vigente é o da
  migration 07.
- Trigger `trg_protect_sensitive_profile_fields` em `user_profiles`.
- Funções + triggers `lockout_guard_user_profiles_update`/`_delete`.
- `REVOKE DELETE ON user_profiles FROM authenticated, anon`.

## 07 — `20260722150000_sprint_4_1_chamados_ti_fundacao.sql`

**Nome:** Sprint 4.1 — Módulo de Chamados de TI, Fundação do banco

**Nota:** este é o arquivo "espelho" — contém, além do escopo original da
Sprint 4.1, o texto final das migrations 08, 09, 10 e 11 (ver seção "Achado
prévio" acima). A auditoria abaixo cobre TODOS os objetos do arquivo como ele
existe hoje.

**Objetos:**
- `user_profiles`: coluna `tipo_vinculo` (+ CHECK) — **Parte 0** desta
  migration.
- Função `protect_sensitive_profile_fields()` **versão final** (com guarda de
  `tipo_vinculo`) — substitui a da migration 06.
- **14 tabelas**: `ti_equipes`, `ti_categorias` (+ índice
  `idx_ti_categorias_equipe_padrao`), `ti_equipe_membros` (+ índice
  `idx_ti_equipe_membros_profile`), `ti_sla_regras`, `ti_chamados` (+
  sequence `ti_chamados_numero_seq`, índices `idx_ti_chamados_solicitante`/
  `_responsavel`/`_equipe`/`_status`/`_relacionado`, único
  `idx_ti_chamados_codigo_chamado`), `ti_chamado_tempos` (+ índices
  `idx_ti_chamado_tempos_chamado`/`_agente`, único
  `uq_ti_chamado_tempos_automatico_aberto`), `ti_chamado_historico` (+
  índices `_chamado`/`_tempo`), `ti_chamado_comentarios` (+ índice
  `_chamado`), `ti_chamado_anexos` (+ índices `_chamado`/`_comentario`),
  `ti_kb_artigos` (+ índices `_categoria`/`_status`/GIN `_busca`),
  `ti_chamado_kb_artigos` (+ índice `_artigo`), `ti_notificacoes` (+ índices
  `_chamado`/`_nao_lidas`), `ti_preferencias_notificacao` (+ únicos
  `uq_ti_preferencias_geral`/`_especifica`), `ti_notificacoes_envios` (+
  índice `_pendentes`).
- Funções helper: `ti_perfil_ativo_id()`, `ti_is_own_equipe(UUID)`,
  `ti_e_solicitante(UUID)`, `ti_pode_ver_chamado(UUID)`,
  `ti_pode_ver_interno_chamado(UUID)`.
- Schema `private` (+ `REVOKE ALL FROM PUBLIC,anon` + `GRANT USAGE TO
  authenticated`) e função `private.ti_comentario_interno_raw(UUID,UUID)`.
- Funções `ti_profiles_in_equipe(UUID)`, `ti_profiles_with_permission(TEXT)`
  (ambas sem GRANT a `anon`/`authenticated` — uso interno só), e
  `ti_calcular_prazo_sla(TEXT,TIMESTAMPTZ)`.
- RLS habilitada + 1 policy de leitura por tabela (13 das 14 tabelas — todas
  exceto `ti_preferencias_notificacao`, que tem "Gestao propria
  ti_preferencias_notificacao" FOR ALL) + `REVOKE ALL`/`GRANT SELECT` (ou
  `SELECT,INSERT,UPDATE,DELETE` só para `ti_preferencias_notificacao`) por
  tabela.
- RPCs: `ti_criar_chamado` (versão final, com alias), `ti_triagem_chamado`
  (versão final, escalares), `ti_atribuir_chamado` (versão final, bloqueio de
  reatribuição), `ti_mudar_status` (versão final, fluxo revisado),
  `ti_iniciar_tempo(UUID)`, `ti_encerrar_tempo(UUID)`,
  `ti_lancar_tempo_manual(UUID,UUID,INTEGER,TEXT)`,
  `ti_comentar_chamado(UUID,TEXT,BOOLEAN)`,
  `ti_marcar_notificacao_lida(UUID)`, `ti_listar_membros_equipe(UUID)`
  (versão final), `ti_fila_atendimento` (9 argumentos, versão final
  paginada).
- Seeds: `ti_equipes` (2), `ti_categorias` (8), `ti_sla_regras` (4),
  `permissions` `resource='tickets'` (19 linhas), `role_permissions` para
  `tickets.*` (admin 19, marketing/gestor/vendedor 5 cada = 15; total 34).

## 08 — `20260729120000_fix_ti_criar_chamado_notificacao_alias.sql`

**Nome:** Patch — corrige alias de coluna em `ti_criar_chamado`

**Objetos:** `CREATE OR REPLACE FUNCTION ti_criar_chamado(TEXT, TEXT, UUID,
TEXT, UUID)` — mesma assinatura da migration 07/Parte 1, corpo idêntico ao já
mirrorado na migration 07 (`AS destinatarios(profile_id)`). `REVOKE ALL` +
`GRANT EXECUTE` reaplicados (idempotente, mesmo resultado da migration 07).
Nenhum objeto novo além da função.

## 09 — `20260729143000_sprint_4_3_central_atendimento_rpcs.sql`

**Nome:** Patch — Sprint 4.3 (Central de Atendimento)

**Objetos:**
- `ti_listar_membros_equipe(UUID)` — nova RPC (texto idêntico ao já
  mirrorado na migration 07).
- `ti_fila_atendimento(UUID,TEXT,TEXT,UUID,UUID,BOOLEAN,TEXT,INTEGER,INTEGER)`
  — nova RPC paginada (texto idêntico ao mirrorado na migration 07).
- `ti_atribuir_chamado(UUID,UUID)` — `CREATE OR REPLACE` (mesma assinatura da
  migration 07/Parte 1), corrigida para bloquear reatribuição (texto idêntico
  ao mirrorado na migration 07).

## 10 — `20260730110000_fix_ti_triagem_chamado_v_prazos.sql`

**Nome:** Patch — corrige bug de `RECORD` não atribuído em `ti_triagem_chamado`

**Objetos:** `CREATE OR REPLACE FUNCTION ti_triagem_chamado(UUID, UUID, TEXT,
UUID)` — mesma assinatura, corpo com `v_prazo_primeira_resposta`/
`v_prazo_resolucao` escalares (idêntico ao mirrorado na migration 07).
`REVOKE ALL` + `GRANT EXECUTE` reaplicados.

## 11 — `20260730130000_fix_ti_mudar_status_fluxo_operacional.sql`

**Nome:** Patch — revisão de fluxo operacional de `ti_mudar_status`

**Objetos:** `CREATE OR REPLACE FUNCTION ti_mudar_status(UUID, TEXT)` — mesma
assinatura, corpo com transição `atribuido → em_atendimento` manual e
`reaberto → atribuido` (idêntico ao mirrorado na migration 07). `REVOKE ALL`
+ `GRANT EXECUTE` reaplicados.

---

## Dry-run de `supabase db push`

Executado em HML (`tljscgsaqofgrfbjuyif`), sem `--dry-run` omitido — nenhuma
migration foi de fato aplicada. Saída completa:

```
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Would push these migrations:
 • 20260716120000_sprint_3_7_brindes_feira.sql
 • 20260716120100_autoatendimento_destinatarios.sql
 • 20260717090000_sprint_3_8_permissions_pbac.sql
 • 20260717100000_hardening_revoke_anon.sql
 • 20260721120000_hardening_leads_feira_rls.sql
 • 20260722100000_permissions_admin_write_rpcs.sql
 • 20260722150000_sprint_4_1_chamados_ti_fundacao.sql
 • 20260729120000_fix_ti_criar_chamado_notificacao_alias.sql
 • 20260729143000_sprint_4_3_central_atendimento_rpcs.sql
 • 20260730110000_fix_ti_triagem_chamado_v_prazos.sql
 • 20260730130000_fix_ti_mudar_status_fluxo_operacional.sql
 • 20260806120000_harden_gifts_delivery_read_access.sql
Finished supabase db push.
```

Resultado esperado confirmado: as 12 migrations locais (as 11 do escopo desta
auditoria + a Fatia C) aparecem como pendentes — comportamento consistente
com "bookkeeping ausente", não com "nada aplicado". Nenhuma migration foi
empurrada de verdade; nenhum comportamento inesperado.

## Resultado observado (checks read-only em HML)

Script executado uma única vez, `supabase/checks/2026-08-06-migration-history-audit-checks.sql`
(somente leitura). Todas as linhas retornaram o valor esperado, com uma única
divergência — que se mostrou um erro de contagem manual **neste documento**,
não um problema em HML (ver nota abaixo).

**Nota sobre a única divergência encontrada:** a expectativa inicial registrada
para `permissions.resource='tickets'` e para `role_permissions` de `admin` em
`tickets.*` era 18; o valor observado em HML foi **19** para ambos. Recontagem
por grep estrutural do arquivo `20260722150000_sprint_4_1_chamados_ti_fundacao.sql`
(linhas 1918–1936, seed de `permissions`) confirmou **19** códigos
`tickets.*` no arquivo local — a expectativa original deste documento estava
errada (contagem manual), não o HML. Corrigido na seção da migration 07
acima; tratado como COMPROVADO, não como pendência.

### 01 — Status: **COMPROVADA**
Todos os objetos (função, 6 policies, coluna+constraint+índice em
`brinde_entregas`, tabela `brinde_feira_estoque` completa, tabela
`brinde_entrega_itens` completa, RPC `registrar_carga_feira` com grants
corretos) confirmados presentes. A RPC de 7 argumentos
`registrar_entrega_brinde_feira` confirmada **ausente** — supersessão
legítima pela migration 02, conforme previsto. Nenhuma pendência.

### 02 — Status: **COMPROVADA**
Coluna+2 constraints+índice de `tipo_destinatario`, extensão `unaccent`,
função `normalize_dedup_text`, e a RPC `registrar_entrega_brinde_feira` de 12
argumentos (versão vigente) confirmados presentes, com grants corretos
(`anon`: false, `authenticated`: true). Nenhuma pendência.

### 03 — Status: **COMPROVADA**
5 tabelas, 4 índices, 2 funções, 1 trigger e 5 das 6 policies originais
confirmados presentes. A policy "Gestao role_permissions" confirmada
**ausente** — supersessão legítima pela migration 06 (dropada lá), conforme
previsto. Seeds conferidos por contagem exata: `roles`=4,
`permissions`(não-tickets)=47, `role_permissions`(não-tickets) por papel:
admin=41, marketing=30, gestor=24, vendedor=10 — todos batendo com a
contagem estrutural extraída do arquivo. Nenhuma pendência.

### 04 — Status: **COMPROVADA**
Único efeito desta migration (REVOKE/GRANT em 2 funções já existentes)
confirmado: `anon` sem EXECUTE, `authenticated` com EXECUTE, nas duas RPCs.
Nenhuma pendência.

### 05 — Status: **COMPROVADA**
2 funções novas confirmadas. Policy antiga "Acesso total leads_feira"
confirmada **ausente** (dropada nesta própria migration, esperado). As 4
policies granulares novas confirmadas presentes, incluindo verificação de
que "Leitura leads_feira" referencia `has_effective_permission` em sua
expressão `USING`. `anon` sem SELECT em `leads_feira`. Índice
`idx_user_profiles_gestor_id` presente. Nenhuma pendência.

### 06 — Status: **COMPROVADA**
Constraint `permission_change_log_action_check` aceitando `'inherit'`,
5 funções (`count_active_users_with_permissions` + as 4 RPCs de escrita) e
3 triggers (`protect_sensitive_profile_fields`, 2×`lockout_guard`)
confirmados presentes. `count_active_users_with_permissions` corretamente
sem EXECUTE para `authenticated` (só uso interno das 4 RPCs). As 2 policies
antigas ("Gestao user_permissions", "Leitura propria user_permissions")
confirmadas **ausentes** — supersessão legítima nesta própria migration,
substituídas por "Leitura user_permissions". Grants de tabela (`anon`:
false, `authenticated`: true em SELECT; `DELETE` bloqueado para os dois) em
`role_permissions`/`user_permissions`/`permission_change_log`/`user_profiles`
todos confirmados. Nenhuma pendência.

### 07 — Status: **COMPROVADA**
Todos os 14 objetos de tabela, 1 sequence, 21 índices, 5 funções helper,
1 schema (`private`) + 1 função nele, 3 funções utilitárias, 13 policies de
leitura + 1 de gestão própria, e as 11 RPCs do ciclo de vida do chamado
confirmados presentes — cobertura total, não apenas um objeto de amostra.
Verificação adicional de **corpo** de função (via `pg_get_functiondef`, não
apenas assinatura) confirmou que as 4 correções posteriormente
espelhadas aqui realmente estão no texto vigente: `ti_criar_chamado` usa o
alias `destinatarios(profile_id)` (fix da migration 08); `ti_triagem_chamado`
usa `v_prazo_resolucao TIMESTAMPTZ` escalar, não mais `RECORD` (fix da
migration 10); `ti_atribuir_chamado` bloqueia reatribuição (fix da migration
09); `ti_mudar_status` inclui a transição manual `atribuido→em_atendimento`
(fix da migration 11). `protect_sensitive_profile_fields()` confirmada na
versão final (corpo referencia `tipo_vinculo`). Seeds conferidos por
contagem exata: `ti_equipes`=2, `ti_categorias`=8, `ti_sla_regras`=4,
`permissions`(tickets)=19, `role_permissions`(tickets) por papel: admin=19,
marketing=5, gestor=5, vendedor=5 — todos batendo após a correção da
expectativa (ver nota acima). Nenhuma pendência.

### 08 — Status: **COMPROVADA**
Único objeto desta migration (`CREATE OR REPLACE` de `ti_criar_chamado`, sem
mudança de assinatura) confirmado presente com o corpo já validado na seção
07 (mesmo texto, mirrorado). Grants corretos (`anon`: false, `authenticated`:
true). Nenhuma pendência.

### 09 — Status: **COMPROVADA**
As 3 RPCs desta migration (`ti_listar_membros_equipe`, `ti_fila_atendimento`
9-arg, `ti_atribuir_chamado` corrigida) confirmadas presentes, com o corpo de
`ti_atribuir_chamado` já validado na seção 07 (bloqueio de reatribuição).
Grants corretos para `authenticated`. Nenhuma pendência.

### 10 — Status: **COMPROVADA**
Único objeto desta migration (`ti_triagem_chamado`, mesma assinatura)
confirmado presente com o corpo já validado na seção 07 (variáveis
escalares, não `RECORD`). Grant correto para `authenticated`. Nenhuma
pendência.

### 11 — Status: **COMPROVADA**
Único objeto desta migration (`ti_mudar_status`, mesma assinatura) confirmado
presente com o corpo já validado na seção 07 (transição
`atribuido→em_atendimento`). Grant correto para `authenticated`. Nenhuma
pendência.

---

## Resultado consolidado

| Versão | Migration | Status | Evidências | Pendências |
|---|---|---|---|---|
| 20260716120000 | sprint_3_7_brindes_feira | COMPROVADA | 26 objetos verificados (função, 6 policies, 2 tabelas completas, RPC + grants); 7-arg confirmada ausente (supersessão esperada) | Nenhuma |
| 20260716120100 | autoatendimento_destinatarios | COMPROVADA | 8 objetos verificados (coluna+2 constraints+índice, extensão, função, RPC 12-arg + grants) | Nenhuma |
| 20260717090000 | sprint_3_8_permissions_pbac | COMPROVADA | 5 tabelas, 4 índices, 2 funções, 1 trigger, 5 policies + seeds (roles=4, permissions=47, role_permissions=105 por papel) | Nenhuma |
| 20260717100000 | hardening_revoke_anon | COMPROVADA | 4 grants verificados (anon/authenticated × 2 funções) | Nenhuma |
| 20260721120000 | hardening_leads_feira_rls | COMPROVADA | 2 funções, policy antiga ausente (esperado), 4 policies novas + expressão, grant anon, índice | Nenhuma |
| 20260722100000 | permissions_admin_write_rpcs | COMPROVADA | constraint, 5 funções, 3 triggers, 2 policies antigas ausentes (esperado), grants de tabela | Nenhuma |
| 20260722150000 | sprint_4_1_chamados_ti_fundacao | COMPROVADA | 14 tabelas, 1 sequence, 21 índices, 9 funções, 1 schema, 14 policies, 11 RPCs (corpo verificado), seeds exatos | Nenhuma |
| 20260729120000 | fix_ti_criar_chamado_notificacao_alias | COMPROVADA | função + corpo + grants | Nenhuma |
| 20260729143000 | sprint_4_3_central_atendimento_rpcs | COMPROVADA | 3 funções + corpo + grants | Nenhuma |
| 20260730110000 | fix_ti_triagem_chamado_v_prazos | COMPROVADA | função + corpo + grant | Nenhuma |
| 20260730130000 | fix_ti_mudar_status_fluxo_operacional | COMPROVADA | função + corpo + grant | Nenhuma |

## Classificação final: **A) Todas as 11 migrations COMPROVADAS**

Nenhuma PARCIAL, nenhuma NÃO COMPROVADA, nenhuma divergência material entre o
schema de HML e os arquivos locais. A única discrepância numérica encontrada
durante a auditoria foi um erro de contagem manual neste próprio documento
(corrigido, ver nota na seção de resultados), não uma divergência real do
banco.

**Conforme instrução explícita**: esta classificação A é o que **permitiria**,
em uma etapa FUTURA e separada, propor uma reconciliação (marcar as 11
versões antigas como aplicadas, deixar `20260806120000` pendente, verificar
`migration list`, aplicar a Fatia C depois). **Essa reconciliação NÃO foi
executada nesta tarefa** — nenhum `migration repair`, nenhuma criação de
`supabase_migrations.schema_migrations`, nenhum INSERT de histórico. Fica
registrada apenas como o próximo passo possível, pendente de nova aprovação
explícita.
