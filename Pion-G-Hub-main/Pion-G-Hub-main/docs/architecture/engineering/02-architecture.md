# 02 - Architecture

> Documento de Arquitetura do Projeto
>
> Versão: 1.0
>
> Última atualização: Julho/2026

---

# Arquitetura Geral

O PION G HUB foi desenvolvido utilizando uma arquitetura modular baseada em domínios de negócio (Domain Driven Modular Architecture).

Ao invés de organizar o projeto por tipo de arquivo (pages, components, services...), a organização principal acontece por **módulos**, onde cada módulo representa uma área da empresa.

Exemplos:

- Leads
- Brindes
- Custos
- Marketing
- Financeiro
- Compras
- RH
- CRM
- Métricas

Cada módulo é responsável exclusivamente pelo seu próprio domínio.

---

# Filosofia Arquitetural

A arquitetura do HUB foi construída sobre cinco pilares.

## 1. Modularidade

Cada funcionalidade pertence a um módulo específico.

Não existem funcionalidades espalhadas entre múltiplos diretórios.

Sempre que uma nova necessidade surgir, deve-se avaliar se ela pertence:

- a um módulo existente;
- ou se justifica a criação de um novo módulo.

---

## 2. Independência

Sempre que possível, módulos não devem depender diretamente uns dos outros.

Isso reduz:

- acoplamento;
- riscos durante manutenção;
- efeitos colaterais.

A comunicação entre módulos deve ocorrer através de serviços compartilhados ou APIs internas.

---

## 3. Escalabilidade

O sistema foi projetado para crescer continuamente.

A criação de novos módulos nunca deve exigir reestruturação da arquitetura principal.

A estrutura inicial deve suportar dezenas de módulos sem perda de organização.

---

## 4. Reutilização

Componentes comuns não pertencem a módulos específicos.

Eles devem permanecer em diretórios compartilhados.

Exemplo:

- Botões
- Inputs
- Dialogs
- Tabelas
- Layouts
- Modais
- Hooks reutilizáveis

---

## 5. Clareza

Um desenvolvedor deve conseguir localizar qualquer funcionalidade rapidamente.

A estrutura do projeto deve ser intuitiva.

---

# Organização do Projeto

A estrutura geral segue o seguinte modelo.

```text
src/

    app/
        routes/
        layouts/
        providers/

    modules/
        leads/
        brindes/
        custos/
        metricas/
        ...

    components/
        ui/
        layout/

    services/

    hooks/

    lib/

    contexts/

    types/

    utils/

    assets/
```

A pasta `modules` representa o núcleo do sistema.

---

# Organização dos Módulos

Todo módulo segue exatamente a mesma estrutura.

```text
modules/

    leads/

        pages/

        components/

        services/

        hooks/

        types/

        utils/

        constants/

        routes/

        index.ts
```

Essa padronização facilita manutenção e acelera a curva de aprendizado.

---

# Estrutura Interna

## pages/

Contém páginas completas.

Responsabilidade:

- telas
- dashboards
- formulários
- visualizações

---

## components/

Componentes exclusivos daquele módulo.

Exemplo:

LeadCard

LeadTimeline

LeadFilters

---

## services/

Toda comunicação externa do módulo.

Exemplos:

Supabase

API

Storage

Integrações

---

## hooks/

Hooks específicos do módulo.

Exemplo:

useLead()

useLeadFilters()

useLeadStatistics()

---

## types/

Interfaces.

Types.

DTOs.

Enums.

---

## utils/

Funções auxiliares.

Sem estado.

Sem dependências.

---

## constants/

Valores fixos utilizados pelo módulo.

---

## routes/

Definição das rotas pertencentes ao módulo.

---

# Componentes Compartilhados

Tudo que pode ser reutilizado permanece fora dos módulos.

Exemplo:

```text
components/

    ui/

        Button

        Input

        Modal

        Dialog

        Badge

        Card

        Tabs

        Table

        Tooltip
```

Nenhum desses componentes deve possuir regras de negócio.

Eles apenas representam interface.

---

# Serviços Compartilhados

A pasta `services` concentra integrações reutilizadas por vários módulos.

Exemplo:

```text
services/

    auth/

    api/

    storage/

    permissions/

    notifications/

    audit/
```

---

# Hooks Compartilhados

Hooks utilizados por múltiplos módulos.

Exemplo:

```text
hooks/

useAuth()

usePermissions()

useDebounce()

usePagination()

useTheme()
```

---

# Tipos Compartilhados

Interfaces comuns.

Exemplo:

```text
types/

User.ts

Profile.ts

Permission.ts

ApiResponse.ts
```

---

# Fluxo de Dados

O fluxo recomendado é sempre o mesmo.

```text
Página

↓

Hook

↓

Service

↓

Supabase / API

↓

Retorno

↓

Hook

↓

Interface
```

Evita lógica diretamente na interface.

---

# Comunicação entre Módulos

Módulos nunca devem acessar diretamente arquivos internos de outros módulos.

Errado:

Leads importando componentes privados do Financeiro.

Correto:

Ambos utilizam componentes compartilhados.

Ou utilizam serviços públicos.

---

# Convenções de Código

## Componentes

Sempre em PascalCase.

```text
LeadCard.tsx

LeadTable.tsx

DashboardHeader.tsx
```

---

## Hooks

Sempre iniciados por "use".

```text
useLead.ts

useAuth.ts

usePermissions.ts
```

---

## Tipos

Sempre em PascalCase.

```text
Lead.ts

LeadStatus.ts

Profile.ts
```

---

## Constantes

Preferencialmente em UPPER_SNAKE_CASE.

```ts
MAX_UPLOAD_SIZE

DEFAULT_PAGE_SIZE

MAX_ATTACHMENTS
```

---

## Pastas

Sempre em minúsculo.

```text
components

services

pages

hooks

types
```

---

# Padrões Arquiteturais

O projeto utiliza:

- Component Based Architecture
- Feature Based Structure
- Domain Oriented Design
- Service Layer Pattern
- Composition Pattern
- Repository Pattern (quando necessário)

---

# Dependências

Sempre que possível:

✔ React

✔ TypeScript

✔ Supabase

✔ Bibliotecas consolidadas

Evitar dependências que resolvam problemas pequenos.

Cada nova biblioteca adiciona custo de manutenção.

---

# Escalabilidade

O objetivo da arquitetura é permitir:

- dezenas de módulos;
- centenas de componentes;
- milhares de linhas de código;

sem perda de organização.

Toda evolução futura deve respeitar esta arquitetura.

Caso uma necessidade não se encaixe nela, a decisão deve ser registrada através de um ADR (Architecture Decision Record), preservando o histórico técnico do projeto.