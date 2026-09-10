# 05 - Future Modules

> Documento de Módulos Planejados
>
> Versão: 1.0
>
> Última atualização: Julho/2026

---

# Visão Geral

Este documento descreve os módulos previstos para futuras versões do PION G HUB.

Esses módulos representam a visão de longo prazo da plataforma e refletem necessidades identificadas durante a evolução dos processos internos da Pion G Plus.

A ordem de desenvolvimento poderá sofrer alterações conforme as prioridades da empresa.

---

# Objetivo

Os módulos descritos neste documento ainda não fazem parte da versão atual do sistema.

Eles servem como referência arquitetural para orientar futuras implementações, garantindo que o crescimento da plataforma ocorra de forma organizada e alinhada à arquitetura modular do HUB.

---

# Status

| Status | Significado |
|---------|-------------|
| 📋 Planejado | Módulo previsto |
| 🎯 Prioritário | Desenvolvimento previsto para as próximas versões |
| 💡 Em estudo | Ideia em avaliação |

---

# BRINDES

Status: 🎯 Prioritário

---

## Objetivo

Controlar todo o ciclo de vida dos brindes institucionais utilizados pela empresa.

---

## Funcionalidades previstas

- Cadastro de brindes
- Categorias
- Controle de estoque
- Solicitações
- Aprovação
- Histórico de movimentações
- Consumo por setor
- Relatórios

---

## Benefícios

- Redução de desperdícios
- Controle de estoque
- Histórico completo
- Indicadores de utilização

---

# CHAMADOS DE TI

Status: 🎯 Prioritário — Sprint 4 (arquitetura consolidada em `sprint-4-chamados-ti.md`)

---

## Objetivo

Centralizar a abertura, triagem e atendimento de chamados de suporte de TI (Infraestrutura e
Sistemas) para toda a empresa, incluindo vendedores externos autenticados.

---

## Funcionalidades previstas

- Abertura e acompanhamento de chamados pelo solicitante
- Triagem e central de atendimento da TI (fila por equipe)
- Cronômetro e controle de tempo trabalhado, separado do SLA
- Notificações in-app (sino compartilhado, alerta sonoro) e por e-mail
- Anexos
- SLA configurável por prioridade, com pausa em "Aguardando solicitante"
- Dashboard e relatórios
- Catálogo de serviços

---

## Benefícios

- Fila única e visível de chamados de TI, sem depender de canais informais
- Métrica real de tempo trabalhado por chamado/agente/equipe/categoria
- SLA auditável e configurável, sem valores fixos no frontend

---

# CONTROLE DE CUSTOS

Status: 🎯 Prioritário

---

## Objetivo

Centralizar todos os custos operacionais relacionados aos departamentos da empresa.

---

## Funcionalidades previstas

- Centros de custo
- Categorias
- Lançamentos
- Rateios
- Relatórios
- Indicadores financeiros

---

## Benefícios

- Visibilidade financeira
- Melhor tomada de decisão
- Histórico consolidado

---

# MÉTRICAS

Status: 🎯 Prioritário

---

## Objetivo

Centralizar indicadores estratégicos da empresa.

---

## Funcionalidades previstas

- KPIs
- Dashboards
- Indicadores por departamento
- Metas
- Comparativos
- Evolução histórica

---

## Integrações

- Leads
- Financeiro
- Compras
- RH
- Produção

---

# CRM

Status: 📋 Planejado

---

## Objetivo

Gerenciar o relacionamento completo com clientes.

---

## Funcionalidades previstas

- Histórico de contatos
- Agenda
- Oportunidades
- Follow-ups
- Pipeline
- Integração com RD Station

---

# FINANCEIRO

Status: 📋 Planejado

---

## Objetivo

Centralizar informações financeiras.

---

## Funcionalidades previstas

- Contas
- Receitas
- Despesas
- Fluxo de caixa
- Pagamentos
- Relatórios

---

# COMPRAS

Status: 📋 Planejado

---

## Objetivo

Gerenciar fornecedores e processos de aquisição.

---

## Funcionalidades previstas

- Cadastro de fornecedores
- Solicitações
- Pedidos
- Aprovações
- Histórico
- Avaliações

---

# RH

Status: 📋 Planejado

---

## Objetivo

Apoiar processos internos de Recursos Humanos.

---

## Funcionalidades previstas

- Colaboradores
- Treinamentos
- Documentos
- Solicitações
- Comunicação interna

---

# ESTOQUE

Status: 💡 Em estudo

---

## Objetivo

Gerenciar estoques internos da empresa.

---

## Funcionalidades previstas

- Entradas
- Saídas
- Inventários
- Localizações
- Alertas

---

# DOCUMENTOS

Status: 💡 Em estudo

---

## Objetivo

Centralizar documentos corporativos.

---

## Funcionalidades previstas

- Upload
- Versionamento
- Compartilhamento
- Controle de acesso
- Histórico

---

# IA CORPORATIVA

Status: 💡 Em estudo

---

## Objetivo

Disponibilizar recursos de Inteligência Artificial integrados ao HUB.

---

## Funcionalidades previstas

- Assistente interno
- Geração de documentos
- Análises automáticas
- Sugestões inteligentes
- Resumo de indicadores
- Busca semântica

---

# NOTIFICAÇÕES

Status: 💡 Em estudo

---

## Objetivo

Centralizar notificações da plataforma.

---

## Funcionalidades previstas

- Alertas
- Push interno
- E-mails
- Histórico
- Preferências do usuário

---

# AUDITORIA AVANÇADA

Status: 💡 Em estudo

---

## Objetivo

Registrar todas as ações críticas realizadas no sistema.

---

## Funcionalidades previstas

- Timeline de alterações
- Histórico de usuários
- Logs de acesso
- Exportação

---

# DASHBOARDS EXECUTIVOS

Status: 💡 Em estudo

---

## Objetivo

Disponibilizar visão estratégica para gestores.

---

## Funcionalidades previstas

- Indicadores consolidados
- Comparativos
- Tendências
- Performance por departamento

---

# MOBILE

Status: 💡 Em estudo

---

## Objetivo

Disponibilizar funcionalidades do HUB em dispositivos móveis.

---

## Possibilidades

- Aprovações
- Indicadores
- Notificações
- Consultas rápidas

---

# Integrações Futuras

O HUB foi projetado para suportar integração com diversos sistemas externos.

Entre eles:

- NOMUS ERP
- RD Station
- Magazord
- APIs REST
- Microsoft 365
- Google Workspace
- Power BI
- Ferramentas de BI
- Serviços de autenticação
- Gateways de pagamento

---

# Critérios para Novos Módulos

Antes da criação de um novo módulo, deve-se responder às seguintes perguntas:

1. Resolve um problema específico?

2. Possui responsabilidades próprias?

3. Pode evoluir independentemente?

4. Precisa de permissões específicas?

5. Possui banco de dados próprio?

Caso a resposta seja "sim" para a maioria dessas perguntas, provavelmente trata-se de um novo módulo.

---

# Ordem Recomendada de Evolução

A evolução prevista da plataforma segue a seguinte prioridade:

1. Leads
2. Brindes
3. Controle de Custos
4. Métricas
5. CRM
6. Financeiro
7. Compras
8. RH
9. Estoque
10. IA Corporativa

Essa sequência poderá ser revisada conforme as necessidades da empresa.

---

# Visão de Longo Prazo

O PION G HUB foi concebido para evoluir continuamente.

A arquitetura modular permite que novos domínios de negócio sejam incorporados sem comprometer a estabilidade da plataforma.

Cada novo módulo deverá respeitar os princípios definidos no Engineering Handbook, garantindo padronização, escalabilidade e facilidade de manutenção.

Este documento representa a visão estratégica do crescimento do HUB e deverá ser revisado periodicamente para refletir as prioridades da organização.