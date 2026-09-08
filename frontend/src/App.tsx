import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AreasPage } from './pages/AreasPage';
import { DepartamentosPage } from './pages/DepartamentosPage';
import { SetoresPage } from './pages/SetoresPage';
import { CargosPage } from './pages/CargosPage';
import { MotivosRefugoPage } from './pages/MotivosRefugoPage';
import { DefeitosRefugoPage } from './pages/DefeitosRefugoPage';
import { ColaboradoresPage } from './pages/ColaboradoresPage';
import { EscalasPage } from './pages/EscalasPage';
import { PontosPage } from './pages/PontosPage';
import { LogisticaPage } from './pages/LogisticaPage';
import { DashboardPage } from './pages/DashboardPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { AuditoriaPage } from './pages/AuditoriaPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { NotificationProvider } from './contexts/NotificationContext';

function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
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
