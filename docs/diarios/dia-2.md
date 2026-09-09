# Diário de Desenvolvimento — Dia 2

**Projeto:** Pion-G-Hub  
**Data:** 2026-09-07  
**Etapa:** Infraestrutura e Configuração Inicial

---

## Objetivos do Dia

- Configurar o ambiente de desenvolvimento
- Estabelecer a base de dados no Supabase
- Definir a arquitetura de autenticação JWT
- Preparar o esqueleto do frontend (React + Vite + TypeScript)

---

## Tarefas Realizadas

### 1. Configuração do Ambiente
- Instalação e configuração do Node.js + Express
- Configuração do Vite + React + TypeScript
- Instalação de dependências: Supabase Client, Tailwind CSS, React Router

### 2. Schema Base no Supabase
- Configuração do banco PostgreSQL via Supabase
- Criação das tabelas iniciais:
  - `perfis` — Matriz de perfis e permissões
  - `colaboradores` — Dados dos colaboradores
  - `filiais` — Gerenciamento de filiais
  - `feriados` — Calendário anual de feriados
- Habilitação do Row Level Security (RLS) nas tabelas
- Configuração de políticas de acesso por perfil

### 3. Autenticação JWT
- Configuração do fluxo de autenticação
- Criação de middlewares de verificação de token
- Definição de rotas protegidas por perfil de acesso

### 4. Esqueleto do Frontend
- Configuração do React Router com rotas básicas
- Estrutura de pastas estabelecida: `src/components/`, `src/pages/`, `src/services/`
- Integração do Supabase Client no frontend

---

## Arquivos Criados/Modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/schema.sql` | Criado | Schema inicial do banco de dados |
| `src/server/index.ts` | Criado | Entry point do backend Express |
| `src/server/middleware/auth.ts` | Criado | Middleware de autenticação JWT |
| `src/client/App.tsx` | Criado | Componente raiz do frontend |
| `src/client/main.tsx` | Criado | Entry point do React |
| `package.json` | Modificado | Dependências atualizadas |

---

## Decisões Tomadas

1. **Supabase como backend-as-a-service**: Acelera o desenvolvimento e fornece autenticação, RLS e realtime nativos.
2. **JWT com Supabase Auth**: Utiliza a infraestrutura de autenticação do Supabase em vez de criar uma do zero.
3. **TypeScript estrito**: Garante type safety em todo o código, reduzindo erros em produção.

---

## Próximos Passos (Dia 3)

- Implementar o módulo de Logística e Operações
- Criar as rotas e controladores da API de Logística
- Configurar o Supabase Realtime para o Dashboard