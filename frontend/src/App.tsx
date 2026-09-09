import { Suspense, lazy } from 'react';
import type { ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { NotificationProvider } from './contexts/NotificationContext';

// Lazy loading por página — reduz bundle inicial
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })) as Promise<{ default: ComponentType<any> }>);
const ColaboradoresPage = lazy(() => import('./pages/ColaboradoresPage').then(m => ({ default: m.ColaboradoresPage })) as Promise<{ default: ComponentType<any> }>);
const EscalasPage = lazy(() => import('./pages/EscalasPage').then(m => ({ default: m.EscalasPage })) as Promise<{ default: ComponentType<any> }>);
const PontosPage = lazy(() => import('./pages/PontosPage').then(m => ({ default: m.PontosPage })) as Promise<{ default: ComponentType<any> }>);
const LogisticaPage = lazy(() => import('./pages/LogisticaPage').then(m => ({ default: m.LogisticaPage })) as Promise<{ default: ComponentType<any> }>);
const AreasPage = lazy(() => import('./pages/AreasPage').then(m => ({ default: m.AreasPage })) as Promise<{ default: ComponentType<any> }>);
const DepartamentosPage = lazy(() => import('./pages/DepartamentosPage').then(m => ({ default: m.DepartamentosPage })) as Promise<{ default: ComponentType<any> }>);
const SetoresPage = lazy(() => import('./pages/SetoresPage').then(m => ({ default: m.SetoresPage })) as Promise<{ default: ComponentType<any> }>);
const CargosPage = lazy(() => import('./pages/CargosPage').then(m => ({ default: m.CargosPage })) as Promise<{ default: ComponentType<any> }>);
const MotivosRefugoPage = lazy(() => import('./pages/MotivosRefugoPage').then(m => ({ default: m.MotivosRefugoPage })) as Promise<{ default: ComponentType<any> }>);
const DefeitosRefugoPage = lazy(() => import('./pages/DefeitosRefugoPage').then(m => ({ default: m.DefeitosRefugoPage })) as Promise<{ default: ComponentType<any> }>);
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage').then(m => ({ default: m.RelatoriosPage })) as Promise<{ default: ComponentType<any> }>);
const AuditoriaPage = lazy(() => import('./pages/AuditoriaPage').then(m => ({ default: m.AuditoriaPage })) as Promise<{ default: ComponentType<any> }>);
const WebhooksPage = lazy(() => import('./pages/WebhooksPage').then(m => ({ default: m.WebhooksPage })) as Promise<{ default: ComponentType<any> }>);

function LoadingFallback() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: '#6b7280' }}>Carregando...</p>
    </div>
  );
}

function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="rh/colaboradores" element={<ColaboradoresPage />} />
              <Route path="rh/escalas" element={<EscalasPage />} />
              <Route path="rh/pontos" element={<PontosPage />} />
              <Route path="logistica" element={<LogisticaPage />} />
              <Route path="cadastros/areas" element={<AreasPage />} />
              <Route path="cadastros/departamentos" element={<DepartamentosPage />} />
              <Route path="cadastros/setores" element={<SetoresPage />} />
              <Route path="cadastros/cargos" element={<CargosPage />} />
              <Route path="cadastros/motivos-refugo" element={<MotivosRefugoPage />} />
              <Route path="cadastros/defeitos-refugo" element={<DefeitosRefugoPage />} />
              <Route path="relatorios" element={<RelatoriosPage />} />
              <Route path="auditoria" element={<AuditoriaPage />} />
              <Route path="configuracoes/webhooks" element={<WebhooksPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </NotificationProvider>
  );
}

function NotFoundPage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', margin: 0 }}>404</h1>
      <p style={{ marginTop: '1rem', color: '#6b7280' }}>Página não encontrada.</p>
      <Navigate to="/" replace />
    </div>
  );
}

export default App;
