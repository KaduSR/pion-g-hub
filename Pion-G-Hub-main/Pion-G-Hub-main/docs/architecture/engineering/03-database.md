# 03 - Database

> Documento de Arquitetura do Banco de Dados
>
> Versão: 1.0
>
> Última atualização: Julho/2026

---

# Visão Geral

O banco de dados do PION G HUB utiliza **PostgreSQL**, hospedado através do **Supabase**.

Toda modelagem foi projetada para acompanhar a arquitetura modular do sistema, mantendo consistência, escalabilidade e facilidade de manutenção.

O banco representa a fonte única da verdade (Single Source of Truth) para todos os módulos da aplicação.

---

# Objetivos

A modelagem do banco possui os seguintes objetivos:

- Padronização
- Escalabilidade
- Integridade
- Segurança
- Facilidade de manutenção
- Compatibilidade com novos módulos

---

# Filosofia

O banco segue alguns princípios permanentes.

## Uma responsabilidade por tabela

Cada tabela representa apenas um domínio específico.

Exemplo:

- users
- profiles
- permissions
- leads
- lead_interactions

Nunca misturar responsabilidades.

---

## Dados Normalizados

Sempre que possível evitar duplicação de informações.

Relacionamentos devem ocorrer através de chaves estrangeiras.

---

## Integridade

Sempre utilizar:

- Primary Keys
- Foreign Keys
- Constraints
- Índices
- Policies (RLS)

---

## Evolução

Novas tabelas devem seguir os mesmos padrões de nomenclatura definidos neste documento.

---

# Convenções de Nomenclatura

## Tabelas

Sempre:

- minúsculas
- snake_case
- plural

Correto:

```text
users
profiles
permissions
leads
lead_notes
lead_history
```

Errado:

```text
User
Lead
tblLead
CadastroLead
LeadHistory
```

---

## Colunas

Sempre:

- minúsculas
- snake_case

Exemplo:

```text
created_at
updated_at
deleted_at
profile_id
user_id
lead_id
```

---

## Chaves Primárias

Todas as tabelas utilizam:

```sql
id UUID PRIMARY KEY
```

Sempre gerado automaticamente.

---

## Chaves Estrangeiras

Sempre utilizar:

```text
user_id

profile_id

lead_id

campaign_id

supplier_id
```

Nunca utilizar:

```text
id_user

idLead

LeadID

FK_LEAD
```

---

# Campos Padrão

Sempre que fizer sentido, toda tabela deve possuir:

```text
id

created_at

updated_at
```

Opcionalmente:

```text
deleted_at

created_by

updated_by

deleted_by
```

Esses campos permitem auditoria e rastreabilidade.

---

# Soft Delete

Sempre que possível utilizar Soft Delete.

Ao invés de remover registros definitivamente:

```text
deleted_at
```

recebe a data da exclusão.

Isso preserva histórico.

---

# Auditoria

Sempre que possível registrar:

Quem criou.

Quem alterou.

Quando alterou.

Quando removeu.

Essa rastreabilidade é essencial para sistemas corporativos.

---

# Relacionamentos

Utilizar sempre Foreign Keys.

Exemplo:

```text
profiles

↓

users

↓

permissions

↓

permission_profiles
```

Nunca armazenar informações duplicadas.

---

# Índices

Criar índices para:

- Foreign Keys
- Campos de pesquisa
- Campos frequentemente filtrados

Exemplo:

```sql
email

cnpj

status

created_at

profile_id
```

---

# UUID

Todas as tabelas utilizam UUID como chave primária.

Motivos:

- maior segurança
- melhor integração
- menor previsibilidade
- facilidade para APIs

---

# Datas

Sempre utilizar:

```text
created_at

updated_at

deleted_at
```

Tipo:

```sql
TIMESTAMP WITH TIME ZONE
```

Nunca utilizar nomes diferentes.

---

# Status

Sempre que possível utilizar ENUM ou tabelas de domínio.

Evitar valores livres.

Exemplo:

```text
draft

pending

approved

rejected

completed
```

---

# Permissões

Todo acesso ao banco deve respeitar o sistema de permissões do HUB.

O banco nunca deve confiar apenas na interface.

Toda validação importante deve ocorrer também através das políticas do Supabase.

---

# Row Level Security (RLS)

Todas as tabelas acessadas pelo Front-End devem possuir políticas de segurança (RLS).

Objetivos:

- impedir acesso indevido;
- restringir leitura;
- restringir escrita;
- proteger dados sensíveis.

Sempre considerar o menor nível de acesso necessário.

---

# Estrutura Modular

Cada módulo possui seu próprio conjunto de tabelas.

Exemplo:

Leads

```text
leads

lead_notes

lead_history

lead_tags
```

Financeiro

```text
financial_accounts

financial_transactions

payment_methods
```

Compras

```text
suppliers

purchase_orders

purchase_items
```

A separação lógica facilita evolução do sistema.

---

# Tabelas Compartilhadas

Algumas tabelas pertencem ao núcleo da aplicação.

Exemplo:

```text
users

profiles

permissions

profile_permissions

audit_logs

attachments

settings
```

Essas tabelas podem ser utilizadas por todos os módulos.

---

# Convenções para Novos Módulos

Ao criar um novo módulo:

Criar apenas tabelas pertencentes ao domínio.

Exemplo:

Brindes

```text
gifts

gift_categories

gift_stock

gift_requests
```

Nunca misturar tabelas de outros módulos.

---

# Arquivos

Sempre que possível utilizar o Storage do Supabase.

No banco armazenar apenas:

```text
id

file_name

file_path

mime_type

size

created_at
```

Jamais armazenar arquivos binários diretamente nas tabelas.

---

# Configurações

Configurações globais devem permanecer centralizadas.

Exemplo:

```text
settings

setting_groups
```

Evitar múltiplas tabelas de configuração.

---

# Logs

Operações importantes devem ser registradas.

Exemplo:

```text
audit_logs

user_logs

access_logs
```

Isso facilita:

- rastreabilidade;
- auditoria;
- diagnóstico de problemas.

---

# Convenções SQL

Preferências do projeto:

✔ snake_case

✔ UUID

✔ Foreign Keys

✔ Constraints

✔ Índices

✔ Soft Delete

✔ Timestamps

✔ RLS

✔ Normalização

---

# Migrações

Toda alteração estrutural no banco deve ocorrer através de migrations versionadas.

Nunca modificar tabelas diretamente em produção.

Cada migration deve:

- possuir objetivo único;
- ser reversível sempre que possível;
- ser documentada.

---

# Visão de Longo Prazo

O banco de dados do PION G HUB foi projetado para suportar a evolução contínua da plataforma.

Novos módulos devem expandir a estrutura existente sem comprometer a organização, a consistência ou a integridade dos dados.

Toda nova modelagem deve seguir as convenções deste documento, garantindo que o banco permaneça previsível, escalável e de fácil manutenção ao longo dos anos.