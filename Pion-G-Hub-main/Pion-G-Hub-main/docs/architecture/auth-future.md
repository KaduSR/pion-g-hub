# Arquitetura Futura: Módulo Users

## Contexto

Este documento descreve a arquitetura planejada para o módulo de gestão de usuários.

**Status:** Não implementado (preparado para Sprint futura)

---

## Cadastro de Usuários

### Abordagem

- Cadastro **apenas interno** (não público)
- Criado por **Administradores** ou **Gestores Comerciais**
- Implementado via **Supabase Edge Function** com privilégios administrativos
- **NÃO** usar `supabase.auth.signUp()` diretamente no frontend

### Fluxo Planejado

1. Admin/Gestor acessa módulo "Usuários" (rota futura: `/usuarios`)
2. Preenche formulário: nome, email, perfil inicial
3. Frontend chama Edge Function: `POST /functions/v1/admin-create-user`
4. Edge Function usa `supabase.auth.admin.createUser()`
5. Usuário recebe email de definição de senha
6. Usuário define senha e faz primeiro login

### Operações Futuras

- Criar usuário
- Editar nome, email, perfil
- Alterar senha (admin reset)
- Ativar/Inativar usuário
- Upload de foto de perfil

---

## Estrutura Planejada

```
src/modules/users/
├── services/
│   └── usersService.js       # Chamadas para Edge Function admin
├── hooks/
│   └── useUsers.js
├── contexts/
│   └── UsersContext.jsx
├── components/
│   └── UserForm.jsx
└── pages/
    ├── UsersPage.jsx         # Listagem + CRUD
    └── UserProfilePage.jsx   # Perfil do próprio usuário
```

---

## Dependências

- Supabase Edge Function: `admin-create-user`
- Service Role Key no backend (nunca expor no frontend)
- Tabela customizada (futura): `public.user_profiles` (foto, telefone, etc)

---

## Segurança

- Apenas usuários com perfil `Administrador` ou `Gestor Comercial` podem criar usuários
- Service Role Key NUNCA deve ser exposta no frontend
- Todas as operações administrativas devem passar pela Edge Function
- RLS policies devem proteger dados sensíveis de usuários
