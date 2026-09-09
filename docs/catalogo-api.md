# Catálogo de API — Pion-G-Hub

## Visão Geral

Este documento lista exaustivamente todas as rotas do backend do Pion-G-Hub, incluindo verbos HTTP, payloads esperados e códigos de status.

**Base URL**: `/api/v1`
**Autenticação**: Bearer JWT (exceto `/api/v1/auth/*`)
**Formato**: JSON

---

## Convenções

### Headers

| Header | Obrigatório | Descrição |
|--------|-------------|-----------|
| `Content-Type` | Sim | `application/json` |
| `Authorization` | Sim (rotas protegidas) | `Bearer <token_jwt>` |

### Formato de Resposta

```json
// Sucesso
{
  "success": true,
  "data": { ... }
}

// Erro
{
  "success": false,
  "error": "Mensagem de erro"
}
```

### Códigos de Status

| Código | Significado |
|--------|-------------|
| 200 | OK — Requisição bem-sucedida |
| 201 | Created — Recurso criado |
| 400 | Bad Request — Payload inválido (Zod) |
| 401 | Unauthorized — Token ausente ou inválido |
| 403 | Forbidden — Sem permissão |
| 404 | Not Found — Recurso não encontrado |
| 429 | Too Many Requests — Rate limit excedido |
| 500 | Internal Server Error — Erro no servidor |

### Rate Limiting

| Rota | Limite | Janela |
|------|--------|--------|
| `/api/v1/auth/*` | 10 req | 15 min |
| `/api/v1/*` (leitura) | 200 req | 15 min |
| `/api/v1/*` (escrita) | 60 req | 15 min |

---

## Módulos

- [Autenticação](#autenticação)
- [Dashboard](#dashboard)
- [Colaboradores](#colaboradores)
- [Escalas](#escalas)
- [Pontos](#pontos)
- [Logística](#logística)
- [Áreas](#áreas)
- [Departamentos](#departamentos)
- [Setores](#setores)
- [Cargos](#cargos)
- [Motivos Refugo](#motivos-refugo)
- [Defeitos Refugo](#defeitos-refugo)
- [Relatórios](#relatórios)
- [Auditoria](#auditoria)
- [Webhooks](#webhooks)
- [Perfis](#perfis)
- [Sessões](#sessões)

---

## Autenticação

> **Base**: `/api/v1/auth`
> **Proteção**: Público (rate limit rigoroso)

### POST /api/v1/auth/login

Autentica um usuário e retorna JWT.

**Request Body**:
```json
{
  "email": "usuario@empresa.com",
  "password": "senha123"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "usuario": {
      "id": "uuid",
      "email": "usuario@empresa.com",
      "perfil_nome": "Administrador",
      "nivel_hierarquico": 10,
      "filial_id": "uuid"
    }
  }
}
```

**Response 401**: Credenciais inválidas
**Response 429**: Muitas tentativas (brute force)

### POST /api/v1/auth/logout

Encerra a sessão do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Response 200**: `{ "success": true }`

### GET /api/v1/auth/me

Retorna dados do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "usuario@empresa.com",
    "perfil_id": "uuid",
    "perfil_nome": "Administrador",
    "nivel_hierarquico": 10,
    "filial_id": "uuid"
  }
}
```

---

## Dashboard

> **Base**: `/api/v1/dashboard`
> **Proteção**: JWT obrigatório

### GET /api/v1/dashboard/metrics

Retorna métricas agregadas para o dashboard.

**Headers**: `Authorization: Bearer <token>`

**Response 200**:
```json
{
  "success": true,
  "data": {
    "colaboradores": [
      { "status": "Ativo", "total": 150 },
      { "status": "Inativo", "total": 12 }
    ],
    "pontoHoje": 142,
    "escalasMes": 28,
    "logistica": [
      { "status_operacao": "Pendente", "total": 5 },
      { "status_operacao": "Em Trânsito", "total": 12 },
      { "status_operacao": "Entregue", "total": 45 },
      { "status_operacao": "Cancelado", "total": 2 }
    ]
  }
}
```

---

## Colaboradores

> **Base**: `/api/v1/colaboradores`
> **Proteção**: JWT obrigatório
> **Validação**: Zod schema em create/update

### GET /api/v1/colaboradores

Lista todos os colaboradores.

**Headers**: `Authorization: Bearer <token>`

**Query Params** (opcionais):
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `q` | string | Busca textual por nome |
| `status` | string | Filtro por status (Ativo/Inativo) |
| `area_id` | string | Filtro por área |
| `setor_id` | string | Filtro por setor |
| `cargo_id` | string | Filtro por cargo |
| `page` | number | Página (padrão: 1) |
| `limit` | number | Itens por página (padrão: 50) |

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nome": "João Silva",
      "cpf": "12345678900",
      "email": "joao@empresa.com",
      "status": "Ativo",
      "area_id": "uuid",
      "setor_id": "uuid",
      "cargo_id": "uuid",
      "data_admissao": "2024-01-15"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

### GET /api/v1/colaboradores/:id

Busca colaborador por ID.

**Headers**: `Authorization: Bearer <token>`

**Response 200**: Objeto do colaborador
**Response 404**: Colaborador não encontrado

### POST /api/v1/colaboradores

Cria um novo colaborador.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "nome": "João Silva",
  "cpf": "12345678900",
  "email": "joao@empresa.com",
  "status": "Ativo",
  "area_id": "uuid",
  "setor_id": "uuid",
  "cargo_id": "uuid",
  "data_admissao": "2024-01-15"
}
```

**Response 201**: Objeto do colaborador criado
**Response 400**: Dados inválidos (Zod)

### PUT /api/v1/colaboradores/:id

Atualiza um colaborador existente.

**Headers**: `Authorization: Bearer <token>`

**Request Body**: Mesmo schema do POST (campos opcionais)

**Response 200**: Objeto atualizado
**Response 404**: Colaborador não encontrado

### DELETE /api/v1/colaboradores/:id

Remove um colaborador (exclusão lógica).

**Headers**: `Authorization: Bearer <token>`

**Response 200**: `{ "success": true }`
**Response 404**: Colaborador não encontrado

---

## Escalas

> **Base**: `/api/v1/escalas`
> **Proteção**: JWT obrigatório

### GET /api/v1/escalas

Lista escalas do mês.

**Query Params**: `mes` (YYYY-MM), `setor_id`, `page`, `limit`

**Response 200**: Lista paginada de escalas

### GET /api/v1/escalas/:id

Busca escala por ID.

### POST /api/v1/escalas

Cria nova escala.

**Request Body**:
```json
{
  "colaborador_id": "uuid",
  "data_escala": "2024-09-15",
  "turno": "Manhã",
  "setor_id": "uuid"
}
```

### PUT /api/v1/escalas/:id

Atualiza escala existente.

### DELETE /api/v1/escalas/:id

Remove escala.

---

## Pontos

> **Base**: `/api/v1/pontos`
> **Proteção**: JWT obrigatório

### GET /api/v1/pontos

Lista registros de ponto.

**Query Params**: `colaborador_id`, `data_inicio`, `data_fim`, `page`, `limit`

### GET /api/v1/pontos/:id

Busca ponto por ID.

### POST /api/v1/pontos

Registra batida de ponto.

**Request Body**:
```json
{
  "colaborador_id": "uuid",
  "data_registro": "2024-09-09",
  "hora_entrada": "08:00",
  "hora_saida": "17:00"
}
```

### PUT /api/v1/pontos/:id

Atualiza registro de ponto.

### DELETE /api/v1/pontos/:id

Remove registro de ponto.

---

## Logística

> **Base**: `/api/v1/logistica`
> **Proteção**: JWT obrigatório
> **Validação**: Zod schema em create/update

### GET /api/v1/logistica

Lista operações de logística.

**Query Params**: `status_operacao`, `data_inicio`, `data_fim`, `transportadora_id`, `page`, `limit`

**Response 200**: Lista paginada

### GET /api/v1/logistica/:id

Busca operação por ID.

### POST /api/v1/logistica

Cria nova operação.

**Request Body**:
```json
{
  "tipo_operacao": "Coleta",
  "origem": "São Paulo, SP",
  "destino": "Rio de Janeiro, RJ",
  "transportadora_id": "uuid",
  "status_operacao": "Pendente",
  "data_prevista": "2024-09-10"
}
```

### PUT /api/v1/logistica/:id

Atualiza operação (ex: status para "Entregue").

### DELETE /api/v1/logistica/:id

Remove operação.

---

## Áreas

> **Base**: `/api/v1/areas`
> **Proteção**: JWT obrigatório
> **CRUD**: Listar, Buscar, Criar, Atualizar, Excluir

### GET /api/v1/areas
### GET /api/v1/areas/:id
### POST /api/v1/areas
### PUT /api/v1/areas/:id
### DELETE /api/v1/areas/:id

**Request Body (Create/Update)**:
```json
{
  "nome": "Produção",
  "descricao": "Área de produção industrial"
}
```

---

## Departamentos

> **Base**: `/api/v1/departamentos`
> **Proteção**: JWT obrigatório

### GET /api/v1/departamentos
### GET /api/v1/departamentos/:id
### POST /api/v1/departamentos
### PUT /api/v1/departamentos/:id
### DELETE /api/v1/departamentos/:id

**Request Body (Create/Update)**:
```json
{
  "nome": "Recursos Humanos",
  "descricao": "Departamento de RH"
}
```

---

## Setores

> **Base**: `/api/v1/setores`
> **Proteção**: JWT obrigatório

### GET /api/v1/setores
### GET /api/v1/setores/:id
### POST /api/v1/setores
### PUT /api/v1/setores/:id
### DELETE /api/v1/setores/:id

**Request Body (Create/Update)**:
```json
{
  "nome": "Linha de Produção A",
  "departamento_id": "uuid"
}
```

---

## Cargos

> **Base**: `/api/v1/cargos`
> **Proteção**: JWT obrigatório

### GET /api/v1/cargos
### GET /api/v1/cargos/:id
### POST /api/v1/cargos
### PUT /api/v1/cargos/:id
### DELETE /api/v1/cargos/:id

**Request Body (Create/Update)**:
```json
{
  "nome": "Operador de Máquina",
  "descricao": "Opera máquinas de produção"
}
```

---

## Motivos Refugo

> **Base**: `/api/v1/motivos-refugo`
> **Proteção**: JWT obrigatório
> **ID**: `codigo` (string)

### GET /api/v1/motivos-refugo
### GET /api/v1/motivos-refugo/:codigo
### POST /api/v1/motivos-refugo
### PUT /api/v1/motivos-refugo/:codigo
### DELETE /api/v1/motivos-refugo/:codigo

**Request Body (Create/Update)**:
```json
{
  "codigo": "MR-001",
  "descricao": "Defeito dimensional"
}
```

---

## Defeitos Refugo

> **Base**: `/api/v1/defeitos-refugo`
> **Proteção**: JWT obrigatório
> **ID**: `codigo` (string)

### GET /api/v1/defeitos-refugo
### GET /api/v1/defeitos-refugo/:codigo
### POST /api/v1/defeitos-refugo
### PUT /api/v1/defeitos-refugo/:codigo
### DELETE /api/v1/defeitos-refugo/:codigo

**Request Body (Create/Update)**:
```json
{
  "codigo": "DF-001",
  "descricao": "Risco na superfície"
}
```

---

## Relatórios

> **Base**: `/api/v1/relatorios`
> **Proteção**: JWT obrigatório

### GET /api/v1/relatorios/colaboradores-csv

Exporta lista de colaboradores em CSV.

**Headers**: `Authorization: Bearer <token>`

**Query Params**: `q` (busca), `status`, `area_id`, `setor_id`, `cargo_id`

**Response 200**: `text/csv` com BOM UTF-8

**Response Headers**:
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="colaboradores.csv"
```

### GET /api/v1/relatorios/logistica-csv

Exporta operações de logística em CSV.

**Headers**: `Authorization: Bearer <token>`

**Query Params**: `status_operacao`, `data_inicio`, `data_fim`, `transportadora_id`

**Response 200**: `text/csv` com BOM UTF-8

---

## Auditoria

> **Base**: `/api/v1/auditoria`
> **Proteção**: JWT obrigatório

### GET /api/v1/auditoria

Lista logs de auditoria do sistema.

**Query Params**: `tabela_afetada`, `acao`, `usuario_id`, `data_inicio`, `data_fim`, `page`, `limit`

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "acao": "INSERT",
      "tabela_afetada": "colaboradores",
      "registro_id": "uuid",
      "dados_anteriores": null,
      "dados_novos": { "nome": "João Silva" },
      "usuario_id": "uuid",
      "criado_em": "2024-09-09T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50
}
```

---

## Webhooks

> **Base**: `/api/v1/webhooks`
> **Proteção**: JWT obrigatório
> **Validação**: Zod schema em create/update

### GET /api/v1/webhooks

Lista configurações de webhooks.

**Query Params**: `evento`, `ativo`

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nome": "Webhook Slack",
      "url": "https://hooks.slack.com/services/...",
      "evento": "colaborador.criado",
      "ativo": true,
      "criado_em": "2024-09-01T00:00:00Z"
    }
  ]
}
```

### POST /api/v1/webhooks

Cria uma nova configuração de webhook.

**Request Body**:
```json
{
  "nome": "Webhook Slack",
  "url": "https://hooks.slack.com/services/...",
  "evento": "colaborador.criado",
  "ativo": true
}
```

**Validação**:
- `nome`: string, mínimo 3 caracteres
- `url`: string, formato URL válido (HTTPS preferencial)
- `evento`: string, deve ser um evento suportado
- `ativo`: boolean

**Response 201**: Objeto do webhook criado
**Response 400**: Dados inválidos (Zod)

### PUT /api/v1/webhooks/:id

Atualiza configuração de webhook.

**Request Body**: Mesmo schema do POST (campos opcionais)

**Response 200**: Objeto atualizado

### DELETE /api/v1/webhooks/:id

Remove configuração de webhook.

**Response 200**: `{ "success": true }`

---

## Perfis

> **Base**: `/api/v1/perfis`
> **Proteção**: JWT obrigatório

### GET /api/v1/perfis

Lista perfis de acesso.

**Query Params**: `status`, `nivel`

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nome": "Administrador",
      "descricao": "Acesso total",
      "status": true,
      "nivel_hierarquico": 10
    }
  ]
}
```

### GET /api/v1/perfis/:id

Busca perfil por ID.

### POST /api/v1/perfis

Cria novo perfil.

**Request Body**:
```json
{
  "nome": "Supervisor",
  "descricao": "Supervisão de equipes",
  "status": true,
  "nivel_hierarquico": 5,
  "permissoes": [
    { "modulo": "colaboradores", "acao": "ler", "permitido": true }
  ]
}
```

### PUT /api/v1/perfis

Atualiza perfil existente (inclui matriz de permissões).

**Request Body**: Mesmo schema do POST (campos opcionais)

### DELETE /api/v1/perfis/:id

Remove perfil.

---

## Sessões

> **Base**: `/api/v1/sessoes`
> **Proteção**: JWT obrigatório

### GET /api/v1/sessoes

Lista todas as sessões ativas.

**Response 200**: Lista de sessões

### GET /api/v1/sessoes/ativas

Lista apenas sessões ativas.

**Response 200**: Lista de sessões ativas

### GET /api/v1/sessoes/count

Contagem de sessões ativas.

**Response 200**:
```json
{
  "success": true,
  "data": { "count": 42 }
}
```

### GET /api/v1/sessoes/usuario/:usuario_id

Sessões de um usuário específico.

### GET /api/v1/sessoes/:id

Detalhes de uma sessão.

### GET /api/v1/sessoes/:id/detalhe

Detalhes completos de uma sessão.

### GET /api/v1/sessoes/:id/historico

Histórico de atividade da sessão.

### POST /api/v1/sessoes/:id/forcar-logout

Força logout de uma sessão.

**Response 200**: `{ "success": true }`

### POST /api/v1/sessoes/:id/refresh

Renova o token da sessão.

**Response 200**:
```json
{
  "success": true,
  "data": {
    "token": "novo_jwt_token"
  }
}
```

---

## Health Check

### GET /health

Endpoint público de verificação de saúde da API.

**Response 200**:
```json
{
  "status": "ok",
  "timestamp": "2024-09-09T13:35:45.000Z"
}
```

---

## Resumo de Rotas

| Método | Rota | Descrição | Proteção |
|--------|------|-----------|----------|
| POST | `/api/v1/auth/login` | Login | Público |
| POST | `/api/v1/auth/logout` | Logout | JWT |
| GET | `/api/v1/auth/me` | Dados do usuário | JWT |
| GET | `/api/v1/dashboard/metrics` | Métricas dashboard | JWT |
| GET | `/api/v1/colaboradores` | Listar colaboradores | JWT |
| GET | `/api/v1/colaboradores/:id` | Buscar colaborador | JWT |
| POST | `/api/v1/colaboradores` | Criar colaborador | JWT |
| PUT | `/api/v1/colaboradores/:id` | Atualizar colaborador | JWT |
| DELETE | `/api/v1/colaboradores/:id` | Excluir colaborador | JWT |
| GET | `/api/v1/escalas` | Listar escalas | JWT |
| GET | `/api/v1/escalas/:id` | Buscar escala | JWT |
| POST | `/api/v1/escalas` | Criar escala | JWT |
| PUT | `/api/v1/escalas/:id` | Atualizar escala | JWT |
| DELETE | `/api/v1/escalas/:id` | Excluir escala | JWT |
| GET | `/api/v1/pontos` | Listar pontos | JWT |
| GET | `/api/v1/pontos/:id` | Buscar ponto | JWT |
| POST | `/api/v1/pontos` | Registrar ponto | JWT |
| PUT | `/api/v1/pontos/:id` | Atualizar ponto | JWT |
| DELETE | `/api/v1/pontos/:id` | Excluir ponto | JWT |
| GET | `/api/v1/logistica` | Listar operações | JWT |
| GET | `/api/v1/logistica/:id` | Buscar operação | JWT |
| POST | `/api/v1/logistica` | Criar operação | JWT |
| PUT | `/api/v1/logistica/:id` | Atualizar operação | JWT |
| DELETE | `/api/v1/logistica/:id` | Excluir operação | JWT |
| GET | `/api/v1/areas` | Listar áreas | JWT |
| GET | `/api/v1/areas/:id` | Buscar área | JWT |
| POST | `/api/v1/areas` | Criar área | JWT |
| PUT | `/api/v1/areas/:id` | Atualizar área | JWT |
| DELETE | `/api/v1/areas/:id` | Excluir área | JWT |
| GET | `/api/v1/departamentos` | Listar departamentos | JWT |
| GET | `/api/v1/departamentos/:id` | Buscar departamento | JWT |
| POST | `/api/v1/departamentos` | Criar departamento | JWT |
| PUT | `/api/v1/departamentos/:id` | Atualizar departamento | JWT |
| DELETE | `/api/v1/departamentos/:id` | Excluir departamento | JWT |
| GET | `/api/v1/setores` | Listar setores | JWT |
| GET | `/api/v1/setores/:id` | Buscar setor | JWT |
| POST | `/api/v1/setores` | Criar setor | JWT |
| PUT | `/api/v1/setores/:id` | Atualizar setor | JWT |
| DELETE | `/api/v1/setores/:id` | Excluir setor | JWT |
| GET | `/api/v1/cargos` | Listar cargos | JWT |
| GET | `/api/v1/cargos/:id` | Buscar cargo | JWT |
| POST | `/api/v1/cargos` | Criar cargo | JWT |
| PUT | `/api/v1/cargos/:id` | Atualizar cargo | JWT |
| DELETE | `/api/v1/cargos/:id` | Excluir cargo | JWT |
| GET | `/api/v1/motivos-refugo` | Listar motivos refugo | JWT |
| GET | `/api/v1/motivos-refugo/:codigo` | Buscar motivo refugo | JWT |
| POST | `/api/v1/motivos-refugo` | Criar motivo refugo | JWT |
| PUT | `/api/v1/motivos-refugo/:codigo` | Atualizar motivo refugo | JWT |
| DELETE | `/api/v1/motivos-refugo/:codigo` | Excluir motivo refugo | JWT |
| GET | `/api/v1/defeitos-refugo` | Listar defeitos refugo | JWT |
| GET | `/api/v1/defeitos-refugo/:codigo` | Buscar defeito refugo | JWT |
| POST | `/api/v1/defeitos-refugo` | Criar defeito refugo | JWT |
| PUT | `/api/v1/defeitos-refugo/:codigo` | Atualizar defeito refugo | JWT |
| DELETE | `/api/v1/defeitos-refugo/:codigo` | Excluir defeito refugo | JWT |
| GET | `/api/v1/relatorios/colaboradores-csv` | Exportar CSV colaboradores | JWT |
| GET | `/api/v1/relatorios/logistica-csv` | Exportar CSV logística | JWT |
| GET | `/api/v1/auditoria` | Listar logs de auditoria | JWT |
| GET | `/api/v1/webhooks` | Listar webhooks | JWT |
| POST | `/api/v1/webhooks` | Criar webhook | JWT |
| PUT | `/api/v1/webhooks/:id` | Atualizar webhook | JWT |
| DELETE | `/api/v1/webhooks/:id` | Excluir webhook | JWT |
| GET | `/api/v1/perfis` | Listar perfis | JWT |
| GET | `/api/v1/perfis/:id` | Buscar perfil | JWT |
| POST | `/api/v1/perfis` | Criar perfil | JWT |
| PUT | `/api/v1/perfis` | Atualizar perfil | JWT |
| DELETE | `/api/v1/perfis/:id` | Excluir perfil | JWT |
| GET | `/api/v1/sessoes` | Listar sessões | JWT |
| GET | `/api/v1/sessoes/ativas` | Sessões ativas | JWT |
| GET | `/api/v1/sessoes/count` | Contagem de sessões | JWT |
| GET | `/api/v1/sessoes/usuario/:id` | Sessões do usuário | JWT |
| GET | `/api/v1/sessoes/:id` | Detalhes da sessão | JWT |
| GET | `/api/v1/sessoes/:id/detalhe` | Detalhes completos | JWT |
| GET | `/api/v1/sessoes/:id/historico` | Histórico da sessão | JWT |
| POST | `/api/v1/sessoes/:id/forcar-logout` | Forçar logout | JWT |
| POST | `/api/v1/sessoes/:id/refresh` | Renovar token | JWT |
| GET | `/health` | Health check | Público |

**Total**: 65 rotas

---

## Eventos de Webhook Suportados

| Evento | Trigger |
|--------|---------|
| `colaborador.criado` | Novo colaborador registrado |
| `colaborador.atualizado` | Colaborador modificado |
| `colaborador.excluido` | Colaborador removido |
| `logistica.criada` | Nova operação de logística |
| `logistica.atualizada` | Operação modificada |
| `ponto.registrado` | Nova batida de ponto |
| `escala.criada` | Nova escala registrada |
| `escala.atualizada` | Escala modificada |

---

## Referências

- `src/api/routes/*.routes.ts` — Implementação das rotas
- `src/api/validators/*.validator.ts` — Schemas Zod
- `src/shared/types/entities.ts` — Tipos de resposta
- `src/api/middlewares/rateLimit.middleware.ts` — Rate limiting
- `docs/seguranca-api.md` — Políticas de segurança
