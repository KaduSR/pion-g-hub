# Sprint 4.1 — Runbook de Implantação (Chamados de TI)

> Documento canônico e executável. Consolida e substitui as duas versões anteriores discutidas em
> sessão de revisão — não é preciso consultar histórico de conversa nenhum para executar isto.
>
> **Escopo**: aplicação da migration de fundação do módulo de Chamados de TI (14 tabelas, RLS,
> RPCs, seeds — ver `docs/architecture/engineering/sprint-4-chamados-ti.md` para a arquitetura
> completa). **Nada foi aplicado no Supabase ainda.** Este runbook autoriza execução **somente em
> homologação/staging**. Aplicação em produção não está autorizada por este documento — exige nova
> aprovação explícita depois que os resultados de homologação forem revisados.

---

## 0. Arquivos envolvidos

- `supabase/migrations/20260722150000_sprint_4_1_chamados_ti_fundacao.sql` — migration de fundação.
- `supabase/rollbacks/sprint_4_1_chamados_ti_fundacao_rollback.sql` — rollback correspondente.
- `supabase/schema.sql` — já contém o mesmo conteúdo da migration, apendado (histórico consolidado).
- `supabase/tests/sprint_4_1_homologacao.sql` — **arquivo único e executável** com o pré-voo de PBAC
  e toda a bateria de testes (RLS/RPCs), numa só transação `BEGIN`...`ROLLBACK`. Este runbook não
  duplica esse SQL — só referencia o arquivo e explica como ler o resultado (seção 6).

---

## 1. Ordem exata de execução

```
1. Gate de ambiente (seção 2) — confirmar homologação, backup/PITR
2. Aplicar 20260722150000_sprint_4_1_chamados_ti_fundacao.sql        (seção 3)
3. Script de validação pós-migration, só leitura                    (seção 4)
4. Cadastro operacional: Nícolas (Sistemas) e Ricardo (Infraestrutura) (seção 5)
5. Rodar supabase/tests/sprint_4_1_homologacao.sql (pré-voo + bateria) (seção 6)
6. Teste HTTP do schema `private`                                    (seção 7)
```

Só depois dos 6 passos, com todos os resultados esperados batendo, a fundação da Sprint 4.1 pode ser
considerada validada em homologação — e só então cabe pedir aprovação para produção.

---

## 2. Gate de ambiente, pré-requisitos e backup

- **Ambiente obrigatório: homologação primeiro.** Se não existir um projeto Supabase de
  homologação/staging separado do de produção, provisione um antes de continuar. Nenhum passo
  abaixo deve rodar direto em produção.
- **Backup/PITR**: antes do passo 2, confirme no dashboard (Database → Backups) o ponto de
  restauração mais recente do projeto de homologação, ou dispare um backup manual se o plano
  permitir. Anote o timestamp.
- **Sem migration concorrente**: confirme que ninguém mais está aplicando SQL no mesmo banco ao
  mesmo tempo.
- **Via de aplicação**: não há `supabase/config.toml` neste repositório (projeto não linkado ao
  CLI) — aplique colando o conteúdo integral do arquivo de migration no **SQL Editor do dashboard**,
  de uma vez só (o arquivo já está internamente na ordem correta: tabelas → funções → RLS → RPCs →
  seeds → `NOTIFY`).
- **Privilégio**: a migration roda `CREATE SCHEMA IF NOT EXISTS private;` — o usuário do SQL Editor
  do Supabase (dono do banco) já tem esse privilégio por padrão.
- **Sem dependência de versão específica do Postgres** — a migration não usa mais nenhuma sintaxe
  exclusiva de versão (o `ON DELETE SET NULL (coluna)` do PG15+ foi revertido para `NO ACTION` em
  revisão anterior).

---

## 3. Aplicar a migration

Cole e execute o conteúdo integral de `supabase/migrations/20260722150000_sprint_4_1_chamados_ti_fundacao.sql`
no SQL Editor do projeto de **homologação**. O próprio arquivo termina com `NOTIFY pgrst, 'reload
schema';` — aguarde alguns segundos após a execução antes de testar a API (propagação do cache do
PostgREST não é instantânea).

---

## 4. Script de validação pós-migration (só leitura)

```sql
-- 1) As 14 tabelas existem e têm RLS habilitada
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relname LIKE 'ti\_%' ESCAPE '\'
ORDER BY relname;
-- Esperado: 14 linhas, relrowsecurity = true em todas.

-- 2) As 17 funções em public + 1 em private existem
SELECT n.nspname, p.proname, p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE 'ti\_%' ESCAPE '\'
ORDER BY n.nspname, p.proname;
-- Esperado: 17 linhas com nspname='public' (8 helpers + 9 RPCs) + 1 linha
-- com nspname='private' (ti_comentario_interno_raw, security_definer=true).

-- 3) Privilégios do schema private
--    Verificação de PUBLIC feita lendo o ACL estruturado via aclexplode():
--    nessa representação, grantee = 0 significa "o grant é pra PUBLIC" (não
--    pra uma role específica) — forma explícita e direta de checar
--    exatamente esse pseudo-role. anon/authenticated são roles reais,
--    continuam via has_schema_privilege() normalmente.
SELECT
  (SELECT EXISTS (
     SELECT 1
     FROM pg_namespace n
     CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) AS acl
     WHERE n.nspname = 'private' AND acl.grantee = 0 AND acl.privilege_type = 'USAGE'
   ))                                                        AS public_tem_usage,        -- esperado: false
  has_schema_privilege('anon', 'private', 'USAGE')          AS anon_tem_usage,           -- esperado: false
  has_schema_privilege('authenticated', 'private', 'USAGE') AS authenticated_tem_usage;  -- esperado: true

-- 4) user_profiles ganhou tipo_vinculo, todo mundo 'interno'
SELECT tipo_vinculo, count(*) FROM public.user_profiles GROUP BY tipo_vinculo;
-- Esperado: só a linha 'interno' | <total de usuários>.

-- 5) Seeds de catálogo
SELECT (SELECT count(*) FROM public.ti_equipes)                           AS equipes,     -- esperado 2
       (SELECT count(*) FROM public.ti_categorias)                        AS categorias,  -- esperado 8
       (SELECT count(*) FROM public.ti_sla_regras)                        AS sla_regras,  -- esperado 4
       (SELECT count(*) FROM public.permissions WHERE resource = 'tickets') AS permissoes; -- esperado 19

-- 6) role_permissions: admin com as 19, os outros 3 com 5 cada
SELECT r.code, count(*)
FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.permissions p ON p.id = rp.permission_id
WHERE p.resource = 'tickets'
GROUP BY r.code ORDER BY r.code;
-- Esperado: admin=19, gestor=5, marketing=5, vendedor=5.

-- 7) Índices críticos de integridade presentes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'ti_chamado_tempos'
  AND indexname = 'uq_ti_chamado_tempos_automatico_aberto';
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'ti_chamados'
  AND indexname = 'idx_ti_chamados_codigo_chamado';
-- Ambas as consultas acima devem retornar 1 linha cada.
```

Se qualquer resultado vier diferente do esperado, **pare e investigue antes de seguir**.

⚠️ Se alguma das consultas acima **falhar com erro** (em vez de só devolver um valor inesperado) — por
exemplo, se a sessão do SQL Editor estiver dentro de uma transação explícita (`BEGIN` aberto
manualmente) no momento do erro — a transação fica presa em estado abortado até um `ROLLBACK;`
explícito; qualquer comando novo enviado antes disso volta o mesmo erro de "current transaction is
aborted". Rode `ROLLBACK;` antes de tentar de novo.

---

## 5. Cadastro operacional: Nícolas (Sistemas) e Ricardo (Infraestrutura)

Preencha os dois e-mails reais e execute:

```sql
-- Confirma que os dois perfis existem e estão ativos antes de prosseguir
SELECT id, nome, email, role, ativo FROM public.user_profiles
WHERE email IN ('<email-nicolas>', '<email-ricardo>');
-- Confirme visualmente: ambos ativo = true.

-- Nícolas → Sistemas, como coordenador
INSERT INTO public.ti_equipe_membros (equipe_id, profile_id, coordenador, ativo)
SELECT e.id, up.id, true, true
FROM public.ti_equipes e, public.user_profiles up
WHERE e.codigo = 'sistemas' AND up.email = '<email-nicolas>'
ON CONFLICT (equipe_id, profile_id) DO UPDATE SET coordenador = true, ativo = true;

-- Ricardo → Infraestrutura, como coordenador
INSERT INTO public.ti_equipe_membros (equipe_id, profile_id, coordenador, ativo)
SELECT e.id, up.id, true, true
FROM public.ti_equipes e, public.user_profiles up
WHERE e.codigo = 'infraestrutura' AND up.email = '<email-ricardo>'
ON CONFLICT (equipe_id, profile_id) DO UPDATE SET coordenador = true, ativo = true;

-- Conferência — filtrada SÓ pelos dois usuários e respectivas equipes
SELECT e.nome AS equipe, up.nome, up.email, tem.coordenador, tem.ativo
FROM public.ti_equipe_membros tem
JOIN public.ti_equipes e ON e.id = tem.equipe_id
JOIN public.user_profiles up ON up.id = tem.profile_id
WHERE (e.codigo = 'sistemas' AND up.email = '<email-nicolas>')
   OR (e.codigo = 'infraestrutura' AND up.email = '<email-ricardo>');
-- Esperado: exatamente 2 linhas, coordenador = true nas duas.
```

O `DO UPDATE SET coordenador = true, ativo = true` (em vez de `DO NOTHING`) garante que rodar este
script de novo sempre convirja para o estado desejado, mesmo que a linha já existisse com outro
valor (ex.: alguém tivesse cadastrado Nícolas como agente comum antes).

⚠️ **`coordenador = true` só afeta roteamento de notificação de reabertura** (quem recebe
`chamado_reaberto` além do responsável) — não concede nenhuma permissão. Para Nícolas e Ricardo
operarem de verdade (ver fila, iniciar cronômetro, comentar, triar), é preciso conceder as
permissões PBAC individuais via Centro de Permissões — pré-requisito explícito do pré-voo dentro de
`supabase/tests/sprint_4_1_homologacao.sql` (seção 6 abaixo).

---

## 6. Bateria de testes

Todo o pré-voo de PBAC e a bateria de testes vivem em **um único arquivo executável**:

```
supabase/tests/sprint_4_1_homologacao.sql
```

Não há SQL duplicado aqui no runbook — este é o único lugar onde esse teste é mantido, para não
haver duas cópias divergentes. Abra o arquivo, preencha os 5 e-mails de teste na seção "0.
Identidades" (topo do arquivo — é o único ponto de edição manual), e rode o arquivo inteiro de uma
vez no SQL Editor do projeto de homologação.

**O que o arquivo faz, em ordem, numa única transação `BEGIN`...`ROLLBACK`:**

1. Cria um helper de asserção (`pg_temp.assert_eq`) e resolve os 5 perfis de teste por e-mail.
2. **Pré-voo** — antes de criar qualquer dado, valida com `has_effective_permission()`:
   - `admin` tem `tickets.triage = true` e `tickets.manage_all = true`;
   - Ricardo (agente usado para provar isolamento entre equipes) tem `tickets.view_team = true`,
     mas **não** tem `tickets.view_all` nem `tickets.triage` (qualquer uma das duas mascararia os
     testes 3 e 5, dando a ele visão do chamado por outro caminho);
   - Nícolas tem `tickets.view_team = true` e `tickets.time_start = true`.
3. **Bateria** (testes 1 a 9): cria um chamado de teste, confere isolamento entre solicitantes e
   entre equipes, triagem, atribuição, início de atendimento, invisibilidade de comentário
   interno/histórico/tempo para o solicitante, bloqueio de resolução com cronômetro aberto, e
   bloqueio total de acesso para perfil inativo.
4. `ROLLBACK` final — desfaz absolutamente tudo, sempre, mesmo se todas as asserções passarem.

**Cada verificação é uma asserção automática** (via `pg_temp.assert_eq(...)` ou, no teste 8, um bloco
`DO`/`EXCEPTION` dedicado) — não são mais `SELECT` para conferência visual. Se qualquer valor não
bater com o esperado, o próprio script lança `RAISE EXCEPTION` identificando o número e a descrição
do teste, junto com o valor esperado e o obtido, e aborta a transação naquele ponto.

**Critério de sucesso**: o arquivo roda do início ao fim e chega no `ROLLBACK` final sem nenhuma
mensagem `TESTE ... FALHOU` nem `PRÉ-VOO ... FALHOU` na saída — só linhas `NOTICE` de "... OK ...".
Se alguma asserção falhar, a mensagem de erro já diz exatamente o que quebrou; não é preciso
executar mais nada para diagnosticar.

---

## 7. Teste do schema `private` (HTTP)

**Pré-requisitos desta seção**: `bash`, `curl` e `jq` instalados na máquina de quem executa (o
script usa os três; sem `jq` os campos `.access_token`/`.code` não são extraídos corretamente do
JSON de resposta).

⚠️ **Segredos — nunca commitar**: o script abaixo tem placeholders (`<seu-projeto-homologacao>`,
`<anon key de homologação>`, `<email-solicitante-teste>`, `<senha-do-teste>`). Ao preenchê-los para
rodar localmente, **salve a cópia preenchida fora do controle de versão** (ex.: fora do repositório,
ou num arquivo já coberto por `.gitignore` — nunca `git add`/`git commit` um arquivo com anon key,
senha ou token reais preenchidos, mesmo que seja só de homologação). Prefira exportar os valores
como variáveis de ambiente na sessão do terminal (`export ANON_KEY=...`) em vez de editar o script
com o segredo dentro.

**Passo manual, antes de rodar o script**: no dashboard do Supabase, abra *Project Settings → API →
Exposed schemas* e confirme visualmente que `private` **não** está na lista (só `public`/
`graphql_public` devem aparecer).

```bash
#!/usr/bin/env bash
set -euo pipefail

SUPABASE_URL="https://<seu-projeto-homologacao>.supabase.co"
ANON_KEY="<anon key de homologação>"
TEST_EMAIL="<email-solicitante-teste>"
TEST_PASSWORD="<senha-do-teste>"

# 1) Login real — obtém um JWT de usuário autenticado. Nunca testar com a
#    anon key: ela nunca teve EXECUTE nessa função, então um resultado
#    negativo com anon não provaria nada sobre exposição de schema.
AUTH_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo "FALHA: não obteve access_token. Resposta do login:"
  echo "$AUTH_RESPONSE" | jq .
  exit 1
fi
echo "OK: access_token obtido (não vazio/nulo)."

# 2) Confirma que o token FUNCIONA antes de usá-lo no teste real — sem
#    isso, um 401 no passo 3 poderia significar só "token inválido/expirado",
#    não "schema bloqueado". Sonda um endpoint conhecido do schema public.
PROBE_STATUS=$(curl -s -o /tmp/probe_body.json -w "%{http_code}" \
  "$SUPABASE_URL/rest/v1/rpc/ti_perfil_ativo_id" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST -d '{}')

if [ "$PROBE_STATUS" != "200" ]; then
  echo "FALHA: o token não funcionou nem no schema public (status $PROBE_STATUS)."
  echo "Corpo da sonda:"; cat /tmp/probe_body.json; echo
  echo "Corrija login/token antes de interpretar o teste do schema private."
  exit 1
fi
echo "OK: token válido — sonda em public.ti_perfil_ativo_id() retornou 200."

# 3) Teste real: pede EXPLICITAMENTE o schema private via Content-Profile,
#    com um token já confirmado válido. Captura status E corpo.
RESULT_STATUS=$(curl -s -o /tmp/private_test_body.json -w "%{http_code}" \
  "$SUPABASE_URL/rest/v1/rpc/ti_comentario_interno_raw" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Profile: private" \
  -H "Content-Type: application/json" \
  -X POST -d '{"p_chamado_id":"00000000-0000-0000-0000-000000000000","p_comentario_id":"00000000-0000-0000-0000-000000000000"}')

RESULT_BODY=$(cat /tmp/private_test_body.json)
RESULT_CODE=$(echo "$RESULT_BODY" | jq -r '.code // empty')

echo "Status HTTP: $RESULT_STATUS"
echo "Corpo da resposta:"
echo "$RESULT_BODY" | jq . 2>/dev/null || echo "$RESULT_BODY"
echo "Campo .code: $RESULT_CODE"

if [ "$RESULT_STATUS" = "406" ] && [ "$RESULT_CODE" = "PGRST106" ]; then
  echo "TESTE OK: schema 'private' corretamente não exposto (406 / PGRST106)."
elif [ "$RESULT_STATUS" = "404" ] && [ "$RESULT_CODE" = "PGRST202" ]; then
  echo "TESTE INCONCLUSIVO: 404/PGRST202 = função ausente ou cache do PostgREST"
  echo "desatualizado — NÃO comprova que o schema está oculto. Rode"
  echo "NOTIFY pgrst, 'reload schema'; e repita este teste antes de concluir."
  exit 2
elif [ "$RESULT_STATUS" = "401" ] || [ "$RESULT_STATUS" = "403" ]; then
  echo "TESTE FALHOU: $RESULT_STATUS sugere que o PostgREST reconheceu"
  echo "schema/função e só a autorização barrou — indício de 'private' exposto."
  echo "Investigue Project Settings > API > Exposed schemas."
  exit 1
elif [ "$RESULT_STATUS" = "200" ]; then
  echo "TESTE CRÍTICO: a função RODOU. Pare e revise Exposed Schemas AGORA."
  exit 1
else
  echo "TESTE INCONCLUSIVO: combinação inesperada de status/código ($RESULT_STATUS / $RESULT_CODE)."
  exit 2
fi
```

**Critério de sucesso único e explícito**: `status == 406` **E** `body.code == "PGRST106"`. Qualquer
outra combinação (incluindo 404/PGRST202) é tratada como inconclusiva ou falha — nunca como sucesso.

---

## 8. Plano de rollback

Arquivo: `supabase/rollbacks/sprint_4_1_chamados_ti_fundacao_rollback.sql`.

- **Seguro rodar** se a validação (seção 4) falhar, ou se a bateria (seção 6) revelar um problema —
  desde que nenhum chamado real (fora dos de teste, já desfeitos pelo `ROLLBACK` da própria
  transação de teste) tenha sido criado no ambiente.
- **Não seguro** se usuários reais já abriram chamados: o rollback dropa as 14 tabelas — todo o
  histórico (chamados, comentários, tempos, notificações) some em definitivo, sem undo. Nesse
  cenário, a correção certa é uma migration nova incremental, não o rollback completo.
- Ordem: desfaz seeds do catálogo PBAC pré-existente → dropa as 9 RPCs → dropa os 8 helpers
  públicos + `ti_perfil_ativo_id` → dropa `private.ti_comentario_interno_raw` e o schema `private` →
  dropa as 14 tabelas (filhas antes de pais) → reverte `protect_sensitive_profile_fields()` →
  remove `user_profiles.tipo_vinculo`. Termina com `NOTIFY pgrst, 'reload schema';`.

---

## 9. Impactos negativos e riscos da aplicação

- **Superfície de API fica viva imediatamente**, mesmo sem nenhuma tela consumindo ainda (Sprint
  4.2+ não existe) — RLS/RPCs precisam estar corretas em produção a partir do instante do deploy.
- **`user_profiles` é tabela compartilhada e de alto tráfego** — a migration adiciona uma coluna
  (`tipo_vinculo`) e substitui `protect_sensitive_profile_fields()` (mesma assinatura, troca atômica
  via `CREATE OR REPLACE`, sem recriar trigger).
- **Cache do PostgREST**: `NOTIFY pgrst, 'reload schema'` pode levar alguns segundos pra propagar —
  chamadas à API logo após aplicar podem falhar transitoriamente até o reload completar.
- **Dependência de configuração de plataforma para o schema `private`**: a proteção de
  `ti_comentario_interno_raw` depende de `private` não estar na lista de "Exposed schemas" do
  Supabase — configuração de dashboard, fora do controle desta migration. O teste da seção 7 é a
  forma de confirmar isso após cada deploy (repita sempre que a lista de schemas expostos mudar).
- **`ti_equipe_membros` nasce praticamente vazia** (só Nícolas e Ricardo) — até mais gente ser
  cadastrada, só essas duas pessoas conseguem ser atribuídas como responsável nas respectivas
  equipes; qualquer tentativa de atribuir a outra pessoa falha corretamente, não é bug.
- **Valores de SLA são temporários, mantidos por decisão explícita**: baixa 8h/3d, média 4h/1d,
  alta 1h/8h, urgente 15min/2h. Chamados abertos entre este deploy e uma eventual reavaliação vão
  carregar prazos calculados com esses números; mudança futura não recalcula chamados já existentes
  retroativamente (só triagem/mudança de prioridade recalcula) — efeito colateral aceito.
- **Sem staging identificado neste repositório antes deste runbook** — se este for o único projeto
  Supabase existente, os passos 4–7 SÃO o teste real antes de dados de produção existirem.

---

## 10. Aprovações pendentes antes de produção

- [ ] Seção 4 (validação pós-migration) rodada em homologação, todos os resultados batendo.
- [ ] Seção 5 (cadastro Nícolas/Ricardo) confirmada.
- [ ] Seção 6 (pré-voo + bateria de testes) rodada até o `ROLLBACK` final, sem nenhum `RAISE
      EXCEPTION` não tratado.
- [ ] Seção 7 (teste HTTP do schema `private`) com resultado `406`/`PGRST106`.
- [ ] Nova aprovação explícita para aplicar em produção, revisando os resultados acima.
