# Arquitetura Inferida - PionG Blueprint

## Stack Tecnologica

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Frontend | React + Vite + TypeScript | React 18, Vite 5 |
| Backend | Node.js + Express + TypeScript | Node 20, Express 5 |
| Database | PostgreSQL + Supabase | PostgreSQL 15 |
| Realtime | Supabase Realtime | - |
| Auth | Supabase Auth + JWT | RS256 |
| Container | Docker + Docker Compose | Latest |
| Workflows | n8n | Latest |

## Estrutura de Diretorios

```
piong-hub/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── config.toml
├── src/
│   ├── api/                    # Express routes
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── controllers/
│   ├── services/               # Business logic
│   ├── repositories/           # Data access
│   ├── entities/               # Domain entities
│   └── shared/                 # Utils, types, constants
├── src/modules/administrativo/
│   ├── permissoes/
│   └── usuarios-online/
├── src/modules/logistica/
└── src/modules/producao/
```

## Entidades Principais

- perfis, permissoes, sessoes, colaboradores
- filiais, feriados, batidas, avisos
- usuarios_online (view/snapshot)

## API REST

Base: `/api/v1`

| Recurso | Endpoints |
|---------|-----------|
| /perfis | GET, POST |
| /perfis/:id | GET, PUT, DELETE |
| /perfis/:id/permissoes | PUT |
| /sessoes | GET |
| /sessoes/:id | GET |
| /sessoes/:id/forcar-logout | POST |
| /colaboradores | CRUD |
| /filiais | CRUD |
| /feriados | CRUD |