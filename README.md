# Pion-G-Hub

**Plataforma de Migração do Sistema PionG** — Reimplementação moderna com stack Full-Stack TypeScript, banco PostgreSQL/Supabase e deploy containerizado para Hostinger VPS.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.18-black)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1%2F3.2-629b1c)](https://vitest.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791)](https://www.postgresql.org/)

---

## Visão Geral

O **Pion-G-Hub** é o motor de desenvolvimento baseado em agentes para reimplementar o sistema PionG em uma nova plataforma. O projeto mapeia o sistema legado através de um **blueprint completo** (`docs/piong-blueprint/`) e o reconstroi com tecnologias modernas.

### Objetivos

- Modernização completa do sistema PionG legado
- Arquitetura Full-Stack TypeScript (backend + frontend)
- Validação rigorosa de dados com Zod
- Autenticação JWT com rate limiting
- Interface reativa com busca em tempo real
- Deploy containerizado para Hostinger VPS

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                        Hostinger VPS                         │
│  ┌─────────────────┐         ┌──────────────────────────┐   │
│  │   Nginx:80/443  │ ──────► │  React SPA (Frontend)    │   │
│  │   Proxy Reverso │         │  React 19 + Vite 8       │   │
│  └────────┬────────┘         └──────────────────────────┘   │
│           │                                                  │
│  ┌────────▼──────────────────────────────────────────┐       │
│  │         docker-compose.yml                        │       │
│  │  ┌──────────────┐    ┌───────────────────────┐   │       │
│  │  │   backend    │    │      frontend         │   │       │
│  │  │  Node:3000   │◄───│  Nginx Alpine:80      │   │       │
│  │  │  Express     │    │  Vite build           │   │       │
│  │  └──────┬───────┘    └───────────────────────┘   │       │
│  │         │                                         │       │
│  │         ▼                                         │       │
│  │  ┌──────────────┐                                │       │
│  │  │ Supabase     │                                │       │
│  │  │ PostgreSQL   │                                │       │
│  │  └──────────────┘                                │       │
│  └──────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### Stack Tecnológica

| Camada | Tecnologia | Versão | Responsabilidade |
|--------|-----------|--------|------------------|
| Frontend | React + Vite + TypeScript | 19 / 8 / 5.3 | SPA com roteamento, busca em tempo real, code splitting |
| Backend | Node.js + Express + TypeScript | 20 / 4.18 | API REST com middleware de segurança e rate limiting |
| Validação | Zod | 3.25 | Schemas de validação para requests/responses |
| Autenticação | JWT (jsonwebtoken) | 9.0 | Tokens de acesso com refresh strategy |
| Banco | PostgreSQL via Supabase | — | Storage com RLS e PBAC |
| Segurança | Helmet + CORS + express-rate-limit | — | Headers de segurança, CORS, rate limiting |
| Testes Backend | Vitest + Supertest | 2.1 | Testes unitários e de integração |
| Testes Frontend | Vitest + Testing Library | 3.2 | Testes de componentes |
| DevOps | Docker + Docker Compose | 24+ / v2+ | Containerização multi-stage |

---

## Estrutura do Projeto

```
Pion-G-Hub/
├── .claude/
│   ├── agents/                    # Definições de agentes
│   │   └── migration-agent.md
│   └── workflows/                 # Fluxos de trabalho
│       └── migration-workflow.md
├── docs/
│   ├── piong-blueprint/           # 🔑 Blueprint do sistema legado
│   │   ├── REVERSA_INDEX.md       # Índice navegável
│   │   ├── 03-mapa-funcional.md
│   │   ├── 04-matriz-roles.md
│   │   ├── 05-arquitetura-inferida.md
│   │   ├── 08-proposta-microsservicos.md
│   │   └── 09-backlog-priorizado.md
│   ├── infra-hostinger.md         # Infraestrutura Docker
│   ├── guia-deploy-hostinger.md   # Guia de deploy passo a passo
│   ├── homologacao-sistema.md     # Relatório de homologação
│   ├── catalogo-api.md            # Catálogo de endpoints
│   └── ...                        # Documentação técnica completa
├── src/                           # Código fonte do backend
│   ├── app.ts                     # Entry point (Express)
│   ├── index.ts                   # Router principal
│   ├── api/
│   │   ├── middlewares/            # Rate limiting, error handler
│   │   ├── controllers/            # Logica de cada módulo
│   │   ├── routes/                 # Definição de rotas
│   │   ├── validators/             # Schemas Zod
│   │   └── integration/            # Testes de integração
│   ├── services/                   # Camada de serviço
│   ├── repositories/               # Camada de dados
│   └── shared/                     # Utilitários compartilhados
├── frontend/                       # Código fonte do frontend
│   ├── src/
│   │   ├── App.tsx                 # Roteamento com React.lazy
│   │   ├── pages/                  # 14 páginas (lazy loaded)
│   │   ├── components/             # Componentes reutilizáveis
│   │   ├── contexts/               # Contexts (notificações)
│   │   ├── shared/                 # API client, tipos
│   │   └── main.tsx                # Entry point
│   ├── Dockerfile                  # Multi-stage: Vite → Nginx
│   └── nginx.conf                  # Configuração Nginx
├── supabase/
│   ├── migrations/                 # Migrations SQL
│   └── scripts/                    # Scripts de migração
├── Dockerfile                      # Backend multi-stage
├── docker-compose.yml              # Orquestração unificada
├── package.json                    # Dependências backend
└── README.md                       # Este arquivo
```

---

## Módulos do Sistema

### Administrativo

| Módulo | Descrição |
|--------|-----------|
| Dashboard | Métricas agregadas (colaboradores, logística, ponto) |
| Colaboradores | Cadastro de funcionários com busca em tempo real |
| Escala do Mês | Gerenciamento de escalas mensais |
| Controle de Ponto | Batidas e validação de pontos |
| Validação de Ponto | Workflow de aprovação |
| Quadro de Avisos | Comunicados internos |
| OS Manutenção | Ordens de serviço |
| Filiais | Gerenciamento de filiais com colaboradores |
| Feriados | Calendário anual de feriados |
| Permissões | Matriz de perfis e permissões PBAC/RLS |
| Usuários Online | Monitoramento de sessões ativas |

### Logística

| Módulo | Descrição |
|--------|-----------|
| Dashboard Logística | Métricas de operações |
| Lançamentos | Registro de operações |
| Histórico | Consulta de operações passadas |
| Transportadoras | Cadastro de transportadoras |
| Relatórios | Exportação CSV |
| Configurações | Parâmetros do módulo |

### Perfis de Acesso

| Perfil | Acesso |
|--------|--------|
| Administrador | Acesso total |
| Gestor | Acesso gerencial com restrições |
| Colaborador | Acesso básico |
| Líder Produção | Controle de produção |
| Equipe Manutenção | Gestão de OS |
| Supervisor Manutenção | Supervisão |
| Líder RH | Gestão de RH |
| Visualizador Produção | Apenas visualização |
| Qualidade – Refugo | Controle de qualidade |
| Somente Leitura | Leitura apenas |
| Acesso Total | Acesso total |
| Ocultar Tudo | Nenhum acesso |

---

## Desenvolvimento Local

### Pré-Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL (ou conta Supabase)
- Git

### Backend

```bash
# Instalar dependências
cd G:\Browser Mapper
npm install

# Configurar variáveis de ambiente
cp .env.example .env  # se existir
# Editar .env com SUPABASE_URL, SUPABASE_ANON_KEY, JWT_SECRET

# Executar em desenvolvimento (hot reload)
npm run dev

# Rodar testes
npm test

# Build de produção
npm run build
npm start
```

### Frontend

```bash
# Instalar dependências
cd G:\Browser Mapper\frontend
npm install

# Executar em desenvolvimento (Vite HMR)
npm run dev

# Build de produção
npm run build

# Rodar testes
npm test
```

### Banco de Dados

```bash
# Aplicar migrations
cd G:\Browser Mapper
npm run migrate
```

---

## Deploy

### Docker Compose (Recomendado)

```bash
# Clonar repositório na VPS
git clone https://github.com/seu-usuario/piong-hub.git /opt/apps/piong-hub
cd /opt/apps/piong-hub

# Configurar variáveis
cp .env.example .env
# Editar .env

# Deploy completo
docker compose up -d --build

# Verificar saúde
curl http://localhost/health       # Frontend
curl http://localhost:3000/health  # Backend
```

Consulte a documentação completa:

- [Infraestrutura e Docker](docs/infra-hostinger.md)
- [Guia de Deploy](docs/guia-deploy-hostinger.md)
- [Checklist Pós-Deploy](docs/checklist-hostinger.md)

---

## Qualidade e Testes

### Cobertura Atual

| Pacote | Testes | Status |
|--------|--------|--------|
| Backend | 49 testes (7 arquivos) | Todos passando |
| Frontend | 5 testes (1 arquivo) | Todos passando |

### Executar Suíte Completa

```bash
# Backend
cd G:\Browser Mapper && npm test

# Frontend
cd G:\Browser Mapper\frontend && npm test
```

Documentação detalhada:

- [Testes Backend](docs/testes-backend.md)
- [Testes Frontend](docs/testes-frontend.md)
- [Relatório de Qualidade](docs/relatorio-qualidade.md)
- [Homologação](docs/homologacao-sistema.md)

---

## Performance e Segurança

### Otimizações Aplicadas

| Camada | Otimização | Impacto |
|--------|------------|---------|
| Database | 7 índices estratégicos (migration 009) | Dashboard < 50ms |
| API | Rate limiting (3 limiters) | Proteção contra brute force |
| Frontend | Code splitting (React.lazy + Suspense) | Bundle: 238 KB → 76 KB gzip |

### Segurança

- **Helmet**: Security headers HTTP
- **CORS**: Origem configurável
- **Rate Limiting**: Janela deslizante por IP (auth: 10/15min, api: 200/15min, write: 60/15min)
- **JWT**: Autenticação stateless com secret seguro
- **Zod**: Validação de todos os inputs
- **Containers**: Rodam como usuário não-root

Documentação detalhada:

- [Performance e Índices](docs/performance-banco.md)
- [Segurança da API](docs/seguranca-api.md)
- [Otimização Frontend](docs/otimizacao-frontend.md)

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [docs/piong-blueprint/REVERSA_INDEX.md](docs/piong-blueprint/REVERSA_INDEX.md) | Índice navegável do blueprint legado |
| [docs/piong-blueprint/03-mapa-funcional.md](docs/piong-blueprint/03-mapa-funcional.md) | Mapa completo de funcionalidades |
| [docs/piong-blueprint/04-matriz-roles.md](docs/piong-blueprint/04-matriz-roles.md) | Matriz de permissões PBAC/RLS |
| [docs/piong-blueprint/05-arquitetura-inferida.md](docs/piong-blueprint/05-arquitetura-inferida.md) | Arquitetura técnica inferida |
| [docs/infra-hostinger.md](docs/infra-hostinger.md) | Infraestrutura Docker para Hostinger |
| [docs/guia-deploy-hostinger.md](docs/guia-deploy-hostinger.md) | Guia passo a passo de deploy |
| [docs/catalogo-api.md](docs/catalogo-api.md) | Catálogo completo de endpoints |
| [docs/checklist-hostinger.md](docs/checklist-hostinger.md) | Checklist operacional pós-deploy |
| [docs/homologacao-sistema.md](docs/homologacao-sistema.md) | Relatório de homologação e resiliência |
| [docs/conclusao-projeto.md](docs/conclusao-projeto.md) | Relatório final do projeto |

---

## Licença

Projeto interno — Pion-G-Hub v1.0.0
