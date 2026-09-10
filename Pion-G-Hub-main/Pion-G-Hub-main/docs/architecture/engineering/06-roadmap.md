# 06 - Roadmap

> Documento de Roadmap e Governança
>
> Versão: 1.0
>
> Última atualização: Julho/2026

---

# Visão Geral

Este documento descreve a evolução planejada do PION G HUB.

O roadmap organiza o crescimento da plataforma em etapas progressivas, permitindo que novas funcionalidades sejam incorporadas sem comprometer a arquitetura existente.

Este documento também define como decisões técnicas importantes devem ser registradas e como novas funcionalidades devem ser planejadas.

---

# Estado Atual

Atualmente o projeto encontra-se na fase inicial de consolidação da arquitetura.

Os principais pilares da plataforma já foram definidos:

- Arquitetura modular
- Sistema de autenticação
- Perfis
- Permissões
- Layout base
- Dashboard inicial
- Estrutura de módulos

O foco agora passa a ser a expansão dos módulos de negócio.

---

# Objetivos Estratégicos

O desenvolvimento do HUB segue cinco objetivos principais.

## 1. Crescimento Modular

Todo novo recurso deverá ser desenvolvido como um módulo independente sempre que possível.

---

## 2. Padronização

Toda implementação deverá respeitar o Engineering Handbook.

---

## 3. Escalabilidade

O projeto deverá suportar crescimento contínuo sem necessidade de grandes refatorações.

---

## 4. Reutilização

Sempre reutilizar componentes, hooks e serviços compartilhados antes de criar novas implementações.

---

## 5. Documentação

Toda decisão arquitetural relevante deverá ser documentada.

---

# Roadmap

## Fase 1 — Fundação

Status: ✅ Concluída

Objetivos:

- Estrutura inicial
- Autenticação
- Perfis
- Permissões
- Layout
- Sidebar
- Header
- Dashboard Base

---

## Fase 2 — Comercial

Status: 🚧 Em andamento

Objetivos:

- Leads
- Pipeline Comercial
- Gestão de Oportunidades
- Histórico
- Integração com CRM

---

## Fase 3 — Operacional

Status: 📋 Planejada

Objetivos:

- Brindes
- Controle de Custos
- Métricas
- Indicadores

---

## Fase 4 — Gestão

Status: 📋 Planejada

Objetivos:

- Compras
- Financeiro
- RH
- Documentos

---

## Fase 5 — Inteligência

Status: 💡 Futuro

Objetivos:

- Dashboards Executivos
- Analytics
- IA Corporativa
- Automações
- Insights

---

# Critérios para Criação de Novos Módulos

Antes de iniciar um novo módulo, responder:

- Resolve um domínio específico?
- Possui regras de negócio próprias?
- Possui permissões próprias?
- Pode evoluir independentemente?
- Exige tabelas específicas?

Se a maioria das respostas for positiva, recomenda-se criar um módulo independente.

---

# Fluxo de Desenvolvimento

Toda nova funcionalidade deverá seguir o fluxo abaixo.

```text
Necessidade

↓

Análise

↓

Planejamento

↓

ADR (quando necessário)

↓

Modelagem

↓

Banco de Dados

↓

Desenvolvimento

↓

Testes

↓

Documentação

↓

Deploy
```

---

# Versionamento

O projeto utiliza versionamento semântico.

Formato:

```text
MAJOR.MINOR.PATCH
```

Exemplo:

```text
1.0.0
```

Onde:

**MAJOR**

Mudanças incompatíveis.

**MINOR**

Novas funcionalidades.

**PATCH**

Correções.

---

# Sprints

As entregas são organizadas em pequenas sprints.

Cada sprint deve conter:

- objetivo claro;
- escopo definido;
- entregáveis;
- documentação.

Após conclusão, atualizar este roadmap.

---

## Sprint 3.8 — Centro de Permissões (PBAC)

Status: ✅ Concluída (ver `permissions-pbac-inventario.md`).

Exclusiva para o PBAC — não recebe escopo de outros módulos.

---

## Sprint 4 — Módulo de Chamados de TI

Status: 📋 Planejada (arquitetura consolidada em `sprint-4-chamados-ti.md`).

Módulo novo e independente da Sprint 3.8 — usa o PBAC já existente (`resource: tickets`), mas não
o altera estruturalmente.

| Sub-sprint | Escopo |
|---|---|
| 4.0 | Arquitetura final e preparação |
| 4.1 | Fundação do banco, RLS, RPCs e permissões |
| 4.2 | Abertura e acompanhamento pelo solicitante |
| 4.3 | Central de atendimento e triagem da TI |
| 4.4 | Cronômetro e tempo trabalhado |
| 4.5 | Notificações in-app |
| 4.6 | Anexos |
| 4.7 | SLA, dashboard e relatórios |
| 4.8 | Notificações por e-mail |
| 4.9 | ⚠️ pendente de confirmação |
| 4.10 | Catálogo de serviços e refinamentos |

---

# ADR (Architecture Decision Records)

Toda decisão arquitetural importante deve possuir um ADR.

Os ADRs ficam armazenados em:

```text
engineering/

└── adr/
```

---

## Quando criar um ADR?

Criar sempre que houver decisões como:

- mudança de arquitetura;
- adoção de nova tecnologia;
- alteração estrutural no banco;
- novo padrão de desenvolvimento;
- mudança significativa de organização.

---

## Estrutura recomendada

```text
ADR-001-Modular-Architecture.md

ADR-002-Permissions-System.md

ADR-003-Supabase.md
```

---

Cada ADR deve conter:

- Contexto
- Problema
- Opções avaliadas
- Decisão tomada
- Consequências

---

# Débito Técnico

Sempre que uma implementação provisória for realizada, registrar:

- motivo;
- impacto;
- solução definitiva prevista.

Isso evita que soluções temporárias se tornem permanentes.

---

# Princípios para Evolução

Antes de adicionar qualquer funcionalidade, verificar:

✔ Mantém a modularidade?

✔ Evita acoplamento?

✔ Reutiliza componentes existentes?

✔ Respeita os padrões do projeto?

✔ Está documentada?

Se alguma resposta for negativa, a implementação deve ser reavaliada.

---

# Métricas de Evolução

O crescimento da plataforma será acompanhado considerando:

- Quantidade de módulos
- Cobertura de documentação
- Reutilização de componentes
- Débito técnico
- Cobertura de testes
- Performance
- Integrações concluídas

Esses indicadores auxiliam na manutenção da qualidade arquitetural do projeto.

---

# Manutenção do Engineering Handbook

Sempre que houver mudanças relevantes na arquitetura, o Engineering Handbook deverá ser atualizado.

Os documentos devem permanecer sincronizados com a implementação do sistema.

A documentação faz parte do projeto e deve evoluir junto com o código.

---

# Visão de Longo Prazo

O PION G HUB não é apenas um sistema interno, mas uma plataforma construída para acompanhar o crescimento da empresa.

Sua arquitetura modular, documentada e orientada por domínios permite incorporar novos processos, integrações e tecnologias sem comprometer a estabilidade da aplicação.

O objetivo é consolidar um ecossistema único capaz de centralizar operações, integrar sistemas, apoiar decisões estratégicas e servir como base para iniciativas futuras de automação, inteligência artificial e transformação digital.

Este roadmap representa a direção estratégica do projeto e deverá ser revisado periodicamente para refletir a evolução da plataforma e as prioridades da organização.