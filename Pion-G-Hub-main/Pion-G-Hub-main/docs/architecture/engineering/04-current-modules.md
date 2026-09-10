# 04 - Current Modules

> Documento de Módulos Atuais
>
> Versão: 1.0
>
> Última atualização: Julho/2026

---

# Visão Geral

Este documento descreve todos os módulos atualmente existentes no PION G HUB.

Cada módulo representa um domínio de negócio independente e possui responsabilidades bem definidas.

O objetivo deste documento é servir como inventário oficial da plataforma, permitindo que desenvolvedores, arquitetos e inteligências artificiais compreendam rapidamente o estado atual do sistema.

---

# Status dos Módulos

| Status | Significado |
|---------|-------------|
| ✅ Implementado | Funcionalidade concluída e operacional |
| 🚧 Em desenvolvimento | Módulo em construção |
| 🧪 Em testes | Funcionalidade implementada aguardando validação |
| 📋 Estruturado | Arquitetura preparada, aguardando desenvolvimento |

---

# CORE

O CORE representa a fundação do PION G HUB.

Todos os demais módulos dependem de seus serviços.

---

## Autenticação

### Objetivo

Gerenciar toda autenticação dos usuários.

### Funcionalidades

- Login
- Logout
- Recuperação de senha
- Sessão autenticada
- Persistência da sessão

### Dependências

- Supabase Auth

### Status

✅ Implementado

---

## Usuários

### Objetivo

Gerenciar os usuários cadastrados no sistema.

### Funcionalidades

- Cadastro
- Edição
- Ativação
- Desativação

### Status

✅ Implementado

---

## Perfis

### Objetivo

Agrupar usuários por função.

### Perfis existentes

- Administrador
- Gestor
- Comercial
- Marketing
- RH
- Financeiro
- Compras
- PCP

### Status

✅ Implementado

---

## Permissões

### Objetivo

Controlar o acesso às funcionalidades do HUB.

### Modelo

As permissões são vinculadas aos perfis e determinam quais módulos e ações cada usuário pode acessar.

### Ações suportadas

- Visualizar
- Criar
- Editar
- Excluir
- Administrar

### Status

✅ Implementado

---

# DASHBOARD

## Objetivo

Servir como tela inicial do sistema.

Cada usuário visualizará informações de acordo com suas permissões.

### Funcionalidades

- Indicadores
- Cards
- Atividades recentes
- Atalhos rápidos

### Status

🚧 Em desenvolvimento

---

# LEADS

Primeiro módulo operacional do HUB.

É responsável pelo gerenciamento completo dos leads comerciais.

---

## Objetivo

Centralizar todas as oportunidades comerciais da empresa.

### Funcionalidades

- Cadastro de Leads
- Pipeline Comercial
- Histórico
- Observações
- Responsáveis
- Pesquisa
- Filtros
- Status

### Integrações previstas

- RD Station
- CRM
- APIs futuras

### Status

🚧 Em desenvolvimento

---

# SIDEBAR

## Objetivo

Disponibilizar navegação dinâmica entre os módulos.

### Características

- Menu dinâmico
- Baseado em permissões
- Expansível
- Modular

Menus são exibidos automaticamente conforme as permissões do usuário.

### Status

✅ Implementado

---

# HEADER

## Objetivo

Exibir informações globais da aplicação.

### Funcionalidades

- Perfil do usuário
- Breadcrumb
- Notificações
- Configurações

### Status

✅ Implementado

---

# LAYOUT

## Objetivo

Garantir identidade visual única em toda a plataforma.

### Componentes

- Sidebar
- Header
- Área de conteúdo
- Dialogs
- Modais
- Sistema de notificações

### Status

✅ Implementado

---

# COMPONENTES COMPARTILHADOS

Biblioteca reutilizável utilizada por todos os módulos.

### Exemplos

- Button
- Card
- Modal
- Dialog
- Table
- Badge
- Tabs
- Input
- Select

### Objetivo

Eliminar duplicação de interface.

### Status

🚧 Evolução contínua

---

# SERVIÇOS COMPARTILHADOS

Camada responsável por integrações reutilizadas pelo sistema.

### Serviços

- Autenticação
- Supabase
- Storage
- Upload
- Permissões
- Notificações

### Status

🚧 Evolução contínua

---

# STORAGE

## Objetivo

Centralizar armazenamento de arquivos.

### Tipos suportados

- Imagens
- Documentos
- PDFs
- Arquivos diversos

### Tecnologia

Supabase Storage

### Status

✅ Implementado

---

# AUDITORIA

## Objetivo

Registrar alterações relevantes realizadas no sistema.

### Eventos previstos

- Inclusão
- Alteração
- Exclusão
- Login
- Logout

### Status

📋 Estrutura preparada

---

# CONFIGURAÇÕES

## Objetivo

Centralizar configurações globais da aplicação.

### Exemplos

- Preferências
- Informações da empresa
- Configurações gerais

### Status

📋 Estrutura preparada

---

# Integrações Atuais

Atualmente o HUB utiliza ou prevê integração com:

## Infraestrutura

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage

## Desenvolvimento

- Git
- GitHub

## Corporativas

- RD Station
- NOMUS ERP
- Magazord

---

# Arquitetura Modular

Todos os módulos seguem a mesma estrutura interna.

```text
module/

├── pages/
├── components/
├── services/
├── hooks/
├── types/
├── utils/
├── constants/
├── routes/
└── index.ts
```

---

# Dependências entre Módulos

Os módulos devem permanecer desacoplados.

Sempre que houver necessidade de compartilhamento de funcionalidades, deve-se utilizar:

- Shared Components
- Shared Services
- Shared Hooks
- Shared Types

Nunca acessar diretamente arquivos internos de outro módulo.

---

# Estado Atual da Plataforma

| Área | Situação |
|------|----------|
| Core | ✅ Estável |
| Autenticação | ✅ Implementado |
| Usuários | ✅ Implementado |
| Perfis | ✅ Implementado |
| Permissões | ✅ Implementado |
| Layout | ✅ Implementado |
| Sidebar | ✅ Implementado |
| Header | ✅ Implementado |
| Dashboard | 🚧 Em desenvolvimento |
| Leads | 🚧 Em desenvolvimento |
| Storage | ✅ Implementado |
| Serviços Compartilhados | 🚧 Evolução contínua |
| Auditoria | 📋 Estruturado |
| Configurações | 📋 Estruturado |

---

# Considerações

Os módulos descritos neste documento representam o estado atual da plataforma.

Todo novo módulo incorporado ao PION G HUB deverá ser registrado neste documento, mantendo este inventário sempre atualizado.

A arquitetura modular garante que a evolução do sistema ocorra de forma organizada, previsível e escalável, preservando a independência entre os domínios de negócio.