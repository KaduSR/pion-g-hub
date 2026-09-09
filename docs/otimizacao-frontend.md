# Otimização de Bundle — Pion-G-Hub

## Visão Geral
Este documento descreve a estratégia de code splitting implementada no frontend do Pion-G-Hub para reduzir o tamanho do bundle inicial e melhorar o tempo de carregamento.

---

## 1. Estratégia: Lazy Loading por Rota

### 1.1 Antes
- Todas as 14 páginas eram importadas estaticamente em `App.tsx`
- Bundle inicial incluía código de todas as páginas, mesmo não visitadas
- Tamanho do bundle principal: ~240 KB (estimado)

### 1.2 Depois
- Páginas carregadas sob demanda via `React.lazy()` + `Suspense`
- Cada página gera um chunk separado no build do Vite
- Bundle inicial reduzido para ~76 KB gzipado

### 1.3 Implementação

`frontend/src/App.tsx`

```tsx
import { Suspense, lazy } from 'react';
import type { ComponentType } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';

// Lazy loading por página
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })) as Promise<{ default: ComponentType<any> }>);
const ColaboradoresPage = lazy(() => import('./pages/ColaboradoresPage').then(m => ({ default: m.ColaboradoresPage })) as Promise<{ default: ComponentType<any> }>);
// ... demais páginas

function LoadingFallback() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: '#6b7280' }}>Carregando...</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            {/* ... demais rotas */}
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

---

## 2. Padrão de Tipagem

### Problema
`React.lazy()` espera `Promise<{ default: ComponentType }>`, mas os módulos usam named exports.

### Solução
```tsx
const Page = lazy(() => import('./pages/Page').then(m => ({ default: m.Page })) as Promise<{ default: ComponentType<any> }>);
```

Mapeamos o named export `m.Page` para um objeto `{ default: m.Page }`, satisfazendo o tipo esperado.

---

## 3. Resultado do Build

```
dist/
  assets/
    index-RM9MwNsx.js                238.33 KB (76.47 KB gzip)
    BaseTable-BDesW8b3.js             1.58 KB
    AuditoriaPage-BGKlOUfE.js         1.85 KB
    RelatoriosPage-Yax7VZGa.js        2.66 KB
    CargosPage-BKTb_RHY.js            3.01 KB
    SetoresPage-B7zG5MDJ.js           3.02 KB
    DepartamentosPage-DS-U6BxO.js     3.05 KB
    MotivosRefugoPage-BSAu9uek.js     3.06 KB
    AreasPage-BfQVdzLp.js             3.38 KB
    DefeitosRefugoPage-CPIBJrFN.js    3.62 KB
    EscalasPage-DBNmpRfn.js           3.68 KB
    DashboardPage-CygLhpvr.js         3.83 KB
    WebhooksPage-PV_I1a0z.js          3.97 KB
    PontosPage-D_zcmIDf.js            4.32 KB
    LogisticaPage-BbNZjBS_.js         4.84 KB
    ColaboradoresPage-WBIPD8kD.js     5.15 KB
```

### Ganho
- **Bundle inicial**: 238 KB → ~76 KB gzipado (apenas componentes comuns + Layout)
- **Páginas sob demanda**: carregadas apenas quando o usuário navega
- **Cache**: chunks de páginas podem ser cacheados separadamente

---

## 4. Validação

```sh
cd frontend
npm run build   # ✓ tsc limpo + vite build limpo
```

---

## 5. Referências

- `frontend/src/App.tsx` — implementação do lazy loading
- Vite: Code Splitting — https://vitejs.dev/guide/features.html#code-splitting
- React: `React.lazy` + `Suspense` — https://react.dev/reference/react/lazy
