import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cadastros/areas" element={<AreasPage />} />
        <Route path="/cadastros/departamentos" element={<DepartamentosPage />} />
        <Route path="/cadastros/setores" element={<SetoresPage />} />
        <Route path="/cadastros/cargos" element={<CargosPage />} />
        <Route path="/cadastros/motivos-refugo" element={<MotivosRefugoPage />} />
        <Route path="/cadastros/defeitos-refugo" element={<DefeitosRefugoPage />} />
        <Route path="/rh/colaboradores" element={<ColaboradoresPage />} />
        <Route path="/rh/escalas" element={<EscalasPage />} />
        <Route path="/rh/pontos" element={<PontosPage />} />
        <Route path="/logistica" element={<LogisticaPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
