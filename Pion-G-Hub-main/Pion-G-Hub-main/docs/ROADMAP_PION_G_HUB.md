# Roadmap Oficial — PION G HUB

> Documento de referência oficial do backlog estratégico do PION G HUB.
>
> Versão: 1.2
>
> Criado em: 2026-08-10
>
> Última atualização: 2026-08-10 — formalização da Sprint 5.2 (Portais
> Departamentais) e da Sprint 6.0 (Customer Success), a partir de decisões
> de priorização aprovadas fora do repositório (ver Seção 11).
>
> Atualização (2026-08-12): registro do fechamento complementar da Sprint
> 5.1.1 — dois ciclos adicionais de estabilização em Produção (PR #10 e PR
> #11, ver Seção 4 e Seção 11) — e registro de novo backlog não iniciado
> (P1 — Visibilidade Operacional de Brindes; P2 — Associação Kit ↔ Feira,
> ver Seção 8).
>
> Fontes: documentos existentes em `docs/architecture/`, `docs/deployments/`,
> código-fonte (`moduleRegistry.js`, `areaRegistry.js`, `permissions.js`) e
> decisões relatadas diretamente pelo responsável do produto nesta sessão
> (marcadas explicitamente como tal quando não houver documento técnico
> prévio correspondente).

---

## Nota de escopo e relação com outros documentos

Este arquivo é o **novo** documento de referência para backlog estratégico
(sprints pendentes, épicos, dependências, ordem de evolução). Ele **não
substitui** os documentos técnicos existentes — convive com eles e os
referencia:

- `docs/architecture/engineering/06-roadmap.md` — roadmap do *Engineering
  Handbook* (fases genéricas 1–5, princípios de arquitetura, ADRs,
  versionamento). É o documento de **governança de engenharia**, não de
  backlog de produto. **Está desatualizado**: descreve o projeto como "fase
  inicial de consolidação" e lista a Fase 2 (Comercial/Leads) como "🚧 Em
  andamento", sem refletir Sprint 3.8, Sprint 4 (Chamados de TI, já
  encerrada em Produção) nem Sprint 5.1/5.1.1. A única parte deste arquivo
  já sincronizada com a realidade é a tabela de sub-sprints 4.4–4.10, usada
  como base aqui.
- `docs/architecture/engineering/05-future-modules.md` — módulos futuros do
  Engineering Handbook. **Também desatualizado**: trata "BRINDES" e
  "CHAMADOS DE TI" como módulos ainda não implementados, quando ambos já
  têm sprints inteiras entregues e fechadas (ou em fechamento) em Produção.
- `docs/architecture/engineering/04-current-modules.md` — inventário de
  módulos "atuais". Também desatualizado (Dashboard/Leads como "🚧 Em
  desenvolvimento", sem menção a Brindes, Chamados de TI ou Hub por Áreas).

**Recomendação, não executada nesta tarefa** (a tarefa é exclusivamente
criar este roadmap): os três documentos acima do Engineering Handbook
deveriam ser revisados numa tarefa própria para refletir o estado real da
plataforma. Este roadmap usa como fonte de verdade os documentos
específicos por sprint (`docs/deployments/*`, `sprint-4-chamados-ti.md`,
`permissions-pbac-inventario.md`, `07-central-corporativa-servicos.md`) e o
código-fonte, não o Engineering Handbook genérico, sempre que houver
conflito.

### Fonte oficial de planejamento

`docs/ROADMAP_PION_G_HUB.md` (este documento) é a **fonte oficial vigente**
para:

- status das sprints;
- priorização;
- backlog;
- frentes futuras;
- épicos;
- decisões de roadmap.

Documentos específicos de arquitetura (`docs/architecture/**`,
`docs/deployments/**`) continuam sendo fonte de verdade para:

- desenho técnico;
- decisões arquiteturais;
- banco de dados;
- permissões;
- fluxos;
- implementação de cada módulo.

**Em caso de divergência de STATUS ou PRIORIDADE entre um documento
histórico (incluindo `05-future-modules.md` e `06-roadmap.md`) e este
Roadmap Oficial, prevalece o Roadmap Oficial mais recente.** Isso não
altera nem apaga os documentos históricos — eles continuam existindo como
registro e como fonte de desenho técnico; apenas deixam de ser a
referência de status/prioridade a partir da existência deste documento.

---

## Sumário

1. [Título e propósito](#1-título-e-propósito)
2. [Princípios de governança](#2-princípios-de-governança)
3. [Estado atual](#3-estado-atual)
4. [Hard Stop atual](#4-hard-stop-atual)
5. [Roadmap de curto prazo](#5-roadmap-de-curto-prazo)
6. [Roadmap de médio prazo](#6-roadmap-de-médio-prazo)
7. [Épicos estratégicos](#7-épicos-estratégicos)
8. [Backlog futuro por área](#8-backlog-futuro-por-área)
9. [Dependências](#9-dependências)
10. [Itens explicitamente fora do escopo atual](#10-itens-explicitamente-fora-do-escopo-atual)
11. [Histórico de decisões relevantes](#11-histórico-de-decisões-relevantes)
12. [Política de atualização do roadmap](#12-política-de-atualização-do-roadmap)

### Legenda de status

| Ícone | Status |
|---|---|
| ✅ | CONCLUÍDA |
| 🟡 | EM FECHAMENTO |
| 🔵 | PLANEJADA |
| 🟣 | ÉPICO FUTURO |
| ⚪ | BACKLOG |
| ⛔ | BLOQUEADA |

---

## 1. Título e propósito

**PION G HUB — Roadmap Oficial.**

Consolidar em um único documento: sprints pendentes; sprints em fechamento;
épicos aprovados; módulos futuros já discutidos e aprovados
conceitualmente; dependências entre frentes; ordem recomendada de
evolução; e itens concluídos relevantes, apenas quando necessários para
contextualizar o restante do roadmap. Este documento é a referência
oficial do backlog estratégico do PION G HUB a partir desta versão.

---

## 2. Princípios de governança

### Regra obrigatória: conclusão de sprint

**Nenhuma sprint pode ser considerada concluída apenas porque o
desenvolvimento terminou.** O fluxo obrigatório do projeto é:

1. Desenvolvimento em branch isolada
2. Revisão estática e técnica
3. Build/testes locais
4. SQL somente em HML, quando aplicável
5. Validação e smoke test em HML
6. Limpeza de seeds/dados temporários
7. Documentação de fechamento/release checkpoint
8. Revisão final dos arquivos e escopo
9. Commit e push
10. Pull Request
11. Checks/code review
12. Merge
13. Deploy frontend
14. SQL/migrations em Produção, quando aplicável
15. Smoke test em Produção
16. Confirmação de rollback/contingência
17. Encerramento formal da sprint
18. Somente então atualizar `main` e iniciar branch limpa da próxima sprint

Se qualquer um destes passos ainda estiver pendente, a sprint **não** deve
constar como ✅ CONCLUÍDA neste roadmap — deve constar como 🟡 EM
FECHAMENTO, com os passos pendentes explicitados.

### Outros princípios (do Engineering Handbook, `06-roadmap.md`)

- Crescimento modular: todo novo recurso deve ser um módulo independente
  sempre que possível.
- Reutilização: reaproveitar componentes/hooks/serviços compartilhados
  antes de criar novos.
- Escalabilidade sem grandes refatorações.
- Toda decisão arquitetural relevante deve ser documentada (ADR quando
  aplicável).
- PBAC (`has_effective_permission`/`can()`) continua sendo o único
  mecanismo de autorização — organização visual por Área (Sprint 5.1) não
  substitui nem contorna permissão.

### Regra operacional: CHANGE FREEZE durante feira/evento ativo

> Adicionada em 2026-08-12, a partir da experiência operacional da Expo
> Hospital (ver Seção 4 e Seção 11) — não retroativa a decisões
> anteriores a esta data.

Durante feira/evento em operação ativa, Produção entra em **CHANGE
FREEZE**: deploy, migration, hotfix ou alteração estrutural em Produção
somente em janela operacional explicitamente aprovada, com a equipe
orientada a pausar novos cadastros durante a janela.

**Exceção:** somente para P0 com operação bloqueada ou risco ativo de
corrupção/perda de dados — ainda assim, com coordenação da janela sempre
que possível.

---

## 3. Estado atual

Resumo do que está **implementado e em produção** hoje, com base nos
documentos de fechamento existentes (não no Engineering Handbook genérico,
desatualizado nesse ponto):

| Frente | Status | Evidência |
|---|---|---|
| Core (auth, perfis, permissões, layout, sidebar, dashboard base) | ✅ | `04-current-modules.md` (parcialmente desatualizado, mas estas partes conferem) |
| Sprint 3.8 — Centro de Permissões (PBAC) | ✅ | `permissions-pbac-inventario.md`; `06-roadmap.md` |
| Sprint 4.0–4.3 — Módulo de Chamados de TI (fundação + Central de Atendimento) | ✅ | `docs/deployments/2026-08-04-sprint-4.3-production-closure.md` — "Status técnico: APROVADA PARA ENCERRAMENTO" |
| Brindes — módulo base (Sprint 3.1/3.7) | ✅ | `permissions-pbac-inventario.md` ("Brindes já usa PBAC parcial desde a Sprint 3.1/3.7") |
| Sprint 5.1 — Áreas Departamentais (Central de Áreas) | ✅ | `src/modules/hub/areaRegistry.js` ("Sprint 5.1 — Etapa 1"); mergeado via PR #5, commit `f98a9bf` |
| Sprint 5.1.1 — Gestão de Brindes: restrição de acesso, Autoatendimento de kits, hardening de leitura | ✅ CONCLUÍDA | ver Seção 4 |

**Áreas departamentais ativas hoje** (`areaRegistry.js`): Início/Corporativo,
Marketing, Departamento de TI, Administração (4 áreas; a posição `order: 3`
está reservada/não preenchida no registro atual — não presumir para qual
área futura ela está reservada, isso não está documentado). Áreas citadas
como futuras no próprio código (`areaRegistry.js`, comentário): Manutenção,
Financeiro, Estratégia & Governança, Compras, Recursos Humanos.

---

## 4. Hard Stop atual

### Hard Stop resolvido — Sprint 5.1.1 encerrada formalmente em 2026-08-10

**Não há Hard Stop funcional ativo neste roadmap no momento.** O Hard Stop
registrado nesta seção era a Sprint 5.1.1: seu Smoke Test de Produção,
post-checks de segurança e rollback/contingência estão aprovados, e o
documento de encerramento técnico existe —
`docs/deployments/2026-08-10-sprint-5.1.1-production-closure.md`. **Falta
somente o rito Git/documental deste próprio fechamento** (passo 18 do
fluxo formal, Seção 2 — commit, push, PR, checks, merge, sincronização de
`main` e limpeza de branch, ainda em andamento na branch
`chore/sprint-5.1.1-production-closure`) — sua **conclusão é condicionada
ao merge deste fechamento**: uma vez mergeado, `main` sincronizada e a
branch removida, o passo 18 é considerado concluído automaticamente pela
evidência do próprio Git, sem exigir uma nova atualização documental só
para registrar isso. Até lá, nenhuma nova sprint deve iniciar formalmente
uma branch de desenvolvimento. O registro abaixo é **preservado como
histórico** do que motivou este Hard Stop e como ele evoluiu — não foi
apagado, só atualizado com o resultado (ver anotações "CONCLUÍDO"/"✅"
abaixo e Seção 11).

### ✅ Sprint 5.1.1 — Gestão de Brindes (restrição de acesso, Autoatendimento de kits e hardening de leitura)

> A situação descrita no prompt original ("SQL PROD concluído; Smoke PROD
> pendente; encerramento formal pendente") **foi confirmada** com base no
> estado real verificado nesta sessão de trabalho, e diverge do texto do
> documento `docs/deployments/2026-08-06-sprint-5.1.1-gifts-release-checkpoint.md`,
> que ainda declara "Produção NÃO alterada" — **esse checkpoint está
> desatualizado** em relação ao que já ocorreu (merge do PR #6, deploy de
> frontend em Produção e aplicação da migration `20260806120000` em
> Produção). Sinalizado aqui como divergência a corrigir; não corrigido
> nesta tarefa, que é exclusivamente a criação deste roadmap.
>
> **Atualização (2026-08-10):** a divergência sinalizada acima foi
> corrigida — `release-checkpoint.md` e o runbook de hardening receberam
> notas de atualização apontando para o estado real, sem apagar o texto
> histórico original.

- **ID/Sprint:** 5.1.1
- **Nome:** Gestão de Brindes — restrição de acesso (Fatia A), entrega de
  kits no Autoatendimento (Fatia B), hardening de leitura administrativa
  de entregas (Fatia C)
- **Status:** ✅ CONCLUÍDA (era 🟡 EM FECHAMENTO até 2026-08-10 — ver
  Seção 11 para o registro da mudança)
- **Objetivo:** restringir a Gestão de Brindes a gestores; permitir entrega
  de kit (além de item avulso) no Autoatendimento; remover leitura ampla
  de `brinde_entregas`/`brinde_entrega_itens` e fechar lacuna de `anon` em
  `confirmar_entrega_brinde`.
- **Escopo conhecido:** ver `docs/deployments/2026-08-06-sprint-5.1.1-gifts-release-checkpoint.md`
  (checkpoint pré-PR) e `docs/deployments/2026-08-10-sprint-5.1.1-production-closure.md`
  (encerramento de Produção, resultado final).
- **Dependências:** Sprint 3.7 (Brindes base), Sprint 3.8 (PBAC).
- **Pré-requisitos:** nenhum pendente — todos concluídos.
- **Critério de entrada:** já iniciada.
- **Critério de conclusão (passos do fluxo formal, Seção 2 — passos 15–17
  concluídos em 2026-08-10; passo 18 pendente, ver abaixo):**
  - passo 15 (Smoke test em Produção) — **CONCLUÍDO**: aprovado pelo
    usuário (Fatia A, Fatia B item avulso, Fatia B kit, mais regressão de
    cadastro de lead pela Captação e pelo Autoatendimento);
  - passo 16 (confirmação de rollback/contingência revisada antes do
    encerramento) — **CONCLUÍDO**: script revisado e classificado como
    "REVISADO E DISPONÍVEL", não executado por não haver regressão que o
    justificasse;
  - passo 17 (encerramento formal da sprint, com documento próprio) —
    **CONCLUÍDO**: `docs/deployments/2026-08-10-sprint-5.1.1-production-closure.md`;
  - passo 18 (main atualizada e branch limpa para a próxima sprint) —
    **CONCLUSÃO CONDICIONADA AO MERGE DESTE FECHAMENTO:** enquanto a
    branch `chore/sprint-5.1.1-production-closure` não estiver mergeada
    em `main`, a Sprint 6.1 permanece bloqueada. Após o merge deste
    fechamento, sincronização local de `main` com `origin/main` e
    remoção segura da branch local/remota, este passo será considerado
    automaticamente **CONCLUÍDO** pela evidência do próprio Git, sem
    necessidade de um novo PR exclusivamente documental.
- **Observações:** PR #6 mergeado (`0734725`); migration `20260806120000`
  aplicada em HML e em Produção, ambas validadas por post-check read-only
  (policies amplas removidas, `anon` sem `EXECUTE`, `authenticated`/
  `service_role` preservados). **O Hard Stop funcional desta sprint está
  resolvido** (Smoke, rollback e encerramento técnico aprovados) — falta
  apenas o passo 18, cuja conclusão é **condicionada ao merge deste
  fechamento** (acima) e não exige nova atualização documental para ser
  reconhecida. Uma vez concluído, a Sprint 6.1 — Customer Success (Seção
  5) e as Sprints 4.4–4.10 (Seção 5) ficam **liberadas para início**, cada
  uma sujeita ao seu próprio fluxo formal de 18 passos (Seção 2). Elegível
  para início **não significa iniciada** — nenhuma delas foi iniciada
  nesta tarefa.

### Atualização (2026-08-12) — Fechamento complementar: PR #10 e PR #11

Após o encerramento formal registrado acima (2026-08-10), a operação ao
vivo da feira Expo Hospital revelou a necessidade de dois ciclos
adicionais de estabilização em Produção, tratados como hotfixes
independentes (fora do fluxo de uma nova sprint numerada) — **não
retroagem** ao status ✅ CONCLUÍDA da Sprint 5.1.1 acima, que permanece
válido para o escopo original (Fatia A/B/C):

- **PR #10** — `fix(gifts): consume fair stock for event deliveries`.
  Corrigiu baixa dupla de estoque: `confirmar_entrega_brinde` (fluxo
  legado) decrementava o estoque **global** mesmo para entregas
  vinculadas a uma feira, duplicando a baixa já aplicada corretamente
  pelo estoque **local** da carga via `registrar_entrega_brinde_feira`.
  Merge em `main`: `16d9f912029290eded8bd60cdcedfdd104639022`. Migration
  em Produção: `20260811160000_fix_confirmar_entrega_brinde_feira_guard.sql`
  (guarda que bloqueia `confirmar_entrega_brinde` para `feira_id IS NOT
  NULL`, consolidando o consumo de brindes vinculados a feira
  exclusivamente pelo estoque local da carga).
- **PR #11** — `fix(expo): stabilize lead capture and fair gift delivery`.
  Estabilização operacional durante a Expo Hospital: proteção de
  rascunho de leads em `sessionStorage`; persistência/restauração da
  feira selecionada; Cidade/UF preenchidos a partir da feira; seleção
  rápida de vendedor pela equipe real da feira; remoção operacional do
  campo Produto de Interesse; suporte a quantidade de kits (>1) por
  entrega vinculada a feira; distinção visual "estoque central" x saldo
  local da feira. Commit: `24ebde378073a70418d5a62e4f95c1004df93005`.
  Merge em `main`: `dc524de5ca16cde38876ce92fbc8a2d3a9f8f74b`. Deployment
  Production: ID `5872750847`, status `success`. Migration em Produção:
  `20260812130000_fair_delivery_kit_quantity.sql`.

Detalhamento completo (validação HML, aplicação PROD, smoke PROD final)
em `docs/deployments/2026-08-12-sprint-5.1.1-expo-stabilization-closure.md`.
Este ciclo também motivou o registro da regra de **CHANGE FREEZE durante
feira/evento ativo** (Seção 2) e o novo backlog **P1 — Visibilidade
Operacional de Brindes** e **P2 — Associação Kit ↔ Feira** (Seção 8),
nenhum dos dois iniciado.

---

## 5. Roadmap de curto prazo

### Ordem estratégica atual — prioridade ≠ numeração

A numeração de uma sprint indica origem e continuidade técnica dentro do
seu módulo — **não** determina, por si só, a ordem cronológica de
execução. A ordem de execução é decisão de priorização de produto,
registrada à parte. Estado atual da priorização:

- **HARD STOP FUNCIONAL DA SPRINT 5.1.1** → resolvido (Smoke Produção,
  post-checks e rollback/contingência aprovados; documento de encerramento
  criado). Falta só o passo 18 (Seção 4), cuja conclusão é **condicionada
  ao merge deste fechamento** — nenhuma sprint nova inicia formalmente uma
  branch de desenvolvimento antes disso, inclusive a 6.1.
- **SPRINT 6.0 — CUSTOMER SUCCESS** → ✅ CONCLUÍDA. Correspondeu à
  abertura formal da frente e ao desenho macro/funcional (não a
  implementação) — ver entrada abaixo.
- **PRÓXIMA FRENTE EXECUTÁVEL** → Sprint 6.1 — Fundação do Customer
  Success (abaixo), primeira sprint de implementação da frente. Bloqueada
  para abertura de branch até o merge deste fechamento; uma vez mergeado,
  `main` sincronizada e a branch de fechamento removida, fica **liberada
  para início** pela própria evidência do Git, sem exigir nova atualização
  documental — **não iniciada nesta tarefa**.
- **BACKLOG TÉCNICO JÁ APROVADO** → Sprints 4.4 a 4.10 (módulo de Chamados
  de TI, subseção seguinte). Permanecem **planejadas e não canceladas** —
  apenas tiveram a prioridade de execução postergada em relação à frente
  de Customer Success (Sprint 6.1).
- **Sprint 5.2 — Portais Departamentais** (Seção 6) também permanece
  planejada; não se assume que será executada antes ou depois da Sprint
  6.1 — a ordem relativa entre as duas ainda não foi decidida.

### Sprint 6.0 — Customer Success

> Numeração e prioridade formalizadas neste Roadmap Oficial a partir de
> decisão de priorização aprovada fora do repositório — a ausência de
> documentação técnica prévia não invalida a decisão (ver Seção 11).
>
> **Atualização (2026-08-10, mesmo dia):** a Sprint 6.0 foi concluída —
> correspondeu à abertura formal da frente e ao desenho macro/funcional,
> não à implementação. Entradas anteriores desta seção e da Seção 11 que a
> descrevem como 🔵 PLANEJADA refletem o estado real no momento em que
> foram escritas, dentro desta mesma sessão de trabalho, e não foram
> reescritas retroativamente (ver Seção 11 para a cronologia completa).
> **A próxima frente executável é a Sprint 6.1**, logo abaixo.

- **ID/Sprint:** 6.0
- **Nome:** Customer Success — abertura formal da frente e desenho macro
- **Status:** ✅ CONCLUÍDA
- **Objetivo:** abrir formalmente a frente de Customer Success — desenho
  funcional e arquitetural do workspace de CS. A Sprint 6.0 **não entregou**
  o produto final do módulo — entregou o desenho aprovado sobre o qual as
  subsprints de implementação (6.1 a 6.8) foram definidas.
- **Entregue nesta sprint:**
  - abertura formal da frente, com prioridade definida como próxima frente
    estratégica após a Sprint 5.1.1;
  - desenho funcional e arquitetural completo, aprovado e registrado em
    `docs/ROADMAP_CUSTOMER_SUCCESS.md` (documento filho deste Roadmap
    Oficial — criado, revisado e mergeado via PR #8 em 2026-08-10);
  - decomposição evolutiva em subsprints 6.1 a 6.8, formalizada nesse
    documento;
  - **nenhuma implementação funcional de Customer Success** — nenhum
    componente React, rota, SQL ou migration de CS foi criado nesta
    sprint. A primeira sprint de implementação é a **Sprint 6.1**.
- **Escopo conhecido:** desenho funcional e arquitetural completo,
  incluindo a decomposição em subsprints (6.1 a 6.8), registrado em
  `docs/ROADMAP_CUSTOMER_SUCCESS.md` (documento filho deste Roadmap
  Oficial, aprovado em 2026-08-10). Resumo do escopo original que
  fundamentou esse desenho (fonte primária:
  `docs/architecture/cs/arquiteture_cs.md`, notas informais de requisito,
  não especificação técnica formalizada):
  - **Dashboard:** total de divergências no mês; pesquisas de satisfação;
    alerta de clientes insatisfeitos; alerta de clientes com mais de 3
    divergências (reincidência); comparativo mensal do índice de
    satisfação.
  - **Divergências:** visão por setor (Produção, Qualidade, Logística,
    Comercial — nomenclatura do documento-fonte, distinta das "áreas
    departamentais" do Hub); contador histórico/comparativo; página
    pública externa ao sistema para o cliente registrar não conformidade
    (nome, telefone, razão social, anexos, descrição).
  - **Pesquisa de satisfação:** respostas; índices; controle de
    periodicidade por cliente (~6 meses); resumo anual com extração de
    clientes insatisfeitos.
  - **SLA:** tempo médio de resolução de divergências; alerta acima de 48h.
  - **Clientes em Atenção:** combinação de critérios como insatisfação,
    reincidência e SLA/prazo estourado (síntese do prompt original — o
    documento-fonte não usa exatamente esse nome de seção, mas o conteúdo é
    compatível com os alertas do Dashboard já descritos acima).
  - **Tratamento de divergências:** registro; classificação; status;
    responsável; prazo; comentários; anexos; relacionamento com cliente;
    relacionamento com pedido/ordem ou entidade correspondente (síntese do
    prompt original, coerente com a página pública de registro já descrita
    em `arquiteture_cs.md`, mas sem confirmação linha a linha no
    documento-fonte).
- **Restrição importante (confirmada no código):** Pesquisas e Respostas
  de satisfação **pertencem hoje ao Marketing**, não ao CS —
  `src/modules/hub/areaRegistry.js` documenta explicitamente essa decisão
  de negócio ("não há área Customer Success ativa com processos próprios
  nesta fase"). **Não mover essas funcionalidades automaticamente para
  CS** — o workspace de CS só deve ganhar processos próprios conforme
  forem de fato desenvolvidos.
- **Dependências:** PBAC (✅, para as novas permissões do módulo); Sprint
  5.1 (✅, para onde o portal de CS vai viver na navegação por Áreas).
- **Pré-requisitos:** encerramento formal da Sprint 5.1.1 (Seção 4) —
  **concluído em 2026-08-10** (passos 15–17; passo 18 — rito Git deste
  fechamento — ainda em andamento, ver Seção 4).
- **Critério de entrada:** desenho funcional e arquitetural aprovado pelo
  responsável do produto — **atendido**.
- **Critério de conclusão — ATENDIDO:** desenho funcional/arquitetural
  fechado e aprovado, com a decomposição em subsprints (6.1 a 6.8)
  registrada em documento próprio — `docs/ROADMAP_CUSTOMER_SUCCESS.md`,
  aprovado e mergeado em 2026-08-10 (PR #8). A Sprint 6.0 em si não incluiu
  nenhuma implementação — só o desenho. A execução (Sprint 6.1) segue
  sujeita ao seu próprio fluxo formal de 18 passos (Seção 2) e ao passo 18
  pendente da Sprint 5.1.1 (Seção 4).
- **Observações:** decisão de priorização formalizada neste Roadmap
  Oficial em 2026-08-10 (Seção 11). Decomposição em subsprints (6.1–6.8)
  existe em `docs/ROADMAP_CUSTOMER_SUCCESS.md` — não duplicada aqui, para
  evitar duas fontes de verdade sobre o mesmo detalhamento. A próxima
  frente **executável** é a Sprint 6.1, abaixo.

### Sprint 6.1 — Fundação do Customer Success (próxima frente executável)

> Detalhamento completo do escopo em `docs/ROADMAP_CUSTOMER_SUCCESS.md`
> (seção "Sprint 6.1 — Fundação do Customer Success") — não duplicado
> aqui, para evitar duas fontes de verdade.

- **ID/Sprint:** 6.1
- **Nome:** Fundação do Customer Success (carteira manual)
- **Status:** 🔵 PLANEJADA / ELEGÍVEL PARA INÍCIO
- **Objetivo:** criar a base funcional mínima para o CS operar — workspace,
  permissões iniciais, carteira de clientes, inclusão manual, atribuição
  de responsável, listagem e filtros básicos (detalhes completos no
  documento filho).
- **Dependências:** Sprint 6.0 (✅, desenho aprovado).
- **Pré-requisitos:** conclusão do passo 18 da Sprint 5.1.1 (Seção 4) —
  `main` atualizada e branch de fechamento limpa. Bloqueada para abertura
  de branch enquanto `chore/sprint-5.1.1-production-closure` não estiver
  mergeada; a liberação é reconhecida automaticamente pela evidência do
  próprio Git (merge + `main` sincronizada + branch removida), sem exigir
  nova atualização documental.
- **Critério de entrada:** desenho aprovado (Sprint 6.0, ✅) + passo 18 da
  Sprint 5.1.1 concluído (merge deste fechamento).
- **Observações:** **NÃO iniciada nesta tarefa** — nenhum código, SQL,
  migration, componente React ou rota de Customer Success foi criado.

### Backlog técnico já aprovado — módulo de Chamados de TI (Sprint 4.4–4.10)

Sub-sprints já numeradas oficialmente do módulo de Chamados de TI
(`06-roadmap.md`, `sprint-4-chamados-ti.md`) — numeração preservada como
está documentada, não reorganizada. **Permanecem planejadas: não foram
canceladas, apenas tiveram a prioridade de execução postergada** em
relação à frente de Customer Success (Sprint 6.1, ver "Ordem estratégica
atual" acima).

| Sprint | Nome | Status |
|---|---|---|
| 4.4 | Cronômetro e Tempo Trabalhado | 🔵 PLANEJADA |
| 4.5 | Notificações in-app | 🔵 PLANEJADA |
| 4.6 | Anexos nos Chamados | 🔵 PLANEJADA |
| 4.7 | SLA, Dashboard e Relatórios de TI | 🔵 PLANEJADA |
| 4.8 | Notificações por E-mail | 🔵 PLANEJADA |
| 4.9 | Base de Conhecimento de TI | 🔵 PLANEJADA |
| 4.10 | Catálogo de Serviços e Refinamentos | 🔵 PLANEJADA |

> Nota: `06-roadmap.md` marcava a 4.9 como "⚠️ pendente de confirmação".
> `sprint-4-chamados-ti.md` (linha 24 e seção 14) confirma o nome "Base de
> Conhecimento de TI" — usado aqui como resolvido, não como divergência.

### Sprint 4.4 — Cronômetro e Tempo Trabalhado
- **Status:** 🔵 PLANEJADA
- **Escopo conhecido:** sessões de trabalho; cronômetro de atendimento;
  lançamentos manuais; histórico de tempo por chamado (`ti_iniciar_tempo`,
  `ti_encerrar_tempo`, `ti_lancar_tempo_manual`, `ti_chamado_tempos` já
  existem no banco desde a Sprint 4.1 — a UI/fluxo de uso ainda não).
- **Dependências:** Sprint 4.0–4.3 (✅).
- **Observações:** `sprint-4-chamados-ti.md` seção 6 já documenta que
  SLA × tempo trabalhado não são a mesma coisa — distinção a preservar.

### Sprint 4.5 — Notificações in-app
- **Status:** 🔵 PLANEJADA
- **Escopo conhecido:** central/sino de notificações; eventos: novo
  chamado, atribuição, comentários, mudanças relevantes, resolução e
  demais eventos já definidos no módulo (`ti_notificacoes` existe desde a
  Sprint 4.1).
- **Dependências:** Sprint 4.0–4.3 (✅).

### Sprint 4.6 — Anexos nos Chamados
- **Status:** 🔵 PLANEJADA
- **Escopo conhecido:** anexos em chamados; anexos em comentários;
  tratamento de arquivos ligados a comentários internos; permissões
  correspondentes (`ti_chamado_anexos` existe desde a Sprint 4.1, RLS por
  linha já apontada como requisito em `sprint-4-chamados-ti.md`, seção 13).
- **Dependências:** Sprint 4.0–4.3 (✅).

### Sprint 4.7 — SLA, Dashboard e Relatórios de TI
- **Status:** 🔵 PLANEJADA
- **Escopo conhecido:** primeira resposta; tempo de resolução; SLA;
  chamados vencidos; chamados próximos do vencimento; volume por
  categoria/equipe/prioridade; tempo trabalhado; produtividade;
  indicadores gerenciais.
- **Dependências:** Sprint 4.4 (tempo trabalhado) recomendável, não
  necessariamente bloqueante para todos os indicadores.

### Sprint 4.8 — Notificações por E-mail
- **Status:** 🔵 PLANEJADA
- **Escopo conhecido:** eventos importantes dos chamados enviados por
  e-mail; controle de envio; tratamento de falhas.
- **Dependências:** Sprint 4.5 (mesma arquitetura de eventos, e-mail é
  etapa posterior ao in-app segundo `sprint-4-chamados-ti.md` seção 9).

### Sprint 4.9 — Base de Conhecimento de TI
- **Status:** 🔵 PLANEJADA
- **Escopo conhecido:** artigos; categorias; busca; sugestão de artigos na
  abertura de chamado; vínculo entre solução e artigo; transformar
  resolução de chamado em conhecimento reutilizável (`ti_kb_artigos`,
  `ti_chamado_kb_artigos` já existem no banco desde a Sprint 4.1, só
  leitura habilitada até aqui).
- **Dependências:** Sprint 4.0–4.3 (✅).

### Sprint 4.10 — Catálogo de Serviços e Refinamentos
- **Status:** 🔵 PLANEJADA
- **Escopo conhecido:** administração de categorias, equipes e regras de
  SLA; refinamentos da Central de Atendimento; preparação para a evolução
  corporativa do catálogo de serviços (ponte conceitual com o épico Central
  Corporativa de Serviços, Seção 7).
- **Dependências:** Sprint 4.0–4.3 (✅); serve de base conceitual para a
  Fase 1 (Catálogo de Serviços) do épico Central Corporativa.

---

## 6. Roadmap de médio prazo

### Sprint 5.2 — Portais Departamentais (evolução da Central de Áreas)

> Numeração formalizada neste Roadmap Oficial a partir de decisão
> arquitetural aprovada anteriormente fora do repositório, ainda não
> refletida em documentos versionados (ver Seção 11). O prompt original já
> se referia a este item como "Sprint 5.2"; na versão anterior deste
> roadmap essa numeração havia sido sinalizada como não encontrada no
> repositório — agora formalizada por decisão explícita do responsável do
> produto.

- **ID/Sprint:** 5.2
- **Nome:** Portais Departamentais
- **Status:** 🔵 PLANEJADA
- **Objetivo:** cada área departamental (Marketing, TI, e futuras) ganhar
  seu próprio portal, sem sobrecarregar a Central de Áreas com dados
  pesados.
- **Escopo conhecido:**
  - princípios técnicos aprovados:
    - cada área terá seu próprio portal;
    - Central de Áreas carrega apenas informações mínimas;
    - KPIs são buscados somente quando o portal é aberto;
    - lazy loading;
    - cache temporário;
    - consultas agregadas/RPCs (não trazer volumes grandes de linhas para
      o frontend calcular);
    - foco em performance e escalabilidade;
  - conceito documentado relacionado: `07-central-corporativa-servicos.md`
    já prevê "Fase 5 — Portais Departamentais" (TI, Marketing, Manutenção,
    Compras, RH, outros) como parte do épico Central Corporativa de
    Serviços — não fica claro nos documentos existentes se a Sprint 5.2 é
    a mesma iniciativa da Fase 5 do épico, ou uma evolução mais restrita e
    anterior (só performance/lazy-loading da Central de Áreas já
    existente, sem o motor de roteamento/formulários do épico). **Sinalizado
    para decisão do time, não assumido aqui.**
- **Dependências:** Sprint 5.1 (✅, fornece a estrutura de Áreas que este
  item evolui).
- **Pré-requisitos:** Sprint 5.1.1 formalmente encerrada (Seção 4, regra
  geral do roadmap).
- **Observações:** sem ordem de execução assumida em relação à Sprint 6.1
  — Fundação do Customer Success (Seção 5); ambas são planejadas, e a
  ordem relativa entre elas ainda não foi decidida.

---

## 7. Épicos estratégicos

### 🟣 Central Corporativa de Serviços
- **Status:** 🟣 ÉPICO FUTURO — aprovado conceitualmente, **nada
  implementado ainda** (`07-central-corporativa-servicos.md` é explícito:
  "Não implementar nada deste épico agora", "Sprint 5.1 não implementará
  esse motor").
- **Objetivo:** porta única corporativa para solicitação e acompanhamento
  de serviços internos — o colaborador escolhe o serviço, o sistema
  determina departamento, equipe, formulário, aprovação, prioridade, SLA e
  fila automaticamente.
- **Áreas previstas inicialmente (conforme documentado):** Tecnologia,
  Marketing, Manutenção, **Compras**, Recursos Humanos.
  > **Divergência sinalizada:** o prompt original lista "Tecnologia;
  > Marketing; Manutenção; Qualidade; Suprimentos; RH" — seis áreas, com
  > "Suprimentos" no lugar de "Compras" e incluindo "Qualidade", que não
  > aparece em `07-central-corporativa-servicos.md`. Mantido aqui o que
  > está oficialmente documentado (5 áreas, "Compras") como fonte de
  > verdade; a divergência fica registrada para o time decidir se o
  > documento-fonte deve ser atualizado.
- **Fases do épico (documentadas em `07-central-corporativa-servicos.md`):**
  1. Catálogo de Serviços
  2. Formulários Dinâmicos
  3. Roteamento
  4. Aprovações e SLA
  5. Portais Departamentais
  6. Indicadores Corporativos
- **Dependências:** Sprint 4.10 (Catálogo de Serviços do módulo de TI, base
  conceitual); Sprint 5.1 (✅, estrutura de Áreas).
- **Limites arquiteturais já registrados:** não generalizar `ti_chamados`
  prematuramente; não forçar todos os departamentos a usar o mesmo fluxo;
  não misturar autorização com organização visual; PBAC continua
  controlando acesso; catálogo corporativo não concede acesso operacional
  ao departamento.
- **Observações:** este roadmap **não implementa nada deste épico** — só
  o registra.

> **Nota:** o Módulo de Customer Success deixou de ser tratado como épico
> futuro nesta versão do roadmap — foi promovido a **Sprint 6.0 —
> Customer Success** (abertura formal da frente/desenho macro; status
> atual em Seção 5), por decisão de priorização formal. A próxima frente
> executável é a **Sprint 6.1**, também na Seção 5.

---

## 8. Backlog futuro por área

Itens abaixo não têm número de sprint — registrados como frentes futuras,
sem inventar numeração.

### Marketing — Métricas & Campanhas
- **Status:** ⚪ BACKLOG
- **Confirmado no código:** `moduleRegistry.js`, módulo `metrics-and-campaigns`
  (`status: 'planned'`), com filhos Métricas, Campanhas, Custos, Relatórios.
- **Escopo conhecido:** métricas; campanhas; custos; performance;
  relatórios; evolução futura para ROI (ROI citado no prompt original, não
  encontrado explicitamente no registro de código, que já lista Custos e
  Relatórios).

### Integrações
- **Status:** ⚪ BACKLOG
- **Confirmado no código:** `moduleRegistry.js`, módulo `integrations`
  (`status: 'planned'`), com filhos RD Station, NOMUS, APIs externas.
- **Objetivo estratégico:** reduzir dependência de soluções fragmentadas;
  PION G HUB como ponto central de integração (`05-future-modules.md`
  também lista Magazord, Microsoft 365, Google Workspace, Power BI e
  gateways de pagamento como integrações futuras mais amplas).

### Feiras & Leads — Credenciamento
- **Status:** ⚪ BACKLOG
- **Confirmado no código:** `moduleRegistry.js`, item `Credenciamento`
  dentro do módulo `fairs-and-leads` (`status: 'planned'`).
- **Escopo conhecido:** funcionalidade futura ligada à jornada de eventos e
  feiras — sem detalhamento adicional nos documentos revisados.

### Brindes — Fluxo de Solicitação
- **Status:** ⚪ BACKLOG
- **Escopo conhecido (do prompt original — não encontrado em documento do
  repositório):** para vendedores/solicitantes, evoluir o fluxo para
  "Solicitar brinde" em vez de acesso operacional direto à entrega;
  Marketing ou perfis autorizados atendem/aprovam; "Nova entrega"
  permanece restrita aos perfis autorizados.
- **Observações:** coerente com a direção já tomada na Sprint 5.1.1
  (restringir `gifts.deliver` a um fluxo específico, Autoatendimento), mas
  este item específico de aprovação/solicitação não está registrado em
  nenhum documento técnico existente — registrado aqui pela primeira vez.

### Brindes — Custos
- **Status:** ⚪ BACKLOG
- **Confirmado no código:** `moduleRegistry.js`, item `Financeiro de
  Brindes` dentro do módulo `gifts-management` (`status: 'planned'`).
- **Escopo conhecido:** evoluir o módulo para controles financeiros/custos
  relacionados aos brindes.

### Brindes — Visibilidade Operacional (P1)
- **Status:** ⚪ BACKLOG (não iniciado)
- **Origem:** registrado em 2026-08-12, a partir do fechamento
  complementar da Sprint 5.1.1 (Seção 4) — estabilização operacional
  Expo Hospital (PR #10 e PR #11).
- **Escopo conhecido:**
  - **P1.1** — Saídas por produto.
  - **P1.2** — Origem kit x avulso.
  - **P1.3** — Indicadores + período.
- **Observações:** nenhuma das três frentes foi iniciada nesta tarefa.

### Brindes — Associação Kit ↔ Feira (P2)
- **Status:** ⚪ BACKLOG (não iniciado)
- **Origem:** mesmo fechamento complementar acima (Seção 4) — item já
  identificado durante o diagnóstico de estabilização operacional e
  deliberadamente adiado para depois do evento (P0/P1 tratados
  primeiro).
- **Escopo conhecido:** associação formal entre kit e feira (hoje a
  disponibilidade de kit numa feira é calculada dinamicamente a partir
  dos componentes presentes na carga local, sem um vínculo explícito
  kit↔feira registrado).
- **Dependências:** P1 — Visibilidade Operacional de Brindes (acima) —
  ordem relativa sugerida pelo prompt original, não uma dependência
  técnica rígida.
- **Observações:** não iniciado nesta tarefa.

### Personalização Visual dos Módulos
- **Status:** ⚪ BACKLOG
- **Escopo conhecido (do prompt original — não encontrado em documento do
  repositório):** permitir futuramente configurar imagem/ilustração,
  ícone, descrição, ordem e visibilidade de módulos administrativamente.
  `moduleRegistry.js` já tem campos `icon`/`visualType`/`imageUrl`
  definidos por módulo hoje (hardcoded no código, não editável via UI) —
  esta frente tornaria esses campos administráveis.

### Dashboard Corporativo / Executivo
- **Status:** ⚪ BACKLOG
- **Confirmado em documento:** `05-future-modules.md`, seção "DASHBOARDS
  EXECUTIVOS" (💡 Em estudo) — indicadores consolidados, comparativos,
  tendências, performance por departamento.
- **Restrição importante (confirmada no código):** o `/dashboard` atual
  pertence ao Marketing e trabalha principalmente com dados de Feiras,
  Leads e Pesquisas — `areaRegistry.js` confirma isso explicitamente
  ("Dashboard Geral pertence ao Marketing... nenhum indicador corporativo
  cross-departamental"). **Não tratar o `/dashboard` atual como dashboard
  corporativo definitivo.**

### Planejamento Estratégico
- **Status:** ⚪ BACKLOG
- **Escopo conhecido (do prompt original — não encontrado em documento do
  repositório):** objetivos; metas; indicadores; responsáveis;
  acompanhamento; dashboards derivados do planejamento. Registrado aqui
  pela primeira vez.

### Gestão de Projetos
- **Status:** ⚪ BACKLOG
- **Escopo conhecido (do prompt original — não encontrado em documento do
  repositório):** módulo próprio de gestão de projetos, referência
  conceitual (não literal) ao Monday — evolução em fases, conforme
  necessidade real da empresa, **sem tentar clonar o Monday integralmente**.
  Registrado aqui pela primeira vez.

### Inventário e Governança Tecnológica
- **Status:** ⚪ BACKLOG
- **Escopo conhecido (do prompt original — não encontrado em documento do
  repositório):** centralizar sistemas, ativos, responsáveis, acessos,
  contratos, custos, integrações, criticidade e utilização. Relacionado à
  estratégia corporativa de racionalização de sistemas e redução de SaaS.
  Registrado aqui pela primeira vez. Observação: `2026-08-04-sprint-4.3-production-closure.md`
  já cita "ativos e equipamentos" como melhoria futura do módulo de TI —
  possível ponto de conexão entre as duas frentes, não resolvido aqui.

---

## 9. Dependências

| Item | Depende de | Tipo |
|---|---|---|
| Qualquer nova sprint (inclusive 4.4) | Encerramento formal da Sprint 5.1.1 | Bloqueante (governança, Seção 2/4) |
| Sprint 4.5 (notificações in-app) | Sprint 4.0–4.3 (✅) | Técnica (tabelas já existem) |
| Sprint 4.8 (e-mail) | Sprint 4.5 (mesma arquitetura de eventos) | Técnica/arquitetural |
| Sprint 4.7 (SLA/Dashboard) | Sprint 4.4 (tempo trabalhado) | Recomendada, não totalmente bloqueante |
| Sprint 4.10 (Catálogo de Serviços) | Sprint 4.0–4.3 (✅) | Técnica |
| Épico Central Corporativa — Fase 1 | Sprint 4.10 (base conceitual de catálogo) | Conceitual |
| Épico Central Corporativa — Fase 5 (Portais Departamentais) | Sprint 5.1 (✅) | Técnica |
| Sprint 5.2 — Portais Departamentais (Seção 6) | Sprint 5.1 (✅); encerramento formal da 5.1.1 (✅, concluído 2026-08-10, exceto passo 18 pendente) | Técnica + governança — dependência satisfeita |
| Sprint 6.0 — Customer Success (Seção 5) | PBAC (✅); Sprint 5.1 (✅) | Técnica — dependências satisfeitas; **sprint concluída** (desenho macro/funcional) |
| Sprint 6.1 — Fundação do CS (Seção 5) | Sprint 6.0 (✅); passo 18 da Sprint 5.1.1 — pendente do rito Git deste fechamento (Seção 4) | Técnica + governança — próxima frente executável, elegível, não iniciada |
| Sprints 4.4–4.10 (retomada da execução) | Encerramento formal da 5.1.1 (✅, concluído 2026-08-10, exceto passo 18 pendente); decisão de priorização relativa à Sprint 6.1 | Governança/priorização — permanecem planejadas, elegíveis tecnicamente, aguardando decisão de priorização de execução |
| Marketing — Métricas & Campanhas / Integrações | Fontes de dados externas (NOMUS, RD Station) | Externa |
| Dashboard Corporativo | Existência de múltiplos portais departamentais com dados agregáveis | Conceitual |

---

## 10. Itens explicitamente fora do escopo atual

- Aplicação de qualquer código, banco, migration, componente ou
  configuração nesta tarefa (tarefa é exclusivamente documental).
- Implementação de qualquer fase do épico Central Corporativa de Serviços.
- Decompor a Sprint 6.0 em subsprints (6.1, 6.2, 6.3...) antes do
  fechamento do desenho funcional — não inventado neste roadmap.
- Mover Pesquisas/Respostas de satisfação do Marketing para o CS
  automaticamente.
- Tratar o `/dashboard` atual como dashboard corporativo definitivo.
- Clonar o Monday integralmente na futura Gestão de Projetos.
- Reorganizar a numeração já oficial das sprints existentes.
- Iniciar a Sprint 6.1 ou qualquer implementação funcional de Customer
  Success nesta tarefa — o Hard Stop da Sprint 5.1.1 foi liberado em
  2026-08-10 (Seção 4), o que torna a Sprint 6.1 **elegível**, mas isso
  não equivale a iniciá-la, e não foi feito aqui.
- Assumir ordem de execução entre a Sprint 5.2 e a Sprint 6.1 — nenhuma
  precedência entre elas foi decidida.
- Assumir que as Sprints 4.4–4.10 foram canceladas — apenas tiveram a
  prioridade de execução postergada (Seção 5); com o Hard Stop da 5.1.1
  liberado, ficam tecnicamente elegíveis, mas nenhuma foi iniciada.

---

## 11. Histórico de decisões relevantes

- **Sprint 3.8 — Centro de Permissões (PBAC):** concluída. Estabeleceu
  `roles`/`permissions`/`role_permissions`/`user_permissions` como modelo
  de autorização central do Hub. Nenhum "Sprint 2.10 — Centro de
  Permissões" foi encontrado em nenhum documento do repositório — se essa
  numeração existiu em algum momento, já foi inteiramente absorvida pela
  Sprint 3.8 sem deixar rastro documental, e não é tratada aqui como
  pendência.
- **2026-08-04 — Encerramento de Produção da Sprint 4.3** (fundação +
  Central de Atendimento do módulo de Chamados de TI): registrou como
  "Nova diretriz arquitetural" a evolução do Hub para estrutura por áreas
  departamentais (Início/Corporativo, Marketing, TI, Customer Success,
  Manutenção, Financeiro, Estratégia & Governança, Administração) — esta
  decisão é a origem direta da Sprint 5.1.
- **Sprint 5.1 — Áreas Departamentais:** implementada, mergeada via PR #5
  (`f98a9bf`). `07-central-corporativa-servicos.md` registra explicitamente
  que a Sprint 5.1 **não** implementa o motor da Central Corporativa de
  Serviços — só prepara a navegação.
- **Sprint 5.1.1:** antes de aplicar a Fatia C (hardening de leitura),
  conduzida uma auditoria read-only completa das 11 migrations históricas
  do módulo de Brindes/TI em HML (`docs/deployments/2026-08-06-hml-migration-history-reconciliation-audit.md`,
  classificação A — todas comprovadas) e um plano formal de reconciliação
  de bookkeeping (`docs/deployments/2026-08-06-hml-migration-history-reconciliation-plan.md`),
  antes de qualquer `migration repair`. PR #6 mergeado (`0734725`);
  migration `20260806120000` aplicada em HML e, nesta mesma sessão, em
  Produção — Smoke Produção e encerramento formal seguem pendentes (Seção
  4). *(Nota: este era o estado da Sprint 5.1.1 até este ponto do
  histórico — ver a entrada "2026-08-10 — Encerramento formal da Sprint
  5.1.1", mais abaixo nesta mesma seção, para a resolução.)*
- **Sprint 5.2 (Portais Departamentais) — conceito vs. formalização:** o
  conceito técnico (portal próprio por área, KPIs sob demanda, lazy
  loading, cache temporário, RPCs agregadas) já havia sido aprovado
  arquiteturalmente antes desta atualização, fora do repositório — não foi
  encontrada, na documentação/histórico existentes, uma data confiável
  para essa aprovação conceitual, então nenhuma data retroativa foi
  atribuída a ela. **2026-08-10 — Formalização da Sprint 5.2 no Roadmap
  Oficial:** é a data em que a numeração e o escopo foram registrados
  formalmente neste documento, primeira vez em que passam a existir em
  documento versionado.
- **Sprint 6.x (Customer Success) — origem vs. priorização:** a frente
  Sprint 6.x já havia sido definida anteriormente no desenho do módulo
  (data de origem não documentada com precisão neste repositório — não
  atribuída retroativamente). **2026-08-10 — Priorização executiva da
  Sprint 6.0:** data em que foi formalizada a decisão de que a Sprint 6.0
  — Customer Success passa a ser a **próxima frente estratégica** do PION
  G HUB após o fechamento obrigatório da Sprint 5.1.1, registrada como
  Sprint 6.0 (abertura formal da frente/desenho funcional; naquele
  momento, ainda sem decomposição em subsprints — posteriormente
  formalizada em `docs/ROADMAP_CUSTOMER_SUCCESS.md`). As Sprints 4.4–4.10
  não foram
  canceladas por essa decisão — só tiveram a prioridade de execução
  postergada em relação à Sprint 6.0. *(Nota: nesta data a Sprint 6.0
  ainda estava 🔵 PLANEJADA — ver a entrada "2026-08-10 — Sprint 6.0
  concluída (abertura formal da frente)", mais abaixo nesta mesma seção,
  para a evolução posterior, no mesmo dia, para ✅ CONCLUÍDA.)*
- **2026-08-10 — Aprovação do desenho funcional da Sprint 6.0 — Customer
  Success:** desenho funcional e arquitetural completo aprovado e
  registrado em `docs/ROADMAP_CUSTOMER_SUCCESS.md` (documento filho deste
  Roadmap Oficial), incluindo a decomposição evolutiva em subsprints
  (6.1 a 6.8). Decisões registradas nesse documento: entrada inicial de
  clientes na carteira de CS será manual, sem integração automática nesta
  fase; integração automática com NOMUS e/ou RD Station fica prevista para
  uma sprint de evolução futura (Sprint 6.7); pesquisas de satisfação
  continuam pertencendo ao Marketing. **A aprovação do desenho não
  autoriza o início da execução** — a Sprint 6.1 continua condicionada ao
  encerramento formal da Sprint 5.1.1 (Hard Stop, Seção 4); nenhuma
  implementação, SQL, componente ou migration de Customer Success foi
  criada nesta data.
- **2026-08-10 — Encerramento formal da Sprint 5.1.1:** Smoke Test
  funcional em Produção aprovado pelo usuário (Fatia A — vendedor sem
  Gestão de Brindes e acesso direto a `/brindes` bloqueado; Fatia B —
  entrega de item avulso e de kit pelo Autoatendimento; regressão de
  cadastro de lead pela Captação e pelo Autoatendimento); post-checks de
  segurança da Fatia C aprovados em Produção (policies amplas ausentes,
  policies de gestor presentes, `anon` sem `EXECUTE` em
  `confirmar_entrega_brinde`, `authenticated`/`service_role`
  preservados); rollback/contingência revisado e classificado como
  "REVISADO E DISPONÍVEL", **não executado** por não haver regressão que
  o justificasse. Documento de encerramento criado:
  `docs/deployments/2026-08-10-sprint-5.1.1-production-closure.md`.
  `docs/deployments/2026-08-06-sprint-5.1.1-gifts-release-checkpoint.md`
  e `docs/deployments/2026-08-06-sprint-5.1.1-gifts-data-hardening-runbook.md`
  receberam notas de atualização apontando para o resultado final, sem
  apagar o texto histórico original (ambos descreviam corretamente o
  estado do checkpoint em que foram escritos). **Sprint 5.1.1 passa de
  🟡 EM FECHAMENTO para ✅ CONCLUÍDA neste roadmap; o Hard Stop
  **funcional** da Seção 4 é liberado** (Smoke, post-checks e rollback
  aprovados) — o passo 18 (commit/push/PR/merge/sincronização de `main`
  desta própria documentação de fechamento, branch
  `chore/sprint-5.1.1-production-closure`) permanece **pendente do rito
  Git** e só se completa depois do merge deste fechamento. Isso torna a
  Sprint 6.1 — Customer Success e as Sprints 4.4–4.10 elegíveis para
  início — **nenhuma delas foi iniciada nesta tarefa.**
- **2026-08-10 — Sprint 6.0 concluída (abertura formal da frente):**
  correção de status registrada no mesmo dia em que a Sprint 6.0 foi
  priorizada (ver entrada "Sprint 6.x (Customer Success) — origem vs.
  priorização", acima). Reconhecido que o objetivo real da Sprint 6.0 —
  abertura formal da frente e desenho macro/funcional de Customer Success,
  aprovado em `docs/ROADMAP_CUSTOMER_SUCCESS.md` (PR #8, `b4d0b0f`), com a
  decomposição evolutiva 6.1–6.8 formalizada — já estava **integralmente
  atendido**, o que tornava incoerente mantê-la como 🔵 PLANEJADA. Sprint
  6.0 passa para **✅ CONCLUÍDA** (Seção 5). Nenhuma implementação
  funcional de Customer Success ocorreu na Sprint 6.0 — a primeira sprint
  de execução é a **Sprint 6.1 — Fundação do Customer Success**, nova
  entrada própria criada na Seção 5, que permanece **🔵 PLANEJADA /
  ELEGÍVEL PARA INÍCIO** e **não foi iniciada nesta tarefa**. Entradas
  anteriores desta seção que descrevem a Sprint 6.0 como recém-priorizada
  ou como a "próxima frente" não foram reescritas — permanecem como
  registro do estado no momento em que foram escritas.
- **2026-08-12 — Fechamento complementar da Sprint 5.1.1 (estabilização
  operacional Expo Hospital):** dois hotfixes aplicados em Produção após
  o encerramento formal de 2026-08-10 (Seção 4) — **PR #10** (correção de
  baixa dupla de estoque global em entregas vinculadas a feira, migration
  `20260811160000`) e **PR #11** (estabilização operacional durante a
  Expo Hospital — draft de leads, restauração de feira, Cidade/UF,
  seleção de vendedor, quantidade de kits, migration `20260812130000`).
  Ambos validados integralmente em HML antes da aplicação em Produção;
  smoke PROD final read-only confirmou RPC `registrar_entrega_brinde_feira`
  com exatamente 1 overload (13 parâmetros, `p_quantidade_kits DEFAULT
  1`), grants corretos (`authenticated`/`service_role`/`postgres`, sem
  `anon`/`PUBLIC`), PostgREST reconhecendo a nova assinatura, e os 53
  leads e 35 entregas históricas da Expo Hospital preservados, sem
  nenhum dado fake criado no smoke. Detalhamento completo em
  `docs/deployments/2026-08-12-sprint-5.1.1-expo-stabilization-closure.md`.
  A partir da experiência operacional deste ciclo, foi registrada a
  regra de **CHANGE FREEZE durante feira/evento ativo** (Seção 2) e um
  novo backlog não iniciado: **P1 — Visibilidade Operacional de Brindes**
  (P1.1 Saídas por produto; P1.2 Origem kit x avulso; P1.3 Indicadores +
  período) e **P2 — Associação Kit ↔ Feira** (Seção 8). Este fechamento
  complementar não altera o status ✅ CONCLUÍDA da Sprint 5.1.1 original
  (Fatia A/B/C, 2026-08-10) nem o passo 18 pendente (rito Git do PR #9,
  Seção 4) — ambos permanecem como registrados.

---

## 12. Política de atualização do roadmap

- Este documento deve ser atualizado sempre que o status de uma sprint,
  épico ou item de backlog mudar.
- Nenhum item passa para ✅ CONCLUÍDA sem que as 18 etapas do fluxo formal
  (Seção 2) estejam completas e documentadas em um checkpoint/closure
  próprio — a atualização aqui deve **referenciar** esse documento, não
  substituí-lo.
- Itens sem numeração oficial de sprint não devem receber número neste
  roadmap por conveniência — a numeração é decisão do time, feita quando o
  planejamento técnico da sprint realmente começar.
- Itens marcados neste documento como "não encontrados em documento do
  repositório" (Seções 5, 6, 7 e 8) devem ser promovidos a documentação
  técnica própria assim que a sprint correspondente for planejada — este
  roadmap não substitui essa documentação, só registra a existência da
  decisão conceitual.
- Numeração formalizada neste roadmap a partir de decisão aprovada fora do
  repositório (ex.: Sprint 5.2, Sprint 6.0) é válida a partir do momento em
  que é registrada aqui — a ausência de documentação técnica prévia não
  invalida a decisão de produto, mas o desenho técnico correspondente
  ainda precisa ser produzido antes da execução.
- Divergências entre este roadmap e a implementação real (código,
  migrations, documentos de fechamento) devem ser tratadas como problema
  de documentação a corrigir o quanto antes, não ignoradas.
- Recomenda-se revisão a cada encerramento formal de sprint e, no mínimo,
  antes do início de qualquer novo épico.
