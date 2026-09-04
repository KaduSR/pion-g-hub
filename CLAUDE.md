# Pion-G-Hub — Plataforma de Migração do Sistema PionG

## Visão Geral

O **Pion-G-Hub** é o motor de desenvolvimento baseado em agentes para reimplementar o sistema PionG em uma nova plataforma. Ele carrega o mapeamento completo do sistema legado (`docs/piong-blueprint/`) como conhecimento base para os agentes de desenvolvimento.

## Estrutura do Projeto

```
Pion-G-Hub/
├── .claude/
│   ├── agents/           # Definições de agentes de desenvolvimento
│   │   └── migration-agent.md  # Agente especializado em PionG
│   └── workflows/         # Fluxos de trabalho automatizados
├── docs/
│   └── piong-blueprint/   # 🔑 Blueprint do sistema PionG (fonte de verdade)
│       ├── REVERSA_INDEX.md
│       ├── 03-mapa-funcional.md
│       ├── 04-matriz-roles.md
│       ├── 05-arquitetura-inferida.md
│       ├── 08-proposta-microsservicos.md
│       └── 09-backlog-priorizado.md
├── src/                   # Código-fonte da nova plataforma
└── supabase/              # Schema e configurações do banco
```

## Arquitetura Técnica (Inferida do PionG Original)

| Camada | Tecnologia | Responsabilidade |
|--------|-----------|------------------|
| Frontend | React + Vite + TypeScript | SPA com autenticação JWT |
| Backend | Node.js + Express | API REST com RLS |
| Database | PostgreSQL + Supabase | PBAC + Row Level Security |
| Realtime | Supabase Realtime | Dashboard ao vivo |
| Workflows | n8n | Integrações (IXC, email, etc.) |

## Departamentos e Módulos (do Blueprint)

### Administrativo
- Dashboard, Colaboradores, Escala do Mês, Controle de Ponto
- Validação de Ponto, Quadro de Avisos, OS Manutenção
- **Filiais** (Gerenciamento de filiais com colaboradores)
- **Feriados** (Calendário anual de feriados)
- **Permissões** (Matriz de perfis e permissões)
- **Usuários Online** (Monitoramento de sessões ativas)

### Logística
- Dashboard Logística, Lançamentos, Histórico
- Transportadoras, Relatórios, Configurações

## Perfis de Acesso

| Perfil | Descrição |
|--------|-----------|
| Administrador | Acesso total ao sistema |
| Gestor | Acesso gerencial com restrições |
| Colaborador | Acesso básico |
| Líder Produção | Controle de produção |
| Equipe Manutenção | gestão de OS |
| Supervisor Manutenção | Supervisão de manutenção |
| Líder RH | Gestão de RH |
| Visualizador Produção | Apenas visualização |
| Qualidad – Refugo | Controle de qualidade |
| Somente Leitura | Leitura apenas |
| Acesso Total | Acesso total |
| Ocultar Tudo | Nenhum acesso |

## Como Usar

### 1. Iniciar uma Migração

```bash
# No diretório do projeto
claude # inicia o CLI
```

### 2. Gerar Código com o Migration Agent

O `migration-agent` lê automaticamente o blueprint em `docs/piong-blueprint/` antes de gerar qualquer código. Para acionar:

```
/agent migration-agent
```

### 3. Workflow de Migração

Consulte `.claude/workflows/migration-workflow.md` para o fluxo completo de migração de cada módulo.

## Diretivas

1. **Zero Fabricação**: Todo código gerado deve ter referência no blueprint
2. **Mapeamento Reverso**: Consultar `docs/piong-blueprint/` antes de criar entidades
3. **Auditoria**: Commits devem referenciar o ticket do blueprint

## Status do Blueprint

| Documento | Cobertura | Status |
|-----------|-----------|--------|
| Mapa Funcional | 100% | ✅ Completo |
| Matriz de Roles | 100% | ✅ Completo |
| Arquitetura | 100% | ✅ Completo |
| Proposta Microserviços | 100% | ✅ Completo |
| Backlog | 100% | ✅ Completo |
| Problemas/Gaps | 100% | ✅ Completo |
| Ata vs Sistema | 100% | ✅ Completo |

## Documentação Completa

Todos os documentos estão em `docs/piong-blueprint/`:
- [REVERSA_INDEX.md](docs/piong-blueprint/REVERSA_INDEX.md) - Índice navegável

## Próximos Passos

- [ ] Validar completude do mapa funcional (módulo Usuários Online)
- [ ] Configurar schema base no Supabase
- [ ] Implementar autenticação com JWT
- [ ] Migrar módulo Administrativo primeiro (maior criticidade)