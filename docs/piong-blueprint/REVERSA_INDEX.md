# Indice Navegavel - Blueprint PionG

## Indice Principal

| # | Documento | Descricao | Status |
|---|-----------|-----------|--------|
| 01 | [PROBLEMAS-E-GAPS.md](01-problemas-e-gaps.md) | Analise de problemas e lacunas identificadas | Completo |
| 02 | [ATA-VS-SISTEMA.md](02-ata-vs-sistema.md) | Ata de reuniao vs sistema atual | Completo |
| 03 | [03-mapa-funcional.md](03-mapa-funcional.md) | Mapa completo de funcionalidades | Completo |
| 04 | [04-matriz-roles.md](04-matriz-roles.md) | Matriz de permissoes PBAC/RLS | Completo |
| 05 | [05-arquitetura-inferida.md](05-arquitetura-inferida.md) | Arquitetura tecnica inferida | Completo |
| 06 | [06-modelo-dados.md](06-modelo-dados.md) | Modelo de dados conceitual | Completo |
| 07 | [07-API-REST.md](07-API-REST.md) | Especificacao da API REST | Completo |
| 08 | [08-proposta-microsservicos.md](08-proposta-microsservicos.md) | Proposta de microservicos | Completo |
| 09 | [09-backlog-priorizado.md](09-backlog-priorizado.md) | Backlog priorizado para migracao | Completo |

## Navegacao Rapida

### Modulo Administrativo
- [Permissoes](#modulo-permissoes) - Gerenciamento de perfis e permissoes
- [Usuarios Online](#modulo-usuarios-online) - Monitoramento de sessoes ativas
- [Colaboradores](#modulo-colaboradores) - CADASTRO DE FUNCIONARIOS
- [Filiais](#modulo-filiais) - Gerenciamento de filiais
- [Feriados](#modulo-feriados) - Calendario de feriados
- [Controle de Ponto](#modulo-controle-ponto) - Batidas e validacao

### Modulo Logistica
- [Dashboard Logistica](#modulo-logistica)
- [Lancamentos](#modulo-lancamentos)
- [Transportadoras](#modulo-transportadoras)

### Modulo Producao
- [Dashboard Producao](#modulo-producao)
- [Ordens de Producao](#modulo-ordens-producao)

---

## Modulo Permissoes

### Descricao
Gerenciamento centralizado de perfis de acesso e permissoes granulares por modulo/acao.

### Telas
| Tela | Campos | Filtros | Acoes |
|------|--------|---------|-------|
| Lista de Perfis | id, nome, descricao, status, nivel_hierarquico | status, nivel | criar, editar, duplicar, excluir, ativar/desativar |
| Detalhe do Perfil | id, nome, permissoes[], colaboradores_count | modulo, acao | salvar, cancelar |
| Matriz de Permissoes | perfil, modulo, acao, permitido | modulo, perfil | salvar linha, aplicar em massa |

### Campos Detalhados
```
Perfis:
- id: UUID (PK)
- nome: VARCHAR(100) NOT NULL
- descricao: TEXT
- nivel_hierarquico: INTEGER (1-100, maior = mais permissivo)
- status: BOOLEAN (ativo/inativo)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

Permissoes:
- id: UUID (PK)
- perfil_id: UUID (FK -> perfis)
- modulo: VARCHAR(50) NOT NULL
- acao: VARCHAR(50) NOT NULL
- permitido: BOOLEAN DEFAULT true
- created_at: TIMESTAMPTZ

Valores de modulo:
- administrativo.dashboard
- administrativo.colaboradores
- administrativo.permissoes
- administrativo.usuarios_online
- administrativo.filiais
- administrativo.feriados
- administrativo.controle_ponto
- administrativo.escala_mes
- administrativo.validacao_ponto
- administrativo.quadro_avisos
- administrativo.os_manutencao
- logistica.dashboard
- logistica.lancamentos
- logistica.transportadoras
- producao.dashboard
- producao.ordens
```

### Acoes do Sistema
- **Criar Perfil**: POST /api/perfis
- **Editar Perfil**: PUT /api/perfis/{id}
- **Listar Perfis**: GET /api/perfis
- **Duplicar Perfil**: POST /api/perfis/{id}/duplicar
- **Excluir Perfil**: DELETE /api/perfis/{id}
- **Gerenciar Permissoes**: PUT /api/perfis/{id}/permissoes
- **Listar Permissoes por Modulo**: GET /api/permissoes?modulo={modulo}

### Permissoes por Perfil
| Perfil | permissoes | usuarios_online | filiais |feriados |
|--------|-----------|-----------------|---------|---------|
| Administrador | CRUD Total | CRUD Total | CRUD Total | CRUD Total |
| Gestor | CRUD Total | Leitura | Leitura | Leitura |
| Colaborador | Leitura | Nenhuma | Nenhuma | Nenhuma |
| Lider RH | CRUD Total | Leitura | Leitura | CRUD Total |

---

## Modulo Usuarios Online

### Descricao
Monitoramento em tempo real das sessoes ativas no sistema.

### Telas
| Tela | Campos | Filtros | Acoes |
|------|--------|---------|-------|
| Lista de Sessoes | id_sessao, usuario, email, ip, navegador, tempo_online, ultima_acao, status | status, filial | atualizar, forcar_logout, detalhes |
| Detalhes da Sessao | sessao completa com historico de acoes | - | logout, copiar token |

### Campos Detalhados
```
Sessoes:
- id: UUID (PK)
- usuario_id: UUID (FK -> colaboradores)
- token: VARCHAR(500)
- ip_address: VARCHAR(45)
- user_agent: TEXT
- navegador: VARCHAR(100)
- sistema_operacional: VARCHAR(100)
- device_type: ENUM('desktop', 'tablet', 'mobile')
- ip_geolocalizacao: JSONB
- started_at: TIMESTAMPTZ
- last_activity_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ
- status: ENUM('ativa', 'inativa', 'expirada', 'forcada')
- forcada_por: UUID (FK -> usuarios)
- forcada_em: TIMESTAMPTZ

Historico de Acoes:
- id: UUID (PK)
- sessao_id: UUID (FK -> sessoes)
- acao: VARCHAR(100)
- modulo: VARCHAR(50)
- detalhes: JSONB
- created_at: TIMESTAMPTZ
```

### Acoes do Sistema
- **Listar Sessoes Ativas**: GET /api/sessoes?status=ativa
- **Listar por Usuario**: GET /api/sessoes?usuario_id={id}
- **Forcar Logout**: POST /api/sessoes/{id}/forcar-logout
- **Listar Historico**: GET /api/sessoes/{id}/historico
- **Refresh Token**: POST /api/sessoes/{id}/refresh

### Permissoes por Perfil
| Perfil | Listar Sessoes | Forcar Logout | Ver Detalhes |
|--------|---------------|---------------|--------------|
| Administrador | Todas | Sim | Sim |
| Gestor | Todas | Sim | Sim |
| Colaborador | Apenas propria | Nao | Apenas propria |

---

## Modulo Filiais

### Descricao
Gerenciamento de filiais e suas associacoes.

### Campos
```
Filiais:
- id: UUID (PK)
- codigo: VARCHAR(20) NOT NULL UNIQUE
- nome: VARCHAR(200) NOT NULL
- cnpj: VARCHAR(18)
- endereco: TEXT
- cidade: VARCHAR(100)
- estado: VARCHAR(2)
- telefone: VARCHAR(20)
- email: VARCHAR(255)
- status: BOOLEAN
- responsavel_id: UUID (FK -> colaboradores)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

Colaboradores_Filiais:
- id: UUID (PK)
- colaborador_id: UUID (FK -> colaboradores)
- filial_id: UUID (FK -> filiais)
- data_admissao: DATE
- vinculo: ENUM('CLT', 'PJ', 'estagio', 'temporario')
```

### Acoes
- CRUD completo de filiais
- Associar/desassociar colaboradores
- Transferencia entre filiais

---

## Modulo Feriados

### Descricao
Calendario de feriados nacionais e corporativos.

### Campos
```
Feriados:
- id: UUID (PK)
- nome: VARCHAR(200) NOT NULL
- data: DATE NOT NULL
- tipo: ENUM('nacional', 'estadual', 'municipal', 'corporativo')
- uf: VARCHAR(2) (nullable para nacional)
- municipio_codigo: VARCHAR(10) (nullable)
- ano: INTEGER
- repetitivo: BOOLEAN
- filial_id: UUID (FK -> filiais, nullable = todos)
- created_at: TIMESTAMPTZ
```

---

## Modulo Controle de Ponto

### Descricao
Registro e validacao de batidas de ponto.

### Campos
```
Batidas:
- id: UUID (PK)
- colaborador_id: UUID (FK -> colaboradores)
- data: DATE NOT NULL
- hora: TIME NOT NULL
- tipo: ENUM('entrada', 'saida', 'intervalo_entrada', 'intervalo_saida')
- ip: VARCHAR(45)
- dispositivo: VARCHAR(100)
- observacao: TEXT
- validada: BOOLEAN
- validada_por: UUID (FK -> usuarios)
- validada_em: TIMESTAMPTZ
- status: ENUM('pendente', 'aprovada', 'rejeitada')
```

### Acoes
- Registrar batida
- Validar batidas (lider/gestor)
- Gerar relatorio de ponto
- Calcular horas extras

---

## Servicos Relacionados

### Autenticacao
- Login/Logout
- Refresh token
- Recovery password
- 2FA

### Notificacoes
- Email
- Push
- In-app

### Relatorios
- Exportar PDF
- Exportar Excel
- Agendar envio

---

## Legenda

- **CRUD**: Create, Read, Update, Delete
- **Leitura**: Apenas visualizacao (Read)
- **Nenhuma**: Sem acesso ao modulo