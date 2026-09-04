# Pion-G Plus - Índice de Documentação Reversa

> Blueprint completo do sistema PionG para migração/implementação.

## 📊 Relatórios

| # | Documento | Descrição | Status |
|---|-----------|-----------|--------|
| 02 | [02-relatorio-executivo.md](02-relatorio-executivo.md) | Visão executiva do projeto | ✅ Completo |
| 09 | [09-backlog-priorizado.md](09-backlog-priorizado.md) | Backlog priorizado de migração | ✅ Completo |

## 🔍 Análise Funcional

| # | Documento | Descrição | Status |
|---|-----------|-----------|--------|
| 03 | [03-mapa-funcional.md](03-mapa-funcional.md) | Mapa completo de funcionalidades | ✅ Completo |
| 04 | [04-matriz-roles.md](04-matriz-roles.md) | Matriz de permissões (PBAC) | ✅ Completo |

## 🏗️ Arquitetura

| # | Documento | Descrição | Status |
|---|-----------|-----------|--------|
| 05 | [05-arquitetura-inferida.md](05-arquitetura-inferida.md) | Arquitetura técnica inferida | ✅ Completo |
| 06 | [06-problemas-encontrados.md](06-problemas-encontrados.md) | Issues e gaps identificados | ✅ Completo |
| 07 | [07-ata-vs-sistema.md](07-ata-vs-sistema.md) | Comparativo ATA vs Implementação | ✅ Completo |
| 08 | [08-proposta-microsservicos.md](08-proposta-microsservicos.md) | Proposta de microsserviços | ✅ Completo |

## Estrutura de Diretórios

```
piong-blueprint/
├── 02-relatorio-executivo.md    # Resumo executivo
├── 03-mapa-funcional.md         # Mapa de funcionalidades
├── 04-matriz-roles.md          # Matriz de permissões
├── 05-arquitetura-inferida.md  # Arquitetura técnica
├── 06-problemas-encontrados.md  # Issues e gaps
├── 07-ata-vs-sistema.md         # Comparativo requisitos
├── 08-proposta-microsservicos.md # Proposta microserviços
└── 09-backlog-priorizado.md     # Backlog de migração
```

## Módulos Identificados

### Administrativo
- Dashboard
- Colaboradores
- Escala do Mês
- Controle de Ponto
- Validação
- **Feriados** (Calendário)
- **Permissões** (Perfis de acesso)
- **Usuários Online** (Histórico de acessos)

### Comunicação
- Quadro de Avisos

### Manutenção
- OS Manutenção
- Controle Portaria

### Logística
- Dashboard Logística
- Lançamentos
- Histórico
- Transportadoras
- Relatórios
- Configurações

### Cadastro
- Filiais
- Setores
- Cargos

## Próximos Passos

1. Validar completude do mapa funcional
2. Iniciar implementação do Auth Service
3. Configurar infraestrutura Kubernetes
4. Implementar módulos Fase 1 (Colaboradores, Ponto)

---

*Última atualização: 2026-09-01*
*Gerado via Reversa Framework*