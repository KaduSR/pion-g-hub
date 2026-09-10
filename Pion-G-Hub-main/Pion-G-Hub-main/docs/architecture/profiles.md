# Perfis de Usuário — Arquitetura e Permissões

## Status

| Sprint | Descrição | Status |
|--------|-----------|--------|
| 2.2 | Tabela `user_profiles`, ProfileContext, MyProfilePage | ✅ Implementado |
| Futura | Políticas RLS por role espelhando o mapa de permissões | 🔲 Planejado — ver `docs/architecture/permissions.md` |
| 2.3 | Hook `usePermissions`, componente `RequirePermission`, Sidebar e rotas filtradas por permissão | ✅ Implementado — ver `docs/architecture/permissions.md` |

---

## Separação de responsabilidades

| Onde | O que guarda |
|------|-------------|
| `auth.users` (Supabase Auth) | e-mail, senha (hash), sessão, tokens |
| `public.user_profiles` | nome, telefone, cargo, setor, role, gestor_id, avatar_url |

**Regra:** a senha nunca passa por `user_profiles`. Alterações de senha e e-mail são responsabilidade do Supabase Auth (via Dashboard ou Edge Function futura).

---

## Roles

| Role | Descrição |
|------|-----------|
| `admin` | Acesso total ao sistema |
| `marketing` | Gestão de feiras, visualização de todos os leads, sem gestão de usuários |
| `gestor` | Gerencia equipe própria (vendedores vinculados via `gestor_id`) |
| `vendedor` | Captação de leads, visualiza apenas os próprios |

> ⚠️ O role padrão ao criar um perfil é `vendedor` (menor privilégio).
> Alteração de role só deve ser feita por `admin` — não exposta na UI do próprio usuário.

---

## Tabela `user_profiles`

```sql
id          UUID        PK
user_id     UUID        FK → auth.users(id) ON DELETE CASCADE  [UNIQUE]
nome        TEXT
email       TEXT        -- espelho do auth.users.email, para consultas sem join
telefone    TEXT
cargo       TEXT
setor       TEXT
role        TEXT        CHECK IN ('admin','marketing','gestor','vendedor')  DEFAULT 'vendedor'
gestor_id   UUID        FK → user_profiles(id) ON DELETE SET NULL  [nullable]
avatar_url  TEXT        -- URL pública no bucket assets/avatars/
ativo       BOOLEAN     DEFAULT true
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```

---

## Fluxo de criação de perfil

1. Usuário faz login via Supabase Auth.
2. `ProfileContext` detecta `user.id` disponível no `AuthContext`.
3. `profileService.getByUserId(user.id)` → `maybeSingle()`.
4. Se `null` (primeiro login): `profileService.createDefault()` cria linha com defaults.
5. Perfil fica disponível globalmente via `useProfileContext()`.

---

## RLS — Sprint 2.2 (atual)

Política conservadora: **cada usuário lê e edita apenas o próprio perfil**.

```sql
-- Leitura
CREATE POLICY "perfil_select_proprio" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Escrita
CREATE POLICY "perfil_modificar_proprio" ON public.user_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## RLS — Sprint futura (planejado)

Quando implementar permissões, substituir/complementar com:

```sql
-- Admin lê todos os perfis
CREATE POLICY "perfil_admin_select" ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );

-- Gestor lê perfis da própria equipe
CREATE POLICY "perfil_gestor_select_equipe" ON public.user_profiles
  FOR SELECT
  USING (
    gestor_id IN (
      SELECT id FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'gestor'
    )
  );
```

---

## Mapa de permissões futuras

| Permissão | admin | marketing | gestor | vendedor |
|-----------|:-----:|:---------:|:------:|:--------:|
| `manage_users` | ✅ | ❌ | ✅ (equipe) | ❌ |
| `manage_fairs` | ✅ | ✅ | ✅ (equipe) | ❌ |
| `view_all_leads` | ✅ | ✅ | ❌ | ❌ |
| `view_team_leads` | ✅ | ✅ | ✅ | ❌ |
| `view_own_leads` | ✅ | ✅ | ✅ | ✅ |
| `capture_leads` | ✅ | ✅ | ✅ | ✅ |
| `export_reports` | ✅ | ✅ | ✅ (equipe) | ❌ |
| `manage_settings` | ✅ | ❌ | ❌ | ❌ |

> Gestor: todas as permissões marcadas com ✅ são limitadas à própria equipe (vendedores com `gestor_id` apontando para o gestor).

---

## Arquitetura do módulo

```
src/modules/profiles/
├── services/
│   └── profileService.js    # getByUserId, createDefault, update, uploadAvatar, deleteAvatar
├── hooks/
│   └── useProfile.js        # estado reativo + auto-create no primeiro login
├── contexts/
│   └── ProfileContext.jsx   # provider global; lê user do AuthContext
└── pages/
    └── MyProfilePage.jsx    # /meu-perfil — edição de nome, telefone, cargo, setor, avatar
```

### API pública do contexto

```js
const {
  profile,       // objeto user_profiles | null
  loading,       // boolean
  error,         // string | null
  saveProfile,   // (values: { nome, telefone, cargo, setor }) => Promise<profile>
  uploadAvatar,  // (file: File) => Promise<profile>
  removeAvatar,  // () => Promise<profile>
  reload,        // () => Promise<void>
} = useProfileContext()
```

---

## Campos editáveis vs. somente leitura

| Campo | Editável pelo usuário | Quem pode alterar |
|-------|:--------------------:|-------------------|
| nome | ✅ | Próprio usuário |
| telefone | ✅ | Próprio usuário |
| cargo | ✅ | Próprio usuário |
| setor | ✅ | Próprio usuário |
| avatar_url | ✅ | Próprio usuário |
| email | ❌ | Admin (via Auth) |
| role | ❌ | Admin (sprint futura) |
| gestor_id | ❌ | Admin/Gestor (sprint futura) |
| ativo | ❌ | Admin (sprint futura) |

---

## Sistema de permissões (`usePermissions`)

> Implementado na Sprint 2.3. Documentação completa, mapa de permissões por
> role, mapa de menu e mapa de rotas estão em
> [`docs/architecture/permissions.md`](./permissions.md) — este arquivo não
> duplica esse conteúdo para evitar divergência entre as duas fontes.

---

## Próximos passos

1. ~~**Sprint permissões:** implementar `usePermissions()` e `RequirePermission`~~ ✅ Sprint 2.3
2. **Sprint usuários:** módulo `src/modules/users/` para listagem e criação via Edge Function
3. **RLS restritivo:** substituir políticas abertas de `feiras` e `leads_feira` por políticas baseadas em role — ver detalhamento em `permissions.md`
4. **Edge Function:** `admin-create-user` para criação de usuários sem expor service role key no frontend
