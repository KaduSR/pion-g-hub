# Documentação de Testes do Backend (Pion-G-Hub)

## Visão Geral
Este documento descreve o conjunto de testes implementado para a camada de backend da aplicação Pion-G-Hub, incluindo:

- Configuração do **Vitest** como runner de testes.
- Estratégias de testes **unitários** para validadores, serviços e middlewares.
- Estratégias de testes de **integração** via Supertest para rotas HTTP.
- Procedimentos de **build** e **execução** dos testes.
- Como contribuir adicionando novos testes.

## Estrutura de Diretórios de Testes
```
/tests
  /setup.ts                  # Configurações globais (mocks de fetch, console)
  /api
    /validators
      auth.validator.test.ts
      colaborador.validator.test.ts
      webhook.validator.test.ts
    /services
      webhook.service.test.ts
    /integration
      auth.integration.test.ts
      colaboradores.integration.test.ts
      webhooks.integration.test.ts
```

## Configuração do Vitest
Arquivo `vitest.config.ts` na raiz do projeto:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['tests/**', 'dist/**', 'node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Scripts npm
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "build": "tsc"
  }
}
```

## Estratégia de Testes

### 1. Testes Unitários
#### 1.1 Validadores (Zod)
- **Objetivo**: Garantir que os esquemas de validação aceitem apenas dados conformes e rejeitem os inválidos.
- **Arquivos de teste**: `tests/api/validators/* validator.test.ts`.
- **Cobertura**: Cada esquema deve ter pelo menos:
  - Caso de sucesso (dados válidos).
  - Caso de falha (campos missing, formato incorreto, etc.).

#### 1.2 Serviços
- **WebhookService**
  - Verifica disparo de webhook para múltiplos eventos.
  - Mocka `fetch` para evitar chamadas reais a URLs externas.
  - Testa retorno de erro e comportamento quando não há webhooks ativos.

### 2. Testes de Integração (Supertest)
#### 2.1 Objetivo
Validar o comportamento HTTP real das rotas críticas da API, incluindo:
- Status codes corretos (200, 201, 400, 401, 403, 404, 500).
- Payloads JSON conformes ao contrato `ApiResponse<T>`.
- Rejeição de payloads inválidos pelo Zod.
- Proteção de rotas via JWT (`authMiddleware`).

#### 2.2 Cenários por Módulo

##### Autenticação (`/api/v1/auth`)
- `POST /login` — login com credenciais válidas e inválidas.
- `POST /login` — rejeição de payload sem email ou senha.
- `GET /me` — acesso com token válido e sem token.

##### Colaboradores (`/api/v1/colaboradores`)
- `GET /` — listagem protegida por JWT.
- `POST /` — criação com dados válidos e inválidos.
- `GET /:id` — busca por ID existente e inexistente.
- `PUT /:id` — atualização parcial e com corpo vazio.
- `DELETE /:id` — exclusão.

##### Webhooks (`/api/v1/webhooks`)
- `GET /` — listagem protegida.
- `POST /` — criação com evento e URL válidos.
- `POST /` — rejeição de URL inválida.
- `PUT /:id` — atualização parcial.
- `DELETE /:id` — exclusão.

#### 2.3 Mocks em Testes de Integração
- Banco de dados: `getDatabase()` é substituído por um mock que retorna dados fixos.
- JWT: tokens são gerados com `jsonwebtoken.sign` usando a mesma secret do app.
- `fetch`: mockado globalmente em `tests/setup.ts`.

## Mocks e Configuração Global
Arquivo `tests/setup.ts`:

```ts
import { vi } from 'vitest';

// Mock de fetch global para evitar chamadas HTTP reais
global.fetch = vi.fn();

// Suprime console noise durante os testes
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => ({}));
vi.spyOn(console, 'info').mockImplementation(() => ({}));

afterEach(() => {
  vi.clearAllMocks();
});
```

## Execução dos Testes
```sh
# Executar todos os testes uma vez
npm test

# Executar em modo watch (repara automáticos)
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

O relatório de cobertura será salvo em `coverage/` e pode ser visualizado com `npx serve coverage` ou aberto manualmente em `coverage/index.html`.

## Convenções de Código
- Nome de arquivos: `<modulo>.integration.test.ts` ou `<modulo>.service.test.ts`.
- Nomes de testes em português: `'deve retornar 401 quando token ausente'`.
- Uso de `expect.objectContaining` e `expect.stringContaining` para evitar fragilidade em mensagens.

## Contribuindo com Novos Testes
1. Crie o arquivo de teste na pasta correspondente (`validators`, `services` ou `integration`).
2. Implemente casos de teste que cubram:
   - Dados válidos.
   - Erros esperados (validação, not found, unauthorized).
   - Comportamento de edge cases.
3. Atualize a cobertura executando `npm run test:coverage`.
4. Abra um Pull Request com a descrição detalhando o que foi testado.

---

## Testes do Frontend (Pion-G-Hub)
A suíte de testes do frontend está configurada em `frontend/` usando **Vitest** + **Testing Library** + **jsdom**.

### Estrutura
```
frontend/
  vite.config.ts        # Configuração do Vite (build)
  vitest.config.ts      # Configuração do Vitest (testes)
  src/
    tests/
      setup.ts          # Importa @testing-library/jest-dom
    components/
      BaseTable.test.tsx
```

### Configuração do Vitest
Arquivo `frontend/vitest.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
});
```

### Scripts npm
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "tsc -b && vite build"
  }
}
```

### Cenários Cobertos (BaseTable)
- Renderização de cabeçalhos e linhas.
- Estado vazio: mensagem padrão.
- Filtro por busca: digitar no campo de pesquisa e validar subset visível.
- Título e botão de adição quando fornecidos.

### Execução
```sh
# Na pasta frontend
npm test        # rodar uma vez
npm run test:watch   # modo watch
npm run build  # validação de compilação
```

Veja `docs/testes-frontend.md` para a documentação completa da suíte de testes do frontend.

---
*Este documento será mantido em sincronismo com os diretórios `/tests` e `frontend/src` para garantir que toda a cobertura de testes esteja documentada.*
