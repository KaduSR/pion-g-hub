# Documentação de Testes do Backend (Pion-G-Hub)

## Visão Geral
Este documento descreve o conjunto de testes implementado para a camada de backend da aplicação Pion-G-Hub, incluindo:

- Configuração do **Vitest** como runner de testes.
- Estratégias de testes unitários para:
  - Validadores (Zod schemas).
  - Serviços (ex.: `WebhookService`).
  - Controladores (ex.: `ColaboradoresController`).
- Procedimentos de **build** e **execução** dos testes.
- Como contribuir adicionando novos testes.

## Estrutura de Diretórios de Testes
```
/tests
  /api
    /controllers
      colabobrador.controller.test.ts
      webhook.controller.test.ts
    /services
      webhook.service.test.ts
    /validators
      colaborador.validator.test.ts
      webhook.validator.test.ts
  /unit
    setup.ts                # Configurações globais de mocks
    index.ts                # Ponto de entrada para executar todos os testes
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

## Estratégia de Testes Unitários

### 1. Validadores (Zod)
- **Objetivo**: Garantir que os esquemas de validação aceitem apenas dados conformes e rejeitem os inválidos.
- **Arquivos de teste**: `tests/api/validators/* validator.test.ts`.
- **Cobertura**: Cada esquema deve ter pelo menos:
  - Caso de sucesso (dados válidos).
  - Caso de falha (campos missing, formato incorreto, etc.).

### 2. Serviços
- **WebhookService**
  - Verifica disparo de webhook para múltiplos eventos.
  - Mocka `fetch` para evitar chamadas reais a URLs externas.
  - Testa retorno de erro e comportamento quando não há webhooks ativos.
- **Arquivo de teste**: `tests/api/services/webhook.service.test.ts`.

### 3. Controladores
- **ColaboradoresController**
  - Testa rotas de listagem, criação, atualização e exclusão.
  - Usa `supertest` ou mock de `Request`/`Response` para simular o pipeline Express.
  - Verifica códigos de status e mensagens de erro consolidadas no `errorHandler`.

### 4. Middlewares de Erro
- **Global Error Handler**
  - Verifica se mensagens de erro são formatadas corretamente (status, mensagem, debug info em dev).
  - Garante que a resposta JSON siga o formato `ApiResponse<null>`.

## Mocks e Configuração Global
Arquivo `tests/setup.ts`:

```ts
import { vi } from 'vitest';
import { mockDeep } from 'jest-mock';
import '@testing-library/jest-dom/extend-expect';

// Mock de fetch global
global.fetch = vi.fn();

// Mock de console para evitar ruído nos testes
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => ({}));
vi.spyOn(console, 'info').mockImplementation(() => ({}));

// Helper para resetar mocks entre testes
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

## Contribuindo com Novos Testes
1. Crie o arquivo de teste na pasta correspondente (`controllers`, `services` ou `validators`).
2. Implemente casos de teste que cubram:
   - Dados válidos.
   - Erros esperados (validação, not‑found, conflict).
   - Comportamento de edge cases.
3. Atualize a cobertura executando `npm run test:coverage`.
4. Abra um Pull Request com a descrição detalhando o que foi testado.

## Perguntas Frequentes
- **Preciso instalar algo extra?**  
  Não. Todas as dependências sãodev: `vitest`, `@types/node`, `typescript`. O mock de `fetch` usa a API global.

- **Como debugar um teste que falha?**  
  Execute `npm run test:watch` e adicione `debugger;` onde desejar. O Vitest irá pausar na linha.

- **Posso usar bibliotecas de teste adicionais?**  
  Sim, desde que sejam declaradas em `devDependencies` e não causem efeitos colaterais.

---  
*Este documento será mantido em sincronismo com o diretório `/tests` para garantir que toda a cobertura de testes esteja documentada.*