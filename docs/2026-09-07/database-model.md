# Modelo de Banco de Dados — PionG Hub

## Banco: PostgreSQL (Supabase)

### Tabelas

#### `perfis`
| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK, default gen_random_uuid() |
| nome | VARCHAR(100) | NOT NULL, UNIQUE |
| descricao | TEXT | — |
| nivel_hierarquico | INTEGER | NOT NULL DEFAULT 50, CHECK 0-100 |
| status | BOOLEAN | NOT NULL DEFAULT true |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `modulos`
| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| codigo | VARCHAR(50) | NOT NULL, UNIQUE |
| nome | VARCHAR(100) | NOT NULL |
| departamento | VARCHAR(50) | NOT NULL |
| descricao | TEXT | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `acoes`
| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| codigo | VARCHAR(50) | NOT NULL |
| modulo_id | UUID | FK → modulos(id) |
| nome | VARCHAR(100) | NOT NULL |
| UNIQUE(codigo, modulo_id) | — | — |

#### `permissoes`
| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| perfil_id | UUID | FK → perfis(id) ON DELETE CASCADE |
| modulo_id | UUID | FK → modulos(id) ON DELETE CASCADE |
| acao_codigo | VARCHAR(50) | NOT NULL |
| permitido | BOOLEAN | NOT NULL DEFAULT true |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| UNIQUE(perfil_id, modulo_id, acao_codigo) | — | — |

#### `filiais`
| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| codigo | VARCHAR(20) | NOT NULL, UNIQUE |
| nome | VARCHAR(200) | NOT NULL |
| cnpj | VARCHAR(18) | — |
| endereco | TEXT | — |
| cidade | VARCHAR(100) | — |
| estado | VARCHAR(2) | — |
| telefone | VARCHAR(20) | — |
| email | VARCHAR(255) | — |
| status | BOOLEAN | NOT NULL DEFAULT true |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `colaboradores`
| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| matricula | VARCHAR(50) | UNIQUE |
| nome | VARCHAR(200) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| cpf | VARCHAR(14) | — |
| data_nascimento | DATE | — |
| telefone | VARCHAR(20) | — |
| cargo | VARCHAR(100) | — |
| departamento | VARCHAR(100) | — |
| filial_id | UUID | FK → filiais(id) |
| perfil_id | UUID | FK → perfis(id), NOT NULL DEFAULT 'colaborador' |
| status | BOOLEAN | NOT NULL DEFAULT true |
| data_admissao / data_desligamento | DATE | — |
| foto_url | TEXT | — |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `usuarios` (autenticação)
| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| senha_hash | VARCHAR(255) | NOT NULL |
| colaborador_id | UUID | FK → colaboradores(id) |
| perfil_id | UUID | FK → perfis(id), NOT NULL |
| filial_id | UUID | FK → filiais(id) |
| status | BOOLEAN | NOT NULL DEFAULT true |
| ultimo_login | TIMESTAMPTZ | — |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `sessoes`
| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| usuario_id | UUID | FK → usuarios(id) ON DELETE CASCADE |
| token_hash | VARCHAR(64) | NOT NULL |
| ip_address | VARCHAR(45) | — |
| user_agent / navegador / sistema_operacional | TEXT/VARCHAR | — |
| device_type | VARCHAR(20) | CHECK IN ('desktop','tablet','mobile','unknown') |
| ip_geolocalizacao | JSONB | — |
| started_at / last_activity_at / expires_at | TIMESTAMPTZ | NOT NULL |
| status | VARCHAR(20) | NOT NULL DEFAULT 'ativa' |
| forcada_por | UUID | FK → usuarios(id) |
| forcada_em | TIMESTAMPTZ | — |

#### `sessoes_historico`
| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| sessao_id | UUID | FK → sessoes(id) ON DELETE CASCADE |
| acao / modulo | VARCHAR | — |
| detalhes | JSONB | — |
| ip_address | VARCHAR(45) | — |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `feriados`
| Coluna | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| nome | VARCHAR(200) | NOT NULL |
| data | DATE | NOT NULL |
| tipo | VARCHAR(20) | CHECK IN ('nacional','estadual','municipal','corporativo') |
| uf | VARCHAR(2) | — |
| municipio_codigo | VARCHAR(10) | — |
| ano | INTEGER | NOT NULL |
| repetitivo | BOOLEAN | DEFAULT false |
| filial_id | UUID | FK → filiais(id) |

### Relacionamentos
```
perfis ─┬─ permissoes ─┬─ modulos
        │               └─ acoes
        └─ colaboradores ── usuarios ── sessoes ── sessoes_historico
                           │
filiais ── colaboradores  │
         └─ feriados ────┘
```

### Perfis padrão (seed)
10 perfis: Administrador(100), Gestor(80), Lider RH(75), Supervisor Manutencao(70), Lider Producao(60), Colaborador(50), Qualidad-Refugo(45), Equipe Manutencao(40), Visualizador Producao(30), Somente Leitura(20), Acesso Total(100), Ocultar Tudo(0).
