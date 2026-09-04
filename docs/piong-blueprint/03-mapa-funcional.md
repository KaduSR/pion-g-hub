# Mapa Funcional - PionG Blueprint

## Visao Geral

Este documento descreve o mapa completo de funcionalidades do sistema PionG, incluindo todos os departamentos, modulos, telas, campos, filtros e acoes.

---

## 1. Departamento Administrativo

### 1.1 Dashboard Administrativo

**Descricao**: Painel principal com indicadores e atalhos.

**Campos**:
| Campo | Tipo | Descricao |
|-------|------|-----------|
| total_colaboradores | INTEGER | Contagem total |
| presentes_hoje | INTEGER | Colaboradores com batida hoje |
| ausentes_hoje | INTEGER | Sem batida registrada |
| sessoes_ativas | INTEGER | Usuarios online |
| avisos_pendentes | INTEGER | Quadro de avisos pendente |
| os_manutencao_pendentes | INTEGER | Ordens de servico abertas |

**Filtros**: Periodo, Filial

**Acoes**: Atualizar dashboard, Exportar relatorio

---

### 1.2 Modulo Permissoes

**Descricao**: Gerenciamento de perfis de acesso e matriz de permissoes.

#### Tela: Lista de Perfis

**Campos da Lista**:
| Campo | Tipo | Editavel | Obrigatorio |
|-------|------|----------|-------------|
| id | UUID | Nao | Sim |
| nome | VARCHAR(100) | Sim | Sim |
| descricao | TEXT | Sim | Nao |
| nivel_hierarquico | INTEGER | Sim | Sim |
| colaboradores_count | INTEGER | Nao | - |
| status | BOOLEAN | Sim | Sim |
| created_at | TIMESTAMPTZ | Nao | - |
| updated_at | TIMESTAMPTZ | Nao | - |

**Filtros**:
- Status (ativo/inativo/todos)
- Nivel hierarquico (range)
- Modulo com permissao

**Acoes de Tela**:
- Criar novo perfil
- Editar perfil
- Duplicar perfil existente
- Excluir perfil (soft delete)
- Ativar/Desativar perfil
- Gerenciar permissoes

#### Tela: Detalhe do Perfil / Edicao

**Campos**:
| Campo | Tipo | Validacao |
|-------|------|-----------|
| nome | VARCHAR(100) | Unico no sistema |
| descricao | TEXT | Max 500 caracteres |
| nivel_hierarquico | INTEGER | Entre 1 e 100 |
| status | BOOLEAN | Default true |

**Matriz de Permissoes** (sub-tabela):
| Coluna | Tipo |
|--------|------|
| modulo | VARCHAR(50) |
| acao | VARCHAR(50) |
| permitido | BOOLEAN |

**Acoes**: Salvar, Cancelar, Aplicar permissoes em massa

---

### 1.3 Modulo Usuarios Online

**Descricao**: Monitoramento em tempo real das sessoes ativas.

#### Tela: Lista de Sessoes

**Campos**:
| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | UUID | Identificador unico |
| usuario_nome | VARCHAR(200) | Nome do colaborador |
| usuario_email | VARCHAR(255) | Email do colaborador |
| ip_address | VARCHAR(45) | Endereco IP |
| navegador | VARCHAR(100) | Nome do navegador |
| sistema_operacional | VARCHAR(100) | OS do dispositivo |
| device_type | ENUM | desktop/tablet/mobile |
| tempo_online | INTERVAL | Tempo desde login |
| ultima_acao | TIMESTAMPTZ | Ultima atividade |
| status | ENUM | ativa/inativa/expirada/forcada |
| started_at | TIMESTAMPTZ | Momento do login |

**Filtros**:
- Status (ativa/inativa/expirada/todas)
- Filial
- Usuario especifico
- Periodo de conexao

**Acoes de Tela**:
- Forcar logout de sessao
- Ver detalhes da sessao
- Ver historico de acoes
- Atualizar lista (refresh)
- Exportar relatorio

#### Tela: Detalhes da Sessao

**Campos Expandidos**:
| Campo | Tipo |
|-------|------|
| id | UUID |
| usuario_id | UUID |
| token_hash | VARCHAR(64) |
| ip_address | VARCHAR(45) |
| user_agent | TEXT |
| ip_geolocalizacao | JSONB |
| started_at | TIMESTAMPTZ |
| last_activity_at | TIMESTAMPTZ |
| expires_at | TIMESTAMPTZ |

**Historico de Acoes** (sub-tabela):
| Campo | Tipo |
|-------|------|
| acao | VARCHAR(100) |
| modulo | VARCHAR(50) |
| detalhes | JSONB |
| created_at | TIMESTAMPTZ |

**Acoes**: Logout forcado, Copiar token, Ver todas as sessoes do usuario

---

### 1.4 Modulo Filiais

**Descricao**: Gerenciamento de filiais e suas associacoes com colaboradores.

#### Tela: Lista de Filiais

**Campos**:
| Campo | Tipo |
|-------|------|
| id | UUID |
| codigo | VARCHAR(20) |
| nome | VARCHAR(200) |
| cnpj | VARCHAR(18) |
| cidade | VARCHAR(100) |
| estado | VARCHAR(2) |
| status | BOOLEAN |
| colaboradores_count | INTEGER |

**Acoes**: CRUD completo

#### Tela: Detalhe da Filial

**Campos**:
| Campo | Tipo | Validacao |
|-------|------|-----------|
| codigo | VARCHAR(20) | Unico |
| nome | VARCHAR(200) | Obrigatorio |
| cnpj | VARCHAR(18) | CNPJ valido |
| endereco | TEXT | - |
| cidade | VARCHAR(100) | - |
| estado | VARCHAR(2) | UF valido |
| telefone | VARCHAR(20) | - |
| email | VARCHAR(255) | Email valido |
| responsavel_id | UUID | FK colaboradores |

---

### 1.5 Modulo Feriados

**Descricao**: Calendario de feriados nacionais, estaduais e corporativos.

#### Tela: Lista de Feriados

**Campos**:
| Campo | Tipo |
|-------|------|
| id | UUID |
| nome | VARCHAR(200) |
| data | DATE |
| tipo | ENUM |
| uf | VARCHAR(2) |
| filial_id | UUID |

**Filtros**: Ano, Tipo, UF, Filial

#### Tela: Calendario Visual

**Visualizacao**: Calendario mensal com feriados destacados.

---

### 1.6 Modulo Controle de Ponto

**Descricao**: Registro e gestao de batidas de ponto.

#### Tela: Registro de Batidas

**Campos**:
| Campo | Tipo |
|-------|------|
| id | UUID |
| colaborador_id | UUID |
| data | DATE |
| hora | TIME |
| tipo | ENUM |

#### Tela: Validacao de Ponto

**Campos**:
| Campo | Tipo |
|-------|------|
| batida_id | UUID |
| status | ENUM |
| validada_por | UUID |
| validada_em | TIMESTAMPTZ |
| observacao | TEXT |

---

## 2. Departamento Logistica

### 2.1 Dashboard Logistica

**Indicadores**: Entregas do dia, Em transito, Atrasadas, Canceladas.

### 2.2 Modulo Lancamentos

**Campos**:
| Campo | Tipo |
|-------|------|
| id | UUID |
| transportadora_id | UUID |
| numero_rastreio | VARCHAR(50) |
| destinatario | VARCHAR(200) |
| status | ENUM |

---

## 3. Modulos Comuns

### 3.1 Autenticacao

- Login (email/senha)
- Logout
- Refresh token
- Recovery password
- 2FA (futuro)

### 3.2 Quadro de Avisos

**Campos**:
| Campo | Tipo |
|-------|------|
| id | UUID |
| titulo | VARCHAR(200) |
| mensagem | TEXT |
| autor_id | UUID |
| prioridade | ENUM |
| validade | DATE |

---

## 4. Resumo de Modulos e Acoes

| Modulo | Criar | Ler | Atualizar | Excluir |
|--------|-------|-----|-----------|---------|
| perfis | Sim | Sim | Sim | Soft |
| permissoes | Sim | Sim | Sim | Nao |
| sessoes | Nao | Sim | Nao | Sim |
| filiais | Sim | Sim | Sim | Soft |
| feriados | Sim | Sim | Sim | Sim |
| batidas | Sim | Sim | Sim | Nao |
| colaboradores | Sim | Sim | Sim | Soft |