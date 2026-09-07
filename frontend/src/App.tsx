import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AreasPage } from './pages/AreasPage';
import { DepartamentosPage } from './pages/DepartamentosPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cadastros/areas" element={<AreasPage />} />
        <Route path="/cadastros/departamentos" element={<DepartamentosPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
