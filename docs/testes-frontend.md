# Documentação de Testes do Frontend (Pion-G-Hub)

## Visão Geral
Este documento descreve o conjunto de testes implementado para a camada de frontend da aplicação Pion-G-Hub, incluindo:

- Configuração do **Vitest** + **Testing Library** como runner e utilitários.
- Estratégia de testes de **componentes visuais** (renderização, interação e busca).
- Procedimentos de **build** e **execução** dos testes.
- Convenções e próximos passos para ampliar cobertura.

## Estrutura de Diretórios de Testes
```
frontend/src
  /components
    BaseTable.test.tsx
  /tests
    setup.ts
```

## Configuração do Vitest
Arquivo `frontend/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
})
```

## Scripts npm
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## Estratégia de Testes

### 1. Setup Global
Arquivo `frontend/src/tests/setup.ts`:

```ts
import '@testing-library/jest-dom';
```

### 2. Testes de Componentes
#### BaseTable
- Renderização de cabeçalhos e linhas.
- Estado vazio: mensagem padrão.
- Filtro por busca: digitar no campo de pesquisa e validar subset visível.
- Título e botão de adição quando fornecidos.

## Convenções
- Nomes de arquivos: `<Componente>.test.tsx`.
- Nomes de testes em português: `'renders table headers'`.
- Usar `screen` para consultas e evitar acessar DOM diretamente.

## Execução
```sh
# Na pasta frontend
npm test

# Modo watch
npm run test:watch
```

## Próximos Passos
- Cobrir páginas principais (`ColaboradoresPage`, `DashboardPage`).
- Adicionar testes de roteamento com `MemoryRouter`.
- Validar fluxos de formulário e submissão.
