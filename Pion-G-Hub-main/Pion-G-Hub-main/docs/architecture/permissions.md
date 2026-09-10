# Sistema de Permissões — Arquitetura (Frontend)

## Status

| Sprint | Descrição | Status |
|--------|-----------|--------|
| 2.2 | Tabela `user_profiles`, `ProfileContext`, role no perfil | ✅ Implementado |
| 2.3 | Mapa de permissões, `usePermissions`, `RequirePermission`, Sidebar e rotas filtradas | ✅ Implementado |
| Futura | RLS no Supabase espelhando este mapa | 🔲 Planejado |
| Futura | Módulo de gestão de usuários (`users.manage`) | 🔲 Planejado |
| Futura | Tela "Meus Leads" com filtro por usuário/equipe | 🔲 Planejado |

---

## Escopo desta sprint — leia antes de tudo

**Isto é controle de UX, não de segurança.** O sistema de permissões aqui descrito decide o que aparece no menu e quais rotas redirecionam no frontend. Ele **não substitui Row Level Security (RLS)** no Supabase.

Hoje, qualquer usuário autenticado ainda consegue ler/escrever nas tabelas `feiras` e `leads_feira` via API do Supabase, independentemente do `role`, porque as policies atuais são abertas (`USING (true)`). Esconder um botão ou bloquear uma rota no React não impede uma chamada direta à API. A sprint de RLS (ver "Próximos passos") é o que de fato impõe a regra no backend.

---

## Roles

| Role | Descrição |
|------|-----------|
| `admin` | Acesso total ao sistema |
| `marketing` | Gestão de feiras, leads e relatórios; sem gestão de usuários ou configurações |
| `gestor` | Gerencia a própria equipe (vendedores vinculados via `gestor_id`) |
| `vendedor` | Capta e administra apenas os próprios leads |

> Role padrão ao criar um perfil: `vendedor` (menor privilégio). Alteração de role é responsabilidade de um `admin` — não há UI para o próprio usuário mudar seu role.

---

## Mapa de permissões por role

| Permissão | admin | marketing | gestor | vendedor |
|---|:---:|:---:|:---:|:---:|
| `dashboard.view` | ✅ | ✅ | | |
| `dashboard.view_team` | | | ✅ | |
| `fairs.view` | ✅ | ✅ | ✅ | |
| `fairs.manage` | ✅ | ✅ | | |
| `leads.view_all` | ✅ | ✅ | | |
| `leads.view_team` | | | ✅ | |
| `leads.view_own` | | | | ✅ |
| `leads.capture` | ✅ | ✅ | ✅ | ✅ |
| `leads.manage_all` | ✅ | ✅ | | |
| `leads.manage_team` | | | ✅ | |
| `leads.manage_own` | | | | ✅ |
| `settings.manage` | ✅ | | | |
| `users.manage` | ✅ | | | |
| `reports.export` | ✅ | ✅ | | |
| `reports.export_team` | | | ✅ | |
| `profile.view` | ✅ | ✅ | ✅ | ✅ |

Fonte única deste mapa: `src/modules/permissions/constants/permissions.js` (`ROLE_PERMISSIONS`).

---

## Mapa de menu (Sidebar)

| Item do menu | Visível para | Chave (`menuKey`) | Regra |
|---|---|---|---|
| Dashboard | admin, marketing, gestor | `dashboard` | `dashboard.view` OU `dashboard.view_team` |
| Feiras | admin, marketing, gestor | `fairs` | `fairs.view` |
| Captar Lead | admin, marketing, gestor, vendedor | `captacao` | `leads.capture` |
| Gestão de Leads | admin, marketing, gestor | `leads` | `leads.view_all` OU `leads.view_team` |
| Configurações | admin | `configuracoes` | `settings.manage` |
| Meu Perfil | todos | `meuPerfil` | `profile.view` |

### ⚠️ Limitação desta sprint — "Gestão de Leads" e o vendedor

A chave de menu `leads` **propositalmente não inclui** `leads.view_own`. Isso significa:

- O **vendedor não vê** "Gestão de Leads" no menu, mesmo tendo a permissão `leads.view_own`.
- A **rota `/leads` continua tecnicamente acessível** para quem tem `leads.view_own` — se o vendedor digitar a URL diretamente, a tela carrega (não há tela de "acesso negado" para esse caso).
- A `LeadsPage` atual **não filtra por usuário ou equipe**. Um vendedor que acessar `/leads` diretamente veria a mesma listagem completa que admin/marketing veem hoje — não há recorte por `vendedor` ou `gestor_id` na query.

Esta é uma decisão deliberada da Sprint 2.3: priorizar a separação de menu (vendedor só vê "Captar Lead" e "Meu Perfil") sem ainda construir a tela "Meus Leads" dedicada. A rota não foi bloqueada para `leads.view_own` porque bloqueá-la totalmente exigiria criar essa tela agora, o que está fora do escopo combinado.

**Pendência explícita para a próxima sprint de leads:**
1. Criar tela "Meus Leads" (ou variante filtrada de `LeadsPage`) com query restrita a `vendedor = profile.nome` (ou `vendedor_id`, se a coluna for normalizada).
2. Adicionar filtro de equipe para `gestor` (`leads.view_team` → leads dos vendedores com `gestor_id` apontando para ele).
3. Só então decidir se `/leads` (tela atual, sem filtro) deve deixar de aceitar `leads.view_own`, redirecionando vendedor para a nova tela "Meus Leads" no lugar.

---

## Mapa de rotas

| Rota | Permissão exigida (`anyOf`) | Redireciona se negado |
|---|---|---|
| `/` | `dashboard.view`, `dashboard.view_team` | rota padrão do role |
| `/feiras` | `fairs.view` | rota padrão do role |
| `/captacao` | `leads.capture` | rota padrão do role |
| `/leads` | `leads.view_all`, `leads.view_team`, `leads.view_own` | rota padrão do role |
| `/configuracoes` | `settings.manage` | rota padrão do role |
| `/meu-perfil` | `profile.view` | rota padrão do role |

Fonte única: `ROUTE_PERMISSIONS` em `permissions.js`, consumida por `RequirePermission` em `AppRoutes.jsx`.

### Rota padrão por role (evita loop de redirecionamento)

```js
function getDefaultRouteForRole(role) {
  if (role === 'vendedor') return '/captacao'
  return '/'
}
```

Sem essa exceção, um vendedor sem `dashboard.view` tentando acessar uma rota negada seria redirecionado para `/`, que por sua vez também é negada para ele — gerando um loop infinito de redirecionamentos.

---

## Arquitetura do módulo

```
src/modules/permissions/
├── constants/
│   └── permissions.js       # ROLES, PERMISSIONS, ROLE_PERMISSIONS,
│                             # MENU_PERMISSIONS, ROUTE_PERMISSIONS,
│                             # getPermissionsForRole, getDefaultRouteForRole
├── hooks/
│   └── usePermissions.js    # role, permissions, can, canAny, canAll
└── components/
    └── RequirePermission.jsx # guarda de rota
```

### API pública do hook

```js
const {
  role,         // string | null — profile.role
  permissions,  // string[] — lista resolvida para o role atual
  loading,      // boolean — true enquanto o perfil ainda carrega
  can,          // (permission: string) => boolean
  canAny,       // (permissions: string[]) => boolean — true se tiver QUALQUER uma
  canAll,       // (permissions: string[]) => boolean — true se tiver TODAS
} = usePermissions()
```

### Uso em componentes

```jsx
// Esconder um botão
{can('fairs.manage') && <Button>Nova Feira</Button>}

// Múltiplas permissões aceitáveis
{canAny(['leads.view_all', 'leads.view_team']) && <LeadsTable />}
```

### Uso em rotas

```jsx
<Route
  path="/configuracoes"
  element={
    <RequirePermission permission="settings.manage">
      <AppLayout><SettingsPage /></AppLayout>
    </RequirePermission>
  }
/>

<Route
  path="/leads"
  element={
    <RequirePermission anyOf={['leads.view_all', 'leads.view_team', 'leads.view_own']}>
      <AppLayout><LeadsPage /></AppLayout>
    </RequirePermission>
  }
/>
```

### Comportamento do `RequirePermission`

1. Se `ProfileContext.loading === true`, renderiza `LoadingScreen` — evita negar acesso antes do `role` estar disponível (race condition no primeiro carregamento da página).
2. Avalia `permission` (única) ou `anyOf` (lista).
3. Se negado, redireciona para a rota padrão do role atual (`getDefaultRouteForRole`), evitando loops.
4. Aceita um `fallback` customizado como alternativa ao redirecionamento, para casos futuros que precisem de uma tela de "acesso negado" em vez de redirecionar silenciosamente.

---

## Fail-closed por padrão

Role nulo, desconhecido, ou perfil ainda não carregado resultam em `permissions = []`. Nenhuma permissão é assumida por padrão — toda liberação de acesso é explícita no mapa `ROLE_PERMISSIONS`.

```js
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? []
}
```

---

## O que esta sprint NÃO faz

- **Não implementa RLS.** As tabelas `feiras` e `leads_feira` continuam com policies abertas no Supabase.
- **Não cria módulo de usuários.** A permissão `users.manage` existe no mapa (para `admin`), mas não há tela, rota ou botão que a consuma ainda.
- **Não altera regras de banco** nem o schema SQL.
- **Não filtra dados por usuário/equipe.** `LeadsPage`, `FairsPage` e o Dashboard continuam mostrando os mesmos dados para todos os roles que conseguem acessá-los — a diferenciação é só "pode ver a tela ou não", não "o que aparece dentro dela".
- **Não bloqueia `/leads` para `leads.view_own`** — ver seção de limitação acima.

---

## Próximos passos

### RLS (Row Level Security) — espelhar este mapa no banco

```sql
-- Exemplo de direção para leads_feira (ilustrativo, não aplicado nesta sprint)
CREATE POLICY "leads_select_por_role" ON public.leads_feira
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND (
        up.role IN ('admin', 'marketing')
        OR (up.role = 'gestor' AND vendedor IN (
              SELECT nome FROM public.user_profiles WHERE gestor_id = up.id
            ))
        OR (up.role = 'vendedor' AND vendedor = up.nome)
      )
    )
  );
```

### Tela "Meus Leads" para vendedor

Query filtrada por `vendedor = profile.nome` (ou `vendedor_id`, se a coluna `leads_feira.vendedor` for normalizada para FK em vez de texto livre).

### Filtro de equipe para gestor

`leads.view_team` deve restringir a leads cujo `vendedor` pertence à lista de vendedores com `gestor_id = profile.id`.

### Módulo `users` (consumindo `users.manage`)

CRUD de usuários (criação via Edge Function, já que requer service role key), atribuição de `role` e `gestor_id`.

### `<RequirePermission>` com fallback de "acesso negado"

Hoje todo acesso negado redireciona silenciosamente. Pode valer a pena, no futuro, mostrar uma tela explicando "você não tem permissão para acessar X" em vez de simplesmente trocar de rota sem aviso.
