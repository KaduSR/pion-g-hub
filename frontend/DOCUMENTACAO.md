# Frontend — Documentação e Referência Rápida

**Módulo:** `frontend/`
**Stack:** React 19 + TypeScript + Vite
**Roteamento:** React Router v6
**Build:** `tsc -b && vite build`
**Última atualização:** 2026-09-08

---

## 1. Visão Geral

O frontend do Pion-G-Hub é uma SPA (Single Page Application) construída com React 19 e TypeScript, empacotada com Vite. Ele consome a API backend via serviços (`src/services/`) e utiliza `NotificationContext` para feedback visual ao usuário.

### 1.1 Objetivo da Documentação

Este arquivo substitui/atualiza o `README.md` default do Vite. Ele serve como referência rápida para o estado atual do frontend, incluindo arquitetura, padrões de implementação, páginas, componentes compartilhados, build e fluxo de trabalho Git.

---

## 2. Estrutura de Diretórios

```
frontend/
├── .oxlintrc.json           # Configuração do Oxlint (React + TypeScript)
├── .gitignore
├── index.html               # Entry HTML do Vite
├── package.json
├── tsconfig.app.json        # TS do app
├── tsconfig.json
├── tsconfig.node.json       # TS do Vite/config
├── vite.config.ts
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── main.tsx             # Entry React
│   ├── App.tsx              # Rotas + Layout + 404
│   ├── index.css            # CSS global + animações toast
│   ├── contexts/
│   │   └── NotificationContext.tsx
│   ├── components/
│   │   ├── BaseTable.tsx
│   │   └── Layout.tsx
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── AreasPage.tsx
│   │   ├── DepartamentosPage.tsx
│   │   ├── SetoresPage.tsx
│   │   ├── CargosPage.tsx
│   │   ├── MotivosRefugoPage.tsx
│   │   ├── DefeitosRefugoPage.tsx
│   │   ├── ColaboradoresPage.tsx
│   │   ├── EscalasPage.tsx
│   │   ├── PontosPage.tsx
│   │   ├── LogisticaPage.tsx
│   │   ├── RelatoriosPage.tsx
│   │   ├── AuditoriaPage.tsx
│   │   └── WebhooksPage.tsx
│   ├── services/
│   │   └── cadastrosService.ts
│   ├── shared/
│   │   ├── api.ts
│   │   └── components/
│   │       └── BaseModal.tsx
│   └── types/
│       └── cadastros.ts
└── dist/                    # Build output
    ├── assets/
    ├── index.html
    └── favicon.svg
```

---

## 3. Arquitetura

### 3.1 Padrão de Roteamento

```
BrowserRouter
└── Routes
    └── Route path="/" element={<Layout />}
        ├── index                 → DashboardPage
        ├── dashboard             → DashboardPage
        ├── rh/colaboradores      → ColaboradoresPage
        ├── rh/escalas            → EscalasPage
        ├── rh/pontos             → PontosPage
        ├── logistica             → LogisticaPage
        ├── cadastros/areas       → AreasPage
        ├── cadastros/departamentos → DepartamentosPage
        ├── cadastros/setores     → SetoresPage
        ├── cadastros/cargos      → CargosPage
        ├── cadastros/motivos-refugo → MotivosRefugoPage
        ├── cadastros/defeitos-refugo → DefeitosRefugoPage
        ├── relatorios            → RelatoriosPage
        ├── auditoria             → AuditoriaPage
        ├── configuracoes/webhooks → WebhooksPage
        └── *                     → NotFoundPage (404)
```

### 3.2 Layout + Sidebar

O componente `Layout.tsx` é o wrapper de todas as rotas. Ele fornece:
- **Sidebar fixa (260px):** fundo `#111827`, texto `#f9fafb`, 14 itens de navegação com ícone emoji
- **Área principal (`<Outlet />`):** fundo `#f3f4f6`, `flex: 1`
- **Link ativo:** fundo `#374151`, texto branco, peso 600
- **Transição suave:** `background 0.15s, color 0.15s`

### 3.3 Padrão de Página

Todas as páginas seguem este fluxo:
1. **Loading state:** retorna `Carregando...` enquanto busca dados
2. **Effect de carregamento:** `useEffect` com `cancelled` flag para evitar setState em componente desmontado
3. **Tabela CRUD:** usa `BaseTable` com colunas, dados, handlers de criar/editar/excluir
4. **Modal:** `BaseModal` para formulários de criação/edição
5. **Notificações:** `useNotify()` substitui `confirm()` para feedback de sucesso/erro

### 3.4 Componentes Compartilhados

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `Layout` | `components/Layout.tsx` | Sidebar + área principal |
| `BaseTable` | `components/BaseTable.tsx` | Tabela genérica com busca integrada |
| `BaseModal` | `shared/components/BaseModal.tsx` | Modal reutilizável |

---

## 4. NotificationContext

Contexto global para toasts. Usa `useNotify()` em qualquer componente filho de `NotificationProvider`.

### API

```tsx
const notify = useNotify();

notify.success('Operação realizada com sucesso!');
notify.error('Erro ao processar requisição.');
notify.warning('Atenção: dados inconsistentes.');
notify.info('Informação do sistema.');
```

### Comportamento

- **Posição:** top-right
- **Duração:** 4s (auto-dismiss)
- **Largura máxima:** 380px
- **Animação:** `toast-slide-in` definida em `index.css`

---

## 5. BaseTable — Tabela Genérica

Componente genérico parametrizado por `BaseTable<T>`.

### Props

| Prop | Tipo | Descrição |
|------|------|-----------|
| `columns` | `Column<T>[]` | Colunas da tabela |
| `data` | `T[]` | Dados a renderizar |
| `title?` | `string` | Título do card |
| `onAdd?` | `() => void` | Callback do botão "Adicionar" |
| `addLabel?` | `string` | Texto do botão adicionar |
| `searchPlaceholder?` | `string` | Placeholder da busca (ativa modo busca) |
| `searchKeys?` | `(keyof T)[]` | Campos pesquisáveis (ativa modo busca) |

### Coluna

```tsx
interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
}
```

### Busca Client-Side

Quando `searchPlaceholder` e `searchKeys` são fornecidos:
- Campo de busca aparece acima da tabela
- Filtragem é case-insensitive
- Usa `Array.prototype.some()` para busca em múltiplos campos
- Estado local via `useState('')`

### Empty State

Quando não há dados:
- Sem busca ativa: "Nenhum item cadastrado."
- Com busca ativa: "Nenhum item encontrado para a busca."

---

## 6. Páginas e Funcionalidades

### 6.1 Dashboard (`/`)
- KPIs principais
- Placeholder visual (frontend)

### 6.2 Cadastros (6 páginas)
- **Áreas:** `cadastros/areas`
- **Departamentos:** `cadastros/departamentos`
- **Setores:** `cadastros/setores`
- **Cargos:** `cadastros/cargos`
- **Motivos de Refugo:** `cadastros/motivos-refugo`
- **Defeitos de Refugo:** `cadastros/defeitos-refugo`

Padrão comum:
- CRUD completo via `cadastrosService`
- `useNotify()` para feedback
- `BaseTable` com busca integrada

### 6.3 RH
- **Colaboradores:** busca por nome/email, filtro por status (Todos/Ativo/Inativo/Afastado/Férias)
- **Escalas:** página placeholder
- **Ponto:** página placeholder

### 6.4 Outros Módulos
- **Logística:** busca por código de rastreio, colaborador, origem, destino
- **Relatórios:** página placeholder
- **Auditoria:** página placeholder
- **Webhooks:** página placeholder

---

## 7. Serviços

### 7.1 `cadastrosService.ts`

Serviço centralizado para operações CRUD dos cadastros auxiliares.

```tsx
// Exemplo de uso
import { cadastrosService } from '../services/cadastrosService';

const data = await cadastrosService.getAreas();
const created = await cadastrosService.createArea(payload);
const updated = await cadastrosService.updateArea(id, payload);
await cadastrosService.deleteArea(id);
```

Métodos disponíveis por entidade: `getAreas`, `createArea`, `updateArea`, `deleteArea`, e equivalentes para Departamentos, Setores, Cargos, MotivosRefugo, DefeitosRefugo.

---

## 8. Build

### Comandos

```bash
# Instalar dependências
npm install

# Dev server
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

### Pipeline

```
TypeScript (tsc -b) → Vite build → dist/
```

### Validação

```bash
# TypeScript type check
npx tsc -b

# Build completo
npm run build
```

---

## 9. Padrões e Convenções

### 9.1 Estado Local

- `useState` para filtros client-side
- `useEffect` com flag `cancelled` para evitar memory leaks
- Estado de loading antes de toda requisição

### 9.2 Formulários

- Componentes controlados (`value` + `onChange`)
- Validação nativa HTML (`required`, `type="number"`, etc.)
- Submit via `e.preventDefault()` + `async/await`

### 9.3 Estilos

- Inline styles via objetos JS (`style={{ ... }}`)
- Sem CSS Modules ou CSS-in-JS externo
- Design system próprio com tokens hardcoded

### 9.4 Erros

- `try/catch` em operações assíncronas
- Fallback para estado de erro ou loading infinito (não implementado ainda)
- `notify.error()` para erros de API (não padronizado ainda)

---

## 10. Estado Atual e Pendências

### ✅ Implementado

- [x] Layout com sidebar navegação (14 rotas)
- [x] Rotas aninhadas + 404 handler
- [x] BaseTable genérico com busca client-side
- [x] NotificationContext com 4 tipos de toast
- [x] CRUD completo em 6 páginas de cadastro (Áreas, Departamentos, Setores, Cargos, Motivos Refugo, Defeitos Refugo)
- [x] Busca + filtros em Colaboradores e Logística
- [x] Build limpo: 0 erros TypeScript

### 🔲 Pendente

- [ ] Remover `confirm()` em: Escalas, Pontos, Webhooks, Colaboradores, Logística
- [ ] Implementar páginas placeholder restantes (Escalas, Pontos, Relatórios, Auditoria, Webhooks)
- [ ] Página "Configurações Gerais" (referenciada no sidebar, sem rota)
- [ ] Conectar frontend à API backend real
- [ ] Adicionar loading skeletons
- [ ] Tratamento de erros padronizado
- [ ] Testes unitários/integração

---

## 11. Workflow Git

```bash
# 1. Verificar status
git status

# 2. Adicionar arquivos
git add <arquivos>

# 3. Commit
git commit -m "feat: descricao da mudanca"

# 4. Push
git push origin <branch>
```

### Convenção de Commits

- `feat:` novas funcionalidades
- `fix:` correções de bugs
- `refactor:` refatorações sem mudança de comportamento
- `chore:` tarefas de manutenção

---

## 12. Links Relacionados

- `docs/diarios/dia-2.md` — Infraestrutura e configuração inicial
- `docs/diarios/dia-3.md` — Módulo de Logística
- `docs/2026-09-07/database-model.md` — Modelo de banco
- `CLAUDE.md` — Instruções globais do projeto

---

## 13. Troubleshooting

### Build falha com erros TS

```bash
# Limpar build anterior
rm -rf dist/

# Rebuild
npm run build
```

### Erro "Module not found"

Verificar imports relativos. O projeto usa paths relativos (ex: `'../components/BaseTable'`).

### Toast não aparece

Verificar se o componente está dentro de `<NotificationProvider>` em `App.tsx`.
