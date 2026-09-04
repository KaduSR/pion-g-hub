# Backlog Priorizado de Migração

> Priorização baseada na análise de problemas (06-problemas-encontrados.md) e proposta de microsserviços (08-proposta-microsservicos.md).

---

## Visão Geral do Escopo

| Fase | Foco | Prioridade | Estimativa |
|------|------|------------|-------------|
| **Fase 0** | Setup e Infraestrutura | - | Semanas 1-2 |
| **Fase 1** | Auth + Core Infra | P0 | Semanas 3-6 |
| **Fase 2** | Módulos Administrativos (RH) | P1 | Semanas 7-12 |
| **Fase 3** | Logística | P1 | Semanas 13-16 |
| **Fase 4** | Manutenção | P2 | Semanas 17-20 |
| **Fase 5** | Microserviços + Integrações | P2 | Semanas 21-24 |

---

## Fase 0: Setup e Infraestrutura

| ID | Tarefa | Tipo | Dependência | Esforço |
|----|--------|------|-------------|---------|
| S01 | Configurar repositório Git + branching strategy | DevOps | - | 1 dia |
| S02 | Setup CI/CD pipeline (GitHub Actions) | DevOps | S01 | 2 dias |
| S03 | Configurar ambiente Kubernetes/Docker | Infra | S01 | 2 dias |
| S04 | Implementar logging centralizado | Infra | S02 | 2 dias |
| S05 | Configurar API Gateway (Kong/AWS) | Infra | S03 | 3 dias |
| S06 | Definir contratos de API (OpenAPI) | Backend | S05 | 2 dias |
| **Subtotal** | | | | **12 dias** |

---

## Fase 1: Autenticação + Infra Core

### Sprint 1.1: Auth Service

| ID | Tarefa | Tipo | Dependência | Esforço |
|----|--------|------|-------------|---------|
| A01 | Extrair serviço de autenticação | Backend | S05 | 5 dias |
| A02 | Migrar usuários e sessões | DB | A01 | 3 dias |
| A03 | Configurar JWT cross-service | Backend | A01 | 2 dias |
| A04 | Implementar refresh tokens | Backend | A01 | 2 dias |
| A05 | Testes de autenticação | QA | A04 | 2 dias |
| **Subtotal** | | | | **14 dias** |

### Sprint 1.2: Database Schema

| ID | Tarefa | Tipo | Dependência | Esforço |
|----|--------|------|-------------|---------|
| D01 | Criar schema PostgreSQL base | DB | - | 3 dias |
| D02 | Implementar RLS (Row Level Security) | DB | D01 | 3 dias |
| D03 | Setup migrations versioning | DB | D01 | 1 dia |
| D04 | Configurar backup automático | Infra | D01 | 1 dia |
| **Subtotal** | | | | **8 dias** |

### Sprint 1.3: Frontend Base

| ID | Tarefa | Tipo | Dependência | Esforço |
|----|--------|------|-------------|---------|
| F01 | Setup React + Vite + TypeScript | Frontend | - | 2 dias |
| F02 | Implementar roteamento (React Router) | Frontend | F01 | 1 dia |
| F03 | Configurar autenticação (JWT hooks) | Frontend | F01, A04 | 3 dias |
| F04 | Criar componentes base (UI Kit) | Frontend | F01 | 3 dias |
| F05 | Setup estado global (Zustand/Redux) | Frontend | F01 | 2 dias |
| **Subtotal** | | | | **11 dias** |

---

## Fase 2: Módulos Administrativos (RH)

### Sprint 2.1: Colaboradores

| ID | Tarefa | Tipo | Dependência | Esforço |
|----|--------|------|-------------|---------|
| R01 | CRUD Colaboradores API | Backend | A01 | 3 dias |
| R02 | CRUD Colaboradores UI | Frontend | R01 | 3 dias |
| R03 | Filtros avançados (status/setor) | Backend | R01 | 2 dias |
| R04 | Importação de planilha | Backend | R01 | 3 dias |
| R05 | Testes unitários | QA | R02 | 2 dias |
| **Subtotal** | | | | **13 dias** |

### Sprint 2.2: Controle de Ponto

| ID | Tarefa | Tipo | Dependência | Esforço |
|----|--------|------|-------------|---------|
| P01 | API de registro de ponto | Backend | R01 | 4 dias |
| P02 | UI de registro de ponto | Frontend | P01 | 3 dias |
| P03 | Cálculo de horas/saldo | Backend | P01 | 3 dias |
| P04 | Exportação para Excel | Backend | P01 | 2 dias |
| P05 | Testes de ponto | QA | P04 | 2 dias |
| **Subtotal** | | | | **14 dias** |

### Sprint 2.3: Permissões (PBAC)

| ID | Tarefa | Tipo | Dependência | Esforço |
|----|--------|------|-------------|---------|
| B01 | API de perfis e permissões | Backend | A01 | 3 dias |
| B02 | UI de gestão de permissões | Frontend | B01 | 4 dias |
| B03 | Middleware de autorização | Backend | B01 | 2 dias |
| B04 | Testes de RBAC | QA | B03 | 2 dias |
| **Subtotal** | | | | **11 dias** |

---

## Fase 3: Logística

| ID | Tarefa | Tipo | Dependência | Esforço |
|----|--------|------|-------------|---------|
| L01 | CRUD Lançamentos API | Backend | A01 | 4 dias |
| L02 | Dashboard Logística | Frontend | L01 | 3 dias |
| L03 | CRUD Transportadoras | Backend | L01 | 2 dias |
| L04 | Histórico e relatórios | Backend | L01 | 4 dias |
| L05 | Importação CSV | Backend | L01 | 2 dias |
| L06 | UI completa de fretes | Frontend | L05 | 4 dias |
| **Subtotal** | | | | **19 dias** |

---

## Fase 4: Manutenção

| ID | Tarefa | Tipo | Dependência | Esforço |
|----|--------|------|-------------|---------|
| M01 | CRUD OS Manutenção API | Backend | A01 | 4 dias |
| M02 | Workflow de status OS | Backend | M01 | 3 dias |
| M03 | UI de OS Manutenção | Frontend | M02 | 5 dias |
| M04 | Dashboard manutenção | Frontend | M01 | 3 dias |
| M05 | Notificações de OS | Backend | M02 | 2 dias |
| **Subtotal** | | | | **17 dias** |

---

## Fase 5: Integrações + Microserviços

| ID | Tarefa | Tipo | Dependência | Esforço |
|----|--------|------|-------------|---------|
| I01 | Integration Service | Backend | A01 | 5 dias |
| I02 | Webhook IXC | Backend | I01 | 3 dias |
| I03 | n8n workflows | Infra | I01 | 3 dias |
| I04 | Reports Service | Backend | I01 | 4 dias |
| I05 | PDF/Excel exports | Backend | I04 | 3 dias |
| I06 | Monitoramento completo | Infra | I05 | 2 dias |
| **Subtotal** | | | | **20 dias** |

---

## Correções de Problemas Prioritários

### P0 - Críticos (Resgatar na Fase 1)

| ID | Problema | Solução | Sprint |
|----|----------|---------|--------|
| P0-01 | Falha de autenticação | JWT com refresh tokens robustos | 1.1 |
| P0-02 | Dados não persistem | Transações com rollback | 1.2 |
| P0-03 | Integração IXC não responde | Dead letter queue + retry | 5.2 |
| P0-04 | Sem rollback | Implementar Saga pattern | 1.2 |

### P1 - Altos (Resgatar na Fase 2-3)

| ID | Problema | Solução | Sprint |
|----|----------|---------|--------|
| P1-01 | Performance lenta | Paginação + cache Redis | 2.1 |
| P1-02 | Validação fraca | Zod/Yup schemas | 2.1 |
| P1-03 | Sem cache | Redis distributed cache | 0 |
| P1-05 | Sem paginação | Cursor/offset pagination | 2.1 |

---

## Resumo de Esforço

| Fase | Esforço (dias) | Semanas (5d/semana) |
|------|----------------|---------------------|
| Fase 0: Setup | 12 | 2.5 |
| Fase 1: Auth + Core | 33 | 6.5 |
| Fase 2: RH | 38 | 7.5 |
| Fase 3: Logística | 19 | 4 |
| Fase 4: Manutenção | 17 | 3.5 |
| Fase 5: Integrações | 20 | 4 |
| **Total** | **139 dias** | **~28 semanas (~7 meses)** |

---

## Riscos e Mitigações

| Risco | Prob | Impact | Mitigação |
|-------|------|--------|-----------|
| Curva React/TypeScript | Alta | Médio | Treinamento + pair programming |
| Complexidade microservices | Alta | Alto | Strangler fig gradual |
| Integração IXC legacy | Média | Alto | Mock first, then connect |
| Performance RLS PostgreSQL | Média | Médio | Indexing + query optimization |

---

## Critérios de Pronto

Para cada sprint:
- [ ] Código mergeado na main
- [ ] Testes unitários > 80% coverage
- [ ] Testes de integração passando
- [ ] Documentação API atualizada
- [ ] Deploy em staging validado