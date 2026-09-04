# Proposta de Reorganização em Microsserviços

> **Nota:** Esta proposta é **[INFERIDA]** baseada em análise da arquitetura atual e melhores práticas de mercado. Requer validação com equipe de desenvolvimento.

---

## Visão Geral

A proposta de reorganização do PionG em arquitetura de microsserviços visa resolver os problemas identificados de escalabilidade, manutenibilidade e performance. A migração deve ser gradual (strangler fig pattern).

---

## Microsserviços Propostos

### 1. Auth Service (Serviço de Autenticação)

| Aspecto | Detalhe |
|---|---|
| **Responsabilidade** | Autenticação, autorização, gerenciamento de sessões |
| **Database** | PostgreSQL (tabelas: users, sessions, permissions) |
| **API Endpoints** | POST /auth/login, POST /auth/logout, GET /auth/me |
| **Tecnologia** | Node.js + Express + JWT |
| **Equipe** | Backend Core |

### 2. Clients Service (Gestão de Clientes)

| Aspecto | Detalhe |
|---|---|
| **Responsabilidade** | CRUD de clientes, análise de crédito |
| **Database** | PostgreSQL (tabelas: clients, addresses, contacts) |
| **API Endpoints** | CRUD /clients, GET /clients/:id/credit-analysis |
| **Tecnologia** | Node.js + Fastify + Prisma |
| **Equipe** | Backend Cadastro |

### 3. Production Service (Gestão de Produção)

| Aspecto | Detalhe |
|---|---|
| **Responsabilidade** | Ordens de produção, recebimento, acompanhamento |
| **Database** | PostgreSQL (tabelas: production_orders, production_items) |
| **API Endpoints** | CRUD /production/orders, POST /production/receive |
| **Tecnologia** | Node.js + Fastify + Prisma |
| **Equipe** | Backend Produção |

### 4. Maintenance Service (Gestão de Manutenção)

| Aspecto | Detalhe |
|---|---|
| **Responsabilidade** | Ordens de serviço, técnicos, peças |
| **Database** | PostgreSQL (tabelas: maintenance_orders, technicians, parts) |
| **API Endpoints** | CRUD /maintenance/orders, GET /maintenance/technicians |
| **Tecnologia** | Node.js + Fastify + Prisma |
| **Equipe** | Backend Manutenção |

### 5. HR Service (Recursos Humanos)

| Aspecto | Detalhe |
|---|---|
| **Responsabilidade** | Colaboradores, ponto eletrônico, folha |
| **Database** | PostgreSQL (tabelas: collaborators, point_records) |
| **API Endpoints** | CRUD /rh/collaborators, POST /rh/point, GET /rh/reports |
| **Tecnologia** | Node.js + Fastify + Prisma |
| **Equipe** | Backend RH |

### 6. Integration Service (Integrações)

| Aspecto | Detalhe |
|---|---|
| **Responsabilidade** | IXC, n8n, webhooks, sync |
| **Database** | PostgreSQL (tabelas: integrations, sync_logs, webhooks) |
| **API Endpoints** | POST /integrations/ixc/sync, GET /integrations/logs |
| **Tecnologia** | Node.js + Bull (fila) + Redis |
| **Equipe** | Backend Infra |

### 7. Reports Service (Relatórios)

| Aspecto | Detalhe |
|---|---|
| **Responsabilidade** | Geração de relatórios, dashboards, exports |
| **Database** | Leitura de outros serviços via API |
| **API Endpoints** | GET /reports/*, POST /reports/export |
| **Tecnologia** | Node.js + PDFKit/ExcelJS |
| **Equipe** | Backend Analytics |

---

## API Gateway

```
┌──────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                │
│                  (Kong / AWS API Gateway)                         │
│  - Rate Limiting                                                  │
│  - Authentication                                                  │
│  - Request Routing                                                │
│  - Logging                                                        │
└─────────┬─────────────────────────────────────┬───────────────────┘
          │                                     │
    ┌─────▼─────┐ ┌──────▼─────┐ ┌──────────▼──┐
    │  Auth     │ │  Clients   │ │  Production  │
    │  Service  │ │  Service   │ │  Service     │
    └───────────┘ └────────────┘ └──────────────┘
    ┌───────────┐ ┌────────────┐ ┌──────────────┐
    │Maintenance│ │    HR      │ │   Reports    │
    │  Service  │ │  Service   │ │   Service    │
    └───────────┘ └────────────┘ └──────────────┘
                    ┌────────────┐
                    │Integration │
                    │  Service   │
                    └────────────┘
```

---

## Estratégia de Migração

### Fase 1: Preparação
- [ ] Implementar logging centralizado
- [ ] Configurar API Gateway
- [ ] Definir contratos de API
- [ ] Setup de infraestrutura (Kubernetes/Docker Swarm)

### Fase 2: Serviço de Autenticação
- [ ] Extrair Auth Service
- [ ] Migrar usuários e sessões
- [ ] Configurar JWT para cross-service
- [ ] Validar autenticação em todos os módulos

### Fase 3: Serviços de Negócio
- [ ] Migrar Clients Service
- [ ] Migrar Production Service
- [ ] Migrar Maintenance Service
- [ ] Migrar HR Service

### Fase 4: Serviços de Suporte
- [ ] Migrar Integration Service
- [ ] Migrar Reports Service
- [ ] Consolidar legacy system (strangler fig)

### Fase 5: Otimização
- [ ] Implementar cache distribuído (Redis)
- [ ] Configurar autoscaling
- [ ] Implementar circuit breakers
- [ ] Dashboard de monitoramento

---

## Benefícios Esperados

| Benefício | Impacto |
|---|---|
| Escalabilidade | Cada serviço escala independentemente |
| Manutenibilidade | Equipes dedicadas por domínio |
| Performance | Cache granular e otimização por serviço |
| Resiliência | Isolamento de falhas |
| Deploy Independente | Releases sem downtime global |

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Complexidade operacional | Alta | Alto | Kubernetes + DevOps automation |
| Latência de rede | Média | Médio | Localidade geográfica + cache |
| Consistência eventual | Média | Médio | Saga pattern + eventos |
| Curva de aprendizado | Alta | Médio | Treinamento + documentação |