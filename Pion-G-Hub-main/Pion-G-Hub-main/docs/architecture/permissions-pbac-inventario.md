# Sprint 3.8 — Centro de Permissões (PBAC): Inventário e Catálogo

> Documento de análise "antes de desenvolver", conforme pedido na Sprint 3.8.
> Substitui, ao longo da migração, o modelo descrito em `docs/architecture/permissions.md`
> (RBAC simples por role) — este arquivo cobre **Etapa 1 (Inventário)** e
> **Etapa 2 (Catálogo de Permissões)**. As Etapas 3–7 (banco, backend, frontend,
> UI administrativa, rollout) estão propostas ao final, mas **não implementadas
> ainda** — ver seção "Estado desta entrega" no fim do arquivo.

---

## Etapa 1 — Inventário completo de funcionalidades

Levantado por inspeção direta de todas as páginas/componentes/services em
`src/modules/*` e `src/routes/AppRoutes.jsx`. Para cada ação, indico o
**gating atual** (o que já impede ou não o acesso hoje).

### Dashboard
| Ação | Gating atual |
|---|---|
| Visualizar Dashboard (geral) | Rota: `dashboard.view` OU `dashboard.view_team` |
| Ver gráficos de equipe (vendedor/segmento/feira, completos) | Nenhum — só ausentes quando `isViewOwn` (client-side) |
| Ver resumo de pesquisas de satisfação no Dashboard | Nenhum — só ausente quando `isViewOwn` |

### Feiras
| Ação | Gating atual |
|---|---|
| Visualizar Feiras | Rota: `fairs.view` |
| Criar Feira | **Nenhum** (botão sempre visível pra quem acessa `/feiras`) |
| Editar Feira | **Nenhum** |
| Excluir Feira (hard delete, remove leads junto) | **Nenhum** |
| Encerrar Feira | **Não existe como ação própria** — é só um valor a mais no `<Select>` de Status (Planejada/Em andamento/Finalizada) dentro do form de editar |
| Ver leads da feira (atalho) | Nenhum (herda de `/leads`) |
| Copiar link do autoatendimento interno | **Nenhum** |
| Equipe da feira — Adicionar/Remover integrante | **Nenhum** (checkbox list dentro do form de criar/editar feira) |

### Leads
| Ação | Gating atual |
|---|---|
| Visualizar Leads (todos/equipe/próprios) | Rota: `leads.view_all` \| `leads.view_team` \| `leads.view_own` (só decide *se* a tela abre — dentro dela, todo mundo vê a mesma listagem completa, sem filtro real por equipe/próprio) |
| Criar Lead (captação) | Rota: `leads.capture` |
| Editar Lead (alterar status inline) | **Nenhum** |
| Excluir Lead | **Nenhum** — qualquer um que acesse `/leads` apaga qualquer lead |
| Exportar Excel | **Não existe hoje** — é roadmap (mencionado pelo usuário, sem UI implementada) |
| `leads.manage_all/team/own` (já existem no mapa) | **Não usados por nenhuma tela hoje** — só declarados |

### Brindes (já usa PBAC parcial desde a Sprint 3.1/3.7)
| Ação | Gating atual |
|---|---|
| Visualizar Estoque/Kits/Movimentações/Carga da Feira | `gifts.manage` |
| Criar/Editar/Excluir Item, Kit | `gifts.manage` (bundle único — não há ação individual) |
| Ajustar estoque / Carga da Feira | `gifts.manage` |
| Liberar Brinde (Entregas) | `gifts.manage` OU `gifts.deliver` |
| Cancelar Entrega | `gifts.manage` (implícito — botão só aparece na aba Entregas, mesma condição) |
| Confirmar entrega (fluxo antigo, kit/avulso) | `gifts.manage` |

### Autoatendimento
| Ação | Gating atual |
|---|---|
| Visualizar (`/atendimento`) | Rota: `leads.capture` (reaproveitado, sem permissão própria) |
| Cadastrar novo lead (dentro do Autoatendimento) | `leads.capture` (reaproveitado) |
| Liberar Brinde (lead ou cliente existente) | `gifts.deliver` no banco (RPC `registrar_entrega_brinde_feira`, via `is_gifts_deliverer()`) |
| ~~Ler Credencial (QR)~~ | **DESCONTINUADA (revisão pós-checkpoint da Sprint 3.8)** — a integração com o QR da credencial da organizadora foi descartada por impossibilidade técnica. `FEATURES.qrCredentialReader` foi desligada (`false`); o componente `CredentialScanner.jsx` pode continuar no repositório por ora, mas não deve receber nenhuma permissão nova nem ser reativado sem uma decisão explícita revertendo esta descontinuação. |
| Ativar/Desativar autoatendimento por feira | **Não existe** — não há um "toggle" de habilitar/desabilitar autoatendimento numa feira hoje; qualquer feira "Planejada"/"Em andamento" aceita o fluxo público E o interno |
| Gerar link (público, kiosk) | **Nenhum** — botão de copiar link em `/feiras` |
| Gerar link (interno, autenticado) | **Nenhum** — mesmo botão, agora aponta pra `/atendimento/:feiraId` |

### Usuários (Administração)
| Ação | Gating atual |
|---|---|
| Visualizar lista de usuários | Rota: `users.manage` (só isso — não há `users.view` separado) |
| Criar usuário | **Nenhum na página/componente** — só o gate de rota `users.manage` |
| Editar usuário (cargo, setor, role) | **Nenhum na página/componente** |
| Ativar/Desativar usuário | **Nenhum na página/componente** |
| Resetar senha de outro usuário | **Nenhum na página/componente** (só um check de UI pra não aparecer no próprio card) |
| (Toda a autorização real de escrita hoje mora na Edge Function `admin-auth`, fora do escopo deste inventário de frontend) | |

### Configurações
| Ação | Gating atual |
|---|---|
| Alterar Nome do sistema / Subtítulo | Rota: `settings.manage` (bundle único) |
| Alterar Logo (upload/remover) | `settings.manage` |
| Alterar Cor primária | `settings.manage` |
| (Não existe "Alterar Tema" — só cor primária) | |

### Meu Perfil
| Ação | Gating atual |
|---|---|
| Ver o próprio perfil | Rota: `profile.view` |
| Editar nome/telefone/cargo/setor/avatar (próprio) | Implícito em `profile.view` — sem permissão própria |
| Alterar a própria senha | Implícito em `profile.view` |
| Editar e-mail / role (próprio) | **Bloqueado por design** (campos read-only na UI, não é uma permissão) |

### Pesquisa de Satisfação (não tem permissão própria — reaproveita `fairs.view`)
| Ação | Gating atual |
|---|---|
| Visualizar pesquisas por feira | Rota: `fairs.view` (reaproveitado) |
| Criar pesquisa | **Nenhum** além da rota |
| Ativar/Desativar pesquisa | **Nenhum** |
| Duplicar pesquisa | **Nenhum** |
| Criar/Editar/Excluir/Reordenar pergunta | **Nenhum** (só bloqueado estruturalmente se a pesquisa já tem resposta — regra de negócio, não de permissão) |
| Ver respostas (`/pesquisas/respostas`) | Rota: `fairs.view` (reaproveitado) |
| Responder pesquisa (público, sem login) | N/A — rota pública por design, fora do PBAC |

### Relatórios
| Ação | Gating atual |
|---|---|
| Exportar relatório (todos) | `reports.export` — **declarada no mapa, sem nenhuma tela/botão que a consuma hoje** |
| Exportar relatório (equipe) | `reports.export_team` — idem |

### Rota pública de Autoatendimento (kiosk, `/autoatendimento`)
Fora do escopo do PBAC por design — cadastro de lead sem login, protegido só
por RPCs `SECURITY DEFINER` com validação server-side própria (honeypot,
duplicidade por telefone/e-mail). Nenhuma ação aqui deve ganhar permissão de
usuário, porque não há usuário autenticado nesse fluxo.

### Funcionalidades futuras já no roadmap (`moduleRegistry.js`, `status: 'planned'`)
- Credenciamento (Feiras & Leads)
- Financeiro de Brindes
- Métricas & Campanhas (Métricas, Campanhas, Custos, Relatórios)
- Integrações (RD Station, NOMUS, APIs externas)

---

## Achado crítico: anti-padrão de checagem por role (fora do `can()`)

Dois pontos no código decidem visibilidade comparando `profile.role` direto
contra uma lista hardcoded, sem passar pelo sistema de permissões:

1. `src/modules/fairs/pages/LeadCapturePage.jsx:25`
   ```js
   if (!profile || ['admin', 'gestor', 'marketing'].includes(profile.role)) return true
   ```
2. `src/modules/selfservice/components/FairSelector.jsx:12`
   ```js
   const isManager = !profile || ['admin', 'gestor', 'marketing'].includes(profile.role)
   ```

Os dois implementam a mesma regra ("gestor de feira vê todas; os demais só
veem as feiras da própria equipe"). Candidatos naturais a virar uma
permissão nova (`fairs.view_all_teams` ou similar) na Etapa 7.

Também vale registrar: `getDefaultRouteForRole` (`permissions.js:177`)
compara `role === ROLES.VENDEDOR` — esse é o **único** ponto de role-string
que deve **permanecer** assim mesmo após a migração completa, porque decidir
"pra onde mandar quem não tem permissão nenhuma" é inerentemente uma decisão
por identidade de role, não por permissão (não faz sentido "ter a permissão
de ser redirecionado pra `/captacao`").

---

## Etapa 2 — Catálogo de Permissões

**Decisão de nomenclatura**: o pedido original usa singular (`fair.view`,
`lead.view`, `gift.view`). O sistema já em produção usa **plural**
(`fairs.view`, `leads.view_all`, `gifts.manage` — ver
`src/modules/permissions/constants/permissions.js`). Adotar singular
agora exigiria renomear toda constante já usada em `ROLE_PERMISSIONS`,
`ROUTE_PERMISSIONS`, `MENU_PERMISSIONS` e `moduleRegistry.js` — uma
migração cosmética de alto risco e zero valor funcional. **Mantive o padrão
plural já em produção** e apliquei a mesma convenção `recurso.acao` para
tudo que é novo. Sinalize se isso não for aceitável — é reversível, mas
melhor decidir antes de gerar as migrations da Etapa 3.

Legenda: 🟢 já existe e já está em uso · 🟡 já existe mas nunca é checada por
nenhuma tela · 🆕 proposta nova (ação hoje sem permissão dedicada) · 🔮 roadmap
(funcionalidade ainda não implementada).

### dashboard
| Permissão | Status |
|---|---|
| `dashboard.view` | 🟢 |
| `dashboard.view_team` | 🟢 |

### fairs
| Permissão | Status |
|---|---|
| `fairs.view` | 🟢 |
| `fairs.create` | 🆕 (hoje bundled em `fairs.manage`) |
| `fairs.edit` | 🆕 |
| `fairs.delete` | 🆕 |
| `fairs.finish` | 🆕 (encerrar feira — hoje é só um valor de status) |
| `fairs.team_manage` | 🆕 (adicionar/remover `feira_equipe`) |
| `fairs.view_all_teams` | 🆕 (substitui o anti-padrão `role IN (admin,gestor,marketing)` do item acima) |
| `fairs.manage` | 🟢 (mantida como alias agregado = create+edit+delete+finish+team_manage, pra não quebrar nada existente) |

### leads
| Permissão | Status |
|---|---|
| `leads.view_all` / `view_team` / `view_own` | 🟢 |
| `leads.capture` | 🟢 |
| `leads.edit` | 🆕 (alterar status inline) |
| `leads.delete` | 🆕 |
| `leads.export` | 🔮 |
| `leads.manage_all` / `manage_team` / `manage_own` | 🟡 (mantidas como aliases agregados de edit+delete no escopo correspondente) |

### gifts
| Permissão | Status |
|---|---|
| `gifts.view` | 🆕 (hoje entra junto de `gifts.manage`) |
| `gifts.create` | 🆕 |
| `gifts.edit` | 🆕 |
| `gifts.delete` | 🆕 |
| `gifts.stock_adjust` | 🆕 (carga da feira, movimentações, ajustes) |
| `gifts.deliver` | 🟢 |
| `gifts.cancel_delivery` | 🆕 |
| `gifts.manage` | 🟢 (mantida como alias agregado) |

### selfservice
| Permissão | Status |
|---|---|
| `selfservice.view` | 🆕 (hoje reaproveita `leads.capture`) |
| ~~`selfservice.credential_scan`~~ | ❌ **REMOVIDA (revisão pós-checkpoint)** — leitura de QR de credencial descontinuada, ver Etapa 1 (Autoatendimento). Não está no catálogo nem no seed. |
| `selfservice.enable` / `selfservice.disable` (por feira) | 🔮 (não existe a funcionalidade de ligar/desligar autoatendimento por feira) |

> `selfservice.lead_capture` e `selfservice.gift_deliver` **não são
> permissões novas** — a intenção é continuar reaproveitando `leads.capture`
> e `gifts.deliver`, já que a ação de fundo é literalmente a mesma (cadastrar
> lead / liberar brinde), só que disparada a partir de uma tela diferente.
> Duplicar a permissão só pelo contexto de origem criaria dois lugares pra
> manter a mesma regra.

### users
| Permissão | Status |
|---|---|
| `users.view` | 🆕 |
| `users.create` | 🆕 |
| `users.edit` | 🆕 |
| `users.disable` | 🆕 |
| `users.reset_password` | 🆕 |
| `users.manage` | 🟢 (mantida como alias agregado) |

### settings
| Permissão | Status |
|---|---|
| `settings.edit` | 🆕 (nome consistente com o padrão `recurso.acao`) |
| `settings.manage` | 🟢 (mantida como alias — a granularidade branding/geral fica pra depois, não há tela hoje que precise dessa separação) |

### profile
| Permissão | Status |
|---|---|
| `profile.view` | 🟢 |
| `profile.edit_own` | 🆕 |
| `profile.change_password_own` | 🆕 |

### satisfaction
| Permissão | Status |
|---|---|
| `satisfaction.view` | 🆕 (hoje reaproveita `fairs.view`) |
| `satisfaction.manage` | 🆕 (criar/editar/duplicar/ativar/reordenar) |
| `satisfaction.responses_view` | 🆕 |

### reports
| Permissão | Status |
|---|---|
| `reports.export` / `reports.export_team` | 🟡 (declaradas, sem tela que use) |

### permissions (NOVO — revisão pós-checkpoint)
Cobre o próprio Centro de Permissões (Etapa 6). Concedidas **só a `admin`**
no seed — nenhum outro papel tem nenhuma delas hoje, propositalmente
(administrar permissões é raiz de confiança do sistema, ver seção RLS da
Etapa 3).
| Permissão | Status |
|---|---|
| `permissions.view` | 🆕 |
| `permissions.manage` | 🆕 ("Gerenciar papéis, vínculos de permissões e sobrescritas individuais" — **não** inclui gerenciar o catálogo `permissions` em si, ver Etapa 3) |
| `permissions.audit_view` | 🆕 |

**Contagem final do catálogo: 47 permissões** (45 originais − 1 `selfservice.credential_scan` removida + 3 `permissions.*` novas).

---

## Etapa 3 — Banco de Dados (SQL real, revisado)

O SQL completo vive em `supabase/migrations/20260717090000_sprint_3_8_permissions_pbac.sql`
(replicado em `supabase/schema.sql`, seção "SPRINT 3.8") — não duplicado
aqui para não haver duas versões da mesma coisa divergindo com o tempo.
Resumo do desenho final, já com as correções do checkpoint de revisão:

- **5 tabelas**: `permissions` (catálogo), `roles` (espelha `user_profiles.role`
  como entidade própria), `role_permissions` (N:N), `user_permissions`
  (overrides individuais grant/revoke), `permission_change_log` (auditoria).
- **2 funções novas**: `is_permissions_admin()` (STABLE, só `role='admin'` e
  `ativo=true` — **não** usa `is_gifts_manager()`, que incluiria
  marketing/gestor) e `protect_system_roles()` (função de trigger).
- **1 trigger**: `trg_protect_system_roles` em `roles` (`BEFORE UPDATE OR DELETE`)
  — bloqueia excluir um papel `is_system=true`, trocar seu `code`, ou
  reverter `is_system` para `false`. Nome/descrição continuam editáveis.
- **RLS**: leitura aberta a `authenticated` em `permissions`/`roles`/`role_permissions`
  (necessário pra Etapa 5 montar `can()` no client). Escrita (INSERT/UPDATE/DELETE):
  - `permissions` (catálogo) e `permission_change_log`: **somente leitura para
    todo mundo, inclusive admin** — nenhuma policy de escrita existe. Novo
    código de permissão só entra por migration nova, nunca pela UI
    administrativa; `permission_change_log` só é gravável por trigger/RPC
    `SECURITY DEFINER` (roda com privilégio do dono da função, não do
    usuário — RLS fechado não impede isso, só impede um `INSERT` solto do
    frontend).
  - `roles`, `role_permissions`, `user_permissions`: escrita restrita a
    `is_permissions_admin()`, com `TO authenticated` explícito. É o que a
    Etapa 6 vai administrar de fato.
  - `user_permissions` tem leitura adicionalmente restrita ao próprio dono da linha.
- **Privilégios de função**: `is_permissions_admin()` — `REVOKE ALL FROM PUBLIC`
  + `GRANT EXECUTE TO authenticated`. `protect_system_roles()` (função de
  trigger) — só `REVOKE ALL FROM PUBLIC`, sem grant a ninguém: uma função de
  trigger não é chamada por SQL direto de um usuário, só pelo mecanismo de
  trigger do Postgres, então revogar de `PUBLIC` não impede o trigger de
  disparar no `UPDATE`/`DELETE` de `roles`.
- **Seed**: 4 roles atuais + 47 permissões do catálogo + ~105 vínculos
  role↔permissão, espelhando `ROLE_PERMISSIONS` de `permissions.js` +
  backfill de granulares (ver regra no cabeçalho da migration).
  `permissions.view/manage/audit_view` vão só para `admin`.

**`user_profiles.role` não é removida.** Continua existindo como hoje —
`roles.code` é o elo (`user_profiles.role = roles.code`). Isso preserva
`getDefaultRouteForRole` e qualquer outro ponto que ainda precise saber "qual
é o role deste usuário" sem reescrever o cadastro de perfis.

**Nenhum objeto pré-existente foi alterado.** `is_gifts_manager()` deixou de
ser referenciada por esta sprint (não é mais usada em nenhuma policy das 5
tabelas novas, ao contrário da primeira versão revisada no checkpoint) — ela
continua intocada, cobrindo só o que já cobria antes (brindes, satisfação).

---

## Auditoria: bloqueios para papéis dinâmicos (sem alterar ainda)

Levantamento pedido no checkpoint — a tabela `roles` sozinha **não é
suficiente** para um papel novo (ex: Pré-vendas, Recepção) funcionar de
ponta a ponta. Quatro pontos fora deste banco ainda só aceitam os 4 papéis
atuais:

1. **`supabase/schema.sql:166`** — `user_profiles.role` tem
   `CHECK (role IN ('admin', 'marketing', 'gestor', 'vendedor'))`. Bloqueio
   de banco: nenhum `INSERT`/`UPDATE` com um `role` fora dessa lista passa,
   mesmo que exista uma linha correspondente em `roles`. **Este é o
   bloqueio mais forte** — os outros três são de UI/API, este é do próprio
   dado.
2. **`supabase/functions/admin-auth/index.ts:92`** — a Edge Function que
   cria usuário tem `const ROLES_PERMITIDAS = ['admin', 'marketing', 'gestor', 'vendedor']`,
   validada na ação `create_user` (linha 215). Um papel novo seria
   rejeitado aqui antes mesmo de chegar no banco. (A ação `update_user`
   não passa por esta lista — edição de role vai direto pra
   `user_profiles` via `adminService.updateUser`, então depende só do
   CHECK do item 1.)
3. **`src/modules/admin/components/UserModal.jsx:5`** e
   **`src/modules/admin/components/CreateUserModal.jsx:6`** — ambos
   declaram `const ROLES = ['admin', 'marketing', 'gestor', 'vendedor']`
   como as opções do `<select>` de papel. Um papel novo não apareceria pra
   escolher, mesmo que o backend aceitasse.
4. **`src/modules/permissions/constants/permissions.js`** — `ROLES` (objeto)
   e `ROLE_PERMISSIONS` (mapa) só conhecem os 4 papéis atuais. Um papel novo
   resolveria para `getPermissionsForRole(novoRole) → []` (fail-closed, não
   quebra, mas dá zero acesso) até alguém adicionar uma entrada — isto é
   justamente o que a Etapa 5 substitui, então não é bem um "bloqueio" a
   corrigir agora, é o motivo de a Etapa 5 existir.

**Nenhuma alteração foi feita nestes 4 pontos nesta revisão** — é só o
levantamento pedido. Corrigi-los é trabalho de uma etapa futura (a
constraint do item 1 provavelmente vira uma validação contra a tabela
`roles` via trigger ou `FOREIGN KEY (role) REFERENCES roles(code)`, em vez
do `CHECK` fixo atual — mas essa é uma decisão de schema que merece revisão
própria, não uma correção de checkpoint).

---

## Requisitos obrigatórios para as próximas etapas

Registrado agora, pra não se perder até a Etapa 6:

1. **`permission_change_log` só pode ser preenchida por trigger ou RPC
   `SECURITY DEFINER`, nunca por `INSERT` direto do frontend.** Hoje a
   policy de escrita já restringe a `is_permissions_admin()`, mas isso só
   impede quem não é admin — não impede um admin (ou uma sessão comprometida
   de admin) gravar um log falso/incompleto por engano. Quando a Etapa 6
   implementar a escrita real, ela deve vir de dentro de uma função que
   também faz a alteração em si (grant/revoke), gerando o log como efeito
   colateral automático, nunca como uma chamada solta e independente.
2. **Proteção server-side das ações críticas.** O catálogo desta sprint
   (Etapa 2) documenta várias ações hoje sem gate nenhum (`fairs.delete`,
   `leads.delete`, criação/edição de usuário, etc.) — a Etapa 5 vai
   conectar `can()` a essas telas, mas `can()` é só UX (mesmo aviso que já
   valia desde a Sprint 2.3, ver `docs/architecture/permissions.md`). RLS
   ou RPC `SECURITY DEFINER` continuam sendo a única proteção real contra
   alguém chamando a API do Supabase direto, ignorando o frontend.
3. **Aplicar de verdade os escopos `view_all`/`view_team`/`view_own`.**
   Confirmado no inventário (Etapa 1): hoje essas permissões só decidem
   *se* a tela abre — dentro dela, todo mundo vê a mesma listagem completa
   de leads, sem filtro por equipe ou por usuário. Isso precisa virar
   filtro real na query (client) e, idealmente, RLS no banco — não é
   proteção nenhuma hoje, é só uma cortina de tela.

---

## Estado desta entrega

Concluído: **Etapa 1** (inventário), **Etapa 2** (catálogo) e **Etapa 3**
(banco de dados — SQL real, ver abaixo). Decisões confirmadas pelo usuário:
papéis novos (Pré-vendas, Recepção) **não** são criados agora, só a
estrutura fica pronta pra recebê-los depois; e o rollout das Etapas
seguintes será **uma de cada vez, com checkpoint**, em vez de tudo de uma
sessão só.

### Etapa 3 — entregue e revisada em checkpoint

- `supabase/migrations/20260717090000_sprint_3_8_permissions_pbac.sql` (migration standalone, revisada)
- Mesmo conteúdo replicado em `supabase/schema.sql`, seção "SPRINT 3.8"
- `supabase/rollbacks/sprint_3_8_permissions_pbac_rollback.sql` (rollback, atualizado com os 2 `DROP FUNCTION` novos)
- Cria `permissions`, `roles`, `role_permissions`, `user_permissions`, `permission_change_log`, `is_permissions_admin()`, `protect_system_roles()` + trigger, com RLS restrita a admin nas escritas e seed completo (4 roles atuais + catálogo de **47** permissões + **105** vínculos role↔permissão)
- **Nada foi aplicado no Supabase** — arquivos prontos para revisão, aguardando você rodar manualmente
- **Esta migration não muda o comportamento atual do frontend** (`usePermissions()` continua 100% baseado no mapa estático em JS, isso só muda na Etapa 5) — **mas não é "100% inofensiva" no sentido absoluto**: ela cria tabelas, funções e um trigger novos, sujeitos às próprias políticas RLS, que passam a existir e responder via API do Supabase a partir do momento em que forem aplicadas, mesmo sem nenhuma tela os consumindo ainda.

### Correções aplicadas neste checkpoint (revisão do usuário)

1. RLS de escrita das 5 tabelas trocou de `is_gifts_manager()` (admin+marketing+gestor) para `is_permissions_admin()` (só admin), com `TO authenticated` explícito.
2. Catálogo ganhou `permissions.view`/`permissions.manage`/`permissions.audit_view`, concedidas só a `admin`.
3. Trigger `trg_protect_system_roles` impede excluir, renomear o `code` ou desmarcar `is_system` de um papel de sistema.
4. `selfservice.credential_scan` removida do catálogo/seed; `FEATURES.qrCredentialReader` desligada; funcionalidade marcada como descontinuada no inventário.
5. Auditoria de bloqueios para papéis dinâmicos documentada (sem alterar código).
6. Contagem de permissões corrigida (45 → 47 após as mudanças 2 e 4) e wording de "100% inofensivo" precisado.
7. Requisitos obrigatórios das próximas etapas registrados (log via trigger/RPC, proteção server-side, escopos view_all/team/own reais).

### Correções aplicadas no segundo checkpoint (mesma sprint)

1. `permissions` (catálogo) virou **somente leitura por RLS** — a policy
   "Gestao permissions" foi removida por completo, nem admin escreve nela
   pela API. Novo código de permissão só entra por migration.
2. `permission_change_log` virou **somente leitura por RLS** — a policy
   "Gestao permission_change_log" foi removida. Nenhum usuário, admin
   incluso, grava linha aqui direto; a Etapa 6 escreve via trigger/RPC
   `SECURITY DEFINER`.
3. Descrição de `permissions.manage` ajustada para "Gerenciar papéis,
   vínculos de permissões e sobrescritas individuais" — deixa explícito
   que não cobre o catálogo em si.
4. `is_permissions_admin()`: `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO
   authenticated`. `protect_system_roles()`: `REVOKE ALL FROM PUBLIC`, sem
   grant (função de trigger, disparo não passa pelo mecanismo normal de
   `EXECUTE` — confirmado no comentário da migration).
5. Auditoria de `src/modules/permissions/constants/permissions.js`: **nada
   a remover.** O arquivo nunca teve `selfservice.credential_scan` (nem
   qualquer `selfservice.*`) em `PERMISSIONS`, `ROLE_PERMISSIONS`,
   `MENU_PERMISSIONS` ou `ROUTE_PERMISSIONS` — `/atendimento` sempre
   reaproveitou `LEADS_CAPTURE`, então o mapa estático já estava limpo
   desde antes desta sprint.
6. `supabase/rollbacks/sprint_3_8_permissions_pbac_rollback.sql`: **revisado,
   sem alteração necessária** — `DROP TABLE`/`DROP FUNCTION` já cobrem tudo
   que existe agora (remover policies não muda o que precisa ser dropado).
7. Contagens: **inalteradas** (47 permissões, 105 vínculos role↔permissão)
   — este checkpoint só mexeu em RLS/grants, não em dados do seed.

### Pendente (próximo checkpoint)

**Ainda aguardando sua aprovação para aplicar esta migration no Supabase.**
Depois de aplicada — e só depois —, o próximo passo natural é a **Etapa 4**
(`PermissionService`: carregar/cachear permissões do usuário a partir das
tabelas novas), pré-requisito pra Etapa 5 (migrar `usePermissions()`/`can()`
para consumir o banco em vez do mapa estático). Aviso antes de começar,
como combinado.
